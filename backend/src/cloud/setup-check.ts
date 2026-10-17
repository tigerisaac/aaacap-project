import { randomUUID } from 'node:crypto';
import type { DocumentData } from 'firebase-admin/firestore';
import { queueAlert } from './alerts.js';
import { ForwardingStore, inQuietHours } from './forwarding-store.js';
import { assignedTo, numberRef } from './numbers.js';
import type { CloudStore } from './store.js';

// The daily setup check (protection plan section 5). Shield depends on phone settings it can't read, so once a day a
// short call from a separate check number goes to the person's phone, and what happens shows whether the setup works:
//   arrives back on her Shield number quickly  → unknown callers are silenced and forwarded: all good
//   arrives back late                          → it rang her phone first: Silence Unknown Callers is off
//   answered on her phone (or by Apple)        → she hears a short message telling her to open Shield
//   never arrives                              → carrier forwarding is broken, or Live Voicemail took it
// The check number isn't in her contacts, so it travels the same path as an unknown caller.

export type SetupCheckResult = 'passed' | 'rang_first' | 'answered' | 'not_forwarded';
/** Silenced calls forward at once; a call that rang first waits out the carrier's no-answer timer (about 20 s or more). */
export const SETUP_CHECK_LIMITS = { forwardedWithinMs: 15_000, everyMs: 20 * 3600_000, appRecheckMs: 24 * 3600_000, staleMs: 3 * 60_000 } as const;
export const SETUP_CHECK_MESSAGE = 'This is a Shield check. Unknown callers are ringing your phone. Open Shield to fix it.';
const failures: SetupCheckResult[] = ['rang_first', 'answered', 'not_forwarded'];

export type SetupCheckDialer = (id: string, from: string, to: string) => Promise<string | undefined>;

export class SetupChecks {
  readonly f: ForwardingStore;
  constructor(readonly store: CloudStore) { this.f = new ForwardingStore(store); }
  ref(id: string) { return this.store.db.collection('setupChecks').doc(id); }
  get checkNumber() { return this.store.config.SETUP_CHECK_NUMBER; }

  /** Whether a check may run for this person now: configured, always-on, set up, outside quiet hours, not done recently. */
  due(person: DocumentData | undefined, control: DocumentData | undefined, now: number, every: number = SETUP_CHECK_LIMITS.everyMs) {
    return !this.store.config.SHARED_NUMBER_ENABLED && !!this.checkNumber && !!this.f.endpoints(person) && person!.alwaysOn === true && person!.status === 'setup' && !person!.restoration
      && !inQuietHours(person!, now) && !(control?.lastSetupCheck?.at > now - every) && !(control?.setupCheck?.startedAt > now - SETUP_CHECK_LIMITS.staleMs);
  }

  /** Reserve and place one check call. Returns its id, or undefined if none was due. A dial failure isn't retried. */
  async start(participantId: string, dial: SetupCheckDialer, every?: number) {
    const s = this.store, now = s.now(), id = randomUUID(), controlRef = this.f.controlRef(participantId);
    const reserved = await s.db.runTransaction(async tx => {
      const [person, control] = await tx.getAll(s.personRef(participantId), controlRef);
      if (!this.due(person!.data(), control!.data(), now, every)) return;
      const ends = this.f.endpoints(person!.data())!;
      tx.create(this.ref(id), { participantId, state: 'calling', startedAt: now, expiresAt: now + 30 * 86400_000 });
      tx.set(controlRef, { setupCheck: { id, startedAt: now } }, { merge: true });
      return ends;
    });
    if (!reserved) return;
    try {
      const sid = await dial(id, this.checkNumber!, reserved.phone);
      if (sid) await this.ref(id).update({ outboundSid: sid });
    } catch { await this.finish(id, 'not_forwarded', 'dial_failed'); }
    return id;
  }

  /** The check call came back to a person's Shield number: forwarding works, and the delay says whether it rang first. */
  async arrived(to: string) {
    const s = this.store, now = s.now(), participantId = assignedTo((await numberRef(s, to).get()).data());
    if (!participantId) return;
    const pending = (await this.f.controlRef(participantId).get()).data()?.setupCheck;
    // Only the check placed in the last few minutes can pass; a stray or late call never vouches for an old one.
    if (!pending?.id || !(pending.startedAt > now - SETUP_CHECK_LIMITS.staleMs)) return;
    return this.finish(pending.id, now - pending.startedAt <= SETUP_CHECK_LIMITS.forwardedWithinMs ? 'passed' : 'rang_first', undefined, participantId);
  }

  /** Her phone (or Apple's screening) answered the check call. True if she should hear the message. */
  async answered(id: string) {
    // The forwarded leg is answered by Shield before the outbound leg reports answered; allow its webhook to land first.
    for (let attempt = 0; attempt < 3; attempt++) {
      const check = (await this.ref(id).get()).data();
      if (!check || check.state !== 'calling') return false;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500));
    }
    return (await this.finish(id, 'answered')) === 'answered';
  }

  /** The outbound call ended without arriving or being answered: forwarding is broken. */
  async ended(id: string) { await this.finish(id, 'not_forwarded'); }

  /** Record a result once. Failures alert the person, and helpers if she chose that. */
  async finish(id: string, result: SetupCheckResult, detail?: string, expectedParticipant?: string): Promise<SetupCheckResult | undefined> {
    const s = this.store, now = s.now();
    return s.db.runTransaction(async tx => {
      const doc = await tx.get(this.ref(id)), check = doc.data();
      if (!check || check.state !== 'calling' || (expectedParticipant && check.participantId !== expectedParticipant)) return;
      tx.update(doc.ref, { state: result, finishedAt: now, ...(detail ? { detail } : {}) });
      tx.set(this.f.controlRef(check.participantId), { lastSetupCheck: { id, at: now, result } }, { merge: true });
      if (failures.includes(result)) queueAlert(s, tx, check.participantId, 'setup_check_failed');
      console.info(JSON.stringify({ event: 'setup_check', result, elapsedMs: now - check.startedAt }));
      return result;
    });
  }

  /** Backstop for a check whose status callback never came. */
  async expireStale() {
    const s = this.store, stale = await s.db.collection('setupChecks').where('state', '==', 'calling').limit(50).get();
    for (const doc of stale.docs) if (doc.data().startedAt < s.now() - SETUP_CHECK_LIMITS.staleMs) await this.finish(doc.id, 'not_forwarded', 'no_status');
  }

  /** Every enrolled, always-on person whose check is due. */
  async runDaily(dial: SetupCheckDialer) {
    await this.expireStale();
    const assigned = await this.store.db.collection('shieldNumbers').where('state', '==', 'assigned').limit(100).get();
    for (const entry of assigned.docs) {
      const participantId = assignedTo(entry.data());
      if (participantId) await this.start(participantId, dial).catch(() => undefined);
    }
  }
}
