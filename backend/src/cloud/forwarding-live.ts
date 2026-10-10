import { createHmac, timingSafeEqual } from 'node:crypto';
import { announcementResponse } from './announcements.js';
import { ForwardingStore, type ForwardingCall } from './forwarding-store.js';
import type { LiveDecision, StopReason } from '../live/policy.js';
import type { CloudConfig } from './config.js';

export function streamTicket(config: CloudConfig, id: string, expiry: number) {
  return createHmac('sha256', config.TRIAL_PROXY_SECRET).update(`shield-live-v1:${id}:${expiry}`).digest('hex');
}
export function validStreamTicket(config: CloudConfig, id: string, expiry: number, token: string, now = Date.now()) {
  if (!/^[a-f0-9-]{36}$/.test(id) || !Number.isSafeInteger(expiry) || expiry < now || expiry > now + 90_000 || !/^[a-f0-9]{64}$/.test(token)) return false;
  return timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(streamTicket(config, id, expiry), 'hex'));
}
export function liveStreamXML(config: CloudConfig, call: ForwardingCall, now: number) {
  if (!config.LIVE_BRIDGE_URL) throw new Error('live_bridge_missing');
  const expiry = now + 60_000;
  const url = `${config.LIVE_BRIDGE_URL.replace('https:', 'wss:')}/media/${call.id}/${expiry}/${streamTicket(config, call.id, expiry)}`;
  // The carrier delivers the disclosure before streaming, even if Live starts slowly.
  // Start + a carrier-side deadline survives a bridge process crash. No recording.
  const r = announcementResponse();
  r.say("I'm Shield, an AI call assistant. Who's calling, and what is the call about?");
  r.start().stream({ name: 'shield-live', url, track: 'inbound_track', codec: 'PCMU', bidirectionalMode: 'rtp',
    bidirectionalCodec: 'PCMU', bidirectionalSamplingRate: 8000, enableReconnect: false });
  r.pause({ length: 85 }); r.hangup(); return r.toString();
}

export class ForwardingLive {
  constructor(readonly forwarding: ForwardingStore) {}
  async claim(id: string): Promise<ForwardingCall | undefined> {
    const f = this.forwarding, now = f.store.now();
    return f.transition(id, (c, ctrl, person) => c.state === 'screening' && c.eligible && c.provider === 'telnyx' && !c.liveConnectedAt
      && ctrl.activeCallId === id && ctrl.enabled && ctrl.expiresAt > now && person.status === 'setup' && now - c.createdAt < 85_000
      ? { liveConnectedAt: now, screeningModel: 'gpt-live-1', events: [...c.events, { kind: 'live_screening_started', at: now }] } : undefined);
  }
  async finish(id: string, decision: LiveDecision | StopReason) {
    const f = this.forwarding, now = f.store.now();
    return f.transition(id, (c, ctrl, person) => {
      const approve = typeof decision !== 'string' && decision.action === 'approve';
      // The carrier may report completion before our concurrent outcome write.
      // Preserve the terminal screening decision without reviving an ended call.
      const carrierEndedFirst = !approve && c.state === 'ended' && c.outcome === 'missed' && !c.liveFinishedAt;
      if ((c.state !== 'screening' && !carrierEndedFirst) || !c.liveConnectedAt) return;
      const offer = approve && c.eligible && ctrl.activeCallId === id && ctrl.enabled && ctrl.expiresAt > now && person.status === 'setup';
      const purpose = typeof decision === 'string' ? null : decision.purpose;
      // Only clear scams, robocalls, solicitors and silence hang up. A caller Shield could not clear, or
      // could not offer, may be real: give them voicemail instead of dropping the call.
      const fallback = !carrierEndedFirst && (approve ? !offer : typeof decision === 'string'
        ? decision === 'screening_unavailable' || decision === 'screening_timeout' : decision.action === 'hold');
      if (fallback) {
        const reason = approve ? 'message_only' : typeof decision === 'string' ? decision : 'uncertain';
        return { state: 'voicemail', outcome: 'voicemail', purpose, reason, completedAt: null, liveFinishedAt: now,
          events: [...c.events, { kind: 'voicemail_offered', at: now }] };
      }
      const reason = typeof decision === 'string' ? decision : offer ? 'routine' : decision.reason;
      return { state: offer ? 'offering' : 'ended', outcome: offer ? 'offered' : 'held', purpose,
        reason, completedAt: offer ? null : now, liveFinishedAt: now,
        events: [...c.events, { kind: offer ? 'callback_offered' : 'call_stopped', at: now }] };
    });
  }
}

/** Where the carrier call goes once screening has recorded its outcome. */
export function afterScreening(config: CloudConfig, call: ForwardingCall | undefined): { Url: string; Method: 'POST' } | undefined {
  const base = `${config.PUBLIC_BASE_URL}/forwarding/${config.TRIAL_PROXY_SECRET}`;
  if (call?.state === 'offering') return { Url: `${base}/result`, Method: 'POST' };
  if (call?.state === 'voicemail') return { Url: `${base}/voicemail/${call.id}`, Method: 'POST' };
  return undefined;
}
