import { randomInt, randomUUID } from 'node:crypto';
import { HttpError } from '../auth.js';
import { CloudStore } from './store.js';
import { routeRef } from './shared-routing.js';
import { ForwardingStore, forwardingConsent } from './forwarding-store.js';
import { hasRestorationGuide } from './restoration-guide.js';

export type ProbeKind = 'ring' | 'forwarding';
export type SetupProbe = { id: string; kind: ProbeKind; state: 'waiting' | 'passed' | 'failed'; expiresAt: number;
  nonce: string; outboundSid?: string; inboundSid?: string; passedAt?: number; participantId?: string; routeVersion?: string; audioFallbackAt?: number };
/** Places the probe call from the person's Shield number to their verified phone. */
export type ProbeDependencies = { startForwardingProbe?: (id: string, from: string, to: string) => Promise<void>;
  /** Places the daily setup check call; returns the provider's call id if it gives one. */
  startSetupCheck?: (id: string, from: string, to: string) => Promise<string | undefined> };

export class ForwardingProbes {
  readonly f: ForwardingStore;
  constructor(readonly store: CloudStore) { this.f = new ForwardingStore(store); }
  publicState(c: FirebaseFirestore.DocumentData | undefined) {
    const p = c?.probe as SetupProbe | undefined;
    return p ? { id: p.id, kind: p.kind, state: p.state === 'waiting' && p.expiresAt <= this.store.now() ? 'failed' : p.state,
      expiresAt: new Date(p.expiresAt).toISOString() } : null;
  }
  /** Probe ids route webhooks to their person; the index lives as long as the probe can be answered. */
  indexRef(id: string) { return this.store.db.collection('forwardingProbes').doc(id); }
  async openWindow(participantId: string) {
    const s = this.store, now = s.now(), controlRef = this.f.controlRef(participantId);
    await s.db.runTransaction(async tx => {
      const [control, person] = await tx.getAll(controlRef, s.personRef(participantId));
      const c = control!.data(), p = person!.data();
      this.requireReady(c, p);
      if (c!.enabled && c!.expiresAt > now) {
        if (c!.used >= 10) throw new HttpError(409, 'test_limit_reached');
        return; // Repeated taps cannot extend or reset a running window.
      }
      if (c!.activeCallId) throw new HttpError(409, 'call_still_active');
      const day = Math.floor(now / 86400_000), count = c!.windowDay === day ? c!.windowCount ?? 0 : 0;
      if (count >= 3) throw new HttpError(429, 'test_limit_reached');
      tx.update(controlRef, { enabled: true, allowAnyCaller: true, used: 0, startedAt: now, expiresAt: now + 1800_000,
        windowDay: day, windowCount: count + 1 });
    });
  }
  private requireReady(c: FirebaseFirestore.DocumentData | undefined, p: FirebaseFirestore.DocumentData | undefined) {
    if (!c?.provisioned || !c.dataPlanConfirmed || !hasRestorationGuide(c) || p?.status !== 'setup' || p?.restoration
      || !p.phoneVerifiedAt || p.forwardingConsent !== forwardingConsent || !this.f.endpoints(p)) throw new HttpError(409, 'setup_not_ready');
  }
  async reserve(participantId: string, kind: ProbeKind) {
    const s = this.store, now = s.now(), controlRef = this.f.controlRef(participantId);
    return s.db.runTransaction(async tx => {
      const [control, person] = await tx.getAll(controlRef, s.personRef(participantId));
      const c = control!.data(), p = person!.data(); this.requireReady(c, p);
      const ends = this.f.endpoints(p)!;
      const route = s.config.SHARED_NUMBER_ENABLED ? (await tx.get(routeRef(s, ends.shieldNumber, ends.phone))).data() : undefined;
      if (s.config.SHARED_NUMBER_ENABLED && (!route || route.participantId !== participantId || route.disabledAt || typeof route.version !== 'string')) throw new HttpError(409, 'shared_route_unavailable');
      if (!c!.enabled || c!.expiresAt <= now) throw new HttpError(409, 'test_window_closed');
      if (c!.activeCallId) throw new HttpError(409, 'call_still_active');
      const existing = c!.probe as SetupProbe | undefined;
      if (existing?.state === 'waiting' && existing.expiresAt > now) return undefined;
      const day = Math.floor(now / 86400_000), count = c!.probeDay === day ? c!.probeCount ?? 0 : 0;
      if (count >= 6) throw new HttpError(429, 'test_limit_reached');
      const probe: SetupProbe = { id: randomUUID(), kind, state: 'waiting', expiresAt: now + 90_000,
        nonce: randomInt(10_000_000, 100_000_000).toString(), participantId, ...(route ? { routeVersion: route.version } : {}) };
      tx.update(controlRef, { probe, probeDay: day, probeCount: count + 1 });
      tx.create(this.indexRef(probe.id), { participantId, expiresAt: now + 86400_000 });
      return probe;
    });
  }
  async outbound(id: string, sid: string) {
    return this.change(id, p => p.outboundSid && p.outboundSid !== sid ? undefined : { outboundSid: sid });
  }
  /** A forwarded probe arrives back on the person's own Shield number. */
  async incoming(sid: string, participantId: string) {
    const p = (await this.f.controlRef(participantId).get()).data()?.probe as SetupProbe | undefined;
    if (!p || p.kind !== 'forwarding') return;
    return this.change(p.id, current => current.inboundSid && current.inboundSid !== sid ? undefined : { inboundSid: sid });
  }
  async confirm(id: string, sid: string, digits: string) {
    return this.change(id, p => {
      const valid = p.kind === 'ring' ? p.outboundSid === sid && digits === '1'
        : !!p.outboundSid && p.inboundSid === sid && p.outboundSid !== sid && digits === p.nonce;
      return valid ? { state: 'passed', passedAt: this.store.now() } : undefined;
    });
  }
  async ended(id: string, sid: string, status: string) {
    return this.change(id, p => p.outboundSid === sid && (['busy', 'failed', 'no-answer', 'canceled'].includes(status)
      || (status === 'completed' && p.kind === 'ring')) ? { state: 'failed' } : undefined);
  }
  async audioFallback(id: string, sid: string) {
    return this.change(id, p => p.kind === 'ring' && p.outboundSid === sid ? { audioFallbackAt: p.audioFallbackAt ?? this.store.now() } : undefined);
  }
  private async change(id: string, update: (p: SetupProbe) => Partial<SetupProbe> | undefined) {
    const s = this.store, participantId = (await this.indexRef(id).get()).data()?.participantId as string | undefined;
    if (!participantId) return;
    const controlRef = this.f.controlRef(participantId);
    return s.db.runTransaction(async tx => {
      const [control, person] = await tx.getAll(controlRef, s.personRef(participantId));
      const c = control!.data(), p = c?.probe as SetupProbe | undefined;
      if (!p || p.id !== id || p.state !== 'waiting' || p.expiresAt <= s.now() || !c?.enabled || c.expiresAt <= s.now()
        || person!.data()?.status !== 'setup' || person!.data()?.restoration || person!.data()?.forwardingConsent !== forwardingConsent) return;
      const patch = update(p); if (!patch) return;
      const next = { ...p, ...patch };
      tx.update(controlRef, { probe: next, ...(patch.state === 'passed' ? { [p.kind === 'ring' ? 'ringTestAt' : 'forwardingTestAt']: s.now() } : {}) });
      return { ...next, participantId };
    });
  }
}
