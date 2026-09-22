import Fastify from 'fastify';
import formbody from '@fastify/formbody';
import helmet from '@fastify/helmet';
import { ZodError } from 'zod';
import { HttpError, type AuthProvider } from '../auth.js';
import { FirebaseAuth } from '../firebase-auth.js';
import { createScreener, type Screener } from '../screening.js';
import { CloudStore } from './store.js';
import { registerCloudAPI } from './api.js';
import { registerCloudVoice, type VoiceDependencies } from './voice.js';

export async function buildCloudApp(store: CloudStore, dependencies: VoiceDependencies & { auth?: AuthProvider; screener?: Screener } = {}) {
  // Request URLs may contain the approved trial secret; never use automatic request/body logs.
  const app = Fastify({ logger: false, bodyLimit: 16_384, trustProxy: false });
  await app.register(formbody); await app.register(helmet);
  app.addHook('onSend', async (_request, reply, payload) => { reply.header('Cache-Control', 'no-store'); return payload; });
  app.setErrorHandler((error, request, reply) => {
    const status = error instanceof ZodError ? 400 : error instanceof HttpError ? error.statusCode
      : (error as { statusCode?: number }).statusCode ?? 500;
    if (request.url.startsWith('/trial/')) return reply.code(status).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
    return reply.code(status).send({ error: { code: error instanceof HttpError ? error.code : status === 400 ? 'invalid_request' : 'service_unavailable' } });
  });
  // Google Frontend reserves /healthz; use application-owned paths on Cloud Run.
  app.get('/public/health', async () => ({ status: 'ready', mode: 'voice-trial', hosting: 'firebase' }));
  app.get('/public/ready', async () => { await store.db.doc('trial/control').get(); return { status: 'ready' }; });
  app.get('/privacy', async (_request, reply) => reply.type('text/plain').send(
    'Shield private trial privacy\n\nThis trial accepts only the approved verified test phone. Twilio transcribes the caller introduction. OpenRouter and Google Gemini analyze that introduction. Soniox voices only fixed prompts, generated in advance. The trial does not transfer or record conversations or voicemail.\n\nFirebase hosts the backend, verifies email sign-in and stores encrypted call history. Introductions are encrypted while queued, removed when claimed for screening, and otherwise removed by daily cleanup. Calls are unavailable after 30 days; daily cleanup removes expired documents. Vendor security logs follow their separate policies.\n\nSharing call history requires a single-use invitation and can be revoked. You may delete trial data in Phone setup. No carrier forwarding is changed in this trial.'));
  app.get('/service-info', async (_request, reply) => reply.type('text/plain').send(
    'Shield private trial screens introductions on the Twilio test number. It does not screen all calls to your mobile, authenticate callers, transfer calls, or provide voicemail. The trial admits at most 10 calls during an explicitly opened 60-minute session from the approved phone only. Screening can miss scams. No later conversation is monitored.'));
  await registerCloudAPI(app, store, dependencies.auth ?? new FirebaseAuth(store.config), dependencies.screener ?? createScreener(store.config));
  await registerCloudVoice(app, store, dependencies);
  await app.ready(); return app;
}
