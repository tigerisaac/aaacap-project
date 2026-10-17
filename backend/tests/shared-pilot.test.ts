import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID, generateKeyPairSync, sign } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import Fastify from 'fastify';
import { CloudStore } from '../src/cloud/store.js';
import { cloudSchema } from '../src/cloud/config.js';
import { ForwardingStore } from '../src/cloud/forwarding-store.js';
import { ForwardingLive } from '../src/cloud/forwarding-live.js';
import { forwardingIdentity, enrollSharedRoute, routeRef } from '../src/cloud/shared-routing.js';
import { SharedCallControl, registerCallControl } from '../src/cloud/call-control.js';
import { callJobId, dispatchCallJob } from '../src/cloud/call-jobs.js';
import { CallControlProvider } from '../src/cloud/call-control-provider.js';
import { registerSignedFormBody } from '../src/cloud/form-body.js';
import { SharedProbes } from '../src/cloud/shared-probes.js';
import { ForwardingProbes } from '../src/cloud/forwarding-probes.js';
import { enroll } from './enroll.js';
import { announcementAudio, ANNOUNCEMENT_BACKUP_VOICE, CAPTURE_GREETING, CAPTURE_VOICEMAIL, SOUND_CHECK_MESSAGE } from '../src/cloud/announcements.js';
import { CallMonitor, warningText } from '../src/cloud/monitoring.js';

it('accepts one normalized forwarding identity and rejects missing, malformed, conflicting, or injected headers', () => {
  expect(forwardingIdentity([{ name: 'Diversion', value: '<sip:+12025550101@carrier.example>;reason=no-answer' }])).toBe('+12025550101');
  expect(forwardingIdentity([{ name: 'diversion', value: '<tel:2025550101>, <sip:12025550101@carrier.example>' }])).toBe('+12025550101');
  for (const headers of [undefined, [], [{ name: 'Diversion', value: '<tel:+12025550101>, <tel:+12025550102>' }],
    [{ name: 'Diversion', value: '<sip:+12025550101@carrier.example>\r\nx: y' }], [{ name: 'Diversion', value: '<tel:%2B12025550101>' }],
    [{ name: 'From', value: '<tel:+12025550101>' }], [{ name: 'Diversion', value: '<tel:911>' }]]) expect(forwardingIdentity(headers)).toBeUndefined();
});

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('25 users on one shared number', () => {
  const project = 'demo-shield-shared', admin = initializeApp({ projectId: project }, 'shared-pilot'), db = getFirestore(admin);
  // Independent client = independent admission queue, like a second API instance.
  const otherAdmin = initializeApp({ projectId: project }, 'shared-pilot-other'), otherDB = getFirestore(otherAdmin);
  const keys = generateKeyPairSync('ed25519');
  const config = cloudSchema.parse({ FIREBASE_WEB_API_KEY: 'test', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app', TRIAL_PROXY_SECRET: 'a'.repeat(64), DATA_ENCRYPTION_KEY: 'b'.repeat(64),
    TELNYX_API_KEY: 'test'.repeat(8), TELNYX_PUBLIC_KEY: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64'),
    TELNYX_ACCOUNT_ID: randomUUID(), TELNYX_APPLICATION_ID: '123456789', TELNYX_SHARED_APPLICATION_ID: '987654321', TELNYX_NUMBER: '+12025550999',
    LIVE_SCREENING_ENABLED: true, SHARED_NUMBER_ENABLED: true, LIVE_BRIDGE_URL: 'https://shield-test.a.run.app' });
  const people = Array.from({ length: 26 }, (_, n) => ({ id: randomUUID(), uid: `senior-${n}`, phone: `+120255501${String(n).padStart(2, '0')}`, shieldNumber: config.TELNYX_NUMBER }));
  let now: number, s: CloudStore, f: ForwardingStore, cc: SharedCallControl, provider: CallControlProvider;
  const action = vi.fn(), request = vi.fn();
  const event = (sid: string, type: string, patch: Record<string, unknown> = {}) => ({ id: randomUUID(), event_type: type, occurred_at: new Date(now).toISOString(),
    payload: { call_control_id: sid, call_leg_id: `leg-${sid}`, connection_id: config.TELNYX_SHARED_APPLICATION_ID!, ...(type === 'call.playback.ended' ? { status: 'completed' } : {}), ...patch } });
  const incoming = (sid: string, n: number, patch: Record<string, unknown> = {}) => event(sid, 'call.initiated', { direction: 'incoming', from: '+12025550888', to: config.TELNYX_NUMBER,
    sip_headers: [{ name: 'Diversion', value: `<tel:${people[n]!.phone}>` }], ...patch });
  const approve = { action: 'approve', reason: 'routine', purpose: 'personal', evidence: 'lunch tomorrow', hasName: true, hasReason: true } as const;
  const prepare = vi.fn().mockResolvedValue(undefined);
  async function arrive(n = 0, legacy = false) {
    const sid = randomUUID(); await cc.handle(incoming(sid, n)); const c = (await f.find(sid))!;
    // Retain explicit coverage of calls already in flight during a rolling release.
    if (legacy) { await s.callRef(c.id).update({ startupVersion: FieldValue.delete() }); await cc.answer((await cc.call(c.id))!); }
    else await cc.runJob(callJobId(c.id, 'start'));
    return (await f.find(sid))!;
  }
  async function offer(n = 0) {
    const c = await arrive(n), live = new ForwardingLive(f); await live.claim(c.id); await live.finish(c.id, approve); await cc.outcome(c.id);
    await cc.handle(event(c.parentSid, 'call.playback.ended', { client_state: provider.state(c.id, 'offer') }));
    return (await f.find(c.parentSid))!;
  }
  beforeEach(async () => {
    if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST!)) throw new Error('local_emulator_required');
    await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: 'DELETE' });
    now = Date.UTC(2026, 9, 12, 17); s = new CloudStore(db, config, () => now); f = new ForwardingStore(s);
    for (const p of people) await enroll(s, { ...p, now });
    await db.doc(`shieldNumbers/${config.TELNYX_NUMBER}`).set({ state: 'shared', members: [] });
    for (const p of people.slice(0, 25)) await enrollSharedRoute(s, p.id, { version: randomUUID(), carrier: 'tmobile', qualifiedAt: now });
    action.mockReset().mockResolvedValue({}); request.mockReset().mockImplementation(async () => ({ call_control_id: randomUUID() }));
    provider = new CallControlProvider(config); provider.action = action; provider.request = request; prepare.mockReset().mockResolvedValue(undefined); cc = new SharedCallControl(s, provider, prepare);
  });
  afterAll(async () => { await db.terminate(); await otherDB.terminate(); await deleteApp(admin); await deleteApp(otherAdmin); });
  it('enforces the 25-person enrollment cap and never reassigns an existing forwarding identity', async () => {
    await expect(enrollSharedRoute(s, people[25]!.id, { version: randomUUID(), carrier: 'verizon', qualifiedAt: now })).rejects.toThrow('pilot_full');
    await s.personRef(people[25]!.id).update({ phoneEnc: s.vault.seal(people[0]!.phone, `person:${people[25]!.id}:phone`) });
    await expect(enrollSharedRoute(s, people[25]!.id, { version: randomUUID(), carrier: 'verizon', qualifiedAt: now })).rejects.toThrow('route_quarantined');
  });
  it('admits 25 simultaneous users across two independent clients, then refuses a duplicate live leg', async () => {
    const other = new ForwardingStore(new CloudStore(otherDB, config, () => now));
    const calls = await Promise.all(people.slice(0, 25).map((p, n) => (n % 2 ? other : f).begin(randomUUID(), config.TELNYX_NUMBER, '+12025550888', { diverted: p.phone, legId: `leg-${n}` })));
    expect(calls.every(c => c?.state === 'screening')).toBe(true);
    expect(new Set(calls.map(c => c?.participantId)).size).toBe(25);
    expect(await f.begin(randomUUID(), config.TELNYX_NUMBER, undefined, { diverted: people[0]!.phone, legId: 'extra' })).toBeUndefined();
    await f.ended(calls[0]!.parentSid);
    expect((await f.begin(randomUUID(), config.TELNYX_NUMBER, undefined, { diverted: people[0]!.phone, legId: 'replacement' }))?.participantId).toBe(people[0]!.id);
  });
  it('does not fall back to the caller, another senior, or a shared voicemail when metadata is absent', async () => {
    const sid = randomUUID(); await cc.handle(incoming(sid, 0, { from: people[0]!.phone, sip_headers: [] }));
    expect(await f.find(sid)).toBeUndefined(); expect(action).toHaveBeenCalledWith(sid, 'hangup', expect.anything());
    expect(action.mock.calls.some(c => c[1] === 'answer')).toBe(false);
  });
  it('isolates 25 concurrent offers, rejects cross-call acceptance, bridges only press 1 and releases all slots', async () => {
    const calls = await Promise.all(people.slice(0, 25).map((_, n) => offer(n)));
    expect(new Set(calls.map(c => c.childSid)).size).toBe(25);
    await Promise.all(calls.map(c => cc.handle(event(c.childSid!, 'call.answered', { client_state: provider.state(c.id, 'recipient') }))));
    await Promise.all(calls.map((c, n) => cc.handle(event(calls[(n + 1) % 25]!.childSid!, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }))));
    expect(action.mock.calls.filter(x => x[1] === 'bridge')).toHaveLength(0);
    await Promise.all(calls.map(c => cc.handle(event(c.childSid!, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }))));
    const bridges = action.mock.calls.filter(x => x[1] === 'bridge');
    expect(bridges).toHaveLength(25);
    for (const c of calls) {
      expect(bridges.find(x => x[0] === c.childSid)?.[2].call_control_id).toBe(c.parentSid);
      expect((await cc.call(c.id))?.state).toBe('accepted');
      expect(f.callEndpoints(c)?.phone).toBe(people.find(p => p.id === c.participantId)?.phone);
    }
    await Promise.all(calls.map(c => cc.handle(event(c.parentSid, 'call.hangup'))));
    expect(Object.keys((await db.doc('sharedCapacity/calls').get()).data()?.leases ?? {})).toHaveLength(0);
    for (const c of calls) expect((await f.controlRef(c.participantId).get()).data()?.activeCallId).toBeUndefined();
  }, 60_000);

  it('keeps per-person screening and incoming-call quotas isolated at the larger pilot size', async () => {
    const day = '2026-10-12';
    await db.doc(`forwardingUsage/${day}-${people[0]!.id}`).set({ screened: 30, calls: 99 });
    const voicemail = await arrive(0);
    expect(voicemail.state).toBe('voicemail');
    await f.ended(voicemail.parentSid);
    expect(await f.begin(randomUUID(), config.TELNYX_NUMBER, undefined, { diverted: people[0]!.phone, legId: 'over-person-cap' })).toBeUndefined();
    expect((await arrive(1)).state).toBe('screening');
    expect((await db.doc(`forwardingUsage/${day}-${people[0]!.id}`).get()).data()?.calls).toBe(100);
  });
  it.each(['http-rejection', 'hangup-callback'] as const)('keeps ten connected calls intact and sends the eleventh to its own voicemail after %s', async failure => {
    const connected = await Promise.all(people.slice(0, 10).map((_, n) => offer(n)));
    await Promise.all(connected.map(async c => {
      await cc.handle(event(c.childSid!, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
      await cc.handle(event(c.childSid!, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }));
    }));
    expect(action.mock.calls.filter(x => x[1] === 'bridge')).toHaveLength(10);
    action.mockClear(); request.mockClear();
    if (failure === 'http-rejection') {
      // Exercise the actual HTTP adapter as well as the call-control fallback, without a network request.
      const rejecting = new CallControlProvider(config, vi.fn(async () => Response.json({ errors: [{ title: 'User channel limit exceeded' }] }, { status: 403 })));
      request.mockImplementationOnce((...args: Parameters<CallControlProvider['request']>) => rejecting.request(...args));
    }
    const overflow = await offer(10);
    const rejectedChild = overflow.childSid ?? randomUUID();
    const rejected = event(rejectedChild, 'call.hangup', {
      client_state: provider.state(overflow.id, 'recipient'), from: config.TELNYX_NUMBER, to: people[10]!.phone,
      hangup_cause: 'call_rejected', sip_hangup_cause: '403'
    });
    if (failure === 'hangup-callback') await cc.handle(rejected);
    expect((await cc.call(overflow.id))!).toMatchObject({ state: 'voicemail', outcome: 'voicemail', captureFromAnswer: true });
    expect(action).toHaveBeenCalledWith(overflow.parentSid, 'playback_start', expect.objectContaining({ audio_url: announcementAudio(CAPTURE_VOICEMAIL)!.url }));
    expect(action.mock.calls.some(x => x[0] === overflow.parentSid && ['hangup', 'record_stop'].includes(x[1]))).toBe(false);

    // Duplicate offer/failure callbacks and a late recipient acceptance cannot redial or connect this caller.
    await cc.handle(event(overflow.parentSid, 'call.playback.ended', { client_state: provider.state(overflow.id, 'offer') }));
    await cc.handle(rejected);
    await cc.handle(event(rejectedChild, 'call.gather.ended', { client_state: provider.state(overflow.id, 'accept'), digits: '1' }));
    expect(request.mock.calls.filter(x => x[0] === '/calls')).toHaveLength(1);
    expect(action.mock.calls.some(x => x[1] === 'bridge' || x[1] === 'record_stop')).toBe(false);
    expect(action.mock.calls.filter(x => x[0] === overflow.parentSid && x[1] === 'playback_start'
      && x[2].audio_url === announcementAudio(CAPTURE_VOICEMAIL)!.url)).toHaveLength(1);

    await cc.handle(event(overflow.parentSid, 'call.playback.ended', { client_state: provider.state(overflow.id, 'voicemail') }));
    // Record-from-answer continues; no second recording is started and the capture is attributed to this caller.
    expect(action.mock.calls.some(x => x[1] === 'record_start')).toBe(false);
    const recording = randomUUID();
    await cc.handle(event(overflow.parentSid, 'call.recording.saved', { recording_id: recording,
      recording_started_at: new Date(now).toISOString(), recording_ended_at: new Date(now + 30_000).toISOString() }));
    expect((await db.collection('forwardingRecordings').doc(recording).get()).data()).toMatchObject({ callId: overflow.id, capture: true, duration: 30 });
    await cc.handle(event(overflow.parentSid, 'call.hangup'));
    expect((await cc.call(overflow.id))!).toMatchObject({ state: 'ended', outcome: 'voicemail' });
    expect((await f.controlRef(people[10]!.id).get()).data()?.activeCallId).toBeUndefined();
    expect(Object.keys((await db.doc('sharedCapacity/calls').get()).data()?.leases ?? {})).toHaveLength(10);
    for (const c of connected) {
      expect((await cc.call(c.id))!.state).toBe('accepted');
      expect(action.mock.calls.some(x => [c.parentSid, c.childSid].includes(x[0]))).toBe(false);
    }

    // Once an existing conversation ends, a later caller can be offered normally.
    await cc.handle(event(connected[0]!.parentSid, 'call.hangup'));
    const next = await offer(11);
    expect(next.state).toBe('offering'); expect(next.childSid).toBeDefined();
  }, 60_000);
  it('pins the verified recipient even when the participant phone record later changes', async () => {
    const c = await arrive(); const ends = f.callEndpoints(c);
    await s.personRef(c.participantId).update({ phoneEnc: s.vault.seal(people[1]!.phone, `person:${c.participantId}:phone`) });
    expect(f.callEndpoints((await cc.call(c.id))!)).toEqual(ends);
  });
  it('deduplicates retries and binds only the intended recipient before press-1 bridging', async () => {
    const c = await offer(), child = c.childSid!;
    const answered = event(child, 'call.answered', { client_state: provider.state(c.id, 'recipient') });
    await cc.handle(answered); await cc.handle(answered);
    expect(action.mock.calls.filter(x => x[1] === 'gather_using_audio')).toHaveLength(1);
    expect(action).toHaveBeenCalledWith(child, 'gather_using_audio', expect.objectContaining({ audio_url: expect.stringContaining('/offer-personal.wav') }));
    expect(action.mock.calls.some(x => x[1] === 'speak' || x[1] === 'gather_using_speak')).toBe(false);
    await cc.handle(event(randomUUID(), 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }));
    expect(action.mock.calls.filter(x => x[1] === 'bridge')).toHaveLength(0);
    const accept = event(child, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' });
    await cc.handle(accept); await cc.handle(accept);
    expect(action.mock.calls.filter(x => x[1] === 'bridge')).toHaveLength(1);
    expect(action).toHaveBeenCalledWith(child, 'bridge', expect.objectContaining({ call_control_id: c.parentSid, prevent_double_bridge: true }));
    const stopIndex = action.mock.calls.findIndex(x => x[0] === c.parentSid && x[1] === 'record_stop');
    expect(stopIndex).toBeGreaterThan(-1); expect(stopIndex).toBeLessThan(action.mock.calls.findIndex(x => x[1] === 'bridge'));
    expect(request).toHaveBeenCalledWith('/calls', expect.objectContaining({ to: people[0]!.phone, from: config.TELNYX_NUMBER, time_limit_secs: 3600 }));
  });
  it('keeps an accepted call and its capacity beyond five minutes, then ends it at the hour', async () => {
    const c = await offer(), child = c.childSid!;
    await cc.handle(event(child, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
    await cc.handle(event(child, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }));
    const acceptedAt = now;
    const deadline = db.doc(`callControlDeadlines/${c.id}`);
    expect((await deadline.get()).data()?.dueAt).toBe(acceptedAt + 3600_000);
    now += 8 * 60_000; await cc.sweep();
    expect((await cc.call(c.id))?.state).toBe('accepted');
    expect(await f.begin(randomUUID(), config.TELNYX_NUMBER, undefined, { diverted: people[0]!.phone, legId: 'during-long-call' })).toBeUndefined();
    now = acceptedAt + 3600_000; await cc.sweep();
    expect((await cc.call(c.id))?.state).toBe('ended');
    expect((await db.doc('sharedCapacity/calls').get()).data()?.leases[c.id]).toBeUndefined();
  });
  it('plays Grace before starting screening, and ignores old TTS completion callbacks', async () => {
    const c = await arrive(0, true);
    await cc.handle(event(c.parentSid, 'call.answered'));
    expect(action).toHaveBeenCalledWith(c.parentSid, 'playback_start', expect.objectContaining({ audio_url: announcementAudio(CAPTURE_GREETING)!.url, audio_type: 'wav' }));
    await cc.handle(event(c.parentSid, 'call.speak.ended', { client_state: provider.state(c.id, 'greeting'), status: 'completed' }));
    expect(action.mock.calls.some(x => x[1] === 'streaming_start')).toBe(false);
    const ended = event(c.parentSid, 'call.playback.ended', { client_state: provider.state(c.id, 'greeting') });
    await cc.handle(ended); await cc.handle(ended);
    expect(action.mock.calls.filter(x => x[1] === 'streaming_start')).toHaveLength(1);
  });
  it.each(['failed', 'file_not_found', 'unknown'])('retries a failed Grace greeting once with Joanna (%s), then waits for completion', async status => {
    const c = await arrive(0, true); await cc.handle(event(c.parentSid, 'call.answered'));
    await cc.handle(event(c.parentSid, 'call.playback.ended', { client_state: provider.state(c.id, 'greeting'), status }));
    await cc.handle(event(c.parentSid, 'call.playback.ended', { client_state: provider.state(c.id, 'greeting'), status }));
    expect(action.mock.calls.filter(x => x[1] === 'speak')).toHaveLength(1);
    expect(action).toHaveBeenCalledWith(c.parentSid, 'speak', expect.objectContaining({ payload: CAPTURE_GREETING, voice: ANNOUNCEMENT_BACKUP_VOICE }));
    await cc.handle(event(c.parentSid, 'call.playback.ended', { client_state: provider.state(c.id, 'greeting') }));
    expect(action.mock.calls.some(x => x[1] === 'streaming_start')).toBe(false);
    await cc.handle(event(c.parentSid, 'call.speak.ended', { client_state: provider.state(c.id, 'greeting-backup'), status: 'completed' }));
    expect(action.mock.calls.filter(x => x[1] === 'streaming_start')).toHaveLength(1);
  });
  it('never advances a canceled prompt or an unsuccessful backup', async () => {
    const c = await arrive(0, true); await cc.handle(event(c.parentSid, 'call.answered'));
    await cc.handle(event(c.parentSid, 'call.playback.ended', { client_state: provider.state(c.id, 'greeting'), status: 'cancelled' }));
    expect((await cc.call(c.id))?.state).toBe('ended');
    expect(action.mock.calls.some(x => x[1] === 'speak' || x[1] === 'streaming_start')).toBe(false);
    const other = await arrive(1, true); await cc.handle(event(other.parentSid, 'call.answered'));
    await cc.handle(event(other.parentSid, 'call.playback.ended', { client_state: provider.state(other.id, 'greeting'), status: 'failed' }));
    await cc.handle(event(other.parentSid, 'call.speak.ended', { client_state: provider.state(other.id, 'greeting-backup'), status: 'cancelled_amd' }));
    expect((await cc.call(other.id))?.state).toBe('ended');
    expect(action.mock.calls.some(x => x[1] === 'streaming_start')).toBe(false);
  });
  it('uses Joanna after a definite provider rejection, but retries uncertain playback without switching voices', async () => {
    const c = await arrive(0, true); action.mockRejectedValueOnce(new Error('telnyx_http_422'));
    await cc.handle(event(c.parentSid, 'call.answered'));
    expect(action.mock.calls.filter(x => x[1] === 'speak')).toHaveLength(1);
    const other = await arrive(1, true), answer = event(other.parentSid, 'call.answered');
    action.mockRejectedValueOnce(new Error('timeout'));
    await expect(cc.handle(answer)).rejects.toThrow('timeout'); await cc.handle(answer);
    const plays = action.mock.calls.filter(x => x[0] === other.parentSid && x[1] === 'playback_start');
    expect(plays).toHaveLength(2); expect(plays[0]![2].command_id).toBe(plays[1]![2].command_id);
    expect(action.mock.calls.filter(x => x[1] === 'speak')).toHaveLength(1);
  });
  it('waits for the Joanna hold disclosure before dialing after Grace fails', async () => {
    const c = await arrive(), live = new ForwardingLive(f); await live.claim(c.id); await live.finish(c.id, approve); await cc.outcome(c.id);
    await cc.handle(event(c.parentSid, 'call.playback.ended', { client_state: provider.state(c.id, 'offer'), status: 'file_not_found' }));
    await cc.handle(event(c.parentSid, 'call.playback.ended', { client_state: provider.state(c.id, 'offer') }));
    expect(request).not.toHaveBeenCalled();
    await cc.handle(event(c.parentSid, 'call.speak.ended', { client_state: provider.state(c.id, 'offer-backup'), status: 'completed' }));
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('cannot accept a late primary gather after falling back, and still requires press 1 on the bound recipient', async () => {
    const c = await offer(), child = c.childSid!; await cc.handle(event(child, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
    await cc.handle(event(child, 'call.playback.ended', { client_state: provider.state(c.id, 'accept'), status: 'failed' }));
    expect(action).toHaveBeenCalledWith(child, 'gather_using_speak', expect.objectContaining({ voice: ANNOUNCEMENT_BACKUP_VOICE, minimum_digits: 1, maximum_digits: 1 }));
    await cc.handle(event(child, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }));
    await cc.handle(event(c.parentSid, 'call.gather.ended', { client_state: provider.state(c.id, 'accept-backup'), digits: '1' }));
    await cc.handle(event(child, 'call.gather.ended', { client_state: provider.state(c.id, 'accept-backup'), digits: '1', status: 'cancelled' }));
    expect(action.mock.calls.some(x => x[1] === 'bridge')).toBe(false);
    await cc.handle(event(child, 'call.gather.ended', { client_state: provider.state(c.id, 'accept-backup'), digits: '1' }));
    expect(action.mock.calls.filter(x => x[1] === 'bridge')).toHaveLength(1);
  });
  it('preserves a legitimate keypad interruption of Grace and the no-tone captured voicemail prompt', async () => {
    const c = await offer(), child = c.childSid!; await cc.handle(event(child, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
    await cc.handle(event(child, 'call.playback.ended', { client_state: provider.state(c.id, 'accept'), status: 'cancelled' }));
    await cc.handle(event(child, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '2' }));
    expect(action).toHaveBeenCalledWith(c.parentSid, 'playback_start', expect.objectContaining({ audio_url: announcementAudio(CAPTURE_VOICEMAIL)!.url }));
    expect(action.mock.calls.some(x => x[1] === 'speak' || x[1] === 'gather_using_speak' || x[1] === 'bridge')).toBe(false);
  });
  it('plays the monitoring warning with Grace, with Joanna only after media failure', async () => {
    const c = await offer(); await cc.handle(event(c.childSid!, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
    await cc.handle(event(c.childSid!, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }));
    const warningAction = vi.spyOn(CallControlProvider.prototype, 'action').mockResolvedValue({});
    try {
      await new CallMonitor(f).intervene(c.id, 'secrecy');
      expect(warningAction.mock.calls.some(x => x[1] === 'playback_start')).toBe(false);
      await cc.handle(event(c.parentSid, 'call.hangup'));
      await cc.handle(event(c.childSid!, 'call.hold', { client_state: provider.state(c.id, 'accept') }));
      now += 750; await cc.runJob(callJobId(c.id, 'warning'));
      expect(action).toHaveBeenCalledWith(c.childSid, 'playback_start', expect.objectContaining({ audio_url: announcementAudio(warningText('secrecy'))!.url }));
      expect(warningAction.mock.calls.some(x => x[1] === 'speak')).toBe(false);
      await cc.handle(event(c.childSid!, 'call.playback.ended', { client_state: provider.state(c.id, 'warning'), status: 'file_not_found' }));
      expect(action).toHaveBeenCalledWith(c.childSid, 'speak', expect.objectContaining({ payload: warningText('secrecy'), voice: ANNOUNCEMENT_BACKUP_VOICE }));
      await cc.handle(event(c.childSid!, 'call.speak.ended', { client_state: provider.state(c.id, 'warning-backup'), status: 'completed' }));
      expect(action).toHaveBeenCalledWith(c.childSid, 'hangup', expect.anything());
    } finally { warningAction.mockRestore(); }
  });
  it('preserves warning receipts and fallback while the caller hangup holds the call executor', async () => {
    const c = await offer(); await cc.handle(event(c.childSid!, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
    await cc.handle(event(c.childSid!, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }));
    const warningAction = vi.spyOn(CallControlProvider.prototype, 'action').mockResolvedValue({});
    try {
      await new CallMonitor(f).intervene(c.id, 'secrecy');
      expect((await db.doc(`callControlJobs/${callJobId(c.id, 'deadline', now + 30_000)}`).get()).exists).toBe(true);
      await cc.exclusive(c.id, async () => {
        await cc.handle(event(c.childSid!, 'call.playback.started', { client_state: provider.state(c.id, 'warning') }));
        expect((await cc.call(c.id))?.monitorWarningStartedAt).toBe(now);
        const failure = event(c.childSid!, 'call.playback.ended', { client_state: provider.state(c.id, 'warning'), status: 'file_not_found' });
        await cc.handle(failure); await cc.handle(failure);
        expect(action.mock.calls.filter(x => x[1] === 'speak')).toHaveLength(1);
        const ended = event(c.childSid!, 'call.speak.ended', { client_state: provider.state(c.id, 'warning-backup'), status: 'completed' });
        await cc.handle(event(c.childSid!, 'call.playback.ended', { client_state: provider.state(c.id, 'warning') }));
        expect(action.mock.calls.filter(x => x[0] === c.childSid && x[1] === 'hangup')).toHaveLength(0);
        await cc.handle(ended); await cc.handle(ended);
        expect((await cc.call(c.id))?.monitorWarningCompletedAt).toBe(now);
        expect(action.mock.calls.filter(x => x[0] === c.childSid && x[1] === 'hangup')).toHaveLength(1);
      });
    } finally { warningAction.mockRestore(); }
  });
  it('queues one warning only after both bound legs confirm separation, even during executor contention', async () => {
    const c = await offer(); await cc.handle(event(c.childSid!, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
    await cc.handle(event(c.childSid!, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }));
    const hangup = vi.spyOn(CallControlProvider.prototype, 'action').mockResolvedValue({});
    try {
      await new CallMonitor(f).intervene(c.id, 'secrecy'); action.mockClear();
      expect(await cc.call(c.id)).toMatchObject({ state: 'accepted', monitorWarningWaitForPark: true });
      await cc.handle(event(randomUUID(), 'call.hold', { client_state: provider.state(c.id, 'recipient') }));
      expect((await cc.call(c.id))?.monitorRecipientParkedAt).toBeUndefined();
      await cc.exclusive(c.id, async () => {
        await cc.handle(event(c.childSid!, 'call.hold', { client_state: provider.state(c.id, 'accept') }));
        await cc.handle(event(c.childSid!, 'call.hold', { client_state: provider.state(c.id, 'accept') }));
      });
      expect((await db.doc(`callControlJobs/${callJobId(c.id, 'warning')}`).get()).exists).toBe(false);
      await cc.handle(event(c.parentSid, 'call.hangup'));
      expect(await cc.call(c.id)).toMatchObject({ monitorCallerEndedAt: now, monitorRecipientParkedAt: now, monitorWarningQueuedAt: now + 750 });
      const jobId = callJobId(c.id, 'warning');
      await expect(cc.runJob(jobId)).rejects.toThrow('call_job_not_due');
      now += 749; await expect(cc.runJob(jobId)).rejects.toThrow('call_job_not_due');
      expect(action.mock.calls.some(x => x[1] === 'playback_start')).toBe(false);
      now++; await cc.runJob(jobId); await cc.runJob(jobId);
      expect(action.mock.calls.filter(x => x[1] === 'playback_start')).toHaveLength(1);
    } finally { hangup.mockRestore(); }
  });
  it('does not resurrect warning playback after the recipient hangs up or its cleanup deadline passes', async () => {
    for (const expired of [false, true]) {
      const c = await offer(expired ? 1 : 0); await cc.handle(event(c.childSid!, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
      await cc.handle(event(c.childSid!, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }));
      const hangup = vi.spyOn(CallControlProvider.prototype, 'action').mockResolvedValue({});
      try { await new CallMonitor(f).intervene(c.id, 'secrecy'); } finally { hangup.mockRestore(); }
      await cc.handle(event(c.parentSid, 'call.hangup')); await cc.handle(event(c.childSid!, 'call.hold', { client_state: provider.state(c.id, 'accept') }));
      if (expired) now += 30_000;
      else { await cc.handle(event(c.childSid!, 'call.hangup', { client_state: provider.state(c.id, 'accept') })); now += 750; }
      action.mockClear(); await cc.runJob(callJobId(c.id, 'warning'));
      expect(action.mock.calls.some(x => ['playback_start', 'speak', 'dial', 'bridge'].includes(x[1]))).toBe(false);
    }
  });
  it('records interrupted warning playback without claiming completion or acting on another leg', async () => {
    const c = await offer();
    await s.callRef(c.id).update({ monitorIntervenedAt: now, monitorConcern: 'secrecy' });
    await cc.handle(event(randomUUID(), 'call.playback.started', { client_state: provider.state(c.id, 'warning') }));
    expect((await cc.call(c.id))?.monitorWarningStartedAt).toBeUndefined();
    await s.callRef(c.id).update({ state: 'ended' });
    await cc.handle(event(c.childSid!, 'call.playback.ended', { client_state: provider.state(c.id, 'warning'), status: 'call_hangup' }));
    expect(await cc.call(c.id)).toMatchObject({ monitorWarningInterruptedAt: now });
    expect((await cc.call(c.id))?.monitorWarningCompletedAt).toBeUndefined();
  });
  it('defaults the sound check to Grace and only confirms the active backup gather after failure', async () => {
    const probe = (await new ForwardingProbes(s).reserve(people[0]!.id, 'ring'))!, child = randomUUID();
    await cc.handle(event(child, 'call.initiated', { from: config.TELNYX_NUMBER, to: people[0]!.phone, client_state: provider.state(probe.id, 'probe-ring') }));
    await cc.handle(event(child, 'call.answered', { client_state: provider.state(probe.id, 'probe-ring') }));
    expect(action).toHaveBeenCalledWith(child, 'gather_using_audio', expect.objectContaining({ audio_url: announcementAudio(SOUND_CHECK_MESSAGE)!.url }));
    await cc.handle(event(child, 'call.playback.ended', { client_state: provider.state(probe.id, 'probe-ring'), status: 'failed' }));
    expect(action).toHaveBeenCalledWith(child, 'gather_using_speak', expect.objectContaining({ payload: SOUND_CHECK_MESSAGE, voice: ANNOUNCEMENT_BACKUP_VOICE }));
    await cc.handle(event(child, 'call.gather.ended', { client_state: provider.state(probe.id, 'probe-ring'), digits: '1' }));
    await cc.handle(event(child, 'call.gather.ended', { client_state: provider.state(probe.id, 'probe-ring-backup'), digits: '1', status: 'cancelled' }));
    expect((await f.controlRef(people[0]!.id).get()).data()?.probe.state).toBe('waiting');
    await cc.handle(event(child, 'call.gather.ended', { client_state: provider.state(probe.id, 'probe-ring-backup'), digits: '1' }));
    expect((await f.controlRef(people[0]!.id).get()).data()?.probe.state).toBe('passed');
  });
  it('uses Joanna for a rejected warning audio command, and ends the recipient after its backup finishes', async () => {
    const c = await offer(); await cc.handle(event(c.childSid!, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
    await cc.handle(event(c.childSid!, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }));
    const warningAction = vi.spyOn(CallControlProvider.prototype, 'action').mockImplementation(async (_sid, name) => {
      if (name === 'playback_start') throw new Error('telnyx_http_422');
      return {};
    });
    try {
      await new CallMonitor(f).intervene(c.id, 'remote_access');
      action.mockImplementation(async (_sid, name) => { if (name === 'playback_start') throw new Error('telnyx_http_422'); return {}; });
      await cc.handle(event(c.childSid!, 'call.hold', { client_state: provider.state(c.id, 'accept') }));
      await cc.handle(event(c.parentSid, 'call.hangup'));
      now += 750; await cc.runJob(callJobId(c.id, 'warning'));
      expect(action).toHaveBeenCalledWith(c.childSid, 'speak', expect.objectContaining({ payload: warningText('remote_access'), voice: ANNOUNCEMENT_BACKUP_VOICE }));
      await cc.handle(event(c.childSid!, 'call.speak.ended', { client_state: provider.state(c.id, 'warning-backup'), status: 'completed' }));
      expect(action).toHaveBeenCalledWith(c.childSid, 'hangup', expect.anything());
    } finally { warningAction.mockRestore(); }
  });
  it('records from answer before the greeting, and a saved callback cannot hang up a connected call', async () => {
    const c = await offer();
    expect(action).toHaveBeenCalledWith(c.parentSid, 'answer', expect.objectContaining({ record: 'record-from-answer', record_track: 'inbound', record_max_length: 240 }));
    await cc.handle(event(c.childSid!, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
    await cc.handle(event(c.childSid!, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }));
    const before = action.mock.calls.filter(x => x[1] === 'hangup').length;
    await cc.handle(event(c.parentSid, 'call.recording.saved', { recording_id: randomUUID(), recording_started_at: new Date(now).toISOString(), recording_ended_at: new Date(now + 100_000).toISOString() }));
    expect(action.mock.calls.filter(x => x[1] === 'hangup')).toHaveLength(before);
    expect((await s.db.collection('forwardingRecordings').get()).docs[0]!.data()).toMatchObject({ capture: true, duration: 100 });
  });
  it('never bridges if stopping the temporary capture fails', async () => {
    const c = await offer(); await cc.handle(event(c.childSid!, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
    action.mockImplementation(async (_sid, name) => { if (name === 'record_stop') throw new Error('capture_stop_failed'); return {}; });
    await expect(cc.handle(event(c.childSid!, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }))).rejects.toThrow('capture_stop_failed');
    expect(action.mock.calls.filter(x => x[1] === 'bridge')).toHaveLength(0);
  });
  it('saves a notice outcome even when the recording hangs up first, without offering a live call', async () => {
    const c = await arrive(), live = new ForwardingLive(f); await live.claim(c.id);
    await cc.handle(event(c.parentSid, 'call.hangup'));
    await live.finish(c.id, { ...approve, action: 'message', reason: 'unclear' });
    expect((await cc.call(c.id))!).toMatchObject({ state: 'ended', outcome: 'voicemail', reason: 'automated_notice' });
    expect(action.mock.calls.some(x => x[1] === 'dial' || x[1] === 'bridge')).toBe(false);
  });
  it('never bridges rejection, silence, the inbound caller’s digit, or another person’s child leg', async () => {
    const a = await offer(0), b = await offer(1);
    await cc.handle(event(a.childSid!, 'call.answered', { client_state: provider.state(a.id, 'recipient') }));
    await cc.handle(event(a.parentSid, 'call.gather.ended', { client_state: provider.state(a.id, 'accept'), digits: '1' }));
    await cc.handle(event(b.childSid!, 'call.gather.ended', { client_state: provider.state(a.id, 'accept'), digits: '1' }));
    await cc.handle(event(a.childSid!, 'call.gather.ended', { client_state: provider.state(a.id, 'accept'), digits: '2' }));
    expect(action.mock.calls.filter(x => x[1] === 'bridge')).toHaveLength(0);
    expect((await cc.call(a.id))?.state).toBe('voicemail');
  });
  it('accepts signed raw JSON only from the configured application', async () => {
    const app = Fastify(); registerSignedFormBody(app); await registerCallControl(app, s, provider);
    const e = incoming(randomUUID(), 0), body = JSON.stringify({ data: e }), timestamp = String(now / 1000);
    const headers = { 'content-type': 'application/json', 'telnyx-timestamp': timestamp, 'telnyx-signature-ed25519': sign(null, Buffer.from(`${timestamp}|${body}`), keys.privateKey).toString('base64') };
    expect((await app.inject({ method: 'POST', url: '/voice/shared', headers, payload: body + ' ' })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/voice/shared', headers, payload: body })).statusCode).toBe(200);
    const wrong = JSON.stringify({ data: { ...e, payload: { ...e.payload, connection_id: config.TELNYX_APPLICATION_ID } } });
    headers['telnyx-signature-ed25519'] = sign(null, Buffer.from(`${timestamp}|${wrong}`), keys.privateKey).toString('base64');
    expect((await app.inject({ method: 'POST', url: '/voice/shared', headers, payload: wrong })).statusCode).toBe(403); await app.close();
  });
  it('handles hangup before initiation and never resurrects the call', async () => {
    const sid = randomUUID(); await cc.handle(event(sid, 'call.hangup')); await cc.handle(incoming(sid, 0));
    expect(await f.find(sid)).toBeUndefined(); expect(action).not.toHaveBeenCalled();
  });
  it('retries an uncertain answer with the same command id, but never redials an uncertain outbound call', async () => {
    const sid = randomUUID(), init = incoming(sid, 0); action.mockRejectedValueOnce(new Error('timeout'));
    await cc.handle(init); const bound = (await f.find(sid))!;
    await expect(cc.runJob(callJobId(bound.id, 'start'))).rejects.toThrow('timeout'); await cc.runJob(callJobId(bound.id, 'start'));
    expect(action.mock.calls[0]![2].command_id).toBe(action.mock.calls[1]![2].command_id);
    request.mockRejectedValue(new Error('timeout'));
    const c = (await f.find(sid))!, live = new ForwardingLive(f); await live.claim(c.id); await live.finish(c.id, approve); await cc.outcome(c.id);
    const e = event(sid, 'call.playback.ended', { client_state: provider.state(c.id, 'offer') });
    await cc.handle(e); await cc.handle(e); expect(request).toHaveBeenCalledTimes(1); expect((await cc.call(c.id))?.state).toBe('voicemail');
  });
  it('sweeps a crashed screening session without releasing capacity before successful hangup', async () => {
    const c = await arrive(0, true); now += 91_000; action.mockRejectedValueOnce(new Error('network_down'));
    await expect(cc.sweep()).rejects.toThrow('shared_cleanup_incomplete'); expect((await cc.call(c.id))?.state).toBe('screening');
    now += 500_000;
    expect(await f.begin(randomUUID(), config.TELNYX_NUMBER, undefined, { diverted: people[0]!.phone, legId: 'while-uncertain' })).toBeUndefined();
    expect((await db.doc('sharedCapacity/calls').get()).data()?.leases[c.id]).toBeDefined();
    await cc.sweep(); expect((await cc.call(c.id))?.state).toBe('ended');
    expect((await db.doc('sharedCapacity/calls').get()).data()?.leases[c.id]).toBeUndefined();
  });
  it('qualifies two simultaneous forwarding checks independently, never using another senior’s nonce', async () => {
    const probes = new ForwardingProbes(s), shared = new SharedProbes(s, provider);
    const a = (await probes.reserve(people[0]!.id, 'forwarding'))!, b = (await probes.reserve(people[1]!.id, 'forwarding'))!;
    await routeRef(s, config.TELNYX_NUMBER, people[0]!.phone).update({ enabled: false });
    await Promise.all([shared.start(a.id, config.TELNYX_NUMBER, people[0]!.phone), shared.start(b.id, config.TELNYX_NUMBER, people[1]!.phone)]);
    const outA = randomUUID(), outB = randomUUID(), inA = randomUUID(), inB = randomUUID();
    for (const [probe, n, sid] of [[a, 0, outA], [b, 1, outB]] as const) await cc.handle(event(sid, 'call.initiated', { direction: 'outgoing', from: config.TELNYX_NUMBER, to: people[n]!.phone, client_state: provider.state(probe.id, 'probe-forwarding') }));
    await cc.handle(incoming(inA, 0, { from: config.TELNYX_NUMBER })); await cc.handle(incoming(inB, 1, { from: config.TELNYX_NUMBER }));
    await cc.handle(event(inA, 'call.gather.ended', { client_state: provider.state(a.id, 'probe-inbound'), digits: b.nonce }));
    expect((await f.controlRef(people[0]!.id).get()).data()?.probe.state).toBe('waiting');
    await cc.handle(event(inB, 'call.gather.ended', { client_state: provider.state(b.id, 'probe-inbound'), digits: b.nonce }));
    expect((await f.controlRef(people[1]!.id).get()).data()?.probe.state).toBe('passed');
    expect((await routeRef(s, config.TELNYX_NUMBER, people[0]!.phone).get()).data()?.enabled).toBe(false);
    expect(action.mock.calls.some(x => x[1] === 'bridge')).toBe(false);
  });
  it('revoking a route or changing its verified phone prevents a pending offer from being accepted', async () => {
    const c = await offer(); await cc.handle(event(c.childSid!, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
    await routeRef(s, config.TELNYX_NUMBER, people[0]!.phone).update({ enabled: false });
    await cc.handle(event(c.childSid!, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }));
    expect(action.mock.calls.some(x => x[1] === 'bridge')).toBe(false);
  });
  it('does not let an in-flight forwarding check undo an operator revocation', async () => {
    const probes = new ForwardingProbes(s), probe = (await probes.reserve(people[0]!.id, 'forwarding'))!;
    const out = randomUUID(), incomingSid = randomUUID();
    await probes.outbound(probe.id, out); await probes.incoming(incomingSid, people[0]!.id);
    await routeRef(s, config.TELNYX_NUMBER, people[0]!.phone).update({ enabled: false, disabledAt: now, version: randomUUID() });
    await cc.handle(event(incomingSid, 'call.gather.ended', { client_state: provider.state(probe.id, 'probe-inbound'), digits: probe.nonce }));
    expect((await routeRef(s, config.TELNYX_NUMBER, people[0]!.phone).get()).data()?.enabled).toBe(false);
  });
  it('keeps the slot when the caller hangs up but recipient termination is uncertain', async () => {
    const c = await offer(), hangup = event(c.parentSid, 'call.hangup');
    action.mockRejectedValueOnce(new Error('network_down'));
    await expect(cc.handle(hangup)).rejects.toThrow('network_down');
    expect((await db.doc('sharedCapacity/calls').get()).data()?.leases[c.id]).toBeDefined();
    await cc.handle(hangup);
    expect((await cc.call(c.id))?.state).toBe('ended');
    expect((await db.doc('sharedCapacity/calls').get()).data()?.leases[c.id]).toBeUndefined();
  });
  it.each([false, true])('recovers failed media with a held executor lock (bridge claimed: %s)', async claimed => {
    const c = await arrive(), live = new ForwardingLive(f);
    if (claimed) await live.claim(c.id);
    await cc.exclusive(c.id, async () => {
      const failed = event(c.parentSid, 'streaming.failed');
      await cc.handle(failed); await cc.handle(failed);
      const next = await cc.call(c.id);
      expect(next).toMatchObject({ state: 'voicemail', reason: 'screening_unavailable' });
      expect(next?.events.filter(e => e.kind === 'voicemail_offered')).toHaveLength(1);
      expect(await live.claim(c.id)).toBeUndefined();
      expect(action.mock.calls.filter(x => x[1] === 'playback_start')).toHaveLength(1);
      expect(action.mock.calls.some(x => x[1] === 'hangup' || x[1] === 'bridge')).toBe(false);
      expect((await db.doc('sharedCapacity/calls').get()).data()?.leases[c.id]).toBeDefined();
    });
  });
  it('retries failed recovery without repeating a successful voicemail command', async () => {
    const c = await arrive(), failed = event(c.parentSid, 'streaming.failed');
    action.mockRejectedValueOnce(new Error('network_down'));
    await expect(cc.handle(failed)).rejects.toThrow('network_down');
    await cc.handle(failed); await cc.handle(event(c.parentSid, 'streaming.stopped'));
    const plays = action.mock.calls.filter(x => x[1] === 'playback_start');
    expect(plays).toHaveLength(2);
    expect(plays[0]![2].command_id).toBe(plays[1]![2].command_id);
    expect((await cc.call(c.id))?.state).toBe('voicemail');
  });
  it('releases an unconnected hangup during a stalled outcome and admits the next caller', async () => {
    const c = await arrive(), live = new ForwardingLive(f);
    await live.claim(c.id); await live.finish(c.id, 'screening_unavailable');
    let release!: () => void, entered!: () => void;
    const started = new Promise<void>(r => { entered = r; });
    action.mockImplementation(async (_sid, name) => {
      if (name === 'streaming_stop') { entered(); await new Promise<void>(r => { release = r; }); }
      return {};
    });
    const outcome = cc.outcome(c.id);
    await started;
    try {
      const hangup = event(c.parentSid, 'call.hangup');
      await cc.handle(hangup); await cc.handle(hangup);
      expect((await cc.call(c.id))?.state).toBe('ended');
      expect((await db.doc('sharedCapacity/calls').get()).data()?.leases[c.id]).toBeUndefined();
      const next = await arrive();
      expect(next.state).toBe('screening');
      await cc.handle(hangup);
      expect((await f.controlRef(next.participantId).get()).data()?.activeCallId).toBe(next.id);
    } finally { release(); await outcome; }
    expect(action.mock.calls.some(x => x[1] === 'playback_start' || x[1] === 'bridge')).toBe(false);
  });
  it('persists a recording callback despite a held executor lock', async () => {
    const c = await arrive(), recording = randomUUID();
    await cc.exclusive(c.id, async () => {
      const saved = event(c.parentSid, 'call.recording.saved', { recording_id: recording,
        recording_started_at: new Date(now).toISOString(), recording_ended_at: new Date(now + 5000).toISOString() });
      await cc.handle(saved); await cc.handle(saved);
      expect((await db.collection('forwardingRecordings').doc(recording).get()).data()).toMatchObject({ callId: c.id, duration: 5 });
    });
  });
  it('still terminates a completed saved notice without mistaking its decision for a carrier hangup', async () => {
    const c = await arrive(), live = new ForwardingLive(f); await live.claim(c.id);
    await live.finish(c.id, { ...approve, action: 'message' });
    expect((await cc.call(c.id))?.state).toBe('ended');
    await cc.outcome(c.id);
    expect(action).toHaveBeenCalledWith(c.parentSid, 'hangup', expect.anything());
  });
  it('ignores stale media failure after an offer or acceptance and rejects another inbound leg', async () => {
    const c = await offer();
    await cc.handle(event(c.parentSid, 'streaming.failed'));
    expect((await cc.call(c.id))?.state).toBe('offering');
    await cc.handle(event(c.childSid!, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
    await cc.handle(event(c.childSid!, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }));
    const before = action.mock.calls.length;
    await cc.handle(event(c.parentSid, 'streaming.stopped'));
    expect((await cc.call(c.id))?.state).toBe('accepted');
    expect(action.mock.calls).toHaveLength(before);
    expect(await f.unconnectedHangup(c.id, c.parentSid, c.parentLegId!)).toBeUndefined();
    const other = await arrive(1);
    await cc.handle(event(other.parentSid, 'streaming.failed', { call_leg_id: 'wrong-leg' }));
    await cc.handle(event(other.parentSid, 'call.hangup', { call_leg_id: 'wrong-leg' }));
    expect((await cc.call(other.id))?.state).toBe('screening');
  });
  it('keeps ringing during preparation and does not invite speech until the actual recognizer is ready', async () => {
    const sid = randomUUID(); await cc.handle(incoming(sid, 0)); const c = (await f.find(sid))!;
    expect(action).not.toHaveBeenCalled();
    expect((await db.doc(`callControlJobs/${callJobId(c.id, 'start')}`).get()).exists).toBe(true);
    await cc.runJob(callJobId(c.id, 'start'));
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith(sid, 'answer', expect.objectContaining({ stream_url: expect.stringContaining(`/media/${c.id}/`), record: 'record-from-answer' }));
    await cc.handle(event(sid, 'call.answered')); await cc.handle(event(sid, 'streaming.started'));
    expect(action.mock.calls.some(x => x[1] === 'playback_start')).toBe(false);
    await new ForwardingLive(f).claim(c.id); await cc.screeningReady(c.id); await cc.screeningReady(c.id);
    await cc.runJob(callJobId(c.id, 'greet')); await cc.runJob(callJobId(c.id, 'greet'));
    expect(action.mock.calls.filter(x => x[1] === 'playback_start')).toHaveLength(1);
    expect((await cc.call(c.id))?.greetingCompletedAt).toBeUndefined();
    await cc.handle(event(sid, 'call.playback.ended', { client_state: provider.state(c.id, 'greeting') }));
    expect((await cc.call(c.id))?.greetingCompletedAt).toBe(now);
    expect(action.mock.calls.some(x => x[1] === 'streaming_start')).toBe(false);
  });
  it('recovers admission even if the webhook process dies before any startup work', async () => {
    const sid = randomUUID(), c = (await f.begin(sid, config.TELNYX_NUMBER, '+12025550888', { diverted: people[0]!.phone, legId: `leg-${sid}` }))!;
    const deadline = (await db.doc(`callControlDeadlines/${c.id}`).get()).data()!;
    expect(deadline.dueAt).toBe(now + 20_000);
    now = deadline.dueAt; await cc.runJob(callJobId(c.id, 'deadline', deadline.dueAt));
    expect((await cc.call(c.id))?.state).toBe('ended');
    expect(action).toHaveBeenCalledExactlyOnceWith(sid, 'hangup', expect.anything());
    expect((await arrive()).state).toBe('screening');
  });
  it('ignores hangup before the startup worker and admits a new call immediately', async () => {
    const sid = randomUUID(); await cc.handle(incoming(sid, 0)); const old = (await f.find(sid))!;
    await cc.handle(event(sid, 'call.hangup')); await cc.runJob(callJobId(old.id, 'start'));
    expect(prepare).not.toHaveBeenCalled(); expect(action).not.toHaveBeenCalled();
    const next = await arrive(); expect(next.state).toBe('screening');
    await cc.runJob(callJobId(old.id, 'start'));
    expect((await f.controlRef(next.participantId).get()).data()?.activeCallId).toBe(next.id);
  });
  it('admits the next caller while an old preparation is stuck and ignores its late success', async () => {
    let release!: () => void, entered!: () => void;
    const started = new Promise<void>(r => { entered = r; });
    prepare.mockImplementationOnce(() => { entered(); return new Promise<void>(r => { release = r; }); });
    const sid = randomUUID(); await cc.handle(incoming(sid, 0)); const old = (await f.find(sid))!;
    const preparing = cc.runJob(callJobId(old.id, 'start')); await started;
    try {
      await cc.handle(event(sid, 'call.hangup'));
      const next = await arrive(); expect(next.state).toBe('screening');
      await cc.handle(event(sid, 'call.hangup'));
      expect((await f.controlRef(next.participantId).get()).data()?.activeCallId).toBe(next.id);
    } finally { release(); await preparing; }
    expect(action.mock.calls.some(x => x[0] === sid && x[1] === 'answer')).toBe(false);
  });
  it('offers voicemail after failed preparation and a hangup cannot strand the next call', async () => {
    prepare.mockRejectedValueOnce(new Error('synthetic_startup_timeout'));
    const old = await arrive(); expect(old).toMatchObject({ state: 'voicemail', reason: 'screening_unavailable' });
    const answer = action.mock.calls.find(x => x[1] === 'answer')!; expect(answer[2].stream_url).toBeUndefined();
    await cc.handle(event(old.parentSid, 'call.answered'));
    expect(action).toHaveBeenCalledWith(old.parentSid, 'playback_start', expect.objectContaining({ audio_url: expect.stringContaining('voicemail') }));
    await cc.handle(event(old.parentSid, 'call.hangup'));
    const next = await arrive(); await cc.runJob(callJobId(old.id, 'outcome'));
    expect((await f.controlRef(next.participantId).get()).data()?.activeCallId).toBe(next.id);
  });
  it.each(['before-ready', 'queued-greeting', 'during-greeting'])('releases hangup %s without letting late work affect a new call', async phase => {
    const old = await arrive(), live = new ForwardingLive(f); await live.claim(old.id);
    if (phase !== 'before-ready') await cc.screeningReady(old.id);
    if (phase === 'during-greeting') await cc.runJob(callJobId(old.id, 'greet'));
    await cc.handle(event(old.parentSid, 'call.hangup'));
    const next = await arrive(); const before = action.mock.calls.length;
    await cc.screeningReady(old.id); await cc.runJob(callJobId(old.id, 'greet'));
    await cc.handle(event(old.parentSid, 'call.playback.ended', { client_state: provider.state(old.id, 'greeting') }));
    expect(action.mock.calls).toHaveLength(before);
    expect((await f.controlRef(next.participantId).get()).data()?.activeCallId).toBe(next.id);
  });
  it('retries a failed greeting with the same command and never restarts streaming', async () => {
    const c = await arrive(); await new ForwardingLive(f).claim(c.id); await cc.screeningReady(c.id);
    action.mockRejectedValueOnce(new Error('synthetic_timeout'));
    await expect(cc.runJob(callJobId(c.id, 'greet'))).rejects.toThrow('synthetic_timeout');
    await cc.runJob(callJobId(c.id, 'greet'));
    const plays = action.mock.calls.filter(x => x[1] === 'playback_start');
    expect(plays).toHaveLength(2); expect(plays[0]![2].command_id).toBe(plays[1]![2].command_id);
    expect(action.mock.calls.some(x => x[1] === 'streaming_start')).toBe(false);
  });
  it('recovers a persisted outcome on a fresh worker after the media process disappears', async () => {
    const c = await arrive(), live = new ForwardingLive(f); await live.claim(c.id); await live.finish(c.id, 'screening_unavailable');
    const worker = new SharedCallControl(s, provider, prepare);
    action.mockImplementationOnce(async () => { throw new Error('synthetic_stream_stop_failure'); });
    await worker.runJob(callJobId(c.id, 'outcome')); await worker.runJob(callJobId(c.id, 'outcome'));
    expect(action.mock.calls.filter(x => x[1] === 'playback_start')).toHaveLength(1);
    await worker.handle(event(c.parentSid, 'call.hangup')); expect((await arrive()).state).toBe('screening');
  });
  it('persists recovery even when all media-failure webhook attempts fail', async () => {
    const c = await arrive(); action.mockImplementation(async (_sid, name) => { if (name === 'playback_start') throw new Error('synthetic_down'); return {}; });
    const failed = event(c.parentSid, 'streaming.failed');
    for (let i = 0; i < 3; i++) await expect(cc.handle(failed)).rejects.toThrow('synthetic_down');
    action.mockResolvedValue({}); await new SharedCallControl(s, provider, prepare).runJob(callJobId(c.id, 'outcome'));
    expect((await cc.call(c.id))?.state).toBe('voicemail');
    await cc.handle(event(c.parentSid, 'call.hangup')); expect((await arrive()).state).toBe('screening');
  });
  it('uses the durable startup deadline when no media or failed-stream webhook arrives', async () => {
    const c = await arrive(), deadline = (await db.doc(`callControlDeadlines/${c.id}`).get()).data()!;
    now = deadline.dueAt; await cc.runJob(callJobId(c.id, 'deadline', deadline.dueAt));
    expect((await cc.call(c.id))?.state).toBe('voicemail');
    await cc.runJob(callJobId(c.id, 'outcome'));
    const fallback = (await db.doc(`callControlDeadlines/${c.id}`).get()).data()!;
    now = fallback.dueAt; await cc.runJob(callJobId(c.id, 'deadline', fallback.dueAt));
    expect((await cc.call(c.id))?.state).toBe('ended'); expect((await arrive()).state).toBe('screening');
  });
  it('never releases capacity for an unconfirmed timeout hangup and retries it independently', async () => {
    const c = await arrive(); await s.callRef(c.id).update({ greetingCompletedAt: now });
    const deadline = (await db.doc(`callControlDeadlines/${c.id}`).get()).data()!; now = deadline.dueAt;
    action.mockRejectedValueOnce(new Error('synthetic_hangup_failure'));
    await expect(cc.runJob(callJobId(c.id, 'deadline', deadline.dueAt))).rejects.toThrow('synthetic_hangup_failure');
    expect((await f.controlRef(c.participantId).get()).data()?.activeCallId).toBe(c.id);
    await cc.runJob(callJobId(c.id, 'deadline', deadline.dueAt)); expect((await arrive()).state).toBe('screening');
  });
  it('discards an obsolete deadline and a delayed outcome once the recipient has accepted', async () => {
    const c = await offer(); const old = (await db.doc(`callControlDeadlines/${c.id}`).get()).data()!;
    await cc.handle(event(c.childSid!, 'call.answered', { client_state: provider.state(c.id, 'recipient') }));
    await cc.handle(event(c.childSid!, 'call.gather.ended', { client_state: provider.state(c.id, 'accept'), digits: '1' }));
    const before = action.mock.calls.length; now = old.dueAt;
    await cc.runJob(callJobId(c.id, 'deadline', old.dueAt)); await cc.runJob(callJobId(c.id, 'outcome'));
    expect((await cc.call(c.id))?.state).toBe('accepted'); expect(action.mock.calls).toHaveLength(before);
  });
  it('deduplicates queue delivery but propagates dispatch failures for durable retry', async () => {
    const c = await arrive(), id = callJobId(c.id, 'deadline', now + 25_000);
    const queue = { enqueue: vi.fn().mockRejectedValueOnce(new Error('synthetic_queue_down')).mockResolvedValue(undefined) };
    await expect(dispatchCallJob(s, id, queue)).rejects.toThrow('synthetic_queue_down');
    await dispatchCallJob(s, id, queue); await dispatchCallJob(s, id, queue);
    expect(queue.enqueue.mock.calls[1]![1]).toEqual(queue.enqueue.mock.calls[2]![1]);
    queue.enqueue.mockRejectedValue({ code: 'functions/task-already-exists' });
    await expect(dispatchCallJob(s, id, queue)).resolves.toBeUndefined();
  });
  it('does not admit disabled or unverified routes', async () => {
    await routeRef(s, config.TELNYX_NUMBER, people[0]!.phone).update({ enabled: false });
    expect(await f.begin(randomUUID(), config.TELNYX_NUMBER, undefined, { diverted: people[0]!.phone, legId: 'x' })).toBeUndefined();
    await s.personRef(people[1]!.id).update({ phoneVerifiedAt: null });
    expect(await f.begin(randomUUID(), config.TELNYX_NUMBER, undefined, { diverted: people[1]!.phone, legId: 'y' })).toBeUndefined();
  });
});
