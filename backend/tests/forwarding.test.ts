import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { generateKeyPairSync, sign } from 'node:crypto';
import { enroll } from './enroll.js';
import { CloudStore } from '../src/cloud/store.js';
import { afterScreening, ForwardingLive } from '../src/cloud/forwarding-live.js';
import { ForwardingProbes } from '../src/cloud/forwarding-probes.js';
import { BLOCK_MS, BLOCKED_RECORDS_PER_DAY, CAUTION_MS, ForwardingStore, forwardingConsent } from '../src/cloud/forwarding-store.js';
import { cloudSchema } from '../src/cloud/config.js';
import { buildCloudApp } from '../src/cloud/app.js';
import type { AuthProvider } from '../src/auth.js';

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('Supervised Telnyx forwarding (Firestore emulator)', () => {
  const project = 'demo-shield-forwarding';
  const keys = generateKeyPairSync('ed25519');
  const config = cloudSchema.parse({ FIREBASE_WEB_API_KEY: 'test', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app',
    TRIAL_PROXY_SECRET: 'c'.repeat(64), DATA_ENCRYPTION_KEY: 'd'.repeat(64),
    LIVE_SCREENING_ENABLED: true, LIVE_BRIDGE_URL: 'https://shield-live-test.a.run.app', TELNYX_ACCOUNT_ID: 'fe8d2922-2dcf-4461-87bc-17a539688c31', TELNYX_API_KEY: 'test'.repeat(8),
    TELNYX_APPLICATION_ID: '123456789012345678',
    TELNYX_PUBLIC_KEY: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64') });
  const PERSON = 'b0b7af93-72ad-431d-9708-f1d9564a2b36', NUMBER = '+12025550109', PHONE = '+12025550101';
  const number = NUMBER;
  const admin = initializeApp({ projectId: project }, 'forwarding-tests'), db = getFirestore(admin);
  const sid = (n = 1) => `10123456-1234-4321-1234-${n.toString(16).padStart(12, '0')}`;
  const startProbe = vi.fn<(id: string, from: string, to: string) => Promise<void>>();
  const warmLiveBridge = vi.fn<() => void>();
  let inboundFrom: string, inboundTo: string;
  const from = '+12025550102';
  let now: number, s: CloudStore, f: ForwardingStore, app: Awaited<ReturnType<typeof buildCloudApp>>;
  const auth: AuthProvider = { async identify(token) { return { subject: token }; }, async requestCode() {}, async verifyCode() { return {}; }, async refresh() { return {}; }, async logout() {}, async deleteAccount() {} };
  const headers = (uid = 'owner') => ({ authorization: `Bearer ${uid}`, 'x-shield-participant': PERSON });
  const approve = { action: 'approve', reason: 'routine', purpose: 'personal', evidence: 'lunch tomorrow', hasName: true, hasReason: true } as const;
  const post = (step: string, extra: Record<string, string> = {}, signed = true) => {
    const url = `/forwarding/${config.TRIAL_PROXY_SECRET}/${step}`;
    const params = { AccountSid: config.TELNYX_ACCOUNT_ID, CallSid: sid(), From: from, To: number, Direction: 'inbound', ...extra };
    const payload = new URLSearchParams(params).toString(), timestamp = Math.floor(now / 1000).toString();
    return app.inject({ method: 'POST', url, headers: { 'content-type': 'application/x-www-form-urlencoded', ...(signed
      ? { 'telnyx-signature-ed25519': sign(null, Buffer.from(`${timestamp}|${payload}`), keys.privateKey).toString('base64'), 'telnyx-timestamp': timestamp }
      : {}) }, payload });
  };
  it('serves only approved generic audio from the packaged fallback route', async () => {
    const response = await app.inject({ url: '/public/speech/soniox-grace-2026-10-12/01-greeting.wav' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('audio/wav');
    expect(response.rawPayload.toString('ascii', 0, 4)).toBe('RIFF');
    expect((await app.inject({ url: '/public/speech/soniox-grace-2026-10-12/unknown.wav' })).statusCode).toBe(404);
    const fallback = (await post('fallback')).body;
    expect(fallback).toContain('<Say voice="AWS.Polly.Joanna">Shield is temporarily unavailable.');
  });
  const offer = async (bind = true) => {
    await post('inbound'); const c = (await f.find(sid()))!; const live = new ForwardingLive(f); await live.claim(c.id);
    await live.finish(c.id, approve);
    const response = await post('result'); expect(response.body).toContain('<Dial');
    if (bind) await post(`child/${c.id}`, { CallSid: sid(2), ParentCallSid: sid(), From: number, To: PHONE, CallStatus: 'ringing' });
    return c.id;
  };
  beforeEach(async () => {
    if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST!)) throw new Error('Local emulator required');
    await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: 'DELETE' });
    startProbe.mockReset().mockResolvedValue(undefined); warmLiveBridge.mockReset(); inboundFrom = from; inboundTo = number;
    now = Date.now(); s = new CloudStore(db, config, () => now);
    f = await enroll(s, { id: PERSON, uid: 'owner', phone: PHONE, shieldNumber: NUMBER, now });
    app = await buildCloudApp(s, { auth, warmLiveBridge, startForwardingProbe: startProbe, lookupForwardingChild: async () => ({ parentCallSid: sid(), from: number,
      to: PHONE, status: 'in-progress' }),
      lookupForwardingInbound: async () => ({ from: inboundFrom, to: inboundTo, status: 'in-progress', direction: 'inbound' }) });
  });
  afterEach(async () => { await app.close(); });
  afterAll(async () => { await db.terminate(); await deleteApp(admin); });


  const start = (kind: 'ring' | 'forwarding', uid = 'owner') => app.inject({ method: 'POST', url: '/api/forwarding/probe', headers: headers(uid), payload: { kind } });
  it('starts one fixed-recipient test on concurrent taps and never returns its challenge', async () => {
    expect((await start('ring', 'stranger')).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/api/forwarding/probe', headers: headers(), payload: { kind: 'ring', to: from } })).statusCode).toBe(400);
    const replies = await Promise.all([start('ring'), start('ring'), start('ring')]);
    expect(replies.every(r => r.statusCode === 200)).toBe(true);
    expect(startProbe).toHaveBeenCalledTimes(1);
    const state = (await app.inject({ url: '/api/forwarding', headers: headers() })).json();
    expect(state.probe.state).toBe('waiting'); expect(state.probe.nonce).toBeUndefined();
    expect((await f.begin(sid(), NUMBER, from))!.eligible).toBe(false);
  });
  it('opens an owner-approved window without extending it or resetting consumed calls', async () => {
    const open = () => app.inject({ method: 'POST', url: '/api/forwarding/test-window', headers: headers(), payload: { allowAnyCaller: true } });
    await f.controlRef(PERSON).update({ enabled: false });
    expect((await open()).statusCode).toBe(200);
    const expiry = (await f.controlRef(PERSON).get()).data()!.expiresAt;
    now += 1000; await f.controlRef(PERSON).update({ used: 4 }); await open();
    expect((await f.controlRef(PERSON).get()).data()).toMatchObject({ used: 4, expiresAt: expiry });
    await s.personRef(PERSON).update({ forwardingConsent: 'old' });
    expect((await open()).statusCode).toBe(409); expect((await start('ring')).statusCode).toBe(409);
  });
  it('requires the sound-check digit on the bound signed outbound leg', async () => {
    await start('ring'); const probe = (await f.controlRef(PERSON).get()).data()!.probe;
    expect((await post(`probe/${probe.id}`, { CallSid: sid(9), From: from, To: PHONE })).body).toContain('<Hangup');
    const outbound = { CallSid: sid(8), From: number, To: PHONE };
    expect((await post(`probe/${probe.id}`, outbound, false)).statusCode).toBe(403);
    expect((await post(`probe/${probe.id}`, outbound)).body).toContain('/10-sound-check.wav');
    await post(`probe-confirm/${probe.id}`, { ...outbound, CallSid: sid(7), Digits: '1' });
    expect((await f.controlRef(PERSON).get()).data()!.probe.state).toBe('waiting');
    await post(`probe-confirm/${probe.id}`, { ...outbound, Digits: '1' });
    expect((await f.controlRef(PERSON).get()).data()!.probe.state).toBe('passed');
    expect((await f.controlRef(PERSON).get()).data()!.ringTestAt).toBe(now);
    expect((await f.controlRef(PERSON).get()).data()!.forwardingTestAt).toBeUndefined();
  });
  it('requires the unique challenge to traverse both legs before reporting forwarding', async () => {
    await start('forwarding'); const probe = (await f.controlRef(PERSON).get()).data()!.probe;
    inboundFrom = number;
    const outbound = { CallSid: sid(8), From: number, To: PHONE };
    expect((await post(`probe/${probe.id}`, outbound)).body).toContain(`digits="${probe.nonce}"`);
    expect((await post('inbound', { From: number })).body).toContain('numDigits="8"');
    await post(`probe-confirm/${probe.id}`, { Digits: 'wrong' });
    expect((await f.controlRef(PERSON).get()).data()!.probe.state).toBe('waiting');
    await post(`probe-confirm/${probe.id}`, { CallSid: sid(6), Digits: probe.nonce });
    expect((await f.controlRef(PERSON).get()).data()!.probe.state).toBe('waiting');
    await post(`probe-confirm/${probe.id}`, { Digits: probe.nonce });
    expect((await f.controlRef(PERSON).get()).data()!.probe.state).toBe('passed');
    const state = (await app.inject({ url: '/api/forwarding', headers: headers() })).json();
    expect(state.forwardingTestAt).not.toBeNull(); expect(state.lastTestAt).toBeNull();
    expect((await db.collection('callSessions').get()).empty).toBe(true);
  });
  it('does not retry an uncertain provider request and enforces expiry and daily limits', async () => {
    startProbe.mockRejectedValueOnce(new Error('provider timeout'));
    await start('ring'); await start('ring'); expect(startProbe).toHaveBeenCalledTimes(1);
    const probe = (await f.controlRef(PERSON).get()).data()!.probe;
    now += 90_001;
    expect((await app.inject({ url: '/api/forwarding', headers: headers() })).json().probe.state).toBe('failed');
    expect(await new ForwardingProbes(s).confirm(probe.id, sid(), '1')).toBeUndefined();
    await f.controlRef(PERSON).update({ probeCount: 6, probeDay: Math.floor(now / 86400_000) });
    expect((await start('ring')).statusCode).toBe(429);
  });
  it('restoration stops in-flight test evidence from passing', async () => {
    await start('ring'); const probe = (await f.controlRef(PERSON).get()).data()!.probe;
    await new ForwardingProbes(s).outbound(probe.id, sid());
    await app.inject({ method: 'POST', url: '/api/forwarding/restore', headers: headers() });
    expect(await new ForwardingProbes(s).confirm(probe.id, sid(), '1')).toBeUndefined();
    expect((await start('ring')).statusCode).toBe(409);
  });

  it('rejects a child without authenticated parent binding, wrong parent and wrong destination', async () => {
    const id = await offer(false);
    expect((await post(`whisper/${id}`, { CallSid: sid(2) })).body).toContain('<Hangup');
    await post(`child/${id}`, { CallSid: sid(2), ParentCallSid: sid(8), From: number, To: PHONE, CallStatus: 'ringing' });
    expect((await f.find(sid()))!.childSid).toBeUndefined();
    await post(`child/${id}`, { CallSid: sid(2), ParentCallSid: sid(), From: number, To: from, CallStatus: 'ringing' });
    expect((await f.find(sid()))!.childSid).toBeUndefined();
    const child = { CallSid: sid(2), ParentCallSid: sid(), From: number, To: PHONE, CallStatus: 'in-progress' };
    await Promise.all([post(`child/${id}`, child), post(`child/${id}`, child)]);
    expect((await post(`whisper/${id}`, { CallSid: sid(2) })).body).toContain('/offer-personal.wav');
    expect((await post(`accept/${id}`, { CallSid: sid(2), Digits: '1' })).body).not.toContain('<Hangup');
  });
  it('rejects the wrong application and requires renewed provider consent', async () => {
    expect((await post('inbound', { ConnectionId: '999999999999' })).statusCode).toBe(403);
    await s.personRef(PERSON).update({ forwardingConsent: 'old-provider-consent' });
    expect((await post('inbound')).body).toContain('/07-not-ready.wav');
    expect((await db.collection('callSessions').get()).empty).toBe(true);
  });
  it('requires authentic provider signatures and rejects loopback numbers', async () => {
    expect((await post('inbound', {}, false)).statusCode).toBe(403);
    expect((await post('inbound', { From: number })).body).toContain('<Hangup');
    expect(warmLiveBridge).not.toHaveBeenCalled();
    expect((await db.collection('callSessions').get()).empty).toBe(true);
  });
  it.each(['anonymous', 'Restricted', '+anonymous', ''])('screens a withheld caller ID (%j) without storing it or trusting it', async withheld => {
    inboundFrom = withheld;
    await s.personRef(PERSON).collection('trusted-numbers').add({ phoneHash: s.vault.hash(withheld), enabled: true });
    expect((await post('inbound', { From: withheld })).body).toContain('<Stream');
    expect(warmLiveBridge).toHaveBeenCalledTimes(1);
    const call = (await f.find(sid()))!;
    expect(call).toMatchObject({ state: 'screening', eligible: true });
    expect(s.vault.open(call.callerEnc, `call:${call.id}:caller`)).toBe('');
    const [listed] = (await app.inject({ url: '/api/calls', headers: headers() })).json().calls;
    expect(listed.callerNumber).toBe('No caller ID');
  });
  it('screens an international caller and binds the webhook caller to the provider record', async () => {
    inboundFrom = '+442071838750';
    expect((await post('inbound', { From: inboundFrom })).body).toContain('<Stream');
    expect((await f.find(sid()))?.state).toBe('screening');
    inboundFrom = from;
    expect((await post('inbound', { CallSid: sid(2), From: 'anonymous' })).body).toContain('<Hangup');
    inboundFrom = 'anonymous';
    expect((await post('inbound', { CallSid: sid(3) })).body).toContain('<Hangup');
    expect(await f.find(sid(2))).toBeUndefined(); expect(await f.find(sid(3))).toBeUndefined();
  });
  it('never matches a withheld caller to a single-caller test scope', async () => {
    await f.controlRef(PERSON).update({ allowAnyCaller: false, callerHash: s.vault.hash('') });
    expect((await f.begin(sid(), NUMBER, undefined))!.eligible).toBe(false);
  });
  it('allows any caller but only one offer at a time, including recursive forwarding', async () => {
    const calls = await Promise.all([f.begin(sid(), NUMBER, from), f.begin(sid(2), NUMBER, '+12025550103')]);
    expect(calls.filter(c => c?.eligible)).toHaveLength(1);
    expect(calls.filter(c => c?.state === 'voicemail')).toHaveLength(1);
    expect((await f.controlRef(PERSON).get()).data()!.used).toBe(1);
    expect(await f.begin(sid(), NUMBER, from)).toBeUndefined();
    await f.ended(calls.find(c => c?.eligible)!.parentSid);
    expect((await f.controlRef(PERSON).get()).data()!.activeCallId).toBeUndefined();
    expect((await f.begin(sid(3), NUMBER, from))!.eligible).toBe(true);
  });
  it('never offers outside the window, over quota, paused, or to a trusted caller', async () => {
    await f.controlRef(PERSON).update({ used: 10 }); expect((await f.begin(sid(), NUMBER, from))!.eligible).toBe(false);
    await f.controlRef(PERSON).update({ used: 0, expiresAt: now - 1 }); expect((await f.begin(sid(2), NUMBER, from))!.eligible).toBe(false);
    await f.controlRef(PERSON).update({ expiresAt: now + 10000 }); await s.personRef(PERSON).update({ status: 'paused' });
    expect((await f.begin(sid(3), NUMBER, from))!.eligible).toBe(false);
    await s.personRef(PERSON).update({ status: 'setup' });
    await s.personRef(PERSON).collection('trusted-numbers').add({ phoneHash: s.vault.hash(from) });
    expect((await f.begin(sid(4), NUMBER, from))!.eligible).toBe(false);
  });
  it('offers only the fixed enrolled recipient, requires the bound child and press 1', async () => {
    const id = await offer();
    expect((await post(`accept/${id}`, { CallSid: sid(2), Digits: '1' })).body).toContain('<Hangup');
    const whisper = await post(`whisper/${id}`, { CallSid: sid(2) }); expect(whisper.body).toContain('/offer-personal.wav');
    expect((await post(`accept/${id}`, { CallSid: sid(3), Digits: '1' })).body).toContain('<Hangup');
    const accepted = await post(`accept/${id}`, { CallSid: sid(2), Digits: '1' }); expect(accepted.body).not.toContain('<Hangup');
    expect((await f.find(sid()))!.acceptedAt).toBe(now);
    expect((await post(`accept/${id}`, { CallSid: sid(2), Digits: '1' })).body).not.toContain('<Hangup');
    const ended = await post(`dial-ended/${id}`, { DialCallSid: sid(2), DialCallStatus: 'completed' });
    expect(ended.body).not.toContain('<Record'); expect((await f.find(sid()))!.outcome).toBe('connected');
    expect((await app.inject({ url: '/api/calls?filter=connected', headers: headers() })).json().calls).toHaveLength(1);
  });
  it.each(['2', '', '9'])('routes non-acceptance %s to voicemail without recording a conversation', async digits => {
    const id = await offer(); await post(`whisper/${id}`, { CallSid: sid(2) });
    expect((await post(`accept/${id}`, { CallSid: sid(2), Digits: digits })).body).toContain('<Hangup');
    const ended = await post(`dial-ended/${id}`, { DialCallSid: sid(2), DialCallStatus: 'completed' });
    expect(ended.body).toContain('<Record'); expect(ended.body).toContain('maxLength="60"');
    expect((await f.find(sid()))!.acceptedAt).toBeUndefined();
  });
  it('stops acceptance immediately on restoration and handles unanswered callbacks', async () => {
    const id = await offer(); await post(`whisper/${id}`, { CallSid: sid(2) });
    expect((await app.inject({ method: 'POST', url: '/api/forwarding/restore', headers: headers() })).statusCode).toBe(200);
    expect((await post(`accept/${id}`, { CallSid: sid(2), Digits: '1' })).body).toContain('<Hangup');
    expect((await post(`dial-ended/${id}`, { DialCallSid: sid(2), DialCallStatus: 'no-answer' })).body).toContain('<Record');
    expect((await f.controlRef(PERSON).get()).data()!.enabled).toBe(false);
  });
  it('expires acceptance even if the callback started during the window', async () => {
    const id = await offer(); await post(`whisper/${id}`, { CallSid: sid(2) }); now += 1800_001;
    expect((await post(`accept/${id}`, { CallSid: sid(2), Digits: '1' })).body).toContain('<Hangup');
  });
  it('gates setup and never equates button acknowledgements with a verified routing test', async () => {
    expect((await app.inject({ url: '/api/forwarding', headers: headers('stranger') })).statusCode).toBe(403);
    let state = (await app.inject({ url: '/api/forwarding', headers: headers() })).json();
    expect(state.activationCodes).toEqual(['61', '67', '62'].map(code => `**${code}*${number.slice(1)}#`));
    expect(state.lastTestAt).toBeNull();
    await f.controlRef(PERSON).update({ enabled: false });
    state = (await app.inject({ url: '/api/forwarding', headers: headers() })).json(); expect(state.activationCodes).toEqual([]);
    expect((await app.inject({ method: 'POST', url: '/api/forwarding/progress', headers: headers(), payload: { stage: 'forward0' } })).statusCode).toBe(409);
  });
  it('deduplicates voicemail, rejects invalid durations and protects encrypted audio', async () => {
    await f.controlRef(PERSON).update({ enabled: false }); const c = (await f.begin(sid(), NUMBER, from))!;
    const recordingSid = 'ab123456-1234-4321-1234-000000000001';
    await f.recording(sid(), recordingSid, NaN); expect((await db.collection('forwardingRecordings').get()).empty).toBe(true);
    await Promise.all([f.recording(sid(), recordingSid, 12), f.recording(sid(), recordingSid, 12)]);
    expect((await db.collection('forwardingRecordings').get()).size).toBe(1);
    await db.collection('forwardingAudio').doc(c.id).set({ participantId: c.participantId, expiresAt: now + 10000,
      audioEnc: s.vault.seal(Buffer.from('test audio').toString('base64'), `voicemail:${c.id}`) });
    await s.callRef(c.id).update({ 'voicemail.status': 'ready' });
    expect((await app.inject({ url: `/api/voicemails/${c.id}/audio`, headers: headers('stranger') })).statusCode).toBe(403);
    expect((await app.inject({ url: `/api/voicemails/${c.id}/audio`, headers: headers() })).body).toBe('test audio');
    expect((await app.inject({ method: 'DELETE', url: `/api/voicemails/${c.id}`, headers: headers() })).statusCode).toBe(200);
    expect((await db.collection('forwardingAudio').doc(c.id).get()).exists).toBe(false);
    expect((await app.inject({ method: 'POST', url: '/api/account/delete', headers: headers() })).statusCode).toBe(409);
  });
  it('sends every forwarded caller to voicemail when live screening is switched off', async () => {
    await app.close();
    app = await buildCloudApp(new CloudStore(db, { ...config, LIVE_SCREENING_ENABLED: false }, () => now), { auth, warmLiveBridge,
      lookupForwardingInbound: async () => ({ from: inboundFrom, to: number, status: 'in-progress', direction: 'inbound' }) });
    const xml = (await post('inbound')).body;
    expect(xml).toContain('<Record'); expect(xml).not.toContain('<Stream'); expect(warmLiveBridge).not.toHaveBeenCalled();
    expect(await f.find(sid())).toMatchObject({ state: 'voicemail', eligible: false, reason: 'message_only' });
    expect((await f.controlRef(PERSON).get()).data()).toMatchObject({ used: 0 });
  });
  it('screens a number removed from the shared list and skips screening for one still saved', async () => {
    const ref = s.personRef(PERSON).collection('trusted-numbers').doc('test-contact');
    await ref.set({ phoneHash: s.vault.hash(from), enabled: true });
    await post('inbound'); expect((await f.find(sid()))?.state).toBe('voicemail');
    await f.ended(sid()); await ref.update({ enabled: false });
    await post('inbound', { CallSid: sid(5) }); expect((await f.find(sid(5)))?.state).toBe('screening');
  });

  it('claims live audio only once, preserves a silent block, and releases the call lock', async () => {
    await post('inbound'); const c = (await f.find(sid()))!; const live = new ForwardingLive(f);
    const claims = await Promise.all([live.claim(c.id), live.claim(c.id)]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    await live.finish(c.id, 'silent_caller'); await f.ended(sid());
    expect(await f.find(sid())).toMatchObject({ state: 'ended', outcome: 'held', reason: 'silent_caller', screeningModel: 'gpt-live-1' });
    expect((await f.controlRef(PERSON).get()).data()?.activeCallId).toBeUndefined();
  });
  it('preserves the block when the carrier completion callback arrives first', async () => {
    await post('inbound'); const c = (await f.find(sid()))!; const live = new ForwardingLive(f); await live.claim(c.id);
    await f.ended(sid()); await live.finish(c.id, 'silent_caller');
    expect(await f.find(sid())).toMatchObject({ state: 'ended', outcome: 'held', reason: 'silent_caller' });
  });
  it('rechecks the test window before a live approval can offer a call', async () => {
    await post('inbound'); const c = (await f.find(sid()))!; const live = new ForwardingLive(f); await live.claim(c.id);
    await f.controlRef(PERSON).update({ enabled: false });
    const result = await live.finish(c.id, approve);
    expect(result).toMatchObject({ state: 'voicemail', reason: 'message_only' });
    expect((await post('result')).body).not.toContain('<Dial');
  });
  it.each([
    ['an unresolved hold', { action: 'hold', reason: 'unclear', purpose: 'personal', evidence: 'kind of private', hasName: true, hasReason: false }, 'uncertain'],
    ['a screening failure', 'screening_unavailable', 'screening_unavailable'],
    ['a screening timeout', 'screening_timeout', 'screening_timeout']
  ] as const)('gives voicemail instead of hanging up after %s', async (_label, decision, reason) => {
    await post('inbound'); const c = (await f.find(sid()))!; const live = new ForwardingLive(f); await live.claim(c.id);
    const saved = await live.finish(c.id, decision as Parameters<ForwardingLive['finish']>[1]);
    expect(saved).toMatchObject({ state: 'voicemail', outcome: 'voicemail', reason });
    expect(afterScreening(config, saved)).toEqual({ Url: `${config.PUBLIC_BASE_URL}/forwarding/${config.TRIAL_PROXY_SECRET}/voicemail/${c.id}`, Method: 'POST' });
    const xml = (await post(`voicemail/${c.id}`)).body;
    expect(xml).toContain('<Stop><Stream name="shield-live"'); expect(xml).toContain('/05-voicemail-after-screening.wav'); expect(xml).toContain('<Record');
    expect((await post(`voicemail/${c.id}`, { CallSid: sid(7) })).body).not.toContain('<Record');
    await f.recording(sid(), '20123456-1234-4321-1234-000000000001', 12);
    expect((await f.find(sid()))!.voicemail).toMatchObject({ duration: 12, status: 'pending' });
  });
  it('never offers voicemail to a blocked scam or a silent line', async () => {
    // Silence first: after a scam block the same number is ended before screening.
    for (const [n, decision] of [[1, 'silent_caller'], [2, { action: 'block', reason: 'scam', purpose: 'other', evidence: 'read me the code', hasName: true, hasReason: true }]] as const) {
      await post('inbound', { CallSid: sid(n) }); const c = (await f.find(sid(n)))!; const live = new ForwardingLive(f); await live.claim(c.id);
      const saved = await live.finish(c.id, decision as Parameters<ForwardingLive['finish']>[1]);
      expect(saved).toMatchObject({ state: 'ended', outcome: 'held' }); expect(afterScreening(config, saved)).toBeUndefined();
      expect((await post(`voicemail/${c.id}`, { CallSid: sid(n) })).body).not.toContain('<Record');
      await f.ended(sid(n));
    }
  });
  const scamBlock = { action: 'block', reason: 'scam', purpose: 'other', evidence: 'read me the code', hasName: true, hasReason: true } as const;
  /** A fresh test window after the clock jumps past the last one. */
  const reopen = () => f.controlRef(PERSON).update({ enabled: true, used: 0, expiresAt: now + 1800_000 });
  const blocked = (phone = from) => s.personRef(PERSON).collection('blocked-numbers').doc(s.vault.hash(phone));
  /** Screen the call `n` from `inboundFrom` and apply a decision. */
  const screen = async (n: number, decision: Parameters<ForwardingLive['finish']>[1]) => {
    await post('inbound', { CallSid: sid(n), From: inboundFrom }); const c = (await f.find(sid(n)))!; const live = new ForwardingLive(f);
    const claimed = await live.claim(c.id); await live.finish(c.id, decision); await f.ended(sid(n)); return claimed!;
  };
  it('remembers a scam number and ends its next call at once, without screening, voicemail or the daily allowance', async () => {
    await screen(1, scamBlock);
    const entry = (await blocked().get()).data()!;
    expect(entry).toMatchObject({ reason: 'scam', expiresAt: now + BLOCK_MS, attempts: 0 }); expect(JSON.stringify(entry)).not.toContain(from.slice(2));
    expect((await s.personRef(PERSON).get()).data()!.scamStoppedAt).toBe(now);
    const used = (await f.controlRef(PERSON).get()).data()!.used;
    warmLiveBridge.mockReset(); now += 60_000;
    const xml = (await post('inbound', { CallSid: sid(2) })).body;
    expect(xml).toContain('/08-cannot-connect.wav'); expect(xml).not.toContain('<Stream'); expect(xml).not.toContain('<Record');
    expect(await f.find(sid(2))).toMatchObject({ state: 'ended', outcome: 'held', reason: 'blocked_caller', eligible: false });
    expect((await f.controlRef(PERSON).get()).data()).toMatchObject({ used }); expect((await f.controlRef(PERSON).get()).data()!.activeCallId).toBeUndefined();
    expect((await blocked().get()).data()).toMatchObject({ attempts: 1, lastAttemptAt: now });
    // A late carrier callback must not revive it, and voicemail is never offered.
    await f.ended(sid(2)); expect((await post(`voicemail/${(await f.find(sid(2)))!.id}`, { CallSid: sid(2) })).body).not.toContain('<Record');
    const [listed] = (await app.inject({ url: '/api/calls?filter=held', headers: headers() })).json().calls;
    expect(listed).toMatchObject({ title: 'Blocked caller tried again', reasonCode: 'blocked_caller', callerNumber: from });
    // Other callers are screened as usual.
    inboundFrom = '+12025550103'; expect((await post('inbound', { CallSid: sid(3), From: inboundFrom })).body).toContain('<Stream');
  });
  it('blocks a saved contact that turned out to be a scam, and screens again once the block expires', async () => {
    await screen(1, scamBlock);
    await s.personRef(PERSON).collection('trusted-numbers').add({ phoneHash: s.vault.hash(from), enabled: true });
    expect((await post('inbound', { CallSid: sid(2) })).body).toContain('/08-cannot-connect.wav');
    await s.personRef(PERSON).collection('trusted-numbers').get().then(q => Promise.all(q.docs.map(d => d.ref.delete())));
    now += BLOCK_MS; await reopen(); expect((await post('inbound', { CallSid: sid(3) })).body).toContain('<Stream');
  });
  it.each([
    ['a robocall', { ...scamBlock, reason: 'robocall' }], ['a solicitation', { ...scamBlock, reason: 'solicitation' }], ['a silent line', 'silent_caller'],
    ['an unresolved hold', { action: 'hold', reason: 'unclear', purpose: 'personal', evidence: 'kind of private', hasName: true, hasReason: false }]
  ] as const)('does not remember the number or set caution after %s', async (_label, decision) => {
    await screen(1, decision as Parameters<ForwardingLive['finish']>[1]);
    expect((await blocked().get()).exists).toBe(false);
    expect((await s.personRef(PERSON).get()).data()!.scamStoppedAt).toBeUndefined();
  });
  it('sets caution after a withheld scam caller, who cannot be blocked by number', async () => {
    inboundFrom = 'anonymous'; await screen(1, scamBlock);
    expect((await s.personRef(PERSON).collection('blocked-numbers').get()).empty).toBe(true);
    expect((await s.personRef(PERSON).get()).data()!.scamStoppedAt).toBe(now);
    expect((await post('inbound', { CallSid: sid(2), From: 'anonymous' })).body).toContain('<Stream');
  });
  it('screens with caution for 24 hours after a stopped scam, and only then', async () => {
    expect((await screen(1, approve)).screeningCaution).toBeUndefined();
    await screen(2, scamBlock);
    inboundFrom = '+12025550103'; now += CAUTION_MS - 1; await reopen();
    const cautious = await screen(3, approve);
    expect(cautious.screeningCaution).toBe(true); expect((await f.find(sid(3)))!.screeningCaution).toBe(true);
    now += 1; await reopen(); expect((await screen(4, approve)).screeningCaution).toBeUndefined();
  });
  it('keeps at most a fixed number of blocked attempts a day in history but ends every one', async () => {
    await screen(1, scamBlock);
    for (let n = 2; n < BLOCKED_RECORDS_PER_DAY + 4; n++) expect((await post('inbound', { CallSid: sid(n) })).body).toContain('/08-cannot-connect.wav');
    const history = (await db.collection('callSessions').where('reason', '==', 'blocked_caller').get()).size;
    expect(history).toBe(BLOCKED_RECORDS_PER_DAY);
    expect((await blocked().get()).data()!.attempts).toBe(BLOCKED_RECORDS_PER_DAY + 2);
    // A duplicate webhook for the same call is not a second attempt.
    await post('inbound', { CallSid: sid(2) }); expect((await blocked().get()).data()!.attempts).toBe(BLOCKED_RECORDS_PER_DAY + 2);
    // The total also includes attempts beyond the history cap, once per provider call.
    const overview = (await app.inject({ url: '/api/overview', headers: headers() })).json();
    expect(overview.counts.stoppedTotal).toBe(BLOCKED_RECORDS_PER_DAY + 3);
  });
  it('lists blocked numbers to the person and lets only the person unblock', async () => {
    await screen(1, scamBlock); const id = s.vault.hash(from);
    const list = (await app.inject({ url: '/api/blocked-numbers', headers: headers() })).json();
    expect(list.items).toEqual([expect.objectContaining({ id, phone: from, reason: 'scam', attempts: 0 })]);
    expect((await app.inject({ url: '/api/blocked-numbers', headers: headers('stranger') })).statusCode).toBe(403);
    expect((await app.inject({ method: 'DELETE', url: `/api/blocked-numbers/${id}`, headers: headers('stranger') })).statusCode).toBe(403);
    expect((await app.inject({ method: 'DELETE', url: '/api/blocked-numbers/not-a-hash', headers: headers() })).statusCode).toBe(400);
    expect((await app.inject({ method: 'DELETE', url: `/api/blocked-numbers/${id}`, headers: headers() })).json()).toEqual({ unblocked: true });
    expect((await app.inject({ method: 'DELETE', url: `/api/blocked-numbers/${id}`, headers: headers() })).statusCode).toBe(404);
    expect((await post('inbound', { CallSid: sid(2) })).body).toContain('<Stream');
  });
  it('hides expired blocks at once and removes them in daily cleanup', async () => {
    await screen(1, scamBlock); now += BLOCK_MS;
    expect((await app.inject({ url: '/api/blocked-numbers', headers: headers() })).json().items).toEqual([]);
    await s.cleanup(); expect((await blocked().get()).exists).toBe(false);
  });
  it('resumes an approved Live call through the existing private callback route', async () => {
    await post('inbound'); const c = (await f.find(sid()))!; const live = new ForwardingLive(f); await live.claim(c.id);
    await live.finish(c.id, approve);
    const xml = (await post('result')).body;
    expect(xml).toContain('<Stop><Stream name="shield-live"');
    expect(xml).toContain(PHONE);
    expect(xml).toContain('/whisper/');
    expect((await f.find(sid()))?.state).toBe('offering');
  });

});
