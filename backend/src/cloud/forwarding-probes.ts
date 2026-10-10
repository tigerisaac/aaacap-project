import { randomInt, randomUUID } from 'node:crypto';
import { HttpError } from '../auth.js';
import { CloudStore, type Person } from './store.js';
import { ForwardingStore, forwardingConsent } from './forwarding-store.js';

export type ProbeKind = 'ring' | 'forwarding';
export type SetupProbe = { id: string; kind: ProbeKind; state: 'waiting' | 'passed' | 'failed'; expiresAt: number;
  nonce: string; outboundSid?: string; inboundSid?: string; passedAt?: number };
export type ProbeDependencies = { startForwardingProbe?: (id: string) => Promise<void> };

export class ForwardingProbes {
  readonly f: ForwardingStore;
  constructor(readonly store: CloudStore) { this.f = new ForwardingStore(store); }
  publicState(c: FirebaseFirestore.DocumentData | undefined) {
    const p = c?.probe as SetupProbe | undefined;
    return p ? { id: p.id, kind: p.kind, state: p.state === 'waiting' && p.expiresAt <= this.store.now() ? 'failed' : p.state,
      expiresAt: new Date(p.expiresAt).toISOString() } : null;
  }
  async openWindow() {
    const s = this.store, now = s.now();
    await s.db.runTransaction(async tx => {
      const [control, person] = await tx.getAll(this.f.control, s.personRef(s.config.TRIAL_PARTICIPANT_ID));
      const c = control!.data(), p = person!.data();
      this.requireReady(c, p);
      if (c!.enabled && c!.expiresAt > now) {
        if (c!.used >= 10) throw new HttpError(409, 'test_limit_reached');
        return; // Repeated taps cannot extend or reset a running window.
      }
      if (c!.activeCallId) throw new HttpError(409, 'call_still_active');
      const day = Math.floor(now / 86400_000), count = c!.windowDay === day ? c!.windowCount ?? 0 : 0;
      if (count >= 3) throw new HttpError(429, 'test_limit_reached');
      tx.update(this.f.control, { enabled: true, allowAnyCaller: true, used: 0, startedAt: now, expiresAt: now + 1800_000,
        windowDay: day, windowCount: count + 1 });
    });
  }
  private requireReady(c: FirebaseFirestore.DocumentData | undefined, p: FirebaseFirestore.DocumentData | undefined) {
    if (!c?.provisioned || !c.dataPlanConfirmed || !c.restorationGuide?.length || p?.status !== 'setup'
      || !p.phoneVerifiedAt || p.forwardingConsent !== forwardingConsent(this.store.config)
      || this.store.phone(p as Person) !== this.store.config.TRIAL_VERIFIED_CALLER) throw new HttpError(409, 'setup_not_ready');
  }
  async reserve(kind: ProbeKind) {
    const s = this.store, now = s.now();
    return s.db.runTransaction(async tx => {
      const [control, person] = await tx.getAll(this.f.control, s.personRef(s.config.TRIAL_PARTICIPANT_ID));
      const c = control!.data(), p = person!.data(); this.requireReady(c, p);
      if (!c!.enabled || c!.expiresAt <= now) throw new HttpError(409, 'test_window_closed');
      if (c!.activeCallId) throw new HttpError(409, 'call_still_active');
      const existing = c!.probe as SetupProbe | undefined;
      if (existing?.state === 'waiting' && existing.expiresAt > now) return undefined;
      const day = Math.floor(now / 86400_000), count = c!.probeDay === day ? c!.probeCount ?? 0 : 0;
      if (count >= 6) throw new HttpError(429, 'test_limit_reached');
      const probe: SetupProbe = { id: randomUUID(), kind, state: 'waiting', expiresAt: now + 90_000,
        nonce: randomInt(10_000_000, 100_000_000).toString() };
      tx.update(this.f.control, { probe, probeDay: day, probeCount: count + 1 }); return probe;
    });
  }
  async outbound(id: string, sid: string) {
    return this.change(id, p => p.outboundSid && p.outboundSid !== sid ? undefined : { outboundSid: sid });
  }
  async incoming(sid: string) {
    const p = (await this.f.control.get()).data()?.probe as SetupProbe | undefined;
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
  private async change(id: string, update: (p: SetupProbe) => Partial<SetupProbe> | undefined) {
    const s = this.store;
    return s.db.runTransaction(async tx => {
      const [control, person] = await tx.getAll(this.f.control, s.personRef(s.config.TRIAL_PARTICIPANT_ID));
      const c = control!.data(), p = c?.probe as SetupProbe | undefined;
      if (!p || p.id !== id || p.state !== 'waiting' || p.expiresAt <= s.now() || !c?.enabled || c.expiresAt <= s.now()
        || person!.data()?.status !== 'setup' || person!.data()?.forwardingConsent !== forwardingConsent(s.config)) return;
      const patch = update(p); if (!patch) return;
      const next = { ...p, ...patch };
      tx.update(this.f.control, { probe: next, ...(patch.state === 'passed' ? { [p.kind === 'ring' ? 'ringTestAt' : 'forwardingTestAt']: s.now() } : {}) });
      return next;
    });
  }
}
