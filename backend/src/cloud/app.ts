import Fastify from 'fastify';
import { registerSignedFormBody } from './form-body.js';
import helmet from '@fastify/helmet';
import { ZodError } from 'zod';
import { HttpError, type AuthProvider } from '../auth.js';
import { FirebaseAuth } from '../firebase-auth.js';
import { createMessageChecker, type MessageChecker } from './message-check.js';
import { CloudStore } from './store.js';
import { registerCloudAPI } from './api.js';
import { registerForwardingVoice, type ForwardingVoiceDependencies } from './forwarding-voice.js';
import type { ProbeDependencies } from './forwarding-probes.js';
import { registerForwardingAPI } from './forwarding-api.js';

export async function buildCloudApp(store: CloudStore, dependencies: ForwardingVoiceDependencies & ProbeDependencies & { auth?: AuthProvider; checker?: MessageChecker; openaiApiKey?: string } = {}) {
  // Webhook URLs contain the forwarding secret; never use automatic request/body logs.
  const app = Fastify({ logger: false, bodyLimit: 16_384, trustProxy: false });
  registerSignedFormBody(app); await app.register(helmet);
  app.addHook('onSend', async (_request, reply, payload) => { reply.header('Cache-Control', 'no-store'); return payload; });
  app.setErrorHandler((error, request, reply) => {
    const status = error instanceof ZodError ? 400 : error instanceof HttpError ? error.statusCode
      : (error as { statusCode?: number }).statusCode ?? 500;
    if (request.url.startsWith('/forwarding/')) return reply.code(status).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
    return reply.code(status).send({ error: { code: error instanceof HttpError ? error.code : status === 400 ? 'invalid_request' : 'service_unavailable' } });
  });
  // Google Frontend reserves /healthz; use application-owned paths on Cloud Run.
  app.get('/public/health', async () => ({ status: 'ready', mode: 'forwarding-pilot', hosting: 'firebase' }));
  app.get('/public/ready', async () => { await store.db.doc('forwarding/control').get(); return { status: 'ready' }; });
  app.get('/privacy', async (_request, reply) => reply.type('text/plain').send(
    'Shield pilot privacy\n\nShield answers calls that the enrolled phone forwards to its Telnyx number. Telnyx provides the number, carries call audio and speaks Shield\'s fixed prompts. During screening, OpenAI GPT Live receives the caller\'s audio and OpenAI GPT-6 Luna decides how to handle the call; OpenAI session storage is disabled. Shield does not record or store screening audio or transcripts; only the outcome, a short category and timestamps are saved. Suspicious, silent or unwanted calls end without an announcement, and calls Shield cannot clear are offered voicemail. A screened call is offered to the enrolled phone, and the owner must press 1 to connect. Connected conversations are not recorded. If the owner turns on connected-call protection, the caller first hears that an AI assistant will transcribe the call; after the owner accepts, Telnyx transcribes both sides and OpenAI GPT-6 Luna checks the text for requests such as codes, payments, remote access or secrecy, and Shield may end the call with a spoken warning. That transcript is encrypted while the call is connected and deleted when it ends (or within two hours at most); only whether Shield intervened is kept in call history. No audio is saved. Forwarded callers can leave up to 60 seconds of voicemail; audio is encrypted in Firebase and the phone-provider copy is deleted after ingestion. Expired local audio is hidden immediately and removed by daily cleanup.\n\nIf you use Check, the text you submit is sent to OpenAI GPT-6 Luna for analysis and is not stored by Shield.\n\nIf you choose Share all iPhone contacts, Shield stores encrypted contact names and phone numbers for your shared calling list. It does not upload contact photos, email addresses or other contact fields. In the forwarding demo, iPhone Contacts controls which calls ring; changes in Shared contacts update both lists. Removed numbers have a protected restore copy stored on this iPhone.\n\nFirebase hosts the backend, verifies email sign-in and stores encrypted call history. Calls are unavailable after 30 days; daily cleanup removes expired documents. Vendor security logs follow their separate policies.\n\nSharing call history requires a single-use invitation and can be revoked. You may delete trial data in Phone setup. Forwarding is changed manually by the phone owner. Deleting the app or ending a test window does not restore carrier forwarding. Restore ordinary calls and carrier voicemail before deleting the account.'));
  app.get('/service-info', async (_request, reply) => reply.type('text/plain').send(
    'Shield screens calls that the enrolled phone forwards to its Telnyx number, during supervised test windows the owner opens: at most 10 screened calls in 30 minutes, one offer at a time and five minutes per connection. Outside a window, forwarded callers can leave voicemail. Shield does not authenticate callers or screen every call to your mobile, and screening can miss scams or stop a legitimate caller. Forwarding is carrier-specific and must be set up and restored manually. Connected conversations are monitored only when the owner turns on connected-call protection; it checks a transcript of both sides, can end a call with a warning, and can also miss scams or end a call that was not a scam. This is not a validated always-on service.'));
  await registerCloudAPI(app, store, dependencies.auth ?? new FirebaseAuth(store.config), dependencies.checker ?? createMessageChecker(dependencies.openaiApiKey));
  await registerForwardingVoice(app, store, dependencies);
  await registerForwardingAPI(app, store, dependencies.auth ?? new FirebaseAuth(store.config), dependencies);
  await app.ready(); return app;
}
