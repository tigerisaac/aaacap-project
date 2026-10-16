import type { WebSocket } from 'ws';
import type { StopReason } from './policy.js';
import type { TimingSink } from './timing.js';

type MediaSession = { readonly ended: boolean; input(chunk: number, payload: string): void; stop(reason: StopReason): Promise<void> };

/** Carrier media is disposable; losing it must not be mistaken for telephone hangup. */
export function attachMediaTransport(provider: WebSocket, session: MediaSession, start: () => void, timing: TimingSink) {
  let started = false;
  const fail = () => {
    if (!session.ended) void session.stop('screening_unavailable').catch(() => timing('handoff_failed', {}));
  };
  const timer = setTimeout(() => { timing('provider_start_timeout', {}); fail(); }, 5000);
  const clear = () => clearTimeout(timer);
  provider.on('message', raw => {
    if (session.ended) return;
    let event: any;
    try { event = JSON.parse(raw.toString()); } catch { clear(); fail(); return; }
    if (!event || typeof event !== 'object' || Array.isArray(event)) { clear(); fail(); return; }
    if (event.event === 'start') {
      clear();
      if (started || event.start?.media_format?.encoding !== 'PCMU'
        || event.start.media_format.sample_rate !== 8000 || event.start.media_format.channels !== 1) { fail(); return; }
      started = true; timing('provider_started', {});
      try { start(); } catch { fail(); }
    } else if (event.event === 'media' && started && event.media?.track === 'inbound') {
      try { session.input(Number(event.media.chunk), event.media.payload); } catch { clear(); fail(); }
    } else if (event.event === 'stop') { clear(); fail(); }
  });
  provider.on('error', () => { clear(); fail(); });
  provider.on('close', () => { clear(); fail(); });
  return clear;
}
