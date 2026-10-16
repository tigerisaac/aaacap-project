import { SharedCallControl } from '../cloud/call-control.js';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { cloudSchema } from '../cloud/config.js';
import { CloudStore } from '../cloud/store.js';
import { ForwardingStore } from '../cloud/forwarding-store.js';
import { afterScreening, ForwardingLive, validStreamTicket } from '../cloud/forwarding-live.js';
import { TelnyxVoice } from '../cloud/forwarding-provider.js';
import { ScreeningSession } from './session.js';
import { HybridScreeningSession, HYBRID_SCREENING_VERSION } from './hybrid.js';
import { SCREENING_POLICY_VERSION } from './policy.js';
import { DECISION_MODEL, researchScamPattern } from './research.js';
import { callTiming } from './timing.js';
import { attachMediaTransport } from './media-transport.js';

const processStartedAt = Date.now() - process.uptime() * 1000;
let acceptedCalls = 0;
let acknowledgementAudio: Buffer | undefined;
try {
  const metadata = JSON.parse(readFileSync(new URL('./ack-audio/manifest.json', import.meta.url), 'utf8'));
  const audio = readFileSync(new URL('./ack-audio/one-moment.pcmu', import.meta.url));
  if (audio.length < 160 || audio.length > 16000 || metadata.format !== 'PCMU' || metadata.sampleRate !== 8000
    || createHash('sha256').update(audio).digest('hex') !== metadata.sha256) throw new Error('invalid_acknowledgement');
  acknowledgementAudio = audio;
} catch { console.warn(JSON.stringify({ event: 'acknowledgement_unavailable' })); }

const config = cloudSchema.parse(JSON.parse(process.env.SHIELD_RUNTIME ?? '{}'));
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error('openai_key_required');
const screeningMode = process.env.SHIELD_SCREENING_MODE ?? 'live';
if (!['live', 'hybrid'].includes(screeningMode)) throw new Error('invalid_screening_mode');
const sonioxKey = process.env.SONIOX_API_KEY;
if (screeningMode === 'hybrid' && !sonioxKey) throw new Error('soniox_key_required');
const store = new CloudStore(getFirestore(getApps()[0] ?? initializeApp()), config);
const forwarding = new ForwardingStore(store), live = new ForwardingLive(forwarding), telnyx = new TelnyxVoice(config);
const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  const prepare = /^\/prepare\/([a-f0-9-]{36})\/(\d{13})\/([a-f0-9]{64})$/.exec(request.url ?? '');
  if (prepare) {
    if (request.method !== 'POST' || !validStreamTicket(config, prepare[1]!, Number(prepare[2]), prepare[3]!)) { response.writeHead(403).end(); return; }
    try {
      const call = (await store.callRef(prepare[1]!).get()).data();
      if (!call?.startupVersion || call.state !== 'screening' || call.inboundEndedAt || sessions >= MAX_SESSIONS) { response.writeHead(409).end(); return; }
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ startupProtocol: 1 }));
    } catch { response.writeHead(503).end(); }
    return;
  }
  if (request.url !== '/ready') { response.writeHead(404).end(); return; }
  response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ status: 'ready', model: 'gpt-live-1', decisionModel: DECISION_MODEL, policyVersion: SCREENING_POLICY_VERSION,
      timingLogs: true, startupProtocol: 1, waitAcknowledgement: !!acknowledgementAudio, maxSessions: MAX_SESSIONS, sharedTransport: 'call-control-v1',
      screeningMode, ...(screeningMode === 'hybrid' ? { hybridVersion: HYBRID_SCREENING_VERSION, transcriptionModel: 'stt-rt-v5' } : {}) }));
});
const sockets = new WebSocketServer({ noServer: true, maxPayload: 32_768, perMessageDeflate: false });
// Each session only relays 8 kHz audio, so one instance can carry several people's screenings at once.
const MAX_SESSIONS = Math.max(1, Math.min(10, Number(process.env.LIVE_SESSIONS_PER_INSTANCE) || 10));
let sessions = 0;
/** No room on this instance: never connect the caller, and don't leave them on hold. Voicemail instead. */
async function refuse(id: string) {
  try {
    const call = await live.unavailable(id), next = afterScreening(config, call);
    if (call?.transport !== 'call-control' && call && next) await telnyx.update(call.parentSid, next);
    console.info(JSON.stringify({ event: 'live_screening_refused', reason: 'capacity' }));
  } catch { console.error(JSON.stringify({ event: 'live_refusal_unrouted' })); }
}
server.on('upgrade', async (request, socket, head) => {
  const match = /^\/media\/([a-f0-9-]{36})\/(\d{13})\/([a-f0-9]{64})$/.exec(request.url ?? '');
  if (!match || !validStreamTicket(config, match[1]!, Number(match[2]), match[3]!)) { socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return; }
  if (sessions >= MAX_SESSIONS) { socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); void refuse(match[1]!); return; }
  sessions++;
  let released = false;
  const release = () => { if (!released) { released = true; sessions--; } };
  // A client can disappear during the Firestore claim. Release capacity even then.
  socket.once('close', release);
  const claimStartedAt = Date.now();
  try {
    const call = await live.claim(match[1]!, screeningMode === 'hybrid' ? HYBRID_SCREENING_VERSION : 'gpt-live-1');
    if (socket.destroyed) { release(); return; }
    if (!call) { release(); socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return; }
    const timing = callTiming(call.id, call.createdAt);
    timing('bridge_claimed', { claimMs: Date.now() - claimStartedAt, processAgeMs: Date.now() - processStartedAt,
      firstCallInProcess: acceptedCalls++ === 0 });

    sockets.handleUpgrade(request, socket, head, provider => {
      let openai: WebSocket | undefined, closing = false, unsubscribe: (() => void) | undefined;
      const send = (ws: WebSocket | undefined, event: object) => {
        if (ws?.readyState === WebSocket.OPEN && ws.bufferedAmount < 100_000) ws.send(JSON.stringify(event));
      };
      const close = () => {
        if (closing) return; closing = true; release(); clearInterval(ticker); clearTransportTimer(); unsubscribe?.();
        timing('transport_closed', {});
        provider.close();
        // Allow final usage to arrive, but never keep a transport alive indefinitely.
        const timer = setTimeout(() => openai?.terminate(), 1500); timer.unref();
      };
      const finish = async (decision: Parameters<ForwardingLive['finish']>[1]) => {
        const handoffAt = Date.now();
        const save = async () => {
          const began = Date.now();
          try { const result = await live.finish(call.id, decision); timing('outcome_saved', { saveMs: Date.now() - began, successful: true }); return result; }
          catch (error) { timing('outcome_saved', { saveMs: Date.now() - began, successful: false }); throw error; }
        };
        if (call.transport === 'call-control') {
          // Saving the result atomically queues carrier work on an on-demand
          // worker. Never depend on this process having CPU after media closes.
          await save();
          timing('handoff_finished', { handoffMs: Date.now() - handoffAt });
          console.info(JSON.stringify({ event: 'live_screening_finished', callId: call.id,
            decision: typeof decision === 'string' ? decision : decision.action, elapsedMs: Date.now() - call.createdAt, carrierWork: 'queued' }));
          return;
        }
        const terminate = async () => {
          for (let attempt = 0; attempt < 3; attempt++) {
            const began = Date.now(); timing('hangup_started', { attempt: attempt + 1 });
            try { if (call.transport === 'call-control') await new SharedCallControl(store).hangup(call.parentSid); else await telnyx.update(call.parentSid, { Status: 'completed' }); timing('hangup_finished', { attempt: attempt + 1, redirectMs: Date.now() - began, successful: true }); return; }
            catch { timing('hangup_finished', { attempt: attempt + 1, redirectMs: Date.now() - began, successful: false }); /* TeXML carrier deadline or the durable shared-call sweep is the final fallback */ }
          }
          console.error(JSON.stringify({ event: 'live_hangup_unconfirmed' }));
        };
        // Scams, robocalls, solicitors and silence are cut off at once; anything that may be a real caller
        // waits for the saved outcome and is routed to the offer or to voicemail.
        const cutOff = typeof decision === 'string' ? decision === 'silent_caller' : decision.action === 'block';
        if (cutOff) {
          await Promise.allSettled([terminate(), save()]);
        } else {
          try {
            const saved = await save();
            if (call.transport === 'call-control') { await new SharedCallControl(store).outcome(call.id); return; }
            const next = afterScreening(config, saved);
            if (next) {
              const began = Date.now(); timing('redirect_started', {});
              try { await telnyx.update(call.parentSid, next); timing('redirect_finished', { redirectMs: Date.now() - began, successful: true }); }
              catch (error) { timing('redirect_finished', { redirectMs: Date.now() - began, successful: false }); throw error; }
            } else await terminate();
          } catch { timing('handoff_failed', {}); await terminate(); await forwarding.ended(call.parentSid).catch(() => {}); }
        }
        timing('handoff_finished', { handoffMs: Date.now() - handoffAt });
        console.info(JSON.stringify({ event: 'live_screening_finished', callId: call.id, decision: typeof decision === 'string' ? decision : decision.action,
          elapsedMs: Date.now() - call.createdAt }));
      };
      const context = { recentScamStopped: call.screeningCaution === true };
      const readiness = call.startupVersion ? { waitForGreeting: true,
        ready: () => { void new SharedCallControl(store).screeningReady(call.id).catch(() => session.stop('screening_unavailable')).catch(() => {}); } } : {};
      const session = screeningMode === 'hybrid'
        ? new HybridScreeningSession({ telnyx: event => send(provider, event), finish, close, timing, acknowledgementAudio, ...readiness },
          { openai: apiKey, soniox: sonioxKey! }, context)
        : new ScreeningSession({ openai: event => send(openai, event), telnyx: event => send(provider, event),
          research: topic => researchScamPattern(topic, apiKey), finish, close, timing, acknowledgementAudio, ...readiness }, Date.now, context);
      const ticker = setInterval(() => {
        try { session.tick(); } catch { void session.stop('screening_unavailable').catch(() => {}); }
      }, 20);
      const clearTransportTimer = attachMediaTransport(provider, session, () => {
          if (session instanceof HybridScreeningSession) { session.start(); return; }
          openai = new WebSocket('wss://api.openai.com/v1/live/sessions', { headers: { Authorization: `Bearer ${apiKey}` },
            handshakeTimeout: 5000, maxPayload: 1_000_000, perMessageDeflate: false, followRedirects: false });
          openai.on('open', () => { timing('model_socket_open', {}); session.start(); });
          openai.on('message', raw => {
            try { const event = JSON.parse(raw.toString());
              if (event.type === 'session.closed' && session.ended) { openai?.close(); return; }
              session.event(event);
            } catch { void session.stop('screening_unavailable'); }
          });
          openai.on('error', () => { void session.stop('screening_unavailable'); });
          openai.on('close', () => { if (!session.ended) void session.stop('screening_unavailable'); });
      }, timing);
      if (call.startupVersion) {
        unsubscribe = store.callRef(call.id).onSnapshot(snapshot => {
          const current = snapshot.data();
          if (!current || current.inboundEndedAt || current.state !== 'screening') { session.providerEnded(); close(); return; }
          if (current.greetingCompletedAt) session.listen();
        }, () => { void session.stop('screening_unavailable').catch(() => {}); });
      }
    });
  } catch { release(); socket.destroy(); }
});
server.listen(Number(process.env.PORT ?? 8080), '0.0.0.0');
