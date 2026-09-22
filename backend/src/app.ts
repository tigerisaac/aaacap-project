import Fastify, { LogController } from 'fastify';
import formbody from '@fastify/formbody';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import twilio from 'twilio';
import { z } from 'zod';
import type { Config } from './config.js';
import { openDatabase, type Database } from './db.js';
import { Store } from './store.js';
import { Vault } from './crypto.js';
import { ManagedAuth, HttpError, type AuthProvider } from './auth.js';
import { FirebaseAuth } from './firebase-auth.js';
import { DemoTelephony, TwilioTelephony, type Telephony } from './telephony.js';
import { createScreener, UnavailableScreener, screen, type Screener } from './screening.js';
import { VoiceService, type VoiceParams } from './voice.js';
import { registerAPI } from './api.js';
import { hangup } from './twiml.js';
import { Worker } from './worker.js';
import { PushNotifier, type Notifier } from './notifications.js';

export type Dependencies = { db?: Database; telephony?: Telephony; screener?: Screener; auth?: AuthProvider; notifier?: Notifier; logger?: boolean };

export async function buildApp(config: Config, dependencies: Dependencies = {}) {
  const app = Fastify({ logger: dependencies.logger === false ? false : { level: 'info' },
    logController: new LogController({ disableRequestLogging: true }), bodyLimit: 16384, requestTimeout: 12000,
    trustProxy: config.TRUSTED_PROXY_HOPS ? (_address, hop) => hop < config.TRUSTED_PROXY_HOPS : false });
  await app.register(formbody);
  await app.register(helmet);
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  const db = dependencies.db ?? await openDatabase(config);
  const store = new Store(db, new Vault(config.DATA_ENCRYPTION_KEY), config);
  const telephony = dependencies.telephony ?? (config.SHIELD_MODE === 'demo' ? new DemoTelephony() : new TwilioTelephony(config));
  const screener = dependencies.screener ?? (config.SHIELD_MODE === 'live' ? createScreener(config) : new UnavailableScreener());
  const auth = dependencies.auth ?? (config.SHIELD_MODE === 'live' && config.AUTH_PROVIDER === 'firebase'
    ? new FirebaseAuth(config) : new ManagedAuth(config));
  const voice = new VoiceService(store, telephony, screener);
  const worker = new Worker(store, telephony, dependencies.notifier ?? new PushNotifier(store, config));

  app.addHook('onSend', async (_request, reply, payload) => { reply.header('Cache-Control', 'no-store'); return payload; });
  app.setErrorHandler((error, request, reply) => {
    const code = error instanceof HttpError ? error.code : error instanceof z.ZodError ? 'invalid_request' : 'request_failed';
    const status = error instanceof HttpError ? error.statusCode : error instanceof z.ZodError ? 400 : ((error as { statusCode?: number }).statusCode ?? 500);
    if (status >= 500) app.log.error({ code, requestId: request.id }, 'Request failed');
    if (request.url.startsWith('/voice/')) return reply.code(Math.min(status, 500)).type('text/xml').send(hangup());
    return reply.code(status).send({ error: { code } });
  });

  app.get('/healthz', async () => ({ status: 'ok', mode: config.SHIELD_MODE }));
  app.get('/readyz', async () => { await db.query('SELECT 1'); return { status: 'ready' }; });
  await registerAPI(app, store, auth, screener);

  await app.register(async routes => {
    routes.addHook('preValidation', async request => {
      const body = request.body as VoiceParams | undefined;
      const signature = request.headers['x-twilio-signature'];
      if (!body || typeof body !== 'object' || Object.values(body).some(value => typeof value !== 'string')
        || !config.TWILIO_AUTH_TOKEN || typeof signature !== 'string'
        || body.AccountSid !== config.TWILIO_ACCOUNT_SID
        || !twilio.validateRequest(config.TWILIO_AUTH_TOKEN, signature, `${config.PUBLIC_BASE_URL}${request.raw.url}`, body)) {
        throw new HttpError(403, 'invalid_signature');
      }
    });
    const sessionId = (query: unknown) => z.object({ session: z.string().uuid() }).parse(query).session;
    const xmlRoute = (path: string, handler: (id: string, params: VoiceParams) => Promise<string>) => {
      routes.post(path, { config: { rateLimit: false } }, async (request, reply) => reply.type('text/xml').send(await handler(sessionId(request.query), request.body as VoiceParams)));
    };
    routes.post('/voice/inbound', { config: { rateLimit: false } }, async (request, reply) => reply.type('text/xml').send(await voice.inbound(request.body as VoiceParams)));
    xmlRoute('/voice/screening-result', (id, params) => voice.screeningResult(id, params));
    xmlRoute('/voice/whisper', (id, params) => voice.whisper(id, params));
    xmlRoute('/voice/accept', (id, params) => voice.accept(id, params));
    xmlRoute('/voice/dial-complete', (id, params) => voice.dialComplete(id, params));
    xmlRoute('/voice/voicemail-complete', (id, params) => voice.voicemailComplete(id, params));
    routes.post('/voice/status', { config: { rateLimit: false } }, async (request, reply) => { await voice.originalStatus(request.body as VoiceParams); return reply.code(204).send(); });
    routes.post('/voice/child-status', { config: { rateLimit: false } }, async (request, reply) => { await voice.childStatus(sessionId(request.query), request.body as VoiceParams); return reply.code(204).send(); });
    routes.post('/voice/recording-ready', { config: { rateLimit: false } }, async (request, reply) => { await voice.recordingReady(sessionId(request.query), request.body as VoiceParams); return reply.code(204).send(); });
    // Deploy a separate static Hangup TwiML document for private-leg fallback. This endpoint is signed, too.
    routes.post('/voice/fallback', { config: { rateLimit: false } }, async (_request, reply) => reply.type('text/xml').send(hangup()));
  });

  app.post('/sms/classify', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async request => {
    // Apple's deferral payload has no authenticated participant identity. Never export a user's inbox here.
    const body = z.object({ query: z.object({ sender: z.string().max(200).optional(), message: z.object({ text: z.string().max(6000) }) }) }).safeParse(request.body);
    if (!body.success || !config.SMS_CLASSIFICATION_ENABLED) return { action: 'none' };
    if (!await store.quota(db, 'classifications:global', config.MAX_CLASSIFICATIONS_PER_DAY)) return { action: 'none' };
    const decision = await screen(screener, body.data.query.message.text, config.MODEL_TIMEOUT_MS);
    // No automatic junking based on an unevaluated model. Route to unknown unless separately reviewed.
    return { action: decision.route === 'refuse' ? 'filter' : 'none' };
  });
  app.get('/.well-known/apple-app-site-association', async () => ({ messagefilter: {
    apps: config.APPLE_TEAM_ID ? [`${config.APPLE_TEAM_ID}.${config.IOS_BUNDLE_ID}`] : []
  } }));
  app.get('/privacy', async (_request, reply) => reply.type('text/plain').send(
    `Shield pilot privacy\n\nShield processes forwarded call introductions and explicitly submitted checks. Incoming callers are told about transcription and analysis. Connected conversations are not intentionally recorded by Shield. Voicemail is recorded separately, encrypted, and expires within ${config.RETENTION_DAYS} days. Call history expires within ${config.RETENTION_DAYS} days. Vendor logs and abuse monitoring have separate retention.\n\nSharing is optional and revocable. Caregivers can see only the participant data they have been granted. Notifications contain no caller, financial, or health detail. Account deletion begins with restoring carrier forwarding so calls are not lost.\n\nContact: ${config.SUPPORT_EMAIL || 'Pilot support has not been configured.'}\n\nThis deployment requires operator and jurisdiction-specific review before participant enrollment.`));
  app.get('/service-info', async (_request, reply) => reply.type('text/plain').send(
    'Shield screens selected forwarded calls. It does not authenticate callers or prevent every scam. Saved or otherwise allowed callers can bypass screening; introductions can be misleading. The later conversation is not monitored. Pausing offers does not restore carrier forwarding. Deleting the app does not undo forwarding. This is not an emergency or continuously staffed response service.'));
  app.addHook('onClose', async () => { if (!dependencies.db) await db.close(); });
  return { app, store, voice, telephony, worker };
}
