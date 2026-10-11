import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID, generateKeyPairSync } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { CloudStore } from '../src/cloud/store.js';
import { cloudSchema, RETENTION_MS } from '../src/cloud/config.js';
import { buildCloudApp } from '../src/cloud/app.js';
import { ingestForwardingRecording } from '../src/cloud/forwarding-recordings.js';
import { VoicemailCheck, VOICEMAIL_LIMITS, type VoicemailModel } from '../src/cloud/voicemail-check.js';
import { HttpError, type AuthProvider } from '../src/auth.js';

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('Voicemail keep-or-remove (Firestore emulator)', () => {
  const project = 'demo-shield-voicemail';
  const base = { FIREBASE_WEB_API_KEY: 'test', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app',
    TRIAL_PROXY_SECRET: 'c'.repeat(64), DATA_ENCRYPTION_KEY: 'd'.repeat(64),
    TELNYX_ACCOUNT_ID: 'fe8d2922-2dcf-4461-87bc-17a539688c31', TELNYX_API_KEY: 'test'.repeat(8), TELNYX_PUBLIC_KEY: `${'A'.repeat(43)}=`,
    TELNYX_APPLICATION_ID: '123456789012345678', VOICEMAIL_SCREENING_ENABLED: true,
    APNS: { keyId: 'ABCDEF1234', teamId: '6R6HMW3DWN', privateKey: generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() } };
  const admin = initializeApp({ projectId: project }, 'voicemail-tests'), db = getFirestore(admin);
  const PERSON = 'b0b7af93-72ad-431d-9708-f1d9564a2b36', PHONE = '+12025550101';
  const id = PERSON, caller = '+12025550102';
  const auth: AuthProvider = {
    async identify(token) { if (!['owner', 'helper', 'stranger'].includes(token)) throw new HttpError(401, 'sign_in_required'); return { subject: token }; },
    async requestCode() {}, async verifyCode() { return {}; }, async refresh() { return {}; }, async logout() {}
  };
  let now: number, s: CloudStore, app: Awaited<ReturnType<typeof buildCloudApp>>, check: VoicemailCheck;
  const headers = (uid = 'owner') => ({ authorization: `Bearer ${uid}`, 'x-shield-participant': id });
  const model = (verdict: 'keep' | 'scam' | 'junk' | 'fail'): VoicemailModel & { transcribe: ReturnType<typeof vi.fn> } => ({
    transcribe: vi.fn(async () => verdict === 'fail' ? undefined : 'A synthetic message.'),
    decide: vi.fn(async () => ({ keep: verdict === 'keep' ? 0.95 : 0.02, scam: verdict === 'scam' ? 0.96 : 0.01, junk: verdict === 'junk' ? 0.97 : 0.02 }))
  });
  /** A forwarded call whose voicemail audio is stored and waiting for its check. */
  const seed = async (from = caller) => {
    const call = randomUUID();
    await s.callRef(call).set({ id: call, participantId: id, source: 'forwarding', provider: 'telnyx', parentSid: randomUUID(), eligible: false,
      createdAt: now, expiresAt: now + RETENTION_MS, callerEnc: s.vault.seal(from, `call:${call}:caller`), state: 'ended', outcome: 'voicemail',
      reason: 'uncertain', purpose: null, completedAt: now, events: [{ kind: 'voicemail_received', at: now }],
      voicemail: { id: call, duration: 22, status: 'pending', heardAt: null } });
    await db.collection('forwardingAudio').doc(call).set({ participantId: id, expiresAt: now + RETENTION_MS,
      audioEnc: s.vault.seal(Buffer.from('mp3 bytes').toString('base64'), `voicemail:${call}`) });
    await check.jobRef(call).set({ callId: call, createdAt: now, expiresAt: now + RETENTION_MS });
    return call;
  };
  const call = async (call: string) => (await s.callRef(call).get()).data()!;
  const listed = async (call: string) => (await app.inject({ url: '/api/calls', headers: headers() })).json().calls.find((c: { id: string }) => c.id === call);
  const alerts = async () => (await db.collection('alerts').get()).docs.map(d => d.data().kind);

  beforeEach(async () => {
    if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST!)) throw new Error('Local emulator required');
    await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: 'DELETE' });
    now = Date.now(); s = new CloudStore(db, cloudSchema.parse(base), () => now); check = new VoicemailCheck(s);
    app = await buildCloudApp(s, { auth });
    await s.personRef(id).set({ id, ownerUid: 'owner', status: 'setup', nameEnc: s.vault.seal('Margaret', `person:${id}:name`),
      phoneEnc: s.vault.seal(PHONE, `person:${id}:phone`), shieldNumber: '+12025550109' });
    const grant = randomUUID();
    await db.collection('grants').doc(grant).set({ participantId: id, granteeUid: 'helper', canListen: false, acceptedAt: now, revokedAt: null, expiresAt: now });
    await s.memberRef(id, 'helper').set({ participantId: id, granteeUid: 'helper', grantId: grant });
  });
  afterEach(async () => { await app.close(); });
  afterAll(async () => { await db.terminate(); await deleteApp(admin); });

  it('holds a newly stored message for its check instead of showing it', async () => {
    const callId = randomUUID(), recording = 'ab123456-1234-4321-1234-000000000001';
    await s.callRef(callId).set({ id: callId, participantId: id, source: 'forwarding', createdAt: now, expiresAt: now + RETENTION_MS, events: [] });
    await db.collection('forwardingRecordings').doc(recording).set({ callId, participantId: id, recordingSid: recording, provider: 'telnyx',
      parentSid: randomUUID(), duration: 12, status: 'pending', expiresAt: now + RETENTION_MS, createdAt: now });
    const provider = { fetch: async () => new Response(Buffer.from('mp3'), { headers: { 'content-type': 'audio/mpeg' } }), remove: vi.fn(async () => {}) };
    await ingestForwardingRecording(s, recording, provider);
    expect((await call(callId)).voicemail).toMatchObject({ status: 'pending' });
    expect((await check.jobRef(callId).get()).exists).toBe(true);
    expect(await alerts()).toEqual([]); expect(provider.remove).toHaveBeenCalledOnce();
  });
  it('shows and alerts a new message at once while voicemail screening is off', async () => {
    const off = new CloudStore(db, cloudSchema.parse({ ...base, VOICEMAIL_SCREENING_ENABLED: false }), () => now);
    const callId = randomUUID(), recording = 'ab123456-1234-4321-1234-000000000002';
    await s.callRef(callId).set({ id: callId, participantId: id, source: 'forwarding', createdAt: now, expiresAt: now + RETENTION_MS, events: [] });
    await db.collection('forwardingRecordings').doc(recording).set({ callId, participantId: id, recordingSid: recording, provider: 'telnyx',
      parentSid: randomUUID(), duration: 12, status: 'pending', expiresAt: now + RETENTION_MS, createdAt: now });
    await ingestForwardingRecording(off, recording, { fetch: async () => new Response(Buffer.from('mp3'), { headers: { 'content-type': 'audio/mpeg' } }), remove: async () => {} });
    expect((await call(callId)).voicemail).toMatchObject({ status: 'ready' });
    expect((await check.jobRef(callId).get()).exists).toBe(false); expect(await alerts()).toEqual(['voicemail']);
  });
  it('shows and alerts a kept message', async () => {
    const callId = await seed(); await check.check(callId, model('keep'));
    expect((await call(callId)).voicemail.status).toBe('ready');
    expect(await alerts()).toEqual(['voicemail']); expect((await check.jobRef(callId).get()).exists).toBe(false);
  });
  it('removes a confident scam at once, blocks playback, and lets someone who can listen restore it within 7 days', async () => {
    const callId = await seed(); await check.check(callId, model('scam'));
    expect(await call(callId)).toMatchObject({ outcome: 'held', voicemail: { status: 'removed', removedAs: 'scam', removedAt: now } });
    expect(await alerts()).toEqual(['voicemail_removed']);
    expect((await db.collection('forwardingAudio').doc(callId).get()).data()!.expiresAt).toBe(now + VOICEMAIL_LIMITS.purgeMs);
    expect(await listed(callId)).toMatchObject({ title: 'Scam voicemail removed', outcome: 'held',
      voicemail: { status: 'removed', restorableUntil: new Date(now + VOICEMAIL_LIMITS.purgeMs).toISOString() } });
    expect((await app.inject({ url: '/api/calls?filter=voicemail', headers: headers() })).json().calls).toHaveLength(0);
    expect((await app.inject({ url: `/api/voicemails/${callId}/audio`, headers: headers() })).statusCode).toBe(409);
    expect((await app.inject({ method: 'POST', url: `/api/voicemails/${callId}/restore`, headers: headers('helper') })).statusCode).toBe(403);
    now += VOICEMAIL_LIMITS.purgeMs - 1;
    expect((await app.inject({ method: 'POST', url: `/api/voicemails/${callId}/restore`, headers: headers() })).json()).toEqual({ restored: true });
    expect(await call(callId)).toMatchObject({ outcome: 'voicemail', voicemail: { status: 'ready' } });
    expect((await db.collection('forwardingAudio').doc(callId).get()).data()!.expiresAt).toBe((await call(callId)).expiresAt);
    expect((await app.inject({ url: `/api/voicemails/${callId}/audio`, headers: headers() })).body).toBe('mp3 bytes');
  });
  it('purges a removed message after 7 days, after which it cannot be restored', async () => {
    const callId = await seed(); await check.check(callId, model('junk'));
    expect(await alerts()).toEqual([]);
    expect(await listed(callId)).toMatchObject({ title: 'Junk voicemail removed' });
    now += VOICEMAIL_LIMITS.purgeMs; await s.cleanup();
    expect((await db.collection('forwardingAudio').doc(callId).get()).exists).toBe(false);
    expect((await app.inject({ method: 'POST', url: `/api/voicemails/${callId}/restore`, headers: headers() })).statusCode).toBe(409);
  });
  it('keeps a saved contact\'s message without sending it to a model', async () => {
    await s.personRef(id).collection('trusted-numbers').add({ phoneHash: s.vault.hash(caller), enabled: true });
    const callId = await seed(), scam = model('scam'); await check.check(callId, scam);
    expect(scam.transcribe).not.toHaveBeenCalled(); expect((await call(callId)).voicemail.status).toBe('ready');
  });
  it('keeps the message when transcription fails or the model throws', async () => {
    const failed = await seed(); await check.check(failed, model('fail'));
    expect((await call(failed)).voicemail.status).toBe('ready');
    const thrown = await seed(); await check.check(thrown, { transcribe: async () => 'words', decide: async () => { throw new Error('boom'); } });
    expect((await call(thrown)).voicemail.status).toBe('ready');
  });
  it('leaves a message alone if it was deleted during the check', async () => {
    const callId = await seed();
    await check.check(callId, { transcribe: async () => { await app.inject({ method: 'DELETE', url: `/api/voicemails/${callId}`, headers: headers() }); return 'words'; },
      decide: async () => ({ keep: 0, scam: 1, junk: 0 }) });
    expect((await call(callId)).voicemail).toBeUndefined(); expect(await alerts()).toEqual([]);
  });
  it('keeps a message whose check never ran, once it is an hour old', async () => {
    const callId = await seed(); await check.releaseStale();
    expect((await call(callId)).voicemail.status).toBe('pending');
    now += 3600_001; await check.releaseStale();
    expect((await call(callId)).voicemail.status).toBe('ready');
  });
});
