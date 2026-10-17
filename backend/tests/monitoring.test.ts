import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { generateKeyPairSync, sign } from 'node:crypto';
import { enroll } from './enroll.js';
import { CloudStore } from '../src/cloud/store.js';
import { ForwardingStore, forwardingConsent } from '../src/cloud/forwarding-store.js';
import { ForwardingLive } from '../src/cloud/forwarding-live.js';
import { CallMonitor, MONITOR_POLICY_VERSION, MONITORING_CONSENT, type Assessment } from '../src/cloud/monitoring.js';
import { cloudSchema } from '../src/cloud/config.js';
import { buildCloudApp } from '../src/cloud/app.js';
import type { AuthProvider } from '../src/auth.js';
import { dispatchMonitorCheck } from '../src/cloud/monitor-queue.js';

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('Connected-call protection (Firestore emulator)', () => {
  const project = 'demo-shield-monitoring';
  const keys = generateKeyPairSync('ed25519');
  const base = { FIREBASE_WEB_API_KEY: 'test', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app',
    TRIAL_PROXY_SECRET: 'c'.repeat(64), DATA_ENCRYPTION_KEY: 'd'.repeat(64),
    LIVE_SCREENING_ENABLED: true, LIVE_BRIDGE_URL: 'https://shield-live-test.a.run.app', TELNYX_ACCOUNT_ID: 'fe8d2922-2dcf-4461-87bc-17a539688c31', TELNYX_API_KEY: 'test'.repeat(8),
    TELNYX_APPLICATION_ID: '123456789012345678',
    TELNYX_PUBLIC_KEY: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64') };
  let config = cloudSchema.parse({ ...base, CALL_MONITORING_ENABLED: true });
  const PERSON = 'b0b7af93-72ad-431d-9708-f1d9564a2b36', NUMBER = '+12025550109', PHONE = '+12025550101';
  const number = NUMBER;
  const admin = initializeApp({ projectId: project }, 'monitoring-tests'), db = getFirestore(admin);
  const sid = (n = 1) => `10123456-1234-4321-1234-${n.toString(16).padStart(12, '0')}`;
  const from = '+12025550102';
  let now: number, s: CloudStore, f: ForwardingStore, monitor: CallMonitor, app: Awaited<ReturnType<typeof buildCloudApp>>;
  const update = vi.fn<(sid: string, body: Record<string, string>) => Promise<void>>();
  const auth: AuthProvider = { async identify(token) { return { subject: token }; }, async requestCode() {}, async verifyCode() { return {}; }, async refresh() { return {}; }, async logout() {}, async deleteAccount() {} };
  const headers = (uid = 'owner') => ({ authorization: `Bearer ${uid}`, 'x-shield-participant': PERSON });
  const post = (step: string, extra: Record<string, string> = {}, signed = true) => {
    const url = `/forwarding/${config.TRIAL_PROXY_SECRET}/${step}`;
    const params = { AccountSid: config.TELNYX_ACCOUNT_ID!, CallSid: sid(), From: from, To: number, Direction: 'inbound', ...extra };
    const payload = new URLSearchParams(params).toString(), timestamp = Math.floor(now / 1000).toString();
    return app.inject({ method: 'POST', url, headers: { 'content-type': 'application/x-www-form-urlencoded', ...(signed
      ? { 'telnyx-signature-ed25519': sign(null, Buffer.from(`${timestamp}|${payload}`), keys.privateKey).toString('base64'), 'telnyx-timestamp': timestamp } : {}) }, payload });
  };
  const optIn = (enabled = true) => app.inject({ method: 'POST', url: '/api/forwarding/monitoring', headers: headers(),
    payload: enabled ? { enabled: true, version: MONITORING_CONSENT } : { enabled: false } });
  /** Approve a routine caller through live screening, offer it, bind her leg and press 1. Returns the call id and the offer TeXML. */
  const connect = async (accept = true) => {
    await post('inbound'); const c = (await f.find(sid()))!; const live = new ForwardingLive(f); await live.claim(c.id);
    await live.finish(c.id, { action: 'approve', reason: 'routine', purpose: 'personal', evidence: 'lunch tomorrow', hasName: true, hasReason: true });
    const offer = (await post('result')).body;
    await post(`child/${c.id}`, { CallSid: sid(2), ParentCallSid: sid(), From: number, To: PHONE, CallStatus: 'ringing' });
    await post(`whisper/${c.id}`, { CallSid: sid(2) });
    if (accept) await post(`accept/${c.id}`, { CallSid: sid(2), Digits: '1' });
    return { id: c.id, offer };
  };
  const heard = (id: string, text: string, extra: Record<string, string> = {}) => post(`monitor/${id}`, { Transcript: text, IsFinal: 'true', ...extra });
  const jobs = async () => (await db.collection('monitorChecks').get()).docs;
  const build = async () => {
    s = new CloudStore(db, config, () => now); f = new ForwardingStore(s); monitor = new CallMonitor(f, { update });
    app = await buildCloudApp(s, { auth, warmLiveBridge: () => {}, callMonitor: monitor, lookupForwardingChild: async () => ({ parentCallSid: sid(), from: number,
      to: PHONE, status: 'in-progress' }), lookupForwardingInbound: async () => ({ from, to: number, status: 'in-progress', direction: 'inbound' }) });
  };
  beforeEach(async () => {
    if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST!)) throw new Error('Local emulator required');
    await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: 'DELETE' });
    update.mockReset().mockResolvedValue(undefined);
    config = cloudSchema.parse({ ...base, CALL_MONITORING_ENABLED: true });
    now = Date.now(); await build();
    await enroll(s, { id: PERSON, uid: 'owner', phone: PHONE, shieldNumber: NUMBER, now });
  });
  afterEach(async () => { await app.close(); });
  afterAll(async () => { await db.terminate(); await deleteApp(admin); });

  it('is off until the owner opts in with the current consent, and only when the service offers it', async () => {
    expect((await app.inject({ url: '/api/forwarding', headers: headers() })).json().monitoring).toEqual({ available: true, enabled: false, consentVersion: MONITORING_CONSENT, choiceRecorded: false });
    expect((await app.inject({ method: 'POST', url: '/api/forwarding/monitoring', headers: headers(), payload: { enabled: true } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/api/forwarding/monitoring', headers: headers(), payload: { enabled: true, version: 'old' } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/api/forwarding/monitoring', headers: headers('stranger'), payload: { enabled: true, version: MONITORING_CONSENT } })).statusCode).toBeGreaterThanOrEqual(403);
    expect((await optIn()).json()).toEqual({ enabled: true });
    expect((await app.inject({ url: '/api/forwarding', headers: headers() })).json().monitoring).toMatchObject({ enabled: true, choiceRecorded: true });
    expect((await optIn(false)).json()).toEqual({ enabled: false });
    expect((await app.inject({ url: '/api/forwarding', headers: headers() })).json().monitoring).toMatchObject({ enabled: false, choiceRecorded: true });
    await app.close(); config = cloudSchema.parse(base); await build();
    expect((await app.inject({ url: '/api/forwarding', headers: headers() })).json().monitoring).toMatchObject({ available: false, enabled: false });
    expect((await optIn()).statusCode).toBe(409);
  });
  it('asks for the onboarding choice again when an enabled consent is outdated', async () => {
    await s.personRef(PERSON).update({ callMonitoring: { enabled: true, consent: 'old' } });
    expect((await app.inject({ url: '/api/forwarding', headers: headers() })).json().monitoring)
      .toMatchObject({ enabled: false, choiceRecorded: false });
    expect((await optIn()).statusCode).toBe(200);
    expect((await app.inject({ url: '/api/forwarding', headers: headers() })).json().monitoring)
      .toMatchObject({ enabled: true, choiceRecorded: true });
  });
  it('offers calls exactly as before when the owner has not opted in', async () => {
    const { id, offer } = await connect();
    expect(offer).toContain('<Dial'); expect(offer).not.toContain('Transcription'); expect(offer).not.toContain('transcribe');
    await heard(id, 'Read me the code we texted you.');
    expect((await db.collection('monitoredCalls').doc(id).get()).exists).toBe(false);
    expect(await jobs()).toHaveLength(0);
  });
  it('discloses to the caller, then transcribes both sides with the configured engine', async () => {
    await optIn(); const { id, offer } = await connect(false);
    expect(offer).toMatch(/03-hold-monitoring\.wav<\/Play><Start><Transcription/);
    expect(offer).toContain('transcriptionEngine="Soniox"'); expect(offer).toContain('model="soniox/stt-rt-v4"'); expect(offer).toContain('transcriptionTracks="both"');
    expect(offer).toContain(`transcriptionCallback="${config.PUBLIC_BASE_URL}/forwarding/${config.TRIAL_PROXY_SECRET}/monitor/${id}"`);
    expect((await s.callRef(id).get()).data()!.monitoringStartedAt).toBe(now);
    // Before she presses 1 nothing is kept: hold music, whispers and ringing are not her conversation.
    await heard(id, 'Hello? Is anyone there?');
    expect((await db.collection('monitoredCalls').doc(id).get()).exists).toBe(false);
  });
  it('keeps only final, signed, same-call speech encrypted, coalescing updates before spending a check', async () => {
    await optIn(); const { id } = await connect();
    expect((await post(`monitor/${id}`, { Transcript: 'unsigned words', IsFinal: 'true' }, false)).statusCode).toBe(403);
    await heard(id, 'partial words', { IsFinal: 'false' });
    await heard(id, 'Another call', { CallSid: sid(9) });
    expect((await db.collection('monitoredCalls').doc(id).get()).exists).toBe(false);
    await heard(id, 'Hi, it is Dan from the bank.', { Track: 'inbound' });
    await heard(id, 'Oh, hello Dan.', { Track: 'outbound' });
    const stored = (await db.collection('monitoredCalls').doc(id).get()).data()!;
    expect(JSON.stringify(stored)).not.toContain('Dan');
    expect(s.vault.open(stored.transcriptEnc, `monitor:${id}`)).toBe('Caller: Hi, it is Dan from the bank.\nRecipient: Oh, hello Dan.');
    expect(stored.heardAt).toEqual([now, now]);
    await heard(id, 'How can I help?', { Track: 'outbound' });
    expect(await jobs()).toHaveLength(1);
    expect(stored.checks).toBe(0);
  });
  it('schedules speech arriving during a check and checks its latest words even if the speakers then go quiet', async () => {
    await optIn(); const { id } = await connect();
    await heard(id, 'Hi Grandma, it is Emma.');
    await monitor.check(`${id}-1`, async () => {
      await heard(id, 'How are you doing?');
      await heard(id, 'Can you pick me up from practice at five?');
      expect((await jobs()).map(d => d.id).sort()).toEqual([`${id}-1`, `${id}-2`]);
      return { action: 'continue', concern: 'none', evidence: '' };
    });
    expect((await jobs()).map(d => d.id)).toEqual([`${id}-2`]);
    const assess = vi.fn(async (): Promise<Assessment> => ({ action: 'continue', concern: 'none', evidence: '' }));
    await expect(monitor.check(`${id}-2`, assess)).rejects.toThrow('monitor_check_not_due');
    expect(assess).not.toHaveBeenCalled();
    now += 5000;
    // Simulate a cold task worker, not an in-memory timer or another transcript callback.
    await new CallMonitor(f, { update }).check(`${id}-2`, assess);
    expect(assess.mock.calls[0]![0]).toContain('practice at five');
    expect(await jobs()).toHaveLength(0);
  });
  it('recovers a crashed worker without another transcript, charging its abandoned attempt to the old window', async () => {
    await optIn(); const { id } = await connect();
    await heard(id, 'Hi, it is Dan.');
    const ref = db.collection('monitoredCalls').doc(id), m = (await ref.get()).data()!;
    delete m.pending;
    await ref.set({ ...m, checks: 1, lastSlot: 0, lastCheckAt: now,
      running: { [`${id}-1`]: { until: now + 45000, chars: m.chars, token: 'crashed' } } });
    const assess = vi.fn(async (): Promise<Assessment> => ({ action: 'continue', concern: 'none', evidence: '' }));
    await expect(monitor.check(`${id}-1`, assess)).rejects.toThrow('monitor_check_busy');
    now += 45_001;
    await monitor.check(`${id}-1`, assess);
    expect(assess).not.toHaveBeenCalled();
    expect((await jobs()).map(d => d.id)).toEqual([`${id}-2`]);
    await monitor.check(`${id}-2`, assess);
    expect(assess).toHaveBeenCalledOnce();
    expect((await ref.get()).data()!.checks).toBe(2);
  });
  it('records when the quoted request arrived and when the warning started, without its words', async () => {
    await optIn(); const { id } = await connect();
    await heard(id, 'Hi Margaret, it is Dan from the bank.', { Track: 'inbound' });
    now += 2000; const requestAt = now;
    await heard(id, 'Read me the six digit code we just texted you.', { Track: 'inbound' });
    now += 1500;
    await monitor.check(`${id}-1`, async () => ({ action: 'intervene', concern: 'code_or_password', evidence: 'read me the six digit code' }));
    const call = (await s.callRef(id).get()).data()!;
    expect(call).toMatchObject({ monitorPolicyVersion: MONITOR_POLICY_VERSION, monitorEvidenceAt: requestAt, monitorIntervenedAt: now, monitorRedirectedAt: now });
    expect(JSON.stringify(call)).not.toContain('six digit');
  });
  it('leaves the arrival time out when the quote cannot be placed', async () => {
    await optIn(); const { id } = await connect();
    await heard(id, 'This is the fraud team. Read me the code.');
    await monitor.intervene(id, 'code_or_password');
    const call = (await s.callRef(id).get()).data()!;
    expect(call.monitorEvidenceAt).toBeUndefined(); expect(call.monitorRedirectedAt).toBe(now);
  });
  it('re-checks speech that arrived during a check and keeps a real conversation going', async () => {
    await optIn(); const { id } = await connect();
    await heard(id, 'Hi Grandma, it is Emma.');
    const [job] = await jobs();
    const assess = vi.fn(async (): Promise<Assessment> => {
      await heard(id, 'Can you pick me up from practice at five?');
      return { action: 'continue', concern: 'none', evidence: '' };
    });
    await monitor.check(job!.id, assess);
    expect(assess).toHaveBeenCalledOnce(); expect(update).not.toHaveBeenCalled();
    const next = await jobs();
    expect(next.map(d => d.id)).toEqual([`${id}-2`]);
    now += 5000;
    await monitor.check(`${id}-2`, async () => undefined);
    // A provider failure isn't a successful review. Retry in the next reserved window, not immediately.
    expect((await jobs()).map(d => d.id)).toEqual([`${id}-3`]);
    now += 5000;
    await monitor.check(`${id}-3`, async () => ({ action: 'continue', concern: 'none', evidence: '' }));
    expect(await jobs()).toHaveLength(0);
    expect((await s.callRef(id).get()).data()!.monitorIntervenedAt).toBeUndefined();
  });
  it('does not end a call on an invented quote', async () => {
    await optIn(); const { id } = await connect();
    await heard(id, 'I will see you at church on Sunday.');
    const [job] = await jobs();
    await monitor.check(job!.id, async () => ({ action: 'intervene', concern: 'code_or_password', evidence: 'read me the code' }));
    expect(update).not.toHaveBeenCalled();
    expect((await s.callRef(id).get()).data()!.monitorIntervenedAt).toBeUndefined();
  });
  it('ends a clear scam with a spoken warning to her only, then forgets the transcript', async () => {
    await optIn(); const { id } = await connect();
    await heard(id, 'This is the fraud team. Read me the six digit code we just texted you.');
    const [job] = await jobs();
    await monitor.check(job!.id, async () => ({ action: 'intervene', concern: 'code_or_password', evidence: 'Read me the six digit code' }));
    expect(update).toHaveBeenCalledExactlyOnceWith(sid(2), { Url: `${config.PUBLIC_BASE_URL}/forwarding/${config.TRIAL_PROXY_SECRET}/monitor-warning/${id}`, Method: 'POST' });
    expect((await db.collection('monitoredCalls').doc(id).get()).exists).toBe(false);
    // Later speech and checks are ignored once Shield has stepped in.
    await heard(id, 'Hello? Are you still there?');
    expect((await db.collection('monitoredCalls').doc(id).get()).exists).toBe(false);
    expect((await post(`monitor-warning/${id}`, { CallSid: sid() })).body).not.toContain('code or password');
    const warning = (await post(`monitor-warning/${id}`, { CallSid: sid(2) })).body;
    expect(warning).toContain('/warning-code_or_password.wav'); expect(warning).not.toContain('six digit'); expect(warning).toContain('<Hangup');
    expect((await post(`dial-ended/${id}`, { DialCallSid: sid(2), DialCallStatus: 'completed' })).body).not.toContain('<Record');
    const calls = (await app.inject({ url: '/api/calls?filter=connected', headers: headers() })).json().calls;
    expect(calls[0]).toMatchObject({ title: 'Shield ended a connected call', reasonCode: 'monitor_intervened', monitored: true });
  });
  it('blocks the caller\'s number and sets caution once Shield ends a connected call', async () => {
    await optIn(); const { id } = await connect();
    await heard(id, 'Read me the six digit code we just texted you.');
    await monitor.check((await jobs())[0]!.id, async () => ({ action: 'intervene', concern: 'code_or_password', evidence: 'Read me the six digit code' }));
    const entry = (await s.personRef(PERSON).collection('blocked-numbers').doc(s.vault.hash(from)).get()).data();
    expect(entry).toMatchObject({ reason: 'monitor_intervened', sourceCallId: id });
    expect((await s.personRef(PERSON).get()).data()!.scamStoppedAt).toBe(now);
    await post('dial-ended/' + id, { DialCallSid: sid(2), DialCallStatus: 'completed' });
    expect((await post('inbound', { CallSid: sid(5) })).body).toContain('/08-cannot-connect.wav');
  });
  it('ends the whole call if her leg cannot be redirected to the warning', async () => {
    await optIn(); const { id } = await connect();
    update.mockRejectedValueOnce(new Error('telnyx_http_422'));
    await heard(id, 'Go buy three Apple gift cards and read me the numbers.');
    await monitor.check((await jobs())[0]!.id, async () => ({ action: 'intervene', concern: 'payment_or_transfer', evidence: 'buy three Apple gift cards' }));
    expect(update).toHaveBeenLastCalledWith(sid(), { Status: 'completed' });
    expect((await s.callRef(id).get()).data()!.monitorConcern).toBe('payment_or_transfer');
  });
  it('deletes the transcript when an unremarkable call ends', async () => {
    await optIn(); const { id } = await connect();
    await heard(id, 'See you Sunday, love you.');
    expect((await db.collection('monitoredCalls').doc(id).get()).exists).toBe(true);
    await post(`dial-ended/${id}`, { DialCallSid: sid(2), DialCallStatus: 'completed' });
    expect((await db.collection('monitoredCalls').doc(id).get()).exists).toBe(false);
    const assess = vi.fn();
    await monitor.check(`${id}-1`, assess);
    expect(assess).not.toHaveBeenCalled(); expect(await jobs()).toHaveLength(0);
  });

  it('never pays twice for duplicate task delivery, including concurrent delivery', async () => {
    await optIn(); const { id } = await connect(); await heard(id, 'Can you give me a ride home?');
    let finish!: (a: Assessment) => void, entered!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const assess = vi.fn(() => new Promise<Assessment>(resolve => { finish = resolve; entered(); }));
    const first = monitor.check(`${id}-1`, assess); await started;
    await expect(monitor.check(`${id}-1`, assess)).rejects.toThrow('monitor_check_busy');
    finish({ action: 'continue', concern: 'none', evidence: '' }); await first;
    await monitor.check(`${id}-1`, assess);
    expect(assess).toHaveBeenCalledOnce();
    expect((await monitor.monitorRef(id).get()).data()!.checks).toBe(1);
  });

  it('keeps old API jobs working during promotion and switches their follow-up to the new cadence', async () => {
    await optIn(); const { id } = await connect(); await heard(id, 'This is Lee, your neighbor.');
    const ref = monitor.monitorRef(id), doc = (await ref.get()).data()!;
    for (const key of ['pending', 'cadenceVersion', 'startedAt', 'queued']) delete doc[key];
    await ref.set({ ...doc, checks: 1, running: { [`${id}-1`]: { until: now + 45000, chars: doc.chars } } });
    await monitor.jobRef(`${id}-1`).set({ callId: id, createdAt: now, expiresAt: now + 7200000 });
    await monitor.checkLegacy(`${id}-1`, async () => {
      now += 1000;
      await heard(id, 'I can bring the ladder round tomorrow.'); // New API revision handles this callback.
      return { action: 'continue', concern: 'none', evidence: '' };
    });
    const [next] = await jobs(); expect(next!.data().dueAt).toBe(now);
    await monitor.check(next!.id, async () => ({ action: 'continue', concern: 'none', evidence: '' }));
    expect((await ref.get()).data()!.checks).toBe(2);
    expect(await jobs()).toHaveLength(0);
  });

  it('has 240 reserved windows across a busy full hour, with a real check in the last minute', async () => {
    await optIn(); const { id } = await connect(); const start = now, times: number[] = [];
    const assess = vi.fn(async (): Promise<Assessment> => { times.push(now - start); return { action: 'continue', concern: 'none', evidence: '' }; });
    for (let i = 0; i < 240; i++) {
      await heard(id, 'We are discussing the community garden.');
      await heard(id, 'The flowers need more water.');
      const pending = await jobs(); expect(pending).toHaveLength(1);
      now = Math.max(now, pending[0]!.data().dueAt);
      await monitor.check(pending[0]!.id, assess);
      now++;
    }
    expect(times.filter(t => t < 300000)).toHaveLength(60);
    expect(times.filter(t => t >= 300000 && t < 1200000)).toHaveLength(60);
    expect(times.filter(t => t >= 1200000)).toHaveLength(120);
    expect(times.at(-1)).toBe(3580000);
    await heard(id, 'I will see you later.');
    expect(await jobs()).toHaveLength(0);
    now = start + 3600000;
    await heard(id, 'This arrives after the connected deadline.');
    expect(assess).toHaveBeenCalledTimes(240);
  }, 120000);

  it('skips silence, keeps late-call protection, and dispatches only a contentless delayed task', async () => {
    await optIn(); const { id } = await connect(); const start = now;
    await heard(id, 'Hi, it is your neighbor.');
    await monitor.check(`${id}-1`, async () => ({ action: 'continue', concern: 'none', evidence: '' }));
    now = start + 59 * 60000;
    expect(await jobs()).toHaveLength(0);
    await heard(id, 'How was your afternoon?');
    await monitor.check(`${id}-2`, async () => ({ action: 'continue', concern: 'none', evidence: '' }));
    now++;
    await heard(id, 'Read me the verification code we sent.');
    const enqueue = vi.fn().mockResolvedValue(undefined);
    await dispatchMonitorCheck(s, `${id}-3`, { enqueue });
    expect(enqueue.mock.calls[0]![0]).toEqual({ jobId: `${id}-3` });
    expect(enqueue.mock.calls[0]![1].scheduleTime.getTime()).toBe(start + 59 * 60000 + 20000);
    now = enqueue.mock.calls[0]![1].scheduleTime.getTime();
    await monitor.check(`${id}-3`, async () => ({ action: 'intervene', concern: 'code_or_password', evidence: 'Read me the verification code' }));
    expect((await s.callRef(id).get()).data()!.monitorConcern).toBe('code_or_password');
    expect(update).toHaveBeenCalledOnce(); expect(await jobs()).toHaveLength(0);
  });
});
