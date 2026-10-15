import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID, generateKeyPairSync, sign } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { CloudStore } from '../src/cloud/store.js';
import { cloudSchema } from '../src/cloud/config.js';
import { buildCloudApp } from '../src/cloud/app.js';
import { AlertDelivery, queueAlert, type AlertKind } from '../src/cloud/alerts.js';
import { contactPhoneHash } from '../src/cloud/trusted-contacts.js';
import type { AuthProvider } from '../src/auth.js';

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('Phone sign-in and optional trusted contacts (emulator)', () => {
  const project = 'demo-shield-phone-contacts', admin = initializeApp({ projectId: project }, 'phone-contact-tests'), db = getFirestore(admin);
  const PERSON = 'b0b7af93-72ad-431d-9708-f1d9564a2b36', OWNER_PHONE = '+12025550101', PHONE = '+12025550102', FROM = '+12025550109';
  const keys = generateKeyPairSync('ed25519');
  const publicKey = keys.publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('base64');
  const config = cloudSchema.parse({ FIREBASE_WEB_API_KEY: 'test', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app',
    TRIAL_PROXY_SECRET: 'c'.repeat(64), DATA_ENCRYPTION_KEY: 'd'.repeat(64), TELNYX_ACCOUNT_ID: PERSON,
    TELNYX_API_KEY: 'test'.repeat(8), TELNYX_PUBLIC_KEY: publicKey, TELNYX_APPLICATION_ID: '123456789012345678',
    TELNYX_VERIFY_PROFILE_ID: PERSON, SMS_ALERTS: { from: FROM, messagingProfileId: PERSON },
    APNS: { keyId: 'ABCDEF1234', teamId: '6R6HMW3DWN', privateKey: 'SYNTHETIC PRIVATE KEY' } });
  const mint = vi.fn(async (_phone: string) => ({ accessToken: 'synthetic', refreshToken: 'refresh', expiresIn: 3600 }));
  const auth: AuthProvider = {
    async identify(token) { return { subject: token, ...(['contact', 'recycled'].includes(token) ? { verifiedPhone: PHONE } : token === 'other' ? { verifiedPhone: '+12025550103' } : {}) }; },
    async requestCode() {}, async verifyCode() { return {}; }, async refresh() { return {}; }, async logout() {}, signInVerifiedPhone: mint
  };
  const sms = vi.fn(async (_phone: string, _body: string) => 'submitted' as const);
  const push = vi.fn(async () => 'sent' as const);
  const start = vi.fn(async (_phone: string) => PERSON), verify = vi.fn(async (_id: string, code: string, _phone: string) => code === '123456');
  let now: number, store: CloudStore, app: Awaited<ReturnType<typeof buildCloudApp>>;
  const headers = (uid = 'owner', selected = true) => ({ authorization: `Bearer ${uid}`, ...(selected ? { 'x-shield-participant': PERSON } : {}) });
  const create = (id = randomUUID(), phone = PHONE, uid = 'owner') => app.inject({ method: 'POST', url: '/api/trusted-contacts', headers: headers(uid), payload: { id, name: 'Alex', phone, consent: true } });
  const respond = (id: string, accept = true, textAlerts = true, appAlerts = true, uid = 'contact') => app.inject({ method: 'POST', url: `/api/contact-alerts/${id}`, headers: headers(uid, false), payload: { accept, textAlerts, appAlerts } });
  const list = (uid = 'contact') => app.inject({ url: '/api/contact-alerts', headers: headers(uid, false) });
  const queue = async (kind: AlertKind = 'blocked_caller') => { const batch = db.batch(); queueAlert(store, batch, PERSON, kind); await batch.commit(); return (await db.collection('alerts').get()).docs[0]!.id; };
  const delivery = () => new AlertDelivery(store, { send: push }, { send: sms });
  const hook = async (word: string, options: { valid?: boolean; at?: number; profile?: string } = {}) => {
    const timestamp = String(Math.floor(now / 1000));
    const payload = JSON.stringify({ data: { event_type: 'message.received', occurred_at: new Date(options.at ?? now).toISOString(), payload: {
      from: { phone_number: PHONE }, to: [{ phone_number: FROM }], text: word, messaging_profile_id: options.profile ?? PERSON
    } } });
    return app.inject({ method: 'POST', url: '/public/messaging/webhook', payload, headers: { 'content-type': 'application/json',
      'telnyx-timestamp': timestamp, 'telnyx-signature-ed25519': options.valid === false ? 'invalid' : sign(null, Buffer.from(`${timestamp}|${payload}`), keys.privateKey).toString('base64') } });
  };
  beforeEach(async () => {
    if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST!)) throw new Error('Local emulator required');
    await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: 'DELETE' });
    now = Date.now(); vi.clearAllMocks(); verify.mockImplementation(async (_id, code) => code === '123456');
    store = new CloudStore(db, config, () => now); app = await buildCloudApp(store, { auth, phoneVerifier: { start, verify }, textSender: { send: sms } });
    await store.personRef(PERSON).set({ id: PERSON, ownerUid: 'owner', status: 'setup', nameEnc: store.vault.seal('Margaret', `person:${PERSON}:name`), phoneEnc: store.vault.seal(OWNER_PHONE, `person:${PERSON}:phone`) });
  });
  afterEach(async () => { await app.close(); });
  afterAll(async () => { await db.terminate(); await deleteApp(admin); });

  it('issues opaque expiring challenges, throttles resends, and never mints a session for an incorrect code', async () => {
    const response = await app.inject({ method: 'POST', url: '/auth/phone/start', payload: { phone: PHONE } });
    expect(response.statusCode).toBe(200); const { challenge } = response.json();
    expect(challenge).toMatch(/^[a-f0-9]{64}$/); expect(start).toHaveBeenCalledWith(PHONE);
    const stored = (await db.collection('phoneAuthChallenges').get()).docs[0]!.data();
    expect(JSON.stringify(stored)).not.toContain(PHONE);
    const check = (code: string) => app.inject({ method: 'POST', url: '/auth/phone/verify', payload: { challenge, code } });
    expect((await check('000000')).json().error.code).toBe('phone_code_incorrect'); expect(mint).not.toHaveBeenCalled();
    expect((await check('123456')).statusCode).toBe(200); expect(mint).toHaveBeenCalledExactlyOnceWith(PHONE);
    expect((await check('123456')).json().error.code).toBe('phone_code_expired');
    expect((await app.inject({ method: 'POST', url: '/auth/phone/start', payload: { phone: PHONE } })).statusCode).toBe(429);
    expect(start).toHaveBeenCalledTimes(1);
  });
  it('rejects expired and exhausted challenges before calling the provider', async () => {
    const { challenge } = (await app.inject({ method: 'POST', url: '/auth/phone/start', payload: { phone: PHONE } })).json();
    for (let i = 0; i < 5; i++) await app.inject({ method: 'POST', url: '/auth/phone/verify', payload: { challenge, code: '000000' } });
    expect((await app.inject({ method: 'POST', url: '/auth/phone/verify', payload: { challenge, code: '123456' } })).json().error.code).toBe('phone_code_expired');
    expect(verify).toHaveBeenCalledTimes(5); expect(mint).not.toHaveBeenCalled();
    now += 61_000;
    const second = (await app.inject({ method: 'POST', url: '/auth/phone/start', payload: { phone: PHONE } })).json().challenge;
    now += 300_001;
    expect((await app.inject({ method: 'POST', url: '/auth/phone/verify', payload: { challenge: second, code: '123456' } })).statusCode).toBe(401);
    expect(verify).toHaveBeenCalledTimes(5);
  });
  it('serializes concurrent verification so only one session can be minted', async () => {
    const { challenge } = (await app.inject({ method: 'POST', url: '/auth/phone/start', payload: { phone: PHONE } })).json();
    const replies = await Promise.all([0, 1].map(() => app.inject({ method: 'POST', url: '/auth/phone/verify', payload: { challenge, code: '123456' } })));
    expect(replies.filter(r => r.statusCode === 200)).toHaveLength(1); expect(mint).toHaveBeenCalledTimes(1);
  });
  it('fences a slow verification whose lease was superseded, even if the provider accepts it', async () => {
    const { challenge } = (await app.inject({ method: 'POST', url: '/auth/phone/start', payload: { phone: PHONE } })).json();
    verify.mockImplementationOnce(async () => {
      await db.collection('phoneAuthChallenges').doc(store.vault.hash(challenge)).update({ checkingID: 'another-request' });
      return true;
    });
    expect((await app.inject({ method: 'POST', url: '/auth/phone/verify', payload: { challenge, code: '123456' } })).statusCode).toBe(401);
    expect(mint).not.toHaveBeenCalled();
  });
  it('limits active contacts to five and keeps declined contacts from consuming a slot', async () => {
    const ids: string[] = [];
    for (let i = 2; i <= 6; i++) {
      const response = await create(randomUUID(), `+1202555010${i}`);
      expect(response.statusCode).toBe(200); ids.push(response.json().contact.id);
    }
    expect((await create(randomUUID(), '+12025550107')).json().error.code).toBe('trusted_contact_limit');
    await respond(ids[0]!, false, false, false);
    expect((await create(randomUUID(), '+12025550107')).statusCode).toBe(200);
  });
  it('requires explicit owner choice and a real contact before enabling, and saves no without requiring contacts', async () => {
    expect((await create(randomUUID(), PHONE, 'stranger')).statusCode).toBe(403);
    const choice = (enabled: boolean) => app.inject({ method: 'POST', url: '/api/trusted-contacts/choice', headers: headers(), payload: { enabled } });
    expect((await choice(true)).statusCode).toBe(409); expect((await choice(false)).statusCode).toBe(200);
    expect((await app.inject({ url: '/api/trusted-contacts', headers: headers() })).json()).toMatchObject({ enabled: false, choiceRecorded: true, contacts: [] });
    expect(sms).not.toHaveBeenCalled(); expect((await create(randomUUID(), OWNER_PHONE)).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/api/trusted-contacts', headers: headers(), payload: { id: randomUUID(), name: 'Alex', phone: PHONE, consent: false } })).statusCode).toBe(400);
  });
  it('sends only a generic request and retries the same save without sending another text', async () => {
    const id = randomUUID(); expect((await create(id)).statusCode).toBe(200); expect((await create(id)).statusCode).toBe(200);
    expect(sms).toHaveBeenCalledTimes(1); expect(sms.mock.calls[0]![1]).not.toContain('Margaret');
    expect((await create()).json().error.code).toBe('trusted_contact_exists');
    const d = (await db.collection('alertContacts').doc(id).get()).data();
    expect(JSON.stringify(d)).not.toContain(PHONE); expect(JSON.stringify(d)).not.toContain('Alex');
    expect((await list('other')).json().requests).toEqual([]); expect((await list('owner')).statusCode).toBe(403);
    expect((await list()).json().requests).toMatchObject([{ id, name: 'Margaret', status: 'pending' }]);
  });
  it('requires matching verified phone consent and never grants call history or recording access', async () => {
    const id = (await create()).json().contact.id;
    expect((await respond(id, true, true, false, 'other')).statusCode).toBe(404);
    expect((await respond(id, true, false, false)).statusCode).toBe(400);
    expect((await respond(id)).statusCode).toBe(200);
    expect((await list('recycled')).json().requests).toEqual([]);
    expect((await respond(id, true, true, false, 'recycled')).statusCode).toBe(404);
    expect((await app.inject({ url: '/api/calls', headers: headers('contact') })).statusCode).toBe(403);
    expect((await app.inject({ url: '/api/people', headers: headers('contact', false) })).json().people).toEqual([]);
    expect((await db.collection('memberships').get()).empty).toBe(true); expect((await db.collection('grants').get()).empty).toBe(true);
    expect((await app.inject({ method: 'POST', url: '/api/devices', headers: headers('contact', false), payload: { token: 'ab'.repeat(32), environment: 'development' } })).statusCode).toBe(200);
  });
  it('delivers opted-in text and push once, skips pending contacts and excludes voicemail activity', async () => {
    const id = (await create()).json().contact.id; sms.mockClear();
    await delivery().deliver(await queue()); expect(sms).not.toHaveBeenCalled();
    await respond(id); await app.inject({ method: 'POST', url: '/api/devices', headers: headers('contact', false), payload: { token: 'ab'.repeat(32), environment: 'development' } });
    const job = await queue(); await Promise.all([delivery().deliver(job), delivery().deliver(job)]);
    expect(sms).toHaveBeenCalledTimes(1); expect(push).toHaveBeenCalledTimes(1);
    expect(sms.mock.calls[0]![1]).toContain('Margaret'); expect(sms.mock.calls[0]![1]).not.toContain(PHONE);
    await delivery().deliver(await queue('voicemail')); expect(sms).toHaveBeenCalledTimes(1); expect(push).toHaveBeenCalledTimes(1);
  });
  it('does not deliver queued events from before acceptance', async () => {
    const id = (await create()).json().contact.id; sms.mockClear(); const job = await queue(); now += 10;
    await respond(id); await delivery().deliver(job); expect(sms).not.toHaveBeenCalled();
  });
  it.each(['no', 'decline', 'revoke', 'offboard'])('stops alerts immediately after %s', async action => {
    const id = (await create()).json().contact.id; await respond(id); sms.mockClear(); const job = await queue();
    if (action === 'no') await app.inject({ method: 'POST', url: '/api/trusted-contacts/choice', headers: headers(), payload: { enabled: false } });
    if (action === 'decline') await respond(id, false, false, false);
    if (action === 'revoke') await app.inject({ method: 'DELETE', url: `/api/trusted-contacts/${id}`, headers: headers() });
    if (action === 'offboard') await store.personRef(PERSON).update({ status: 'offboarded' });
    await delivery().deliver(job); expect(sms).not.toHaveBeenCalled();
  });
  it('honors signed STOP/START in order, rejects forged hooks and leaves push choices intact', async () => {
    const id = (await create()).json().contact.id; await respond(id); sms.mockClear();
    expect((await hook('STOP', { valid: false })).statusCode).toBe(403);
    await hook('STOP', { profile: randomUUID() }); expect((await db.collection('smsOptOuts').get()).empty).toBe(true);
    expect((await hook('STOP')).statusCode).toBe(200);
    expect((await list()).json().textsStopped).toBe(true);
    await delivery().deliver(await queue()); expect(sms).not.toHaveBeenCalled();
    expect((await respond(id)).json().error.code).toBe('texts_stopped');
    expect((await respond(id, true, false, true)).statusCode).toBe(200);
    now += 10; await hook('START'); await hook('STOP', { at: now - 10 });
    expect((await db.collection('smsOptOuts').doc(contactPhoneHash(store, PHONE)).get()).data()?.stopped).toBe(false);
  });
  it('expires pending requests, retains accepted consent, and disables features without provider configuration', async () => {
    const first = (await create()).json().contact.id;
    const second = (await create(randomUUID(), '+12025550103')).json().contact.id; await respond(second, true, true, false, 'other');
    now += 31 * 86400_000;
    expect((await list()).json().requests).toEqual([]); expect((await respond(first)).statusCode).toBe(404);
    await store.cleanup(); expect((await db.collection('alertContacts').doc(first).get()).exists).toBe(false);
    expect((await db.collection('alertContacts').doc(second).get()).exists).toBe(true);
    await app.close(); store = new CloudStore(db, { ...config, TELNYX_VERIFY_PROFILE_ID: undefined, SMS_ALERTS: undefined }, () => now);
    app = await buildCloudApp(store, { auth, phoneVerifier: { start, verify }, textSender: { send: sms } });
    expect((await app.inject({ method: 'POST', url: '/auth/phone/start', payload: { phone: PHONE } })).statusCode).toBe(503);
    expect((await create()).statusCode).toBe(503);
  });
});
