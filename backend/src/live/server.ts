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
import { SCREENING_POLICY_VERSION } from './policy.js';
import { DECISION_MODEL, researchScamPattern } from './research.js';
import { callTiming } from './timing.js';

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
const store = new CloudStore(getFirestore(getApps()[0] ?? initializeApp()), config);
const forwarding = new ForwardingStore(store), live = new ForwardingLive(forwarding), telnyx = new TelnyxVoice(config);
const server = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.url !== '/ready') { response.writeHead(404).end(); return; }
  response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ status: 'ready', model: 'gpt-live-1', decisionModel: DECISION_MODEL, policyVersion: SCREENING_POLICY_VERSION,
      timingLogs: true, waitAcknowledgement: !!acknowledgementAudio, maxSessions: MAX_SESSIONS, sharedTransport: 'call-control-v1' }));
});
const sockets = new WebSocketServer({ noServer: true, maxPayload: 32_768, perMessageDeflate: false });
// Each session only relays 8 kHz audio, so one instance can carry several people's screenings at once.
const MAX_SESSIONS = Math.max(1, Math.min(10, Number(process.env.LIVE_SESSIONS_PER_INSTANCE) || 10));
let sessions = 0;
/** No room on this instance: never connect the caller, and don't leave them on hold. Voicemail instead. */
async function refuse(id: string) {
  try {
    const call = await live.unavailable(id), next = afterScreening(config, call);
    if (call?.transport === 'call-control') await new SharedCallControl(store).outcome(call.id);
    else if (call && next) await telnyx.update(call.parentSid, next);
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
  const claimStartedAt = Date.now();
  try {
    const call = await live.claim(match[1]!);
    if (!call) { release(); socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return; }
    const timing = callTiming(call.id, call.createdAt);
    timing('bridge_claimed', { claimMs: Date.now() - claimStartedAt, processAgeMs: Date.now() - processStartedAt,
      firstCallInProcess: acceptedCalls++ === 0 });

    sockets.handleUpgrade(request, socket, head, provider => {
      let openai: WebSocket | undefined, streamStarted = false, closing = false;
      const send = (ws: WebSocket | undefined, event: object) => {
        if (ws?.readyState === WebSocket.OPEN && ws.bufferedAmount < 100_000) ws.send(JSON.stringify(event));
      };
      const close = () => {
        if (closing) return; closing = true; release(); clearInterval(ticker); clearTimeout(startTimer);
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
      const session = new ScreeningSession({ openai: event => send(openai, event), telnyx: event => send(provider, event), research: topic => researchScamPattern(topic, apiKey), finish, close, timing, acknowledgementAudio },
        Date.now, { recentScamStopped: call.screeningCaution === true });
      const ticker = setInterval(() => session.tick(), 20);
      const startTimer = setTimeout(() => { void session.stop('screening_unavailable'); }, 5000);
      provider.on('message', raw => {
        let e: any; try { e = JSON.parse(raw.toString()); } catch { void session.stop('screening_unavailable'); return; }
        if (e.event === 'start') {
          if (streamStarted || e.start?.media_format?.encoding !== 'PCMU' || e.start.media_format.sample_rate !== 8000 || e.start.media_format.channels !== 1) {
            void session.stop('screening_unavailable'); return;
          }
          streamStarted = true; clearTimeout(startTimer);
          timing('provider_started', {});
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
        } else if (e.event === 'media' && streamStarted && e.media?.track === 'inbound') session.input(Number(e.media.chunk), e.media.payload);
        else if (e.event === 'stop' && !session.ended) {
          session.providerEnded();
          // A media stream stopping is not proof that either telephone leg has ended.
          if (call.transport === 'call-control') {
            const cc = new SharedCallControl(store);
            void cc.exclusive(call.id, () => cc.stop(call)).catch(() => console.error(JSON.stringify({ event: 'live_hangup_unconfirmed' })));
          } else void forwarding.ended(call.parentSid).catch(() => {});
        }
      });
      provider.on('error', () => { void session.stop('screening_unavailable'); });
      provider.on('close', () => { if (!session.ended) void session.stop('screening_unavailable'); });
    });
  } catch { release(); socket.destroy(); }
});
server.listen(Number(process.env.PORT ?? 8080), '0.0.0.0');
