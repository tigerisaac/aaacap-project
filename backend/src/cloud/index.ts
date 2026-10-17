import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { cloudSchema } from './config.js';
import { CloudStore } from './store.js';
import type { buildCloudApp } from './app.js';

const runtime = defineSecret('SHIELD_RUNTIME');
const openaiKey = defineSecret('SHIELD_OPENAI_API_KEY');
const options = { region: 'us-central1', minInstances: 0, maxInstances: 2, memory: '512MiB' as const,
  cpu: 1, timeoutSeconds: 30, secrets: [runtime], serviceAccount: 'shield-runtime@shield-calls-isaac.iam.gserviceaccount.com' };
let store: CloudStore | undefined;
function getStore() {
  if (!store) {
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST && !process.env.FUNCTIONS_EMULATOR) throw new Error('unexpected_auth_emulator');
    const app = getApps()[0] ?? initializeApp();
    store = new CloudStore(getFirestore(app), cloudSchema.parse(JSON.parse(runtime.value())));
  }
  return store;
}
let appPromise: ReturnType<typeof buildCloudApp> | undefined;
// The API needs the OpenAI key only for the Check tab.
export const shieldApi = onRequest({ ...options, secrets: [runtime, openaiKey], invoker: 'public', concurrency: 20 }, async (request, response) => {
  try {
    // Background functions do not need Fastify or Firebase Auth, so the HTTP app loads lazily.
    appPromise ??= import('./app.js').then(({ buildCloudApp }) => buildCloudApp(getStore(), { openaiApiKey: openaiKey.value() }))
      .catch(error => { appPromise = undefined; throw error; });
    const app = await appPromise;
    const headers: Record<string, string> = {};
    for (const name of ['authorization', 'content-type', 'x-shield-participant', 'telnyx-signature-ed25519', 'telnyx-timestamp']) {
      const value = request.headers[name]; if (typeof value === 'string') headers[name] = value;
    }
    const result = await app.inject({ method: request.method as 'GET' | 'POST' | 'DELETE', url: request.originalUrl,
      headers, remoteAddress: request.ip ?? 'unknown', payload: ['GET', 'HEAD'].includes(request.method) ? undefined : request.rawBody });
    for (const [name, value] of Object.entries(result.headers)) if (value !== undefined) response.setHeader(name, value);
    response.status(result.statusCode).send(result.rawPayload);
  } catch {
    response.status(503).set('Cache-Control', 'no-store').send({ error: { code: 'service_unavailable' } });
  }
});
export const cleanupShield = onSchedule({ ...options, maxInstances: 1, schedule: 'every day 04:00', timeZone: 'America/Chicago',
  retryCount: 3, timeoutSeconds: 120 }, async () => {
  await getStore().cleanup();
  const { VoicemailCheck } = await import('./voicemail-check.js');
  await new VoicemailCheck(getStore()).releaseStale();
});

export const ingestForwardingVoicemail = onDocumentCreated({ ...options, document: 'forwardingRecordings/{recordingId}', retry: true, concurrency: 2 }, async event => {
  const { ingestForwardingRecording } = await import('./forwarding-recordings.js');
  await ingestForwardingRecording(getStore(), event.params.recordingId);
});

// The daily setup check for each always-on person, mid-morning Central so it never lands in quiet hours.
export const dailySetupChecks = onSchedule({ ...options, maxInstances: 1, schedule: 'every day 10:30', timeZone: 'America/Chicago',
  retryCount: 0, timeoutSeconds: 120 }, async () => {
  const [{ SetupChecks }, { TelnyxVoice }] = await Promise.all([import('./setup-check.js'), import('./forwarding-provider.js')]);
  const s = getStore(); if (!s.config.SETUP_CHECK_NUMBER) return;
  const telnyx = new TelnyxVoice(s.config);
  await new SetupChecks(s).runDaily((id, from, to) => telnyx.startSetupCheck(id, from, to));
});

// Check, transcribe and summarize every stored voicemail/notice; uncertain content remains playable.
export const checkForwardingVoicemail = onDocumentCreated({ ...options, secrets: [runtime, openaiKey], timeoutSeconds: 120,
  document: 'voicemailChecks/{callId}', retry: true, concurrency: 2 }, async event => {
  const { VoicemailCheck, transcribeVoicemail, decideVoicemail } = await import('./voicemail-check.js');
  const key = openaiKey.value();
  await new VoicemailCheck(getStore()).check(event.params.callId, { transcribe: audio => transcribeVoicemail(audio, key), decide: text => decideVoicemail(text, key) });
});

// Contentless alert jobs support both app notifications and opted-in trusted-contact texts.
export const sendShieldAlert = onDocumentCreated({ ...options, document: 'alerts/{alertId}', retry: false, concurrency: 4 }, async event => {
  const { AlertDelivery, APNsSender } = await import('./alerts.js');
  const s = getStore();
  const sender = s.config.APNS ? new APNsSender(s.config.APNS, s.config.IOS_BUNDLE_ID) : { send: async () => 'failed' as const };
  await new AlertDelivery(s, sender).deliver(event.params.alertId);
});

// Durable outbox: enqueue the timer without holding an instance open until its due time.
export const monitorConnectedCall = onDocumentCreated({ ...options, secrets: [runtime, openaiKey], document: 'monitorChecks/{jobId}', retry: true, concurrency: 8,
  timeoutSeconds: 60 }, async event => {
  // Keep calls made by an older API revision protected during a rolling release/rollback.
  if (event.data?.data().dueAt === undefined) {
    const [{ CallMonitor, assessCall }, { ForwardingStore }] = await Promise.all([import('./monitoring.js'), import('./forwarding-store.js')]);
    await new CallMonitor(new ForwardingStore(getStore())).checkLegacy(event.params.jobId, text => assessCall(text, openaiKey.value()));
    return;
  }
  const { dispatchMonitorCheck } = await import('./monitor-queue.js');
  await dispatchMonitorCheck(getStore(), event.params.jobId);
});

export const monitorScheduledCall = onTaskDispatched({ ...options, secrets: [runtime, openaiKey], timeoutSeconds: 60,
  invoker: ['shield-runtime@shield-calls-isaac.iam.gserviceaccount.com'], concurrency: 8,
  retryConfig: { maxAttempts: 20, minBackoffSeconds: 5, maxBackoffSeconds: 30, maxRetrySeconds: 300 },
  rateLimits: { maxConcurrentDispatches: 16, maxDispatchesPerSecond: 10 } }, async request => {
  const jobId = request.data?.jobId;
  if (typeof jobId !== 'string' || !/^[a-zA-Z0-9-]{1,180}$/.test(jobId)) return;
  const [{ CallMonitor, assessCall }, { ForwardingStore }] = await Promise.all([import('./monitoring.js'), import('./forwarding-store.js')]);
  const key = openaiKey.value();
  await new CallMonitor(new ForwardingStore(getStore())).check(jobId, transcript => assessCall(transcript, key));
});

export const expireSharedCalls = onSchedule({ ...options, maxInstances: 1, schedule: 'every 1 minutes', retryCount: 1, timeoutSeconds: 120 }, async () => {
  const { SharedCallControl } = await import('./call-control.js');
  await new SharedCallControl(getStore()).sweep();
});

// Separate from call recovery so recording deletion cannot delay the next caller.
export const expireMessageDeliveries = onSchedule({ ...options, maxInstances: 1, schedule: 'every 5 minutes', retryCount: 3, timeoutSeconds: 120 }, async () => {
  const { expireMessageAudio } = await import('./message-audio.js');
  const { expireProviderRecordings } = await import('./forwarding-recordings.js');
  const s = getStore();
  await expireMessageAudio(s);
  // Never log provider response bodies or recording URLs. Failed jobs remain for the next sweep.
  await expireProviderRecordings(s);
});

export const dispatchSharedCallJob = onDocumentCreated({ ...options, document: 'callControlJobs/{jobId}', retry: true, concurrency: 20 }, async event => {
  const { dispatchCallJob } = await import('./call-jobs.js');
  await dispatchCallJob(getStore(), event.params.jobId);
});

export const runSharedCallJob = onTaskDispatched({ ...options, concurrency: 20,
  invoker: ['shield-runtime@shield-calls-isaac.iam.gserviceaccount.com'],
  retryConfig: { maxAttempts: 30, minBackoffSeconds: 1, maxBackoffSeconds: 10, maxRetrySeconds: 300 },
  rateLimits: { maxConcurrentDispatches: 20, maxDispatchesPerSecond: 20 } }, async request => {
  const jobId = request.data?.jobId;
  if (typeof jobId !== 'string' || !/^[a-z0-9-]{1,100}$/.test(jobId)) return;
  const { SharedCallControl } = await import('./call-control.js');
  await new SharedCallControl(getStore()).runJob(jobId);
});
