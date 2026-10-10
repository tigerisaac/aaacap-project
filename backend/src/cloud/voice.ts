import type { FastifyInstance, FastifyRequest } from 'fastify';
import twilio from 'twilio';
import { secureEqual } from '../crypto.js';
import { loadSpeech, loadSpeechConfig, type PromptID } from '../speech.js';
import type { CloudStore } from './store.js';

type ProviderCall = { sid: string; accountSid: string; from: string; to: string; direction: string;
  status: string; dateCreated: Date | null };
export type WebhookTiming = { step: string; elapsedMs: number; providerLookupMs: number; statusCode: number };
export type VoiceDependencies = { lookupCall?: (sid: string) => Promise<ProviderCall>;
  reportWebhookTiming?: (timing: WebhookTiming) => void };

export async function registerCloudVoice(app: FastifyInstance, store: CloudStore, options: VoiceDependencies = {}) {
  const config = store.config;
  // Twilio speaks fixed prompts directly; no external MP3 fetch or Soniox startup work.
  const speech = await loadSpeech(loadSpeechConfig({ TTS_PROVIDER: 'twilio' }), config.PUBLIC_BASE_URL);
  const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN, { timeout: 2000, autoRetry: false });
  const lookup = options.lookupCall ?? (sid => client.calls(sid).fetch());
  const finish = (prompt?: PromptID) => {
    const xml = new twilio.twiml.VoiceResponse(); if (prompt) speech.say(xml, prompt); xml.hangup(); return xml.toString();
  };
  const callback = (step: string) => `${config.PUBLIC_BASE_URL}/trial/${config.TRIAL_PROXY_SECRET}/${step}`;
  const waiting = (announce: boolean, pauseSeconds = 1) => {
    const xml = new twilio.twiml.VoiceResponse(); if (announce) speech.say(xml, 'waiting');
    xml.pause({ length: pauseSeconds }); xml.redirect({ method: 'POST' }, callback('result')); return xml.toString();
  };
  await app.register(async voice => {
    const timings = new WeakMap<FastifyRequest, { start: number; providerLookupMs: number }>();
    voice.addHook('onRequest', async request => { timings.set(request, { start: performance.now(), providerLookupMs: 0 }); });
    voice.addHook('onResponse', async (request, reply) => {
      const timing = timings.get(request); const step = request.routeOptions.url?.split('/').at(-1);
      // Fixed route names and durations only: never URLs, credentials, call IDs or speech.
      if (timing && step && ['inbound', 'introduction', 'result', 'fallback'].includes(step)) {
        options.reportWebhookTiming?.({ step, elapsedMs: Math.round(performance.now() - timing.start),
          providerLookupMs: timing.providerLookupMs, statusCode: reply.statusCode });
      }
    });
    voice.addHook('preValidation', async (request, reply) => {
      const candidate = (request.params as { secret: string }).secret;
      const body = request.body as Record<string, string> | undefined;
      let valid = /^[a-f0-9]{64}$/.test(candidate ?? '') && secureEqual(candidate, config.TRIAL_PROXY_SECRET)
        && !!body && typeof body === 'object' && !Array.isArray(body) && Object.values(body).every(value => typeof value === 'string')
        && body.AccountSid === config.TWILIO_ACCOUNT_SID && /^CA[a-f0-9]{32}$/i.test(body.CallSid ?? '')
        && body.From === config.TRIAL_VERIFIED_CALLER && body.To === config.TRIAL_TWILIO_NUMBER && body.Direction === 'inbound';
      if (valid) {
        const lookupStarted = performance.now();
        try {
          const call = await lookup(body!.CallSid!); const age = call.dateCreated ? store.now() - call.dateCreated.getTime() : Infinity;
          valid = call.sid === body!.CallSid && call.accountSid === config.TWILIO_ACCOUNT_SID
            && call.from === config.TRIAL_VERIFIED_CALLER && call.to === config.TRIAL_TWILIO_NUMBER && call.direction === 'inbound'
            && ['ringing', 'in-progress'].includes(call.status) && Number.isFinite(age) && age >= -5000 && age <= 120_000;
        } catch { valid = false; }
        finally { timings.get(request)!.providerLookupMs = Math.round(performance.now() - lookupStarted); }
      }
      if (!valid) return reply.code(403).type('text/xml').send(finish());
    });
    voice.post('/trial/:secret/inbound', async (request, reply) => {
      reply.type('text/xml'); const body = request.body as Record<string, string>;
      const result = await store.beginCall(body.CallSid!);
      if (result !== 'accepted') return finish(result === 'expired' ? 'expired' : undefined);
      const xml = new twilio.twiml.VoiceResponse();
      const gather = xml.gather({ input: ['speech'], language: 'en-US', timeout: 6, speechTimeout: '1',
        actionOnEmptyResult: true, method: 'POST', action: callback('introduction') });
      speech.say(gather, 'greeting'); xml.hangup(); return xml.toString();
    });
    voice.post('/trial/:secret/introduction', async (request, reply) => {
      reply.type('text/xml'); const body = request.body as Record<string, string>;
      if ((body.SpeechResult?.length ?? 0) > 6000) return finish('unavailable');
      const result = await store.introduction(body.CallSid!, body.SpeechResult ?? '');
      return result === 'queued' ? waiting(true) : finish(result === 'silence' ? 'silence' : undefined);
    });
    voice.post('/trial/:secret/result', async (request, reply) => {
      reply.type('text/xml'); const result = await store.result((request.body as Record<string, string>).CallSid!);
      if (result.kind === 'wait') return waiting(false, result.pauseSeconds);
      if (result.kind === 'duplicate') return finish();
      return finish(result.decision!.reason === 'screening_unavailable' ? 'unavailable' : result.decision!.route);
    });
    voice.post('/trial/:secret/fallback', async (_request, reply) => reply.type('text/xml').send(finish()));
  });
}
