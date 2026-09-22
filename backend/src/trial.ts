import Fastify, { LogController } from 'fastify';
import formbody from '@fastify/formbody';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import twilio from 'twilio';
import { z } from 'zod';
import { timingSafeEqual } from 'node:crypto';
import { modelConfigFields, modelConfigured } from './model-config.js';
import { createScreener, screen, type Decision, type Screener } from './screening.js';
import { loadSpeech, speechConfigFields, type PromptID } from './speech.js';

const phone = z.string().regex(/^\+[1-9]\d{7,14}$/);
const trialSchema = z.object({
  NODE_ENV: z.enum(['development', 'test']).default('development'),
  TRIAL_PORT: z.coerce.number().int().min(1024).max(65535).default(3001),
  TRIAL_PUBLIC_BASE_URL: z.string().url(),
  TWILIO_ACCOUNT_SID: z.string().regex(/^AC[a-f0-9]{32}$/i),
  TWILIO_AUTH_TOKEN: z.string().min(32),
  TRIAL_TWILIO_NUMBER: phone,
  TRIAL_VERIFIED_CALLER: phone,
  TRIAL_PROXY_SECRET: z.preprocess(value => value === '' ? undefined : value,
    z.string().regex(/^[a-f0-9]{64}$/).optional()),
  TRIAL_MAX_CALLS: z.coerce.number().int().min(1).max(20).default(10),
  TRIAL_SESSION_MINUTES: z.coerce.number().int().min(5).max(120).default(60),
  TRIAL_SCREENING_ENABLED: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
  ...modelConfigFields,
  ...speechConfigFields
});
export type TrialConfig = z.infer<typeof trialSchema>;

export function loadTrialConfig(env: NodeJS.ProcessEnv = process.env): TrialConfig {
  const config = trialSchema.parse(env);
  const url = new URL(config.TRIAL_PUBLIC_BASE_URL);
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('TRIAL_PUBLIC_BASE_URL must be a bare HTTPS origin.');
  }
  if (config.TRIAL_TWILIO_NUMBER === config.TRIAL_VERIFIED_CALLER) throw new Error('Use distinct trial and verified caller numbers.');
  if (config.TRIAL_SCREENING_ENABLED && !modelConfigured(config)) throw new Error('Trial screening requires a configured model and API key.');
  return { ...config, TRIAL_PUBLIC_BASE_URL: url.origin };
}

type TrialEvent = 'call_received' | 'introduction_received' | 'no_speech_received';
type TrialRejection = 'invalid_body' | 'missing_signature' | 'account_mismatch' | 'invalid_signature'
  | 'invalid_call_sid' | 'caller_mismatch' | 'destination_mismatch' | 'not_inbound'
  | 'invalid_proxy_secret' | 'call_verification_failed' | 'call_not_active' | 'provider_call_mismatch';
type ProviderCall = { sid: string; accountSid: string; from: string; to: string; direction: string;
  status: string; dateCreated: Date | null };
type Options = { logger?: boolean; now?: () => number; onEvent?: (event: TrialEvent) => void;
  onRejected?: (reason: TrialRejection) => void; lookupCall?: (sid: string) => Promise<ProviderCall>;
  screener?: Screener; onDecision?: (decision: Decision) => void };
type Params = Record<string, string>;

/** An isolated connectivity test, with no access to the production app or its database. */
export async function buildTrialApp(config: TrialConfig, options: Options = {}) {
  const speech = await loadSpeech(config, config.TRIAL_PUBLIC_BASE_URL);
  const finish = (prompt?: PromptID): string => {
    const response = new twilio.twiml.VoiceResponse();
    if (prompt) speech.say(response, prompt);
    response.hangup();
    return response.toString();
  };
  const now = options.now ?? Date.now;
  const expiresAt = now() + config.TRIAL_SESSION_MINUTES * 60_000;
  const calls = new Map<string, { startedAt: number; finished: boolean; proxy: boolean;
    decision?: Decision; polls: number; resultDelivered: boolean }>();
  const screener = options.screener ?? createScreener(config);
  const pending = new Set<Promise<void>>();
  let client: ReturnType<typeof twilio> | undefined;
  const lookupCall = options.lookupCall ?? (async (sid: string) => {
    client ??= twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN, { timeout: 2000, autoRetry: false });
    return client.calls(sid).fetch();
  });
  const app = Fastify({ logger: options.logger === false ? false : { level: 'info' },
    logController: new LogController({ disableRequestLogging: true }),
    bodyLimit: 8192, requestTimeout: 5000, trustProxy: false });
  await app.register(formbody);
  await app.register(helmet);
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  app.addHook('onClose', async () => { await Promise.allSettled([...pending]); });
  app.addHook('onSend', async (_request, reply, payload) => {
    if (!reply.hasHeader('Cache-Control')) reply.header('Cache-Control', 'no-store');
    return payload;
  });
  await speech.register(app);
  app.setErrorHandler((error, _request, reply) => {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) app.log.error({ code: 'trial_request_failed' }, 'Trial request failed');
    return reply.code(status).type('text/xml').send(finish());
  });
  app.get('/healthz', async () => ({ status: now() < expiresAt ? 'ready' : 'expired', mode: 'voice-trial' }));

  const report = (event: TrialEvent) => {
    // No transcript, raw number, CallSid, or webhook body is written to logs.
    app.log.info({ event }, 'Twilio trial');
    options.onEvent?.(event);
  };
  const registerVoice = async (proxy: boolean) => app.register(async voice => {
    const prefix = proxy ? '/trial/:secret' : '/voice';
    const callback = (step: string) => `${config.TRIAL_PUBLIC_BASE_URL}${proxy ? `/trial/${config.TRIAL_PROXY_SECRET}` : '/voice'}/${step}`;
    const waiting = (announce: boolean) => {
      const response = new twilio.twiml.VoiceResponse();
      if (announce) speech.say(response, 'waiting');
      response.pause({ length: 1 });
      response.redirect({ method: 'POST' }, callback('result'));
      return response.toString();
    };
    voice.addHook('preValidation', async (request, reply) => {
      const params = request.body as Params | undefined;
      const signature = request.headers['x-twilio-signature'];
      const candidate = (request.params as { secret?: string }).secret ?? '';
      const secretValid = proxy && !!config.TRIAL_PROXY_SECRET && /^[a-f0-9]{64}$/.test(candidate)
        && timingSafeEqual(Buffer.from(candidate), Buffer.from(config.TRIAL_PROXY_SECRET));
      let reason: TrialRejection | undefined =
        proxy && !secretValid ? 'invalid_proxy_secret'
        : !params || typeof params !== 'object' || Array.isArray(params)
          || Object.values(params).some(value => typeof value !== 'string') ? 'invalid_body'
        : !proxy && typeof signature !== 'string' ? 'missing_signature'
        : params.AccountSid !== config.TWILIO_ACCOUNT_SID ? 'account_mismatch'
        : !proxy && !twilio.validateRequest(config.TWILIO_AUTH_TOKEN, signature as string,
            `${config.TRIAL_PUBLIC_BASE_URL}${request.raw.url}`, params) ? 'invalid_signature'
        : !/^CA[a-f0-9]{32}$/i.test(params.CallSid ?? '') ? 'invalid_call_sid'
        : params.From !== config.TRIAL_VERIFIED_CALLER ? 'caller_mismatch'
        : params.To !== config.TRIAL_TWILIO_NUMBER ? 'destination_mismatch'
        : params.Direction !== 'inbound' ? 'not_inbound' : undefined;
      if (!reason && proxy) {
        if (now() >= expiresAt) return reply.type('text/xml').send(finish('expired'));
        // The trial interceptor was observed omitting Twilio's signature. This separate,
        // opt-in route requires a 256-bit URL secret AND a fresh, active call read from
        // our authenticated Twilio account. It never enables unsigned /voice requests.
        try {
          const call = await lookupCall(params!.CallSid!);
          const age = call.dateCreated ? now() - call.dateCreated.getTime() : Infinity;
          if (call.sid !== params!.CallSid || call.accountSid !== config.TWILIO_ACCOUNT_SID
            || call.from !== config.TRIAL_VERIFIED_CALLER || call.to !== config.TRIAL_TWILIO_NUMBER
            || call.direction !== 'inbound') reason = 'provider_call_mismatch';
          else if (!['ringing', 'in-progress'].includes(call.status) || !Number.isFinite(age)
            || age < -5000 || age > 120_000) reason = 'call_not_active';
        } catch { reason = 'call_verification_failed'; }
      }
      if (reason) {
        // Fixed diagnostic codes only; never log payloads, signatures, numbers, or transcripts.
        app.log.warn({ event: 'trial_webhook_rejected', reason }, 'Trial webhook rejected');
        options.onRejected?.(reason);
        return reply.code(403).type('text/xml').send(finish());
      }
    });
    voice.post(`${prefix}/inbound`, async (request, reply) => {
      const params = request.body as Params;
      reply.type('text/xml');
      if (now() >= expiresAt || calls.size >= config.TRIAL_MAX_CALLS) {
        return finish('expired');
      }
      if (calls.has(params.CallSid!)) return finish();
      calls.set(params.CallSid!, { startedAt: now(), finished: false, proxy, polls: 0, resultDelivered: false });
      report('call_received');
      const response = new twilio.twiml.VoiceResponse();
      const gather = response.gather({ input: ['speech'], language: 'en-US', timeout: 6,
        speechTimeout: '2', actionOnEmptyResult: true, method: 'POST', action: callback('introduction') });
      speech.say(gather, 'greeting');
      response.hangup();
      return response.toString();
    });
    voice.post(`${prefix}/introduction`, async (request, reply) => {
      const params = request.body as Params;
      const call = calls.get(params.CallSid!);
      reply.type('text/xml');
      if (now() >= expiresAt || !call || call.proxy !== proxy || call.finished || now() - call.startedAt > 120_000) return finish();
      call.finished = true;
      const received = !!params.SpeechResult?.trim();
      report(received ? 'introduction_received' : 'no_speech_received');
      if (received && config.TRIAL_SCREENING_ENABLED) {
        const startedAt = now();
        // Return TwiML immediately: the trial proxy has a five-second fetch limit.
        // Exactly one bounded extraction per call; only its fixed decision is retained.
        const task = screen(screener, params.SpeechResult!, config.MODEL_TIMEOUT_MS).then(decision => {
          call.decision = decision;
          app.log.info({ event: 'trial_screened', route: decision.route, reason: decision.reason,
            elapsedMs: now() - startedAt }, 'Trial screening completed');
          options.onDecision?.(decision);
        });
        pending.add(task);
        void task.then(() => pending.delete(task), () => pending.delete(task));
        return waiting(true);
      }
      return finish(received ? 'connected' : 'silence');
    });
    voice.post(`${prefix}/result`, async (request, reply) => {
      reply.type('text/xml');
      const call = calls.get((request.body as Params).CallSid!);
      if (!config.TRIAL_SCREENING_ENABLED || now() >= expiresAt || !call || call.proxy !== proxy
        || !call.finished || call.resultDelivered || now() - call.startedAt > 120_000) return finish();
      if (!call.decision) {
        // Initial request + Gather + at most four result fetches stay below the ten-hop trial limit.
        if (++call.polls < 4) return waiting(false);
        call.resultDelivered = true;
        return finish('timeout');
      }
      call.resultDelivered = true;
      const decision = call.decision;
      if (decision.reason === 'screening_unavailable') return finish('unavailable');
      return finish(decision.route);
    });
    voice.post(`${prefix}/fallback`, async (_request, reply) => reply.type('text/xml').send(finish()));
  });
  await registerVoice(false);
  if (config.TRIAL_PROXY_SECRET) await registerVoice(true);
  return app;
}
