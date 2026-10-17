import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { generateKeyPairSync, sign } from 'node:crypto';
import { CloudStore } from '../src/cloud/store.js';
import { afterScreening, ForwardingLive } from '../src/cloud/forwarding-live.js';
import { centralDay, DAILY_LIMITS, ForwardingStore } from '../src/cloud/forwarding-store.js';
import { cloudSchema } from '../src/cloud/config.js';
import { buildCloudApp } from '../src/cloud/app.js';
import type { AuthProvider } from '../src/auth.js';
import { enroll } from './enroll.js';

// Ten-person pilot invariants: a call on A's number only ever dials A's verified phone from A's Shield number.
describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('Several people on their own Shield numbers (Firestore emulator)', () => {
  const project = 'demo-shield-pilot';
  const keys = generateKeyPairSync('ed25519');
  const config = cloudSchema.parse({ FIREBASE_WEB_API_KEY: 'test', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app',
    TRIAL_PROXY_SECRET: 'c'.repeat(64), DATA_ENCRYPTION_KEY: 'd'.repeat(64), LIVE_SCREENING_ENABLED: true, LIVE_BRIDGE_URL: 'https://shield-live-test.a.run.app',
    TELNYX_ACCOUNT_ID: 'fe8d2922-2dcf-4461-87bc-17a539688c31', TELNYX_API_KEY: 'test'.repeat(8), TELNYX_APPLICATION_ID: '123456789012345678',
    TELNYX_PUBLIC_KEY: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64') });
  const A = { id: 'a0a7af93-72ad-431d-9708-f1d9564a2b36', uid: 'alice', phone: '+12025550101', shieldNumber: '+15125550111' };
  const B = { id: 'b0b7af93-72ad-431d-9708-f1d9564a2b36', uid: 'bob', phone: '+12025550201', shieldNumber: '+15125550222' };
  const caller = '+12025550102';
  const admin = initializeApp({ projectId: project }, 'pilot-tests'), db = getFirestore(admin);
  const sid = (n: number) => `10123456-1234-4321-1234-${n.toString(16).padStart(12, '0')}`;
  const approve = { action: 'approve', reason: 'routine', purpose: 'personal', evidence: 'lunch tomorrow', hasName: true, hasReason: true } as const;
  const auth: AuthProvider = { async identify(token) { return { subject: token }; }, async requestCode() {}, async verifyCode() { return {}; }, async refresh() { return {}; }, async logout() {}, async deleteAccount() {} };
  const startProbe = vi.fn<(id: string, from: string, to: string) => Promise<void>>();
  let now: number, s: CloudStore, f: ForwardingStore, app: Awaited<ReturnType<typeof buildCloudApp>>;
  const inbound = new Map<string, { from: string; to: string }>();
  const children = new Map<string, { from: string; to: string }>();
  const post = (step: string, params: Record<string, string>) => {
    const payload = new URLSearchParams({ AccountSid: config.TELNYX_ACCOUNT_ID, Direction: 'inbound', ...params }).toString();
    const timestamp = Math.floor(now / 1000).toString();
    return app.inject({ method: 'POST', url: `/forwarding/${config.TRIAL_PROXY_SECRET}/${step}`, payload, headers: { 'content-type': 'application/x-www-form-urlencoded',
      'telnyx-signature-ed25519': sign(null, Buffer.from(`${timestamp}|${payload}`), keys.privateKey).toString('base64'), 'telnyx-timestamp': timestamp } });
  };
  /** A forwarded call from `from` arriving on Shield number `to`. */
  const arrive = (n: number, to: string, from = caller) => { inbound.set(sid(n), { from, to }); return post('inbound', { CallSid: sid(n), From: from, To: to }); };
  const screenAndOffer = async (n: number) => {
    const call = (await f.find(sid(n)))!, live = new ForwardingLive(f);
    await live.claim(call.id); await live.finish(call.id, approve);
    return { call, offer: (await post('result', { CallSid: sid(n), From: caller, To: '' })).body };
  };
  beforeEach(async () => {
    if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST!)) throw new Error('Local emulator required');
    await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: 'DELETE' });
    inbound.clear(); children.clear(); startProbe.mockReset().mockResolvedValue(undefined);
    now = Date.UTC(2026, 9, 12, 17); s = new CloudStore(db, config, () => now);
    f = await enroll(s, { ...A, now, name: 'Alice' }); await enroll(s, { ...B, now, name: 'Bob' });
    app = await buildCloudApp(s, { auth, warmLiveBridge: () => {}, startForwardingProbe: startProbe,
      lookupForwardingInbound: async callSid => ({ ...inbound.get(callSid)!, status: 'in-progress', direction: 'inbound' }),
      lookupForwardingChild: async callSid => ({ ...children.get(callSid)!, status: 'in-progress' }) });
  });
  afterEach(async () => { await app.close(); });
  afterAll(async () => { await db.terminate(); await deleteApp(admin); });

  it('screens two people\'s overlapping calls at once and dials each only to their own phone', async () => {
    expect((await arrive(1, A.shieldNumber)).body).toContain('<Stream');
    expect((await arrive(2, B.shieldNumber)).body).toContain('<Stream');
    const a = await screenAndOffer(1), b = await screenAndOffer(2);
    expect(a.call.participantId).toBe(A.id); expect(b.call.participantId).toBe(B.id);
    expect(a.offer).toContain(`callerId="${A.shieldNumber}"`); expect(a.offer).toContain(`>${A.phone}</Number>`); expect(a.offer).not.toContain(B.phone);
    expect(b.offer).toContain(`callerId="${B.shieldNumber}"`); expect(b.offer).toContain(`>${B.phone}</Number>`); expect(b.offer).not.toContain(A.phone);
  });
  it('binds and accepts only the person\'s own leg: B\'s phone can never pick up A\'s call', async () => {
    await arrive(1, A.shieldNumber); const { call } = await screenAndOffer(1);
    // A leg to the wrong phone, or from the wrong Shield number, never binds.
    await post(`child/${call.id}`, { CallSid: sid(9), ParentCallSid: sid(1), From: A.shieldNumber, To: B.phone, CallStatus: 'ringing' });
    await post(`child/${call.id}`, { CallSid: sid(9), ParentCallSid: sid(1), From: B.shieldNumber, To: A.phone, CallStatus: 'ringing' });
    expect((await f.find(sid(1)))!.childSid).toBeUndefined();
    await post(`child/${call.id}`, { CallSid: sid(8), ParentCallSid: sid(1), From: A.shieldNumber, To: A.phone, CallStatus: 'ringing' });
    children.set(sid(8), { from: B.shieldNumber, to: B.phone });
    expect((await post(`whisper/${call.id}`, { CallSid: sid(8) })).body).toContain('<Hangup');
    children.set(sid(8), { from: A.shieldNumber, to: A.phone });
    expect((await post(`whisper/${call.id}`, { CallSid: sid(8) })).body).toContain('/offer-personal.wav');
    expect((await post(`accept/${call.id}`, { CallSid: sid(8), Digits: '1' })).body).not.toContain('<Hangup');
    expect((await f.find(sid(1)))!.acceptedAt).toBe(now);
  });
  it('keeps each person\'s contacts, pause and one-call-at-a-time to themselves', async () => {
    await s.personRef(A.id).collection('trusted-numbers').add({ phoneHash: s.vault.hash(caller), enabled: true });
    expect((await arrive(1, A.shieldNumber)).body).toContain('<Record');
    expect(await f.find(sid(1))).toMatchObject({ reason: 'known_missed' });
    expect((await arrive(2, B.shieldNumber)).body).toContain('<Stream');
    // B is now busy with one call; a second caller for B gets voicemail, while A is still free.
    expect((await arrive(3, B.shieldNumber, '+12025550103')).body).toContain('<Record');
    expect(await f.find(sid(3))).toMatchObject({ reason: 'busy_guard' });
    await s.personRef(B.id).update({ status: 'paused' });
    expect((await arrive(4, A.shieldNumber, '+12025550104')).body).toContain('<Stream');
  });
  it('answers nothing on an unknown, available or quarantined number', async () => {
    await db.collection('shieldNumbers').doc('+15125550333').set({ state: 'available' });
    await db.collection('shieldNumbers').doc(A.shieldNumber).update({ state: 'quarantine', participantId: null });
    for (const [n, to] of [[1, '+15125550999'], [2, '+15125550333'], [3, A.shieldNumber], [4, 'anonymous']] as const) {
      const xml = (await arrive(n, to)).body;
      expect(xml).not.toContain('<Stream'); expect(xml).not.toContain('<Record'); expect(xml).not.toContain('<Dial');
    }
    expect((await db.collection('callSessions').get()).empty).toBe(true);
    expect((await db.collection('shieldNumbers').doc(A.shieldNumber).get()).data()!.lastCalledAt).toBe(now);
  });
  it('never screens a call from any Shield number, assigned or not (loop guard)', async () => {
    await db.collection('shieldNumbers').doc('+15125550444').set({ state: 'quarantine' });
    await db.collection('shieldNumbers').doc('+15125550555').set({ state: 'service' });
    for (const [n, from] of [[1, B.shieldNumber], [2, '+15125550444'], [3, '+15125550555']] as const) {
      expect((await arrive(n, A.shieldNumber, from)).body).not.toContain('<Stream');
    }
    expect((await db.collection('callSessions').get()).empty).toBe(true);
  });
  it('refuses a number registered to someone else even if a person record names it', async () => {
    await s.personRef(B.id).update({ shieldNumber: A.shieldNumber });
    expect((await arrive(1, A.shieldNumber)).body).toContain('<Stream');
    expect((await f.find(sid(1)))!.participantId).toBe(A.id);
    expect((await arrive(2, B.shieldNumber)).body).not.toContain('<Stream');
  });
  it('sends callers to voicemail past each person\'s daily screening cap, counted on Central time, without touching others', async () => {
    const day = centralDay(now);
    await db.doc(`forwardingUsage/${day}-${A.id}`).set({ participantId: A.id, screened: DAILY_LIMITS.screenedPerPerson, expiresAt: now + 86400_000 });
    expect((await arrive(1, A.shieldNumber)).body).toContain('<Record');
    expect(await f.find(sid(1))).toMatchObject({ state: 'voicemail', reason: 'limit_reached' });
    expect((await arrive(2, B.shieldNumber)).body).toContain('<Stream');
    await db.doc(`forwardingUsage/${day}`).set({ calls: 3, screened: DAILY_LIMITS.screenedTotal, blocked: 0, expiresAt: now + 86400_000 });
    await f.ended(sid(2));
    expect((await arrive(3, B.shieldNumber, '+12025550105')).body).toContain('<Record');
    await db.doc(`forwardingUsage/${day}`).update({ calls: DAILY_LIMITS.callsTotal });
    expect((await arrive(4, B.shieldNumber, '+12025550106')).body).not.toContain('<Record');
    // At 6 p.m. Central the UTC date has already turned over, but the pilot's day hasn't.
    expect(centralDay(Date.UTC(2026, 9, 13, 0, 30))).toBe('2026-10-12');
  });
  it('screens around the clock once always-on, without using a test window', async () => {
    await f.controlRef(A.id).update({ enabled: false });
    expect((await arrive(1, A.shieldNumber)).body).toContain('<Record');
    await f.ended(sid(1));
    await s.personRef(A.id).update({ alwaysOn: true });
    expect((await arrive(2, A.shieldNumber)).body).toContain('<Stream');
    expect(await f.find(sid(2))).toMatchObject({ admittedBy: 'always' });
    const { offer } = await screenAndOffer(2);
    expect(offer).toContain('<Dial'); expect((await f.controlRef(A.id).get()).data()!.used).toBe(0);
  });
  it('sends an approved always-on caller to voicemail in quiet hours, but a supervised test window still rings', async () => {
    now = Date.UTC(2026, 9, 13, 4); // 11 p.m. Central
    await s.personRef(A.id).update({ alwaysOn: true, quietHours: { enabled: true, start: 21, end: 8 } }); await f.controlRef(A.id).update({ enabled: false });
    await arrive(1, A.shieldNumber);
    const live = new ForwardingLive(f), call = (await f.find(sid(1)))!;
    await live.claim(call.id);
    const saved = await live.finish(call.id, approve);
    expect(saved).toMatchObject({ state: 'voicemail', reason: 'quiet_hours' });
    expect(afterScreening(config, saved)?.Url).toContain(`/voicemail/${call.id}`);
    await f.ended(sid(1));
    await f.controlRef(A.id).update({ enabled: true, expiresAt: now + 1800_000 });
    await arrive(2, A.shieldNumber);
    expect((await screenAndOffer(2)).offer).toContain('<Dial');
    await s.personRef(B.id).update({ alwaysOn: true, quietHours: { enabled: false, start: 21, end: 8 } });
    await f.controlRef(B.id).update({ enabled: false });
    await arrive(3, B.shieldNumber);
    expect((await screenAndOffer(3)).offer).toContain('<Dial');
  });
  it('asks the protection question before a Shield number is assigned, but keeps forwarding setup for enrolled people', async () => {
    const C = { id: 'c0c7af93-72ad-431d-9708-f1d9564a2b36', uid: 'carol' };
    await s.personRef(C.id).set({ id: C.id, ownerUid: C.uid, status: 'setup', nameEnc: s.vault.seal('C', `person:${C.id}:name`), phoneEnc: s.vault.seal('+12025550301', `person:${C.id}:phone`) });
    const as = { authorization: `Bearer ${C.uid}`, 'x-shield-participant': C.id };
    expect((await app.inject({ url: '/api/forwarding/monitoring', headers: as })).json()).toMatchObject({ choiceRecorded: false });
    expect((await app.inject({ method: 'POST', url: '/api/forwarding/monitoring', headers: as, payload: { enabled: false } })).json()).toEqual({ enabled: false });
    expect((await app.inject({ url: '/api/forwarding', headers: as })).statusCode).toBe(403);
    expect((await app.inject({ url: '/api/setup', headers: as })).json()).toMatchObject({ shieldNumber: null });
    expect((await app.inject({ url: '/api/forwarding/monitoring', headers: { authorization: 'Bearer alice', 'x-shield-participant': C.id } })).statusCode).toBe(403);
  });
  it('lets each person set quiet hours, and validates them', async () => {
    const set = (body: unknown, uid = A.uid) => app.inject({ method: 'POST', url: '/api/forwarding/quiet-hours',
      headers: { authorization: `Bearer ${uid}`, 'x-shield-participant': A.id }, payload: body as object });
    expect((await set({ enabled: true, start: 22, end: 7 })).json()).toEqual({ quietHours: { enabled: true, start: 22, end: 7 } });
    expect((await set({ enabled: true, start: 24, end: 7 })).statusCode).toBe(400);
    expect((await set({ enabled: false, start: 22, end: 7 }, B.uid)).statusCode).toBe(403);
    expect((await s.personRef(B.id).get()).data()!.quietHours).toBeUndefined();
  });
  it('sends a call the bridge has no room for to voicemail, never to the person', async () => {
    await arrive(1, A.shieldNumber); const call = (await f.find(sid(1)))!;
    const refused = await new ForwardingLive(f).unavailable(call.id);
    expect(refused).toMatchObject({ state: 'voicemail', reason: 'screening_unavailable' });
    expect(afterScreening(config, refused)?.Url).toContain(`/voicemail/${call.id}`);
    expect(await new ForwardingLive(f).claim(call.id)).toBeUndefined();
    expect((await post('result', { CallSid: sid(1) })).body).not.toContain('<Dial');
  });
  it('runs each person\'s phone tests between their own Shield number and phone only', async () => {
    const start = (uid: string, id: string) => app.inject({ method: 'POST', url: '/api/forwarding/probe',
      headers: { authorization: `Bearer ${uid}`, 'x-shield-participant': id }, payload: { kind: 'ring' } });
    await start(B.uid, B.id);
    expect(startProbe).toHaveBeenCalledExactlyOnceWith(expect.any(String), B.shieldNumber, B.phone);
    const probe = (await f.controlRef(B.id).get()).data()!.probe;
    expect((await f.controlRef(A.id).get()).data()!.probe).toBeUndefined();
    expect((await post(`probe/${probe.id}`, { CallSid: sid(5), From: A.shieldNumber, To: A.phone })).body).toContain('<Hangup');
    expect((await post(`probe/${probe.id}`, { CallSid: sid(5), From: B.shieldNumber, To: A.phone })).body).toContain('<Hangup');
    expect((await post(`probe/${probe.id}`, { CallSid: sid(5), From: B.shieldNumber, To: B.phone })).body).toContain('/10-sound-check.wav');
    await post(`probe-confirm/${probe.id}`, { CallSid: sid(5), Digits: '1' });
    expect((await f.controlRef(B.id).get()).data()).toMatchObject({ probe: { state: 'passed' }, ringTestAt: now });
    expect((await start(A.uid, B.id)).statusCode).toBe(403);
  });
  it('shows each person their own number and their carrier\'s codes, and none for an untested carrier', async () => {
    const state = async (person: typeof A) => (await app.inject({ url: '/api/forwarding',
      headers: { authorization: `Bearer ${person.uid}`, 'x-shield-participant': person.id } })).json();
    expect(await state(A)).toMatchObject({ shieldNumber: A.shieldNumber, carrier: 'Tello', carrierVerified: true,
      activationCodes: ['61', '67', '62'].map(code => `**${code}*${A.shieldNumber.slice(1)}#`) });
    await s.personRef(B.id).update({ carrier: 'att' });
    expect(await state(B)).toMatchObject({ shieldNumber: B.shieldNumber, carrier: 'AT&T', carrierVerified: false, activationCodes: [] });
  });
});
