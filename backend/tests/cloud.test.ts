import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { CloudStore } from '../src/cloud/store.js';
import { cloudSchema } from '../src/cloud/config.js';
import { buildCloudApp } from '../src/cloud/app.js';
import { HttpError, type AuthProvider } from '../src/auth.js';
import { extractionSchema, type Screener } from '../src/screening.js';
import { digest, loadSpeechConfig, recipeHash, trialPrompts } from '../src/speech.js';

const enabled = !!process.env.FIRESTORE_EMULATOR_HOST;
describe.skipIf(!enabled)('Firebase serverless integration (Firestore emulator)', () => {
  const config = cloudSchema.parse({ FIREBASE_WEB_API_KEY: 'emulator-test', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app',
    TWILIO_ACCOUNT_SID: `AC${'a'.repeat(32)}`, TWILIO_AUTH_TOKEN: 'b'.repeat(32), TRIAL_PROXY_SECRET: 'c'.repeat(64),
    TRIAL_TWILIO_NUMBER: '+17372583478', TRIAL_VERIFIED_CALLER: '+15127697536',
    TRIAL_PARTICIPANT_ID: 'b0b7af93-72ad-431d-9708-f1d9564a2b36', DATA_ENCRYPTION_KEY: 'd'.repeat(64) });
  const admin = initializeApp({ projectId: 'demo-shield' }, 'cloud-tests');
  const db = getFirestore(admin);
  let now: number; let store: CloudStore; let speechDirectory: string;
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
  beforeAll(async () => {
    speechDirectory = await mkdtemp(`${tmpdir()}/shield-speech-test-`);
    const bytes = Buffer.alloc(128); bytes.write('ID3'); const sha256 = digest(bytes);
    await writeFile(`${speechDirectory}/${sha256}.mp3`, bytes);
    const speech = loadSpeechConfig({ TTS_PROVIDER: 'soniox' });
    await writeFile(`${speechDirectory}/manifest.json`, JSON.stringify({ version: 1,
      entries: Object.fromEntries((Object.keys(trialPrompts) as (keyof typeof trialPrompts)[]).map(id => [id, { recipe: recipeHash(speech, id), sha256, file: `${sha256}.mp3` }])) }));
  });
  beforeEach(async () => {
    if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST!)) throw new Error('Expected local emulator');
    const cleared = await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-shield/databases/(default)/documents`, { method: 'DELETE' });
    if (!cleared.ok) throw new Error('Emulator reset failed');
    now = Date.now(); store = new CloudStore(db, config, () => now);
    await store.personRef(config.TRIAL_PARTICIPANT_ID).set({ id: config.TRIAL_PARTICIPANT_ID, ownerUid: 'owner', status: 'setup',
      nameEnc: store.vault.seal('Isaac', `person:${config.TRIAL_PARTICIPANT_ID}:name`),
      phoneEnc: store.vault.seal(config.TRIAL_VERIFIED_CALLER, `person:${config.TRIAL_PARTICIPANT_ID}:phone`) });
    await db.doc('trial/control').set({ enabled: true, used: 0, expiresAt: now + 3600_000 });
    app = await buildCloudApp(store, { auth, speechDirectory, lookupCall: async id => ({ sid: id, accountSid: config.TWILIO_ACCOUNT_SID,
      from: config.TRIAL_VERIFIED_CALLER, to: config.TRIAL_TWILIO_NUMBER, direction: 'inbound', status: 'in-progress', dateCreated: new Date(now) }) });
  });
  afterEach(async () => { await app?.close(); app = undefined; });
  afterAll(async () => { await db.terminate(); await deleteApp(admin); await rm(speechDirectory, { recursive: true, force: true }); });

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
  it('deduplicates inbound, introductions, job delivery and final playback', async () => {
    expect(await store.beginCall(sid())).toBe('accepted'); expect(await store.beginCall(sid())).toBe('duplicate');
    const intros = await Promise.all([store.introduction(sid(), 'Appointment tomorrow'), store.introduction(sid(), 'Replay')]);
    expect(intros.sort()).toEqual(['duplicate', 'queued']); const id = await callId(); let requests = 0;
    const screener: Screener = { version: 'test', async extract() { requests++; return routine; } };
    await Promise.all([store.processJob(id, screener), store.processJob(id, screener)]);
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
    for (let i = 0; i < 5; i++) expect((await store.result(sid())).kind).toBe('wait');
    expect((await store.result(sid())).decision?.reason).toBe('screening_unavailable');
    let ran = false; await store.processJob(id, { version: 'late', async extract() { ran = true; return routine; } }); expect(ran).toBe(false);
  });
  it('rejects the wrong webhook secret or caller before creating records', async () => {
    const payload = { AccountSid: config.TWILIO_ACCOUNT_SID, CallSid: sid(), From: config.TRIAL_VERIFIED_CALLER, To: config.TRIAL_TWILIO_NUMBER, Direction: 'inbound' };
    expect((await app!.inject({ method: 'POST', url: '/trial/wrong/inbound', payload })).statusCode).toBe(403);
    expect((await app!.inject({ method: 'POST', url: `/trial/${config.TRIAL_PROXY_SECRET}/inbound`, payload: { ...payload, From: '+13125550148' } })).statusCode).toBe(403);
    expect((await db.collection('callSessions').get()).empty).toBe(true);
    const valid = await app!.inject({ method: 'POST', url: `/trial/${config.TRIAL_PROXY_SECRET}/inbound`, headers: { 'content-type': 'application/x-www-form-urlencoded' }, payload: new URLSearchParams(payload).toString() });
    expect(valid.statusCode).toBe(200); expect(valid.body).toContain('<Gather'); expect(valid.body).toContain('<Play>');
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
