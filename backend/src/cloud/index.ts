import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { createScreener } from '../screening.js';
import { cloudSchema } from './config.js';
import { CloudStore } from './store.js';
import { buildCloudApp } from './app.js';

const runtime = defineSecret('SHIELD_RUNTIME');
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
export const shieldApi = onRequest({ ...options, invoker: 'public', concurrency: 20 }, async (request, response) => {
  try {
    appPromise ??= buildCloudApp(getStore()).catch(error => { appPromise = undefined; throw error; });
    const app = await appPromise;
    const headers: Record<string, string> = {};
    for (const name of ['authorization', 'content-type', 'x-shield-participant']) {
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
export const screenCall = onDocumentCreated({ ...options, document: 'screeningJobs/{callId}', retry: false, concurrency: 4 }, async event => {
  const data = getStore(); await data.processJob(event.params.callId, createScreener(data.config));
});
export const cleanupShield = onSchedule({ ...options, maxInstances: 1, schedule: 'every day 04:00', timeZone: 'America/Chicago',
  retryCount: 0 }, async () => { await getStore().cleanup(); });
