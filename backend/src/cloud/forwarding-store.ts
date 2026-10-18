import { sharedBinding, liveLeases, SHARED_CAPACITY } from './shared-routing.js';
import pilotLimits from './pilot-limits.json' with { type: 'json' };
import { randomUUID } from 'node:crypto';
import { FieldValue, type DocumentData, type Transaction, type Firestore } from 'firebase-admin/firestore';
import { HttpError } from '../auth.js';
import { CONSENT_VERSION, RETENTION_MS } from './config.js';
import { queueAlert } from './alerts.js';
import { assignedTo, isShieldNumber, numberRef } from './numbers.js';
import { CloudStore, type Call, type Person } from './store.js';
import { countStoppedCall, wasStopped } from './stopped-total.js';
import { queueCallJob } from './call-jobs.js';

export const FORWARDING_CONSENT = `${CONSENT_VERSION}-forwarding-v1`;
// Consent names the phone provider. Keep this exact value so the owner's existing consent stays valid.
export const forwardingConsent = `${FORWARDING_CONSENT}-telnyx-v1`;
export type ForwardingCall = Call & { source: 'forwarding'; provider?: 'telnyx'; parentSid: string; eligible: boolean;
  liveConnectedAt?: number; liveFinishedAt?: number; screeningModel?: string; screeningCaution?: boolean;
  childSid?: string; acceptedAt?: number; voicemail?: { id: string; duration: number; status: string; heardAt: number | null };
  captureFromAnswer?: boolean;
  startupVersion?: 1; answerRequestedAt?: number; screeningReadyAt?: number; greetingCompletedAt?: number;
  voicemailPromptCompletedAt?: number;
  /** Set only by the authenticated hangup for the immutable inbound leg. */
  inboundEndedAt?: number;
  announcementFallbacks?: Record<string, boolean>;
  monitoringStartedAt?: number; monitorPolicyVersion?: string; monitorIntervenedAt?: number; monitorConcern?: string;
  monitorEvidenceAt?: number; monitorRedirectedAt?: number;
  /** Carrier playback receipts; even completion is not proof of handset audibility. */
  monitorWarningVersion?: 2; monitorWarningConferenceSubmittedAt?: number; monitorWarningConferenceId?: string;
  monitorWarningSubmittedAt?: number; monitorWarningFailedAt?: number;
  monitorWarningWaitForPark?: boolean; monitorCallerEndedAt?: number; monitorRecipientParkedAt?: number; monitorWarningQueuedAt?: number;
  monitorWarningStartedAt?: number; monitorWarningCompletedAt?: number; monitorWarningInterruptedAt?: number;
  /** How a screened call got in: a supervised test window, or the person's always-on screening. */
  transport?: 'call-control'; recipientEnc?: string; shieldNumber?: string; routeVersion?: string; routeKey?: string; parentLegId?: string;
  admittedBy?: 'window' | 'always' };

/** A number that a scam block or an intervention stopped is ended on sight for this long. Scammers borrow real numbers, so it expires. */
export const BLOCK_MS = 180 * 86400_000;
/** After a stopped scam, screening is told for this long that the scammer may call back. */
export const CAUTION_MS = 24 * 3600_000;
/** Blocked callers' attempts kept in history per day; past this they are still ended, without a record. */
export const BLOCKED_RECORDS_PER_DAY = 20;
export type BlockReason = 'scam' | 'monitor_intervened';
/** Maximum recipient-leg duration after answer; the private summary uses the first few seconds. */
export const CONNECTED_CALL_SECONDS = 3600;
// Reserve room for screening and the recipient offer before the connected leg begins.
const CALL_RESERVATION_MS = (CONNECTED_CALL_SECONDS + 120) * 1000;
/**
 * Per Central-time day: screened calls per person and across Shield, which bound model spend, then voicemail; and
 * all forwarded calls, past which Shield answers nothing so a flood can't run up carrier and storage costs.
 */
export const DAILY_LIMITS = { screenedPerPerson: pilotLimits.screenedPerPersonPerDay,
  screenedTotal: pilotLimits.screenedTotalPerDay, callsTotal: pilotLimits.callsTotalPerDay,
  callsPerPerson: pilotLimits.callsPerPersonPerDay } as const;
// Admission alone touches the shared capacity and daily-budget documents. Queue
// that short transaction within each process so a burst doesn't create dozens of
// competing lock upgrades. Firestore still enforces the limits across instances;
// screening, offers and existing calls never wait for this local queue.
const admissionQueues = new WeakMap<Firestore, Promise<void>>();
async function admitInOrder<T>(db: Firestore, admit: () => Promise<T>): Promise<T> {
  const previous = admissionQueues.get(db) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>(resolve => { release = resolve; });
  admissionQueues.set(db, next);
  await previous;
  try { return await admit(); }
  finally { release(); if (admissionQueues.get(db) === next) admissionQueues.delete(db); }
}
const central = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' });
const centralHour = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hourCycle: 'h23' });
/** The pilot's day runs on Central time, not UTC (which would roll over at 6 or 7 p.m. in Texas). */
export const centralDay = (now: number) => central.format(now);
export const DEFAULT_QUIET_HOURS = { enabled: false, start: 21, end: 8 } as const;
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
  callEndpoints(call: ForwardingCall) {
    if (call.transport !== 'call-control' || !call.recipientEnc || !call.shieldNumber) return;
    return { phone: this.store.vault.open(call.recipientEnc, `recipient:${call.id}`), shieldNumber: call.shieldNumber };
  }
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
  async begin(sid: string, to: string, from: string | undefined, shared?: { diverted: string; legId: string }): Promise<ForwardingCall | undefined> {
    const s = this.store, now = s.now(), id = randomUUID(), day = centralDay(now), expiresAt = now + 2 * 86400_000;
    if (!isShieldNumber(to)) return;
    const admit = () => s.db.runTransaction(async tx => {
      const route = (await tx.get(numberRef(s, to))).data();
      const binding = shared && s.config.SHARED_NUMBER_ENABLED && route?.state === 'shared' ? await sharedBinding(s, tx, to, shared.diverted) : undefined;
      const participantId = shared ? binding?.participantId : assignedTo(route);
      const capacityRef = s.db.doc('sharedCapacity/calls'), capacityDoc = shared ? await tx.get(capacityRef) : undefined;
      const leases = liveLeases(capacityDoc?.data());
      if (shared && Object.keys(leases).length >= SHARED_CAPACITY) return;
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
        || !ends || ends.shieldNumber !== to || fromShield?.exists || (!!from && from === s.config.SETUP_CHECK_NUMBER)) return;
      // Checked before the daily caps so a blocked number redialing can't use up real callers' calls.
      if (blockedDoc?.exists && blockedDoc.data()!.expiresAt > now) {
        const blocked = total?.blocked ?? 0, call: ForwardingCall = { id, participantId, source: 'forwarding', provider: 'telnyx', parentSid: sid,
          eligible: false, createdAt: now, expiresAt: now + RETENTION_MS, callerEnc: s.vault.seal(from!, `call:${id}:caller`),
          state: 'ended', outcome: 'held', reason: 'blocked_caller', purpose: null, completedAt: now, events: [{ kind: 'blocked_caller_ended', at: now }] };
        Object.assign(call, countStoppedCall(s, tx, call));
        if (blocked < BLOCKED_RECORDS_PER_DAY) tx.create(s.callRef(id), call);
        tx.create(s.keyRef(sid), { callId: id, expiresAt: now + RETENTION_MS });
        tx.set(totalDoc.ref, { calls: total?.calls ?? 0, screened: total?.screened ?? 0, blocked: blocked + 1, expiresAt });
        tx.update(blockedDoc.ref, { attempts: FieldValue.increment(1), lastAttemptAt: now });
        // Scammers redial in bursts; one alert an hour per number is enough for a helper to step in.
        if (!(blockedDoc.data()!.lastAttemptAt > now - 3600_000)) queueAlert(s, tx, participantId, 'blocked_caller');
        return call;
      }
      if ((total?.calls ?? 0) >= DAILY_LIMITS.callsTotal || (mine?.calls ?? 0) >= DAILY_LIMITS.callsPerPerson) return;
      const window = c.enabled === true && c.expiresAt > now && c.used < 10;
      const open = window || p.alwaysOn === true;
      // A supervised window can be scoped to one test caller; always-on screening takes any caller.
      const scoped = !window || c.allowAnyCaller === true || (!!hash && c.callerHash === hash);
      const known = !!trusted?.docs.some(d => d.data().enabled !== false) || from === ends.phone;
      const free = (!c.activeCallId || (!shared && c.activeUntil <= now)) && !(c.probe?.state === 'waiting' && c.probe.expiresAt > now);
      if (shared && !free) return; // One active incoming call per senior also bounds voicemail and setup-check contention.
      const underCaps = (mine?.screened ?? 0) < DAILY_LIMITS.screenedPerPerson && (total?.screened ?? 0) < DAILY_LIMITS.screenedTotal;
      // Only live GPT screening can clear a caller; with it switched off every forwarded call gets voicemail.
      const screenable = s.config.LIVE_SCREENING_ENABLED && p.status === 'setup' && open && scoped && !known;
      const eligible = screenable && free && underCaps;
      const reason = eligible ? 'screening' : known ? 'known_missed' : screenable && !free ? 'busy_guard' : screenable ? 'limit_reached' : 'message_only';
      const call: ForwardingCall = { id, participantId, source: 'forwarding', provider: 'telnyx', parentSid: sid, eligible,
        ...(eligible ? { admittedBy: window ? 'window' : 'always' } as const : {}),
        ...(shared && binding ? { transport: 'call-control' as const, recipientEnc: s.vault.seal(binding.phone, `recipient:${id}`), shieldNumber: to, routeVersion: binding.version, routeKey: binding.routeKey, parentLegId: shared.legId } : {}),
        createdAt: now, expiresAt: now + RETENTION_MS, callerEnc: s.vault.seal(from ?? '', `call:${id}:caller`),
        state: eligible ? 'screening' : 'voicemail', outcome: eligible ? 'screening' : 'voicemail',
        reason, purpose: null, completedAt: null,
        events: [{ kind: eligible ? 'screening_started' : 'voicemail_offered', at: now }] };
      if (shared) {
        call.startupVersion = 1;
        queueCallJob(s, tx, id, 'start');
        // Admission must never commit a reservation without its crash-recovery timer.
        const dueAt = now + 20_000;
        tx.create(s.db.collection('callControlDeadlines').doc(id), { callId: id, phaseSeconds: 20, dueAt, expiresAt: now + 2 * 3600_000 });
        queueCallJob(s, tx, id, 'deadline', dueAt);
      }
      tx.create(s.callRef(id), call); tx.create(s.keyRef(sid), { callId: id, expiresAt: now + RETENTION_MS });
      tx.set(totalDoc.ref, { calls: (total?.calls ?? 0) + 1, screened: (total?.screened ?? 0) + (eligible ? 1 : 0), blocked: total?.blocked ?? 0, expiresAt });
      tx.set(mineDoc.ref, { participantId, calls: (mine?.calls ?? 0) + 1, screened: (mine?.screened ?? 0) + (eligible ? 1 : 0), expiresAt });
      if (shared) tx.set(capacityRef, { leases: { ...leases, [id]: now + CALL_RESERVATION_MS } });
      if (eligible || shared) tx.update(controlDoc.ref, { ...(window && eligible ? { used: c.used + 1 } : {}), activeCallId: id, activeUntil: now + CALL_RESERVATION_MS });
      return call;
    });
    return shared ? admitInOrder(s.db, admit) : admit();
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
      const capacityRef = s.db.doc('sharedCapacity/calls');
      const route = call.transport === 'call-control' && call.shieldNumber && call.routeKey ? (await tx.get(numberRef(s, call.shieldNumber).collection('routes').doc(call.routeKey))).data() : undefined;
      const patch = update(call, ctrl!.data() ?? {}, person!.data() ?? {});
      if (!patch) return;
      if (call.transport === 'call-control' && patch.state && ['offering', 'accepting', 'accepted'].includes(patch.state)
        && (!route?.enabled || route.version !== call.routeVersion || !person!.data()?.phoneVerifiedAt || this.endpoints(person!.data())?.phone !== this.callEndpoints(call)?.phone)) return;
      if (Object.keys(patch).length && person!.exists && wasStopped({ ...call, ...patch })) {
        Object.assign(patch, countStoppedCall(s, tx, call));
      }
      if (Object.keys(patch).length) tx.update(doc!.ref, patch);
      // The offer job has already finished. Commit a fresh recovery job with the
      // fallback state so a crash or failed announcement cannot strand the caller.
      if (call.transport === 'call-control' && patch.state === 'voicemail' && ['offering', 'accepting'].includes(call.state)) {
        queueCallJob(s, tx, id, 'voicemail');
      }
      if (patch.state === 'ended' && ctrl!.data()?.activeCallId === id) tx.update(controlRef, { activeCallId: FieldValue.delete() });

      // Delete only this call's reservation. Reading/replacing the entire shared map
      // makes unrelated offers and hangups contend with every admission.
      if (patch.state === 'ended' && call.transport === 'call-control') {
        tx.set(capacityRef, { leases: { [id]: FieldValue.delete() } }, { merge: true });
      }
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
      return call.childSid ? {} : { childSid, state: call.state };
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
      if (call.state === 'accepted' && call.childSid === childSid && digits === '1' && screeningOpen(control, person, this.store.now()) && person.status === 'setup') return { state: 'accepted' };
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
  /** A verified inbound hangup must not wait behind a stalled screening executor.
   * Offered/connected calls still need coordinated cleanup of their other leg. */
  async unconnectedHangup(id: string, sid: string, legId: string) {
    return this.transition(id, c => {
      if (c.transport !== 'call-control' || c.parentSid !== sid || c.parentLegId !== legId
        || c.childSid || c.acceptedAt || ['offering', 'accepting', 'accepted'].includes(c.state)) return;
      const inboundEndedAt = c.inboundEndedAt ?? this.store.now();
      if (c.state === 'ended') return { inboundEndedAt };
      return { state: 'ended', completedAt: this.store.now(), inboundEndedAt, outcome: c.state === 'voicemail' ? 'voicemail' : 'missed',
        events: [...c.events, { kind: 'call_ended', at: this.store.now() }] };
    });
  }
  async recording(sid: string, recordingSid: string, duration: number) {
    const call = await this.find(sid);
    const capture = call?.captureFromAnswer === true;
    if (!call || (!capture && (call.acceptedAt || !call.events.some(e => e.kind === 'voicemail_offered')))
      || !Number.isFinite(duration) || duration < 0 || duration > (capture ? 245 : 65)) return;
    const ref = this.store.db.collection('forwardingRecordings').doc(recordingSid);
    await this.store.db.runTransaction(async tx => {
      const [job, current] = await tx.getAll(ref, this.store.callRef(call.id));
      const c = current!.data() as ForwardingCall | undefined;
      if (job!.exists) {
        if (capture && job!.data()!.status !== 'done' && duration > 0) tx.update(ref, { duration: Math.ceil(duration) });
        return;
      }
      if (!c || (!capture && c.acceptedAt)) return;
      tx.create(ref, { callId: c.id, participantId: c.participantId, recordingSid, provider: 'telnyx', parentSid: sid, duration: Math.ceil(duration),
        ...(c.transport ? { transport: c.transport } : {}), ...(capture ? { capture: true } : {}), status: 'pending', expiresAt: c.expiresAt, createdAt: this.store.now() });
      if (capture) {
        // Even rejected/answered captures get a job, so the provider copy is deleted.
        return;
      }
      if (c.voicemailDeletedAt || c.expiresAt <= this.store.now()) return;
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
