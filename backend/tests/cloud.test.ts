import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { CloudStore, RESULT_POLL_PAUSES } from '../src/cloud/store.js';
import { cloudSchema } from '../src/cloud/config.js';
import { buildCloudApp } from '../src/cloud/app.js';
import { HttpError, type AuthProvider } from '../src/auth.js';
import { extractionSchema, type Screener } from '../src/screening.js';
import type { WebhookTiming } from '../src/cloud/voice.js';

const enabled = !!process.env.FIRESTORE_EMULATOR_HOST;
describe.skipIf(!enabled)('Firebase serverless integration (Firestore emulator)', () => {
  const config = cloudSchema.parse({ FIREBASE_WEB_API_KEY: 'emulator-test', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app',
    TWILIO_ACCOUNT_SID: `AC${'a'.repeat(32)}`, TWILIO_AUTH_TOKEN: 'b'.repeat(32), TRIAL_PROXY_SECRET: 'c'.repeat(64),
    TRIAL_TWILIO_NUMBER: '+17372583478', TRIAL_VERIFIED_CALLER: '+15127697536',
    TRIAL_PARTICIPANT_ID: 'b0b7af93-72ad-431d-9708-f1d9564a2b36', DATA_ENCRYPTION_KEY: 'd'.repeat(64) });
  const admin = initializeApp({ projectId: 'demo-shield' }, 'cloud-tests');
  const db = getFirestore(admin);
  let now: number; let store: CloudStore; let timings: WebhookTiming[];
  const sid = (value = 1) => `CA${value.toString(16).padStart(32, '0')}`;
  const routine = extractionSchema.parse({ purpose: 'appointment', sensitiveAccountIssue: { value: 'absent', evidence: null },
    familyMoneyEmergency: { value: 'absent', evidence: null }, prohibitedRequests: [], uncertainty: [] });
  const auth: AuthProvider = {
    async identify(token) { if (!['owner', 'caregiver', 'stranger', 'other-owner'].includes(token)) throw new HttpError(401, 'sign_in_required'); return { subject: token }; },
    async requestCode() {}, async verifyCode() { return {}; }, async refresh() { return {}; }, async logout() {}
  };
  let app: Awaited<ReturnType<typeof buildCloudApp>> | undefined;
  const headers = (token = 'owner') => ({ authorization: `Bearer ${token}`, 'x-shield-participant': config.TRIAL_PARTICIPANT_ID });
  const callId = async (value = 1) => (await store.keyRef(sid(value)).get()).data()!.callId as string;
  beforeEach(async () => {
    if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST!)) throw new Error('Expected local emulator');
    const cleared = await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-shield/databases/(default)/documents`, { method: 'DELETE' });
    if (!cleared.ok) throw new Error('Emulator reset failed');
    now = Date.now(); store = new CloudStore(db, config, () => now); timings = [];
    await store.personRef(config.TRIAL_PARTICIPANT_ID).set({ id: config.TRIAL_PARTICIPANT_ID, ownerUid: 'owner', status: 'setup',
      nameEnc: store.vault.seal('Isaac', `person:${config.TRIAL_PARTICIPANT_ID}:name`),
      phoneEnc: store.vault.seal(config.TRIAL_VERIFIED_CALLER, `person:${config.TRIAL_PARTICIPANT_ID}:phone`) });
    await db.doc('trial/control').set({ enabled: true, used: 0, expiresAt: now + 3600_000 });
    app = await buildCloudApp(store, { auth, reportWebhookTiming: timing => timings.push(timing), lookupCall: async id => ({ sid: id, accountSid: config.TWILIO_ACCOUNT_SID,
      from: config.TRIAL_VERIFIED_CALLER, to: config.TRIAL_TWILIO_NUMBER, direction: 'inbound', status: 'in-progress', dateCreated: new Date(now) }) });
  });
  afterEach(async () => { await app?.close(); app = undefined; });
  afterAll(async () => { await db.terminate(); await deleteApp(admin); });

  it('shares only phone-list fields, deduplicates numbers and restricts the operation to the owner', async () => {
    const payload = { contacts: [{ label: 'Mom', phone: '(312) 555-0148' }, { label: 'Same number', phone: '+13125550148' }, { label: 'Incomplete', phone: '123' }] };
    expect((await app!.inject({ method: 'POST', url: '/api/trusted-numbers/sync', headers: headers('stranger'), payload })).statusCode).toBe(403);
    const synced = await app!.inject({ method: 'POST', url: '/api/trusted-numbers/sync', headers: headers(), payload });
    expect(synced.json()).toEqual({ shared: 1, skipped: 1 });
    const saved = (await store.personRef(config.TRIAL_PARTICIPANT_ID).collection('trusted-numbers').get()).docs;
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
    await store.personRef(config.TRIAL_PARTICIPANT_ID).update({ contactsSyncUntil: now + 60_000, contactsSyncToken: 'other' });
    expect((await sync([entry])).statusCode).toBe(409);
  });

  it('shares the ten-call cap across concurrent instances and does not reset on restart', async () => {
    const other = new CloudStore(db, config, () => now);
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => (i % 2 ? store : other).beginCall(sid(i + 1))));
    expect(results.filter(value => value === 'accepted')).toHaveLength(10);
    expect((await db.doc('trial/control').get()).data()!.used).toBe(10);
    expect(await new CloudStore(db, config, () => now).beginCall(sid(99))).toBe('expired');
  });
  it('does not extend the trial window with a new instance', async () => {
    now += 3600_001; expect(await new CloudStore(db, config, () => now).beginCall(sid())).toBe('expired');
    expect((await db.collection('callSessions').get()).size).toBe(0);
  });
  it('prepares the worker during an admitted call without screening or storing any introduction', async () => {
    await store.beginCall(sid()); const id = await callId();
    const prep = db.collection('screeningJobs').doc(`prepare-${id}`);
    expect((await prep.get()).data()).toMatchObject({ kind: 'prepare', callId: id });
    expect((await prep.get()).data()!.transcriptEnc).toBeUndefined();
    let requests = 0; const screener: Screener = { version: 'test', async extract() { requests++; return routine; } };
    await Promise.all([store.processJob(prep.id, screener), store.processJob(prep.id, screener)]);
    expect(requests).toBe(0); expect((await prep.get()).exists).toBe(false);
    expect((await store.callRef(id).get()).data()!.state).toBe('screening');
    expect((await db.doc('trial/control').get()).data()!.used).toBe(1);
  });
  it('deduplicates inbound, introductions, job delivery and final playback', async () => {
    expect(await store.beginCall(sid())).toBe('accepted'); expect(await store.beginCall(sid())).toBe('duplicate');
    const intros = await Promise.all([store.introduction(sid(), 'Appointment tomorrow'), store.introduction(sid(), 'Replay')]);
    expect(intros.sort()).toEqual(['duplicate', 'queued']); const id = await callId(); let requests = 0;
    const screener: Screener = { version: 'test', async extract() { requests++; return routine; } };
    await Promise.all([store.processJob(id, screener), store.processJob(id, screener), store.processJob(`prepare-${id}`, screener)]);
    expect(requests).toBe(1); expect((await db.collection('screeningJobs').get()).empty).toBe(true);
    expect((await store.result(sid())).decision?.route).toBe('offer'); expect((await store.result(sid())).kind).toBe('duplicate');
    const call = (await store.callRef(id).get()).data()!; expect(call.outcome).toBe('missed'); expect(call.callerEnc).not.toContain(config.TRIAL_VERIFIED_CALLER);
  });
  it('removes introduction before the model runs; failed model cannot clear a call', async () => {
    await store.beginCall(sid()); await store.introduction(sid(), 'Private introduction'); const id = await callId();
    await store.processJob(id, { version: 'failure', async extract() {
      expect((await db.collection('screeningJobs').doc(id).get()).data()!.transcriptEnc).toBeUndefined(); throw new Error('offline');
    } });
    expect((await store.result(sid())).decision?.reason).toBe('screening_unavailable');
  });
  it('times out an absent worker and ignores a late event', async () => {
    await store.beginCall(sid()); await store.introduction(sid(), 'Appointment tomorrow'); const id = await callId();
    for (const pauseSeconds of RESULT_POLL_PAUSES) expect(await store.result(sid())).toEqual({ kind: 'wait', pauseSeconds });
    expect(1 + RESULT_POLL_PAUSES.reduce<number>((sum, value) => sum + value, 0)).toBe(12);
    expect(2 + RESULT_POLL_PAUSES.length).toBeLessThan(10);
    expect((await store.result(sid())).decision?.reason).toBe('screening_unavailable');
    let ran = false; await store.processJob(id, { version: 'late', async extract() { ran = true; return routine; } }); expect(ran).toBe(false);
  });
  it('rejects the wrong webhook secret or caller before creating records', async () => {
    const payload = { AccountSid: config.TWILIO_ACCOUNT_SID, CallSid: sid(), From: config.TRIAL_VERIFIED_CALLER, To: config.TRIAL_TWILIO_NUMBER, Direction: 'inbound' };
    expect((await app!.inject({ method: 'POST', url: '/trial/wrong/inbound', payload })).statusCode).toBe(403);
    expect((await app!.inject({ method: 'POST', url: `/trial/${config.TRIAL_PROXY_SECRET}/inbound`, payload: { ...payload, From: '+13125550148' } })).statusCode).toBe(403);
    expect((await db.collection('callSessions').get()).empty).toBe(true);
    const valid = await app!.inject({ method: 'POST', url: `/trial/${config.TRIAL_PROXY_SECRET}/inbound`, headers: { 'content-type': 'application/x-www-form-urlencoded' }, payload: new URLSearchParams(payload).toString() });
    expect(valid.statusCode).toBe(200); expect(valid.body).toContain('<Gather'); expect(valid.body).toContain('<Say');
    expect(valid.body).not.toContain('<Play>'); expect(valid.body).toContain('speechTimeout="1"');
    const lastTiming = timings.at(-1)!;
    expect(Object.keys(lastTiming).sort()).toEqual(['elapsedMs', 'providerLookupMs', 'statusCode', 'step']);
    expect(lastTiming.step).toBe('inbound'); expect(JSON.stringify(timings)).not.toContain(config.TRIAL_PROXY_SECRET);
  });
  it('returns Twilio speech and fast early polls, then ends as soon as a decision is available', async () => {
    const payload = { AccountSid: config.TWILIO_ACCOUNT_SID, CallSid: sid(), From: config.TRIAL_VERIFIED_CALLER,
      To: config.TRIAL_TWILIO_NUMBER, Direction: 'inbound' };
    const post = (step: string, fields = {}) => app!.inject({ method: 'POST', url: `/trial/${config.TRIAL_PROXY_SECRET}/${step}`,
      headers: { 'content-type': 'application/x-www-form-urlencoded' }, payload: new URLSearchParams({ ...payload, ...fields }).toString() });
    await post('inbound');
    const intro = await post('introduction', { SpeechResult: 'An appointment reminder tomorrow.' });
    expect(intro.body).toContain('<Say'); expect(intro.body).toContain('<Pause length="1"/>'); expect(intro.body).not.toContain('<Play');
    const first = await post('result'); expect(first.body).toContain('<Pause length="1"/>');
    now += 200; const id = await callId();
    await store.processJob(`prepare-${id}`, { version: 'prepare', async extract() { throw new Error('Preparation must not call a model'); } });
    await store.processJob(id, { version: 'test', async extract() { now += 500; return routine; } });
    const result = await post('result');
    expect(result.body).toContain('<Say'); expect(result.body).toContain('routine'); expect(result.body).not.toMatch(/<Play|<Pause|<Redirect/);
    expect((await store.callRef(id).get()).data()!.timings).toEqual({ queueMs: 200, modelMs: 500 });
    expect((await db.collection('screeningJobs').get()).empty).toBe(true);
  });
  it('restricts history and checks to an owner or accepted caregiver', async () => {
    await store.beginCall(sid()); const id = await callId();
    expect((await app!.inject({ url: '/api/overview' })).statusCode).toBe(401);
    expect((await app!.inject({ url: `/api/calls/${id}`, headers: headers('stranger') })).statusCode).toBe(403);
    const result = await app!.inject({ url: `/api/calls/${id}`, headers: headers() }); expect(result.statusCode).toBe(200);
    expect(result.json().call.id).toBe(id); expect(result.json().call.voicemail).toBeNull();
    const native = await app!.inject({ url: `/api/calls/${id.toUpperCase()}`, headers: {
      authorization: 'Bearer owner', 'x-shield-participant': config.TRIAL_PARTICIPANT_ID.toUpperCase() } });
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
    await store.beginCall(sid()); const id = await callId(); now += 31 * 86400_000;
    expect((await app!.inject({ url: '/api/calls', headers: headers() })).json().calls).toEqual([]);
    expect((await app!.inject({ url: `/api/calls/${id}`, headers: headers() })).statusCode).toBe(404);
    await store.cleanup(); expect((await store.callRef(id).get()).exists).toBe(false);
  });
  it('commits quota groups atomically under contention', async () => {
    const outcomes = await Promise.allSettled(Array.from({ length: 8 }, () => store.quota([['paid-global', 3], ['paid-owner', 5]])));
    expect(outcomes.filter(value => value.status === 'fulfilled')).toHaveLength(3);
    expect((await db.collection('usage').get()).docs.map(doc => doc.data().used).sort()).toEqual([3, 3]);
  });
});
