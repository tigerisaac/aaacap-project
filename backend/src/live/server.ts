import { createServer } from 'node:http';
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

const config = cloudSchema.parse(JSON.parse(process.env.SHIELD_RUNTIME ?? '{}'));
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error('openai_key_required');
const store = new CloudStore(getFirestore(getApps()[0] ?? initializeApp()), config);
const forwarding = new ForwardingStore(store), live = new ForwardingLive(forwarding), telnyx = new TelnyxVoice(config);
const server = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.url !== '/ready') { response.writeHead(404).end(); return; }
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify({ status: 'ready', model: 'gpt-live-1', decisionModel: DECISION_MODEL, policyVersion: SCREENING_POLICY_VERSION }));
});
const sockets = new WebSocketServer({ noServer: true, maxPayload: 32_768, perMessageDeflate: false });
let active = false;
server.on('upgrade', async (request, socket, head) => {
  const match = /^\/media\/([a-f0-9-]{36})\/(\d{13})\/([a-f0-9]{64})$/.exec(request.url ?? '');
  if (active || !match || !validStreamTicket(config, match[1]!, Number(match[2]), match[3]!)) { socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return; }
  active = true;
  try {
    const call = await live.claim(match[1]!);
    if (!call) { active = false; socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return; }
    sockets.handleUpgrade(request, socket, head, provider => {
      let openai: WebSocket | undefined, streamStarted = false, closing = false;
      const send = (ws: WebSocket | undefined, event: object) => {
        if (ws?.readyState === WebSocket.OPEN && ws.bufferedAmount < 100_000) ws.send(JSON.stringify(event));
      };
      const close = () => {
        if (closing) return; closing = true; active = false; clearInterval(ticker); clearTimeout(startTimer);
        provider.close();
        // Allow final usage to arrive, but never keep a transport alive indefinitely.
        const timer = setTimeout(() => openai?.terminate(), 1500); timer.unref();
      };
      const finish = async (decision: Parameters<ForwardingLive['finish']>[1]) => {
        const terminate = async () => {
          for (let attempt = 0; attempt < 3; attempt++) {
            try { await telnyx.update(call.parentSid, { Status: 'completed' }); return; } catch { /* carrier-side deadline is the final fallback */ }
          }
          console.error(JSON.stringify({ event: 'live_hangup_unconfirmed' }));
        };
        // Scams, robocalls, solicitors and silence are cut off at once; anything that may be a real caller
        // waits for the saved outcome and is routed to the offer or to voicemail.
        const cutOff = typeof decision === 'string' ? decision === 'silent_caller' : decision.action === 'block';
        if (cutOff) {
          await Promise.allSettled([terminate(), live.finish(call.id, decision)]);
        } else {
          try {
            const next = afterScreening(config, await live.finish(call.id, decision));
            if (next) await telnyx.update(call.parentSid, next); else await terminate();
          } catch { await terminate(); await forwarding.ended(call.parentSid).catch(() => {}); }
        }
        console.info(JSON.stringify({ event: 'live_screening_finished', decision: typeof decision === 'string' ? decision : decision.action,
          elapsedMs: Date.now() - call.createdAt }));
      };
      const session = new ScreeningSession({ openai: event => send(openai, event), telnyx: event => send(provider, event), research: topic => researchScamPattern(topic, apiKey), finish, close },
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
          openai = new WebSocket('wss://api.openai.com/v1/live/sessions', { headers: { Authorization: `Bearer ${apiKey}` },
            handshakeTimeout: 5000, maxPayload: 1_000_000, perMessageDeflate: false, followRedirects: false });
          openai.on('open', () => session.start());
          openai.on('message', raw => {
            try { const event = JSON.parse(raw.toString());
              if (event.type === 'session.closed' && session.ended) { openai?.close(); return; }
              session.event(event);
            } catch { void session.stop('screening_unavailable'); }
          });
          openai.on('error', () => { void session.stop('screening_unavailable'); });
          openai.on('close', () => { if (!session.ended) void session.stop('screening_unavailable'); });
        } else if (e.event === 'media' && streamStarted && e.media?.track === 'inbound') session.input(Number(e.media.chunk), e.media.payload);
        else if (e.event === 'stop' && !session.ended) { session.providerEnded(); void forwarding.ended(call.parentSid).catch(() => {}); }
      });
      provider.on('error', () => { void session.stop('screening_unavailable'); });
      provider.on('close', () => { if (!session.ended) void session.stop('screening_unavailable'); });
    });
  } catch { active = false; socket.destroy(); }
});
server.listen(Number(process.env.PORT ?? 8080), '0.0.0.0');
