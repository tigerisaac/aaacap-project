import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { generateKeyPairSync, sign } from 'node:crypto';
import { CloudStore } from '../src/cloud/store.js';
import { ForwardingStore } from '../src/cloud/forwarding-store.js';
import { SETUP_CHECK_LIMITS, SETUP_CHECK_MESSAGE, SetupChecks } from '../src/cloud/setup-check.js';
import { cloudSchema } from '../src/cloud/config.js';
import { buildCloudApp } from '../src/cloud/app.js';
import type { AuthProvider } from '../src/auth.js';
import { enroll } from './enroll.js';

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('Daily setup check (Firestore emulator)', () => {
  const project = 'demo-shield-setup-check';
  const keys = generateKeyPairSync('ed25519');
  const CHECK = '+15125550999';
  const base = { FIREBASE_WEB_API_KEY: 'test', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app', TRIAL_PROXY_SECRET: 'c'.repeat(64),
    DATA_ENCRYPTION_KEY: 'd'.repeat(64), LIVE_SCREENING_ENABLED: true, LIVE_BRIDGE_URL: 'https://shield-live-test.a.run.app',
    TELNYX_ACCOUNT_ID: 'fe8d2922-2dcf-4461-87bc-17a539688c31', TELNYX_API_KEY: 'test'.repeat(8), TELNYX_APPLICATION_ID: '123456789012345678',
    TELNYX_PUBLIC_KEY: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64'),
    APNS: { keyId: 'ABCDEF1234', teamId: '6R6HMW3DWN', privateKey: generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() } };
  const A = { id: 'a0a7af93-72ad-431d-9708-f1d9564a2b36', uid: 'alice', phone: '+12025550101', shieldNumber: '+15125550111' };
  const admin = initializeApp({ projectId: project }, 'setup-check-tests'), db = getFirestore(admin);
  const auth: AuthProvider = { async identify(token) { return { subject: token }; }, async requestCode() {}, async verifyCode() { return {}; }, async refresh() { return {}; }, async logout() {} };
  const dial = vi.fn<(id: string, from: string, to: string) => Promise<string | undefined>>();
  let now: number, s: CloudStore, f: ForwardingStore, checks: SetupChecks, app: Awaited<ReturnType<typeof buildCloudApp>>;
  // Whole days keep every check at 10:30 a.m. Central, outside quiet hours.
  const DAY = 24 * 3600_000;
  const sid = (n: number) => `10123456-1234-4321-1234-${n.toString(16).padStart(12, '0')}`;
  const post = (step: string, params: Record<string, string>) => {
    const payload = new URLSearchParams({ AccountSid: base.TELNYX_ACCOUNT_ID, ...params }).toString(), timestamp = Math.floor(now / 1000).toString();
    return app.inject({ method: 'POST', url: `/forwarding/${base.TRIAL_PROXY_SECRET}/${step}`, payload, headers: { 'content-type': 'application/x-www-form-urlencoded',
      'telnyx-signature-ed25519': sign(null, Buffer.from(`${timestamp}|${payload}`), keys.privateKey).toString('base64'), 'telnyx-timestamp': timestamp } });
  };
  const build = async (config: Record<string, unknown> = {}) => {
    s = new CloudStore(db, cloudSchema.parse({ ...base, SETUP_CHECK_NUMBER: CHECK, ...config }), () => now); checks = new SetupChecks(s);
    app = await buildCloudApp(s, { auth, warmLiveBridge: () => {}, startSetupCheck: dial,
      lookupForwardingInbound: async () => ({ from: CHECK, to: A.shieldNumber, status: 'in-progress', direction: 'inbound' }) });
  };
  const result = async (id: string) => (await checks.ref(id).get()).data()!.state;
  const alerts = async () => (await db.collection('alerts').get()).docs.map(d => d.data().kind);
  beforeEach(async () => {
    if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST!)) throw new Error('Local emulator required');
    await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: 'DELETE' });
    dial.mockReset().mockResolvedValue(sid(9));
    now = Date.UTC(2026, 9, 12, 15, 30); // 10:30 a.m. Central
    await build();
    f = await enroll(s, { ...A, now, person: { alwaysOn: true }, control: { enabled: false } });
  });
  afterEach(async () => { await app.close(); });
  afterAll(async () => { await db.terminate(); await deleteApp(admin); });

  it('calls from the check number to the person\'s own phone, once a day, only when always-on and outside quiet hours', async () => {
    const id = (await checks.start(A.id, dial))!;
    expect(dial).toHaveBeenCalledExactlyOnceWith(id, CHECK, A.phone);
    expect(await checks.start(A.id, dial)).toBeUndefined();
    await checks.finish(id, 'passed'); now += DAY;
    const second = (await checks.start(A.id, dial))!; expect(second).toBeDefined();
    await checks.finish(second, 'passed');
    await s.personRef(A.id).update({ alwaysOn: false }); now += DAY;
    expect(await checks.start(A.id, dial)).toBeUndefined();
    await s.personRef(A.id).update({ alwaysOn: true, quietHours: { enabled: true, start: 21, end: 8 } }); now = Date.UTC(2026, 9, 15, 4); // 11 p.m. Central
    expect(await checks.start(A.id, dial)).toBeUndefined();
    await app.close(); await build({ SETUP_CHECK_NUMBER: undefined }); now = Date.UTC(2026, 9, 16, 15, 30);
    expect(await checks.start(A.id, dial)).toBeUndefined();
    expect(dial).toHaveBeenCalledTimes(2);
  });
  it('passes when the call comes straight back through forwarding, and hangs up without screening it', async () => {
    const id = (await checks.start(A.id, dial))!; now += 6000;
    const xml = (await post('inbound', { CallSid: sid(1), From: CHECK, To: A.shieldNumber })).body;
    expect(xml).toContain('<Hangup'); expect(xml).not.toContain('<Stream'); expect(xml).not.toContain('<Record');
    expect(await result(id)).toBe('passed');
    expect((await f.controlRef(A.id).get()).data()!.lastSetupCheck).toMatchObject({ id, result: 'passed', at: now });
    expect((await db.collection('callSessions').get()).empty).toBe(true); expect(await alerts()).toEqual([]);
  });
  it('never lets a late or stray call from the check number vouch for an old check', async () => {
    const id = (await checks.start(A.id, dial))!; now += SETUP_CHECK_LIMITS.staleMs + 1;
    await post('inbound', { CallSid: sid(1), From: CHECK, To: A.shieldNumber });
    expect(await result(id)).toBe('calling');
    await checks.expireStale(); expect(await result(id)).toBe('not_forwarded');
    expect((await db.collection('callSessions').get()).empty).toBe(true);
  });
  it('flags a call that rang her phone first, and alerts', async () => {
    const id = (await checks.start(A.id, dial))!; now += 25_000;
    await post('inbound', { CallSid: sid(1), From: CHECK, To: A.shieldNumber });
    expect(await result(id)).toBe('rang_first'); expect(await alerts()).toEqual(['setup_check_failed']);
  });
  it('speaks the fixed message when her phone answers, and only on the check call\'s own legs', async () => {
    const id = (await checks.start(A.id, dial))!;
    expect((await post(`setup-check/${id}`, { CallSid: sid(9), From: '+12025550188', To: A.phone })).body).not.toContain('Shield check');
    expect((await post(`setup-check/${id}`, { CallSid: sid(9), From: CHECK, To: '+12025550188' })).body).not.toContain('Shield check');
    expect(await result(id)).toBe('calling');
    const xml = (await post(`setup-check/${id}`, { CallSid: sid(9), From: CHECK, To: A.phone })).body;
    expect(xml).toContain(SETUP_CHECK_MESSAGE); expect(xml).toContain('<Hangup');
    expect(await result(id)).toBe('answered'); expect(await alerts()).toEqual(['setup_check_failed']);
  });
  it('stays quiet when the forwarded copy arrived before the answer was reported', async () => {
    const id = (await checks.start(A.id, dial))!; now += 4000;
    await post('inbound', { CallSid: sid(1), From: CHECK, To: A.shieldNumber });
    expect((await post(`setup-check/${id}`, { CallSid: sid(9), From: CHECK, To: A.phone })).body).not.toContain('Shield check');
    expect(await result(id)).toBe('passed');
  });
  it('reports broken forwarding when the call ends without coming back, and records one result only', async () => {
    const id = (await checks.start(A.id, dial))!;
    await post(`setup-check-status/${id}`, { CallSid: sid(9), From: CHECK, To: A.phone, CallStatus: 'no-answer' });
    expect(await result(id)).toBe('not_forwarded');
    await post('inbound', { CallSid: sid(1), From: CHECK, To: A.shieldNumber });
    expect(await result(id)).toBe('not_forwarded'); expect(await alerts()).toEqual(['setup_check_failed']);
  });
  it('counts a failed dial or a lost status as broken forwarding', async () => {
    dial.mockRejectedValueOnce(new Error('telnyx_http_500'));
    const failed = (await checks.start(A.id, dial))!;
    expect(await checks.ref(failed).get().then(d => d.data())).toMatchObject({ state: 'not_forwarded', detail: 'dial_failed' });
    now += DAY;
    const lost = (await checks.start(A.id, dial))!;
    await checks.expireStale(); expect(await result(lost)).toBe('calling');
    now += SETUP_CHECK_LIMITS.staleMs + 1; await checks.expireStale(); expect(await result(lost)).toBe('not_forwarded');
  });
  it('runs from the app at launch when the last check is over a day old, and shows the result', async () => {
    const run = () => app.inject({ method: 'POST', url: '/api/forwarding/setup-check', headers: { authorization: `Bearer ${A.uid}`, 'x-shield-participant': A.id } });
    expect((await run()).json()).toEqual({ started: true });
    const id = (await f.controlRef(A.id).get()).data()!.setupCheck.id; await checks.finish(id, 'passed');
    // 22 hours later (8:30 a.m.): due for the daily run, but the app waits a full day.
    now += 22 * 3600_000; expect((await run()).json()).toEqual({ started: false });
    const state = (await app.inject({ url: '/api/forwarding', headers: { authorization: `Bearer ${A.uid}`, 'x-shield-participant': A.id } })).json();
    expect(state).toMatchObject({ setupCheckNumber: CHECK, lastSetupCheck: { result: 'passed' } });
  });
  it('checks every always-on person in the daily run', async () => {
    const B = { id: 'b0b7af93-72ad-431d-9708-f1d9564a2b36', uid: 'bob', phone: '+12025550201', shieldNumber: '+15125550222' };
    await enroll(s, { ...B, now, control: { enabled: false } });
    await checks.runDaily(dial);
    expect(dial).toHaveBeenCalledExactlyOnceWith(expect.any(String), CHECK, A.phone);
  });
});
