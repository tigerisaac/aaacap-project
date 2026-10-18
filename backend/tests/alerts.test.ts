import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID, generateKeyPairSync } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getShieldFirestore } from '../src/cloud/firestore.js';
import { CloudStore } from '../src/cloud/store.js';
import { cloudSchema, RETENTION_MS } from '../src/cloud/config.js';
import { buildCloudApp } from '../src/cloud/app.js';
import { ALERTS, AlertDelivery, queueAlert, type AlertKind, type PushSender } from '../src/cloud/alerts.js';
import { ForwardingStore, forwardingConsent } from '../src/cloud/forwarding-store.js';
import { CallMonitor } from '../src/cloud/monitoring.js';
import { HttpError, type AuthProvider } from '../src/auth.js';

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('Push alerts (Firestore emulator)', () => {
  const project = 'demo-shield-alerts';
  const base = { FIREBASE_WEB_API_KEY: 'test', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app',
    TRIAL_PROXY_SECRET: 'c'.repeat(64), DATA_ENCRYPTION_KEY: 'd'.repeat(64),
    TELNYX_ACCOUNT_ID: 'fe8d2922-2dcf-4461-87bc-17a539688c31', TELNYX_API_KEY: 'test'.repeat(8), TELNYX_PUBLIC_KEY: `${'A'.repeat(43)}=`,
    TELNYX_APPLICATION_ID: '123456789012345678' };
  const apns = { keyId: 'ABCDEF1234', teamId: '6R6HMW3DWN',
    privateKey: generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() };
  const admin = initializeApp({ projectId: project }, 'alerts-tests'), db = getShieldFirestore(admin);
  const PERSON = 'b0b7af93-72ad-431d-9708-f1d9564a2b36', PHONE = '+12025550101', NUMBER = '+12025550109';
  const id = PERSON;
  const tokens = { owner: 'aa'.repeat(32), helper: 'bb'.repeat(32), viewer: 'cc'.repeat(32) };
  const auth: AuthProvider = {
    async identify(token) { if (!['owner', 'helper', 'viewer', 'stranger'].includes(token)) throw new HttpError(401, 'sign_in_required'); return { subject: token }; },
    async requestCode() {}, async verifyCode() { return {}; }, async refresh() { return {}; }, async logout() {}, async deleteAccount() {}
  };
  let now: number, s: CloudStore, app: Awaited<ReturnType<typeof buildCloudApp>>;
  const sent: { token: string; body: string }[] = [];
  const send = vi.fn<PushSender['send']>();
  const headers = (uid = 'owner') => ({ authorization: `Bearer ${uid}`, 'x-shield-participant': id });
  const build = async (withApns = true) => {
    s = new CloudStore(db, cloudSchema.parse({ ...base, ...(withApns ? { APNS: apns } : {}) }), () => now);
    app = await buildCloudApp(s, { auth });
  };
  const register = (uid: keyof typeof tokens) => app.inject({ method: 'POST', url: '/api/devices', headers: headers(uid), payload: { token: tokens[uid], environment: 'development' } });
  /** A helper with an accepted grant; `canListen` controls voicemail access. */
  const share = async (uid: string, canListen: boolean) => {
    const grant = randomUUID();
    await db.collection('grants').doc(grant).set({ participantId: id, granteeUid: uid, canListen, acceptedAt: now, revokedAt: null, expiresAt: now });
    await s.memberRef(id, uid).set({ participantId: id, granteeUid: uid, grantId: grant });
  };
  const deliverAll = async () => {
    for (const doc of (await db.collection('alerts').get()).docs) await new AlertDelivery(s, { send }).deliver(doc.id);
  };
  const queued = async () => (await db.collection('alerts').get()).docs.map(d => d.data().kind);

  beforeEach(async () => {
    if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST!)) throw new Error('Local emulator required');
    await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: 'DELETE' });
    now = Date.now(); sent.length = 0;
    send.mockReset().mockImplementation(async (token, _environment, body) => { sent.push({ token, body }); return 'sent'; });
    await build();
    await s.personRef(id).set({ id, ownerUid: 'owner', status: 'setup', phoneVerifiedAt: now, forwardingConsent, shieldNumber: NUMBER,
      nameEnc: s.vault.seal('Margaret', `person:${id}:name`), phoneEnc: s.vault.seal(PHONE, `person:${id}:phone`) });
  });
  afterEach(async () => { await app.close(); });
  afterAll(async () => { await db.terminate(); await deleteApp(admin); });

  it('offers notifications and stores a registration only when APNs is configured', async () => {
    expect((await app.inject({ url: '/public/config' })).json().notificationsAvailable).toBe(true);
    expect((await register('owner')).json()).toEqual({ registered: true });
    const [device] = (await db.collection('devices').get()).docs;
    expect(device!.data()).toMatchObject({ uid: 'owner', environment: 'development' }); expect(JSON.stringify(device!.data())).not.toContain(tokens.owner);
    expect((await app.inject({ method: 'POST', url: '/api/devices', headers: headers(), payload: { token: 'xyz' } })).statusCode).toBe(400);
    expect((await register('stranger' as 'owner')).statusCode).toBe(403);
    await app.close(); await build(false);
    expect((await app.inject({ url: '/public/config' })).json().notificationsAvailable).toBe(false);
    await db.collection('devices').doc(device!.id).delete();
    expect((await register('owner')).json()).toEqual({ registered: false });
    expect((await db.collection('devices').get()).empty).toBe(true);
  });
  it('moves a phone to whoever signs in on it, and forgets it on sign-out', async () => {
    await share('helper', true);
    await register('owner');
    await app.inject({ method: 'POST', url: '/api/devices', headers: headers('helper'), payload: { token: tokens.owner, environment: 'development' } });
    expect((await db.collection('devices').get()).docs.map(d => d.data().uid)).toEqual(['helper']);
    await app.inject({ method: 'POST', url: '/auth/logout', headers: headers('helper') });
    expect((await db.collection('devices').get()).empty).toBe(true);
  });
  it('sends person alerts to the person, and helper alerts only after the person turns them on', async () => {
    await share('helper', true); await share('viewer', false);
    await register('owner'); await register('helper'); await register('viewer');
    const first = db.batch(); queueAlert(s, first, id, 'voicemail'); await first.commit();
    await deliverAll();
    expect(sent).toEqual([{ token: tokens.owner, body: 'You have a new voicemail in Shield.' }]);
    expect((await db.collection('alerts').get()).empty).toBe(true);

    expect((await app.inject({ method: 'POST', url: '/api/helper-alerts', headers: headers('helper'), payload: { enabled: true } })).statusCode).toBe(403);
    expect((await app.inject({ url: '/api/helper-alerts', headers: headers() })).json()).toEqual({ available: true, enabled: false, choiceRecorded: false });
    expect((await app.inject({ method: 'POST', url: '/api/helper-alerts', headers: headers(), payload: { enabled: true } })).json()).toEqual({ enabled: true });
    expect((await app.inject({ url: '/api/helper-alerts', headers: headers() })).json()).toMatchObject({ enabled: true, choiceRecorded: true });
    sent.length = 0;
    const batch = db.batch(); queueAlert(s, batch, id, 'voicemail'); queueAlert(s, batch, id, 'monitor_intervened'); await batch.commit();
    await deliverAll();
    // Shared-history helpers follow the same intervention-only alert rule as caretakers.
    expect(sent).toEqual(expect.arrayContaining([
      { token: tokens.owner, body: 'You have a new voicemail in Shield.' },
      { token: tokens.helper, body: 'Shield detected a possible scam request during a call with Margaret. Check in with them.' },
      { token: tokens.viewer, body: 'Shield detected a possible scam request during a call with Margaret. Check in with them.' }]));
    expect(sent).toHaveLength(3);
    expect(sent.some(m => /\+1\d{10}/.test(m.body))).toBe(false);
    sent.length = 0;
    for (const kind of Object.keys(ALERTS) as AlertKind[]) {
      if (kind === 'monitor_intervened') continue;
      const job = db.batch(); queueAlert(s, job, id, kind); await job.commit();
    }
    await deliverAll();
    expect(sent.every(message => message.token === tokens.owner)).toBe(true);
  });
  it('drops a registration Apple reports as gone, skips expired ones and stale jobs', async () => {
    await register('owner');
    send.mockResolvedValueOnce('unregistered');
    const batch = db.batch(); queueAlert(s, batch, id, 'protection_paused'); await batch.commit();
    await deliverAll(); expect((await db.collection('devices').get()).empty).toBe(true);
    await register('owner'); now += 86400_001;
    const late = db.batch(); queueAlert(s, late, id, 'protection_paused'); await late.commit();
    now += 60 * 86400_000; await deliverAll(); expect(send).toHaveBeenCalledTimes(1);
  });
  it('queues pause once and does not announce service stopped merely for opening restoration', async () => {
    const pause = (paused: boolean) => app.inject({ method: 'POST', url: '/api/setup/pause', headers: headers(), payload: { paused } });
    await pause(true); await pause(true); await pause(false);
    expect(await queued()).toEqual(['protection_paused']);
    await db.collection('forwarding').doc('control').set({ enabled: true });
    await app.inject({ method: 'POST', url: '/api/forwarding/restore', headers: headers() });
    await app.inject({ method: 'POST', url: '/api/forwarding/restore', headers: headers() });
    expect((await queued()).sort()).toEqual(['protection_paused']);
  });
  it('queues nothing when push is not configured', async () => {
    await app.close(); await build(false);
    await app.inject({ method: 'POST', url: '/api/setup/pause', headers: headers(), payload: { paused: true } });
    expect(await queued()).toEqual([]);
  });
  it('throttles blocked-call jobs and queues an alert when Shield ends a connected call', async () => {
    const f = new ForwardingStore(s), from = '+12025550102', hash = s.vault.hash(from);
    await f.controlRef(PERSON).set({ provisioned: true, enabled: false, used: 0, expiresAt: now });
    await s.personRef(id).update({ shieldNumber: NUMBER });
    await db.collection('shieldNumbers').doc(NUMBER).set({ state: 'assigned', participantId: id, assignedAt: now });
    await f.blockedRef(id, hash).set({ reason: 'scam', expiresAt: now + 86400_000, createdAt: now, attempts: 0 });
    await f.begin('10123456-1234-4321-1234-000000000001', NUMBER, from); now += 60_000;
    await f.begin('10123456-1234-4321-1234-000000000002', NUMBER, from);
    expect(await queued()).toEqual(['blocked_caller']);
    now += 3600_000; await f.begin('10123456-1234-4321-1234-000000000003', NUMBER, from);
    expect(await queued()).toEqual(['blocked_caller', 'blocked_caller']);

    const call = randomUUID();
    await s.callRef(call).set({ id: call, participantId: id, source: 'forwarding', provider: 'telnyx', parentSid: '10123456-1234-4321-1234-000000000009',
      childSid: '10123456-1234-4321-1234-00000000000a', eligible: true, createdAt: now, expiresAt: now + RETENTION_MS, callerEnc: s.vault.seal('', `call:${call}:caller`),
      state: 'accepted', outcome: 'connected', reason: 'routine', purpose: 'personal', completedAt: null, events: [] });
    await new CallMonitor(f, { update: async () => {} }).intervene(call, 'code_or_password');
    expect((await queued()).filter(k => k === 'monitor_intervened')).toHaveLength(1);
  });
});
