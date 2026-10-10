import Fastify from 'fastify';
import { registerSignedFormBody } from './form-body.js';
import helmet from '@fastify/helmet';
import { ZodError } from 'zod';
import { HttpError, type AuthProvider } from '../auth.js';
import { FirebaseAuth } from '../firebase-auth.js';
import { createScreener, type Screener } from '../screening.js';
import { CloudStore } from './store.js';
import { registerCloudAPI } from './api.js';
import { registerCloudVoice, type VoiceDependencies } from './voice.js';
import { registerForwardingVoice, type ForwardingVoiceDependencies } from './forwarding-voice.js';
import type { ProbeDependencies } from './forwarding-probes.js';
import { registerForwardingAPI } from './forwarding-api.js';

export async function buildCloudApp(store: CloudStore, dependencies: VoiceDependencies & ForwardingVoiceDependencies & ProbeDependencies & { auth?: AuthProvider; screener?: Screener } = {}) {
  // Request URLs may contain the approved trial secret; never use automatic request/body logs.
  const app = Fastify({ logger: false, bodyLimit: 16_384, trustProxy: false });
  registerSignedFormBody(app); await app.register(helmet);
  app.addHook('onSend', async (_request, reply, payload) => { reply.header('Cache-Control', 'no-store'); return payload; });
  app.setErrorHandler((error, request, reply) => {
    const status = error instanceof ZodError ? 400 : error instanceof HttpError ? error.statusCode
      : (error as { statusCode?: number }).statusCode ?? 500;
    if ((request.url.startsWith('/trial/') || request.url.startsWith('/forwarding/'))) return reply.code(status).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
    return reply.code(status).send({ error: { code: error instanceof HttpError ? error.code : status === 400 ? 'invalid_request' : 'service_unavailable' } });
  });
  // Google Frontend reserves /healthz; use application-owned paths on Cloud Run.
  app.get('/public/health', async () => ({ status: 'ready', mode: 'voice-trial', hosting: 'firebase' }));
  app.get('/public/ready', async () => { await store.db.doc('trial/control').get(); return { status: 'ready' }; });
  app.get('/privacy', async (_request, reply) => reply.type('text/plain').send(
    'Shield private trial privacy\n\nThe direct-call trial accepts only the approved verified test phone. Twilio speaks fixed prompts and transcribes the caller introduction. OpenRouter and Google Gemini analyze that introduction. Soniox is not used. The direct-call trial does not transfer calls. A separately enabled supervised forwarding test uses Telnyx for phone service and introduction transcription when configured for Telnyx (otherwise Twilio). When live screening is enabled, OpenAI GPT Live 1 receives live caller audio and GPT-6 Luna evaluates screening decisions. Otherwise OpenRouter and Google Gemini screen introductions. Live screening audio and transcripts are not stored by Shield; OpenAI session storage is disabled. Only fixed outcome categories are saved. Silent, suspicious or timed-out live calls end without an announcement. It can offer screened calls back to the enrolled phone. The owner must press 1 to connect. Connected conversations are not recorded. If the owner turns on connected-call protection, the caller first hears that an AI assistant will transcribe the call; after the owner accepts, Telnyx transcribes both sides and OpenAI GPT-6 Luna checks the text for requests such as codes, payments, remote access or secrecy, and Shield may end the call with a spoken warning. That transcript is encrypted while the call is connected and deleted when it ends (or within two hours at most); only whether Shield intervened is kept in call history. No audio is saved. Forwarded callers can leave up to 60 seconds of voicemail; audio is encrypted in Firebase and the phone-provider copy is deleted after ingestion. Expired local audio is hidden immediately and removed by daily cleanup.\n\nIf you choose Share all iPhone contacts, Shield stores encrypted contact names and phone numbers for your shared calling list. It does not upload contact photos, email addresses or other contact fields. In the forwarding demo, iPhone Contacts controls which calls ring; changes in Shared contacts update both lists. Removed numbers have a protected restore copy stored on this iPhone.\n\nFirebase hosts the backend, verifies email sign-in and stores encrypted call history. Introductions are encrypted while queued, removed when claimed for screening, and otherwise removed by daily cleanup. Calls are unavailable after 30 days; daily cleanup removes expired documents. Timing diagnostics contain fixed step names and durations, not call IDs, phone numbers or speech. Vendor security logs follow their separate policies.\n\nSharing call history requires a single-use invitation and can be revoked. You may delete trial data in Phone setup. Forwarding is changed manually by the phone owner. Deleting the app or ending a test window does not restore carrier forwarding. Restore ordinary calls and carrier voicemail before deleting the account.'));
  app.get('/service-info', async (_request, reply) => reply.type('text/plain').send(
    'Shield private trial screens introductions on the Twilio test number. It does not authenticate callers or screen all calls to your mobile. A separate supervised forwarding path supports explicit press-1 acceptance and replacement voicemail. Forwarding is carrier-specific and must be set up and restored manually. The trial admits at most 10 calls during an explicitly opened 60-minute session from the approved phone only. Screening can miss scams. Connected conversations are monitored only when the owner turns on connected-call protection; it checks a transcript of both sides, can end a call with a warning, and can also miss scams or end a call that was not a scam. Supervised callbacks are limited to one enrolled recipient; the supervised window may admit any incoming caller when explicitly opened by the enrolled owner or operator, at most 10 screened calls in a 30-minute window, one offer at a time and five minutes per connection. When offers are unavailable, forwarded calls can leave voicemail. This is not a validated always-on service.'));
  await registerCloudAPI(app, store, dependencies.auth ?? new FirebaseAuth(store.config), dependencies.screener ?? createScreener(store.config));
  await registerCloudVoice(app, store, dependencies);
  await registerForwardingVoice(app, store, dependencies);
  await registerForwardingAPI(app, store, dependencies.auth ?? new FirebaseAuth(store.config), dependencies);
  await app.ready(); return app;
}
