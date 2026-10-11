import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { CloudStore } from '../src/cloud/store.js';
import { cloudSchema, RETENTION_MS } from '../src/cloud/config.js';
import { buildCloudApp } from '../src/cloud/app.js';
import { HttpError, type AuthProvider } from '../src/auth.js';
import { extractionSchema, type MessageChecker } from '../src/cloud/message-check.js';

const enabled = !!process.env.FIRESTORE_EMULATOR_HOST;
describe.skipIf(!enabled)('Firebase serverless integration (Firestore emulator)', () => {
  const config = cloudSchema.parse({ FIREBASE_WEB_API_KEY: 'emulator-test', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app',
    TRIAL_PROXY_SECRET: 'c'.repeat(64), DATA_ENCRYPTION_KEY: 'd'.repeat(64),
    TELNYX_ACCOUNT_ID: 'fe8d2922-2dcf-4461-87bc-17a539688c31', TELNYX_API_KEY: 'test'.repeat(8), TELNYX_PUBLIC_KEY: `${'A'.repeat(43)}=`,
    TELNYX_APPLICATION_ID: '123456789012345678' });
  const admin = initializeApp({ projectId: 'demo-shield' }, 'cloud-tests');
  const db = getFirestore(admin);
  let now: number; let store: CloudStore; let checked: string[];
  const routine = extractionSchema.parse({ purpose: 'appointment', sensitiveAccountIssue: { value: 'absent', evidence: null },
    familyMoneyEmergency: { value: 'absent', evidence: null }, prohibitedRequests: [], uncertainty: [] });
  const checker: MessageChecker = { async extract(text) { checked.push(text); return routine; } };
  const auth: AuthProvider = {
    async identify(token) { if (!['owner', 'caregiver', 'stranger', 'other-owner'].includes(token)) throw new HttpError(401, 'sign_in_required'); return { subject: token }; },
    async requestCode() {}, async verifyCode() { return {}; }, async refresh() { return {}; }, async logout() {}
  };
  let app: Awaited<ReturnType<typeof buildCloudApp>> | undefined;
  const PERSON = 'b0b7af93-72ad-431d-9708-f1d9564a2b36', PHONE = '+15127697536', NUMBER = '+12025550109';
  const headers = (token = 'owner') => ({ authorization: `Bearer ${token}`, 'x-shield-participant': PERSON });
  /** A finished forwarded call, as call control leaves it. */
  const seedCall = async () => {
    const id = randomUUID();
    await store.callRef(id).set({ id, participantId: PERSON, source: 'forwarding', provider: 'telnyx', parentSid: randomUUID(),
      eligible: true, createdAt: now, expiresAt: now + RETENTION_MS, callerEnc: store.vault.seal('+13125550148', `call:${id}:caller`),
      state: 'ended', outcome: 'held', reason: 'scam', purpose: 'other', completedAt: now,
      events: [{ kind: 'screening_started', at: now }, { kind: 'call_stopped', at: now }] });
    return id;
  };
  beforeEach(async () => {
    if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST!)) throw new Error('Expected local emulator');
    const cleared = await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-shield/databases/(default)/documents`, { method: 'DELETE' });
    if (!cleared.ok) throw new Error('Emulator reset failed');
    now = Date.now(); store = new CloudStore(db, config, () => now); checked = [];
    await store.personRef(PERSON).set({ id: PERSON, ownerUid: 'owner', status: 'setup',
      nameEnc: store.vault.seal('Isaac', `person:${PERSON}:name`),
      phoneEnc: store.vault.seal(PHONE, `person:${PERSON}:phone`), shieldNumber: NUMBER });
    app = await buildCloudApp(store, { auth, checker });
  });
  afterEach(async () => { await app?.close(); app = undefined; });
  afterAll(async () => { await db.terminate(); await deleteApp(admin); });

  it('shares only phone-list fields, deduplicates numbers and restricts the operation to the owner', async () => {
    const payload = { contacts: [{ label: 'Mom', phone: '(312) 555-0148' }, { label: 'Same number', phone: '+13125550148' }, { label: 'Incomplete', phone: '123' }] };
    expect((await app!.inject({ method: 'POST', url: '/api/trusted-numbers/sync', headers: headers('stranger'), payload })).statusCode).toBe(403);
    const synced = await app!.inject({ method: 'POST', url: '/api/trusted-numbers/sync', headers: headers(), payload });
    expect(synced.json()).toEqual({ shared: 1, skipped: 1 });
    expect((await store.personRef(PERSON).get()).data()).toMatchObject({ contactsSyncedAt: now, contactsSyncUntil: 0 });
    const saved = (await store.personRef(PERSON).collection('trusted-numbers').get()).docs;
    expect(saved).toHaveLength(1); expect(saved[0]!.data().phoneEnc).not.toContain('3125550148');
    const list = (await app!.inject({ url: '/api/trusted-numbers', headers: headers() })).json();
    expect(list.items[0]).toMatchObject({ label: 'Mom', phone: '+13125550148', enabled: true });
    expect((await app!.inject({ method: 'POST', url: '/api/trusted-numbers/sync', headers: headers(), payload: { contacts: [], photos: ['unexpected'] } })).statusCode).toBe(400);
  });
  it('can remove and restore a number without losing its original list identity', async () => {
    const sync = (contacts: {label: string; phone: string}[]) => app!.inject({ method: 'POST', url: '/api/trusted-numbers/sync', headers: headers(), payload: { contacts } });
    const entry = { label: 'Mom', phone: '+13125550148' };
    await sync([entry]);
    let list = (await app!.inject({ url: '/api/trusted-numbers', headers: headers() })).json(); const id = list.items[0].id;
    await sync([]);
    list = (await app!.inject({ url: '/api/trusted-numbers', headers: headers() })).json(); expect(list.items[0]).toMatchObject({ id, enabled: false });
    expect((await app!.inject({ method: 'PATCH', url: `/api/trusted-numbers/${id}`, headers: headers('stranger'), payload: { enabled: true } })).statusCode).toBe(403);
    await sync([entry]);
    list = (await app!.inject({ url: '/api/trusted-numbers', headers: headers() })).json(); expect(list.items).toHaveLength(1); expect(list.items[0]).toMatchObject({ id, enabled: true });
    await store.personRef(PERSON).update({ contactsSyncUntil: now + 60_000, contactsSyncToken: 'other' });
    expect((await sync([entry])).statusCode).toBe(409);
  });

  it('restricts history and checks to an owner or accepted caregiver', async () => {
    const id = await seedCall();
    expect((await app!.inject({ url: '/api/overview' })).statusCode).toBe(401);
    expect((await app!.inject({ url: `/api/calls/${id}`, headers: headers('stranger') })).statusCode).toBe(403);
    const result = await app!.inject({ url: `/api/calls/${id}`, headers: headers() }); expect(result.statusCode).toBe(200);
    expect(result.json().call.id).toBe(id); expect(result.json().call.voicemail).toBeNull();
    const native = await app!.inject({ url: `/api/calls/${id.toUpperCase()}`, headers: {
      authorization: 'Bearer owner', 'x-shield-participant': PERSON.toUpperCase() } });
    expect(native.statusCode).toBe(200); expect(native.json().call.id).toBe(id);
  });
  it('accepts invitations once and enforces immediate revocation and owner-only writes', async () => {
    const created = await app!.inject({ method: 'POST', url: '/api/sharing', headers: headers(), payload: { label: 'Family', canListen: false, consent: true } });
    expect(created.statusCode).toBe(200); const { id, code } = created.json();
    const replies = await Promise.all(['caregiver', 'stranger'].map(token => app!.inject({ method: 'POST', url: '/api/sharing/accept', headers: headers(token), payload: { code } })));
    expect(replies.filter(reply => reply.statusCode === 200)).toHaveLength(1);
    const winner = replies[0]!.statusCode === 200 ? 'caregiver' : 'stranger';
    expect((await app!.inject({ url: '/api/overview', headers: headers(winner) })).statusCode).toBe(200);
    expect((await app!.inject({ method: 'POST', url: '/api/setup/pause', headers: headers(winner), payload: { paused: true } })).statusCode).toBe(403);
    expect((await app!.inject({ method: 'DELETE', url: `/api/sharing/${id}`, headers: headers() })).statusCode).toBe(200);
    expect((await app!.inject({ url: '/api/overview', headers: headers(winner) })).statusCode).toBe(403);
  });
  it('matches iOS contacts and pagination DTOs without leaking expired history', async () => {
    expect((await app!.inject({ method: 'POST', url: '/api/destinations', headers: headers(), payload: { label: 'Clinic', phone: '+13125550148', provenance: 'card' } })).statusCode).toBe(200);
    const contacts = (await app!.inject({ url: '/api/destinations', headers: headers() })).json();
    expect(contacts.items[0]).toMatchObject({ label: 'Clinic', phone: '+13125550148', provenance: 'card' }); expect(contacts.items[0].createdAt).toBeTypeOf('string');
    const id = await seedCall(); now += 31 * 86400_000;
    expect((await app!.inject({ url: '/api/calls', headers: headers() })).json().calls).toEqual([]);
    expect((await app!.inject({ url: `/api/calls/${id}`, headers: headers() })).statusCode).toBe(404);
    await store.cleanup(); expect((await store.callRef(id).get()).exists).toBe(false);
  });
  it('commits quota groups atomically under contention', async () => {
    const outcomes = await Promise.allSettled(Array.from({ length: 8 }, () => store.quota([['paid-global', 3], ['paid-owner', 5]])));
    expect(outcomes.filter(value => value.status === 'fulfilled')).toHaveLength(3);
    expect((await db.collection('usage').get()).docs.map(doc => doc.data().used).sort()).toEqual([3, 3]);
  });  it('checks pasted text only with consent, without storing it, and never claims a sender is genuine', async () => {
    const payload = { text: 'Your dentist appointment is tomorrow at 3.', analysisConsent: true };
    expect((await app!.inject({ method: 'POST', url: '/api/check', payload })).statusCode).toBe(401);
    expect((await app!.inject({ method: 'POST', url: '/api/check', headers: headers(), payload: { text: payload.text } })).statusCode).toBe(400);
    const result = await app!.inject({ method: 'POST', url: '/api/check', headers: headers(), payload });
    expect(result.json()).toMatchObject({ decision: 'offer', reasonCode: 'routine', title: 'Check independently' });
    expect(result.json().detail).toContain('does not establish who sent');
    expect(checked).toEqual([payload.text]);
    expect(JSON.stringify((await db.collection('callSessions').get()).docs.map(d => d.data()))).not.toContain('dentist');
  });
  it('reports the Telnyx number in setup and no longer reports a direct-call trial window', async () => {
    const setup = (await app!.inject({ url: '/api/setup', headers: headers() })).json();
    expect(setup).toMatchObject({ shieldNumber: NUMBER, trial: null });
  });
});
