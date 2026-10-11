import { randomUUID } from 'node:crypto';
import { FieldValue, type DocumentData, type Transaction } from 'firebase-admin/firestore';
import { HttpError } from '../auth.js';
import { CONSENT_VERSION, RETENTION_MS } from './config.js';
import { queueAlert } from './alerts.js';
import { assignedTo, isShieldNumber, numberRef } from './numbers.js';
import { CloudStore, type Call, type Person } from './store.js';

export const FORWARDING_CONSENT = `${CONSENT_VERSION}-forwarding-v1`;
// Consent names the phone provider. Keep this exact value so the owner's existing consent stays valid.
export const forwardingConsent = `${FORWARDING_CONSENT}-telnyx-v1`;
export type ForwardingCall = Call & { source: 'forwarding'; provider?: 'telnyx'; parentSid: string; eligible: boolean;
  liveConnectedAt?: number; liveFinishedAt?: number; screeningModel?: string; screeningCaution?: boolean;
  childSid?: string; acceptedAt?: number; voicemail?: { id: string; duration: number; status: string; heardAt: number | null };
  monitoringStartedAt?: number; monitorPolicyVersion?: string; monitorIntervenedAt?: number; monitorConcern?: string;
  monitorEvidenceAt?: number; monitorRedirectedAt?: number;
  /** How a screened call got in: a supervised test window, or the person's always-on screening. */
  admittedBy?: 'window' | 'always' };

/** A number that a scam block or an intervention stopped is ended on sight for this long. Scammers borrow real numbers, so it expires. */
export const BLOCK_MS = 180 * 86400_000;
/** After a stopped scam, screening is told for this long that the scammer may call back. */
export const CAUTION_MS = 24 * 3600_000;
/** Blocked callers' attempts kept in history per day; past this they are still ended, without a record. */
export const BLOCKED_RECORDS_PER_DAY = 20;
export type BlockReason = 'scam' | 'monitor_intervened';
/**
 * Per Central-time day: screened calls per person and across Shield, which bound model spend, then voicemail; and
 * all forwarded calls, past which Shield answers nothing so a flood can't run up carrier and storage costs.
 */
export const DAILY_LIMITS = { screenedPerPerson: 30, screenedTotal: 200, callsTotal: 500 } as const;
const central = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' });
const centralHour = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hourCycle: 'h23' });
/** The pilot's day runs on Central time, not UTC (which would roll over at 6 or 7 p.m. in Texas). */
export const centralDay = (now: number) => central.format(now);
export const DEFAULT_QUIET_HOURS = { enabled: true, start: 21, end: 8 } as const;
/** Quiet hours (owner decision, October 10): overnight, a caller Shield would offer gets voicemail instead of ringing her. */
export function inQuietHours(person: DocumentData, now: number) {
  const q = person.quietHours ?? DEFAULT_QUIET_HOURS;
  if (q.enabled === false || q.start === q.end) return false;
  const hour = Number(centralHour.format(now));
  return q.start > q.end ? hour >= q.start || hour < q.end : hour >= q.start && hour < q.end;
}
/** A person's calls can be offered during a supervised test window, or always once their setup has passed its tests. */
export const screeningOpen = (control: DocumentData, person: DocumentData, now: number) =>
  person.alwaysOn === true || (control.enabled === true && control.expiresAt > now);

/** Forwarded calls for every enrolled person. The number a call arrives on decides whose call it is. */
export class ForwardingStore {
  constructor(readonly store: CloudStore) {}
  controlRef(participantId: string) { return this.store.personRef(participantId).collection('forwarding').doc('control'); }
  blockedRef(participantId: string, phoneHash: string) { return this.store.personRef(participantId).collection('blocked-numbers').doc(phoneHash); }
  /** A person's own Shield number and verified phone, the only two ends their calls ever use. Never from a request. */
  endpoints(person: DocumentData | undefined): { shieldNumber: string; phone: string } | undefined {
    if (!person?.phoneVerifiedAt || !isShieldNumber(person.shieldNumber)) return;
    const phone = this.store.phone(person as Person);
    return /^\+1\d{10}$/.test(phone) && phone !== person.shieldNumber ? { shieldNumber: person.shieldNumber, phone } : undefined;
  }
  async endpointsFor(participantId: string) { return this.endpoints((await this.store.personRef(participantId).get()).data()); }
  async find(sid: string): Promise<ForwardingCall | undefined> {
    const key = (await this.store.keyRef(sid).get()).data();
    if (!key?.callId) return;
    const call = (await this.store.callRef(key.callId).get()).data() as ForwardingCall | undefined;
    return call?.source === 'forwarding' ? call : undefined;
  }
  /**
   * Admits a call that arrived on Shield number `to`. Unknown, available and quarantined numbers, and any call from a
   * Shield number (loop guard), get nothing. `from` is undefined when the caller's number was withheld; such a caller is
   * never trusted, can't be blocked by number, and is screened like any other. A blocked number is ended at once: no
   * screening, model cost or voicemail.
   */
  async begin(sid: string, to: string, from: string | undefined): Promise<ForwardingCall | undefined> {
    const s = this.store, now = s.now(), id = randomUUID(), day = centralDay(now), expiresAt = now + 2 * 86400_000;
    if (!isShieldNumber(to)) return;
    return s.db.runTransaction(async tx => {
      const route = (await tx.get(numberRef(s, to))).data(), participantId = assignedTo(route);
      if (!participantId) {
        // Someone's forwarding may still point here: an operator should contact them before the number is released.
        if (route?.state === 'quarantine') {
          console.error(JSON.stringify({ event: 'quarantined_number_called' }));
          // The number can't be released until 30 days pass without one of these.
          tx.update(numberRef(s, to), { lastCalledAt: now });
        }
        return;
      }
      const personRef = s.personRef(participantId), hash = from ? s.vault.hash(from) : undefined;
      const [key, controlDoc, personDoc, totalDoc, mineDoc, fromShield, trusted, blockedDoc] = await Promise.all([
        tx.get(s.keyRef(sid)), tx.get(this.controlRef(participantId)), tx.get(personRef),
        tx.get(s.db.doc(`forwardingUsage/${day}`)), tx.get(s.db.doc(`forwardingUsage/${day}-${participantId}`)),
        isShieldNumber(from) ? tx.get(numberRef(s, from)) : undefined,
        hash ? tx.get(personRef.collection('trusted-numbers').where('phoneHash', '==', hash).limit(1)) : undefined,
        hash ? tx.get(this.blockedRef(participantId, hash)) : undefined
      ]);
      const c = controlDoc.data(), p = personDoc.data(), total = totalDoc.data(), mine = mineDoc.data(), ends = this.endpoints(p);
      if (key.exists || !c?.provisioned || !p || p.status === 'offboarded' || p.forwardingConsent !== forwardingConsent
        || !ends || ends.shieldNumber !== to || fromShield?.exists) return;
      // Checked before the daily caps so a blocked number redialing can't use up real callers' calls.
      if (blockedDoc?.exists && blockedDoc.data()!.expiresAt > now) {
        const blocked = total?.blocked ?? 0, call: ForwardingCall = { id, participantId, source: 'forwarding', provider: 'telnyx', parentSid: sid,
          eligible: false, createdAt: now, expiresAt: now + RETENTION_MS, callerEnc: s.vault.seal(from!, `call:${id}:caller`),
          state: 'ended', outcome: 'held', reason: 'blocked_caller', purpose: null, completedAt: now, events: [{ kind: 'blocked_caller_ended', at: now }] };
        if (blocked < BLOCKED_RECORDS_PER_DAY) tx.create(s.callRef(id), call);
        tx.create(s.keyRef(sid), { callId: id, expiresAt: now + RETENTION_MS });
        tx.set(totalDoc.ref, { calls: total?.calls ?? 0, screened: total?.screened ?? 0, blocked: blocked + 1, expiresAt });
        tx.update(blockedDoc.ref, { attempts: FieldValue.increment(1), lastAttemptAt: now });
        // Scammers redial in bursts; one alert an hour per number is enough for a helper to step in.
        if (!(blockedDoc.data()!.lastAttemptAt > now - 3600_000)) queueAlert(s, tx, participantId, 'blocked_caller');
        return call;
      }
      if ((total?.calls ?? 0) >= DAILY_LIMITS.callsTotal) return;
      const window = c.enabled === true && c.expiresAt > now && c.used < 10;
      const open = window || p.alwaysOn === true;
      // A supervised window can be scoped to one test caller; always-on screening takes any caller.
      const scoped = !window || c.allowAnyCaller === true || (!!hash && c.callerHash === hash);
      const known = !!trusted?.docs.some(d => d.data().enabled !== false) || from === ends.phone;
      const free = !c.activeCallId && !(c.probe?.state === 'waiting' && c.probe.expiresAt > now);
      const underCaps = (mine?.screened ?? 0) < DAILY_LIMITS.screenedPerPerson && (total?.screened ?? 0) < DAILY_LIMITS.screenedTotal;
      // Only live GPT screening can clear a caller; with it switched off every forwarded call gets voicemail.
      const screenable = s.config.LIVE_SCREENING_ENABLED && p.status === 'setup' && open && scoped && !known;
      const eligible = screenable && free && underCaps;
      const reason = eligible ? 'screening' : known ? 'known_missed' : screenable && !free ? 'busy_guard' : screenable ? 'limit_reached' : 'message_only';
      const call: ForwardingCall = { id, participantId, source: 'forwarding', provider: 'telnyx', parentSid: sid, eligible,
        ...(eligible ? { admittedBy: window ? 'window' : 'always' } as const : {}),
        createdAt: now, expiresAt: now + RETENTION_MS, callerEnc: s.vault.seal(from ?? '', `call:${id}:caller`),
        state: eligible ? 'screening' : 'voicemail', outcome: eligible ? 'screening' : 'voicemail',
        reason, purpose: null, completedAt: null,
        events: [{ kind: eligible ? 'screening_started' : 'voicemail_offered', at: now }] };
      tx.create(s.callRef(id), call); tx.create(s.keyRef(sid), { callId: id, expiresAt: now + RETENTION_MS });
      tx.set(totalDoc.ref, { calls: (total?.calls ?? 0) + 1, screened: (total?.screened ?? 0) + (eligible ? 1 : 0), blocked: total?.blocked ?? 0, expiresAt });
      tx.set(mineDoc.ref, { participantId, screened: (mine?.screened ?? 0) + (eligible ? 1 : 0), expiresAt });
      if (eligible) tx.update(controlDoc.ref, { ...(window ? { used: c.used + 1 } : {}), activeCallId: id });
      return call;
    });
  }
  /** `effect` runs only when `update` changed the call, and its writes commit atomically with that change. */
  async transition(id: string, update: (call: ForwardingCall, control: DocumentData, person: DocumentData) => Partial<ForwardingCall> | undefined,
    effect?: (tx: Transaction, next: ForwardingCall, personExists: boolean) => void) {
    const s = this.store;
    return s.db.runTransaction(async tx => {
      const doc = await tx.get(s.callRef(id)), call = doc.data() as ForwardingCall | undefined;
      if (!call || call.source !== 'forwarding') return;
      const controlRef = this.controlRef(call.participantId);
      const [ctrl, person] = await tx.getAll(controlRef, s.personRef(call.participantId));
      const patch = update(call, ctrl!.data() ?? {}, person!.data() ?? {});
      if (!patch) return;
      if (Object.keys(patch).length) tx.update(doc.ref, patch);
      if (patch.state === 'ended' && ctrl!.data()?.activeCallId === id) tx.update(controlRef, { activeCallId: FieldValue.delete() });
      const next = { ...call, ...patch };
      if (Object.keys(patch).length) effect?.(tx, next, person!.exists);
      return next;
    });
  }
  /**
   * After a scam block or an intervention: end this number's calls for 180 days and screen everyone with extra
   * caution for 24 hours. A withheld number can't be blocked, but still sets the caution flag.
   */
  rememberScam(tx: Transaction, call: ForwardingCall, reason: BlockReason, personExists: boolean) {
    const s = this.store, now = s.now(), caller = s.vault.open(call.callerEnc, `call:${call.id}:caller`);
    if (!personExists) return;
    tx.update(s.personRef(call.participantId), { scamStoppedAt: now });
    if (!caller) return;
    const hash = s.vault.hash(caller);
    tx.set(this.blockedRef(call.participantId, hash), { phoneEnc: s.vault.seal(caller, `blocked:${call.participantId}:${hash}`), reason,
      sourceCallId: call.id, createdAt: now, expiresAt: now + BLOCK_MS, attempts: 0 });
  }
  async bindChild(id: string, childSid: string, parentSid: string) {
    return this.transition(id, (call, control, person) => {
      if (call.provider !== 'telnyx' || call.parentSid !== parentSid || !['offering', 'accepting'].includes(call.state)
        || control.activeCallId !== id || !screeningOpen(control, person, this.store.now()) || person.status !== 'setup'
        || (call.childSid && call.childSid !== childSid)) return;
      return call.childSid ? {} : { childSid };
    });
  }
  async whisper(id: string, childSid: string, parentSid: string) {
    return this.transition(id, (call, control, person) => {
      if (call.parentSid !== parentSid || !['offering', 'accepting'].includes(call.state) || control.activeCallId !== id
        || !screeningOpen(control, person, this.store.now()) || person.status !== 'setup' || (call.childSid && call.childSid !== childSid)) return;
      if (call.state === 'accepting') return {};
      return { childSid, state: 'accepting', events: [...call.events, { kind: 'private_summary_played', at: this.store.now() }] };
    });
  }
  async accept(id: string, childSid: string, digits: string) {
    return this.transition(id, (call, control, person) => {
      if (call.state === 'accepted' && call.childSid === childSid && digits === '1') return {};
      if (call.state !== 'accepting' || call.childSid !== childSid || control.activeCallId !== id) return;
      const yes = digits === '1' && screeningOpen(control, person, this.store.now()) && person.status === 'setup';
      return { state: yes ? 'accepted' : 'voicemail', outcome: yes ? 'connected' : 'voicemail',
        ...(yes ? { acceptedAt: this.store.now() } : { reason: digits === '2' ? 'declined' : 'no_acceptance' }),
        events: [...call.events, { kind: yes ? 'accepted' : 'not_accepted', at: this.store.now() }] };
    });
  }
  async dialEnded(id: string, parentSid: string, childSid: string, status: string) {
    return this.transition(id, call => {
      if (call.parentSid !== parentSid || call.state === 'ended' || (call.childSid && call.childSid !== childSid)
        || !['completed', 'busy', 'failed', 'no-answer', 'canceled'].includes(status)) return;
      return call.acceptedAt ? { state: 'ended', completedAt: this.store.now(), events: [...call.events, { kind: 'call_ended', at: this.store.now() }] }
        : { state: 'voicemail', outcome: 'voicemail', reason: call.reason === 'declined' ? 'declined' : 'no_acceptance',
          events: [...call.events, { kind: 'voicemail_offered', at: this.store.now() }] };
    });
  }
  async ended(sid: string) {
    const call = await this.find(sid); if (!call) return;
    await this.transition(call.id, c => c.state === 'ended' ? undefined : {
      state: 'ended', completedAt: this.store.now(), outcome: c.acceptedAt ? 'connected' : c.state === 'voicemail' ? 'voicemail' : 'missed',
      events: [...c.events, { kind: 'call_ended', at: this.store.now() }] });
  }
  async recording(sid: string, recordingSid: string, duration: number) {
    const call = await this.find(sid);
    if (!call || call.acceptedAt || !call.events.some(e => e.kind === 'voicemail_offered') || !Number.isFinite(duration) || duration < 0 || duration > 65) return;
    const ref = this.store.db.collection('forwardingRecordings').doc(recordingSid);
    await this.store.db.runTransaction(async tx => {
      const [job, current] = await tx.getAll(ref, this.store.callRef(call.id));
      const c = current!.data() as ForwardingCall | undefined;
      if (job!.exists || !c || c.acceptedAt || c.voicemailDeletedAt || c.expiresAt <= this.store.now()) return;
      tx.create(ref, { callId: c.id, participantId: c.participantId, recordingSid, provider: 'telnyx', parentSid: sid, duration: Math.ceil(duration),
        status: 'pending', expiresAt: c.expiresAt, createdAt: this.store.now() });
      tx.update(current!.ref, { voicemail: { id: c.id, duration: Math.ceil(duration), status: 'pending', heardAt: null },
        outcome: 'voicemail', events: [...c.events, { kind: 'voicemail_received', at: this.store.now() }] });
    });
  }

  /** The signed-in person's own forwarding setup. Only someone enrolled with a Shield number has one. */
  async requireOwner(uid: string, selected?: string) {
    const ctx = await this.store.access(uid, selected, true);
    if (!isShieldNumber(ctx.participant.shieldNumber)) throw new HttpError(403, 'access_denied');
    return ctx;
  }
}
