import { randomUUID } from 'node:crypto';
import { FieldValue, type DocumentData } from 'firebase-admin/firestore';
import { HttpError } from '../auth.js';
import { CONSENT_VERSION, RETENTION_MS } from './config.js';
import { forwardingNumber } from './forwarding-provider.js';
import { CloudStore, type Call } from './store.js';

export const FORWARDING_CONSENT = `${CONSENT_VERSION}-forwarding-v1`;
// Consent names the phone provider. Keep this exact value so the owner's existing consent stays valid.
export const forwardingConsent = `${FORWARDING_CONSENT}-telnyx-v1`;
export type ForwardingCall = Call & { source: 'forwarding'; provider?: 'telnyx'; parentSid: string; eligible: boolean;
  liveConnectedAt?: number; liveFinishedAt?: number; screeningModel?: string;
  childSid?: string; acceptedAt?: number; voicemail?: { id: string; duration: number; status: string; heardAt: number | null };
  monitoringStartedAt?: number; monitorIntervenedAt?: number; monitorConcern?: string };

/** Single-participant, supervised forwarding pilot. Never promotes a profile to validated. */
export class ForwardingStore {
  constructor(readonly store: CloudStore) {}
  get control() { return this.store.db.doc('forwarding/control'); }
  async find(sid: string): Promise<ForwardingCall | undefined> {
    const key = (await this.store.keyRef(sid).get()).data();
    if (!key?.callId) return;
    const call = (await this.store.callRef(key.callId).get()).data() as ForwardingCall | undefined;
    return call?.source === 'forwarding' && call.participantId === this.store.config.TRIAL_PARTICIPANT_ID ? call : undefined;
  }
  /** `from` is undefined when the caller's number was withheld; such a caller is never trusted and is screened like any other. */
  async begin(sid: string, from: string | undefined): Promise<ForwardingCall | undefined> {
    const s = this.store, now = s.now(), id = randomUUID();
    return s.db.runTransaction(async tx => {
      const [key, controlDoc, personDoc, quotaDoc, trusted] = await Promise.all([
        tx.get(s.keyRef(sid)), tx.get(this.control), tx.get(s.personRef(s.config.TRIAL_PARTICIPANT_ID)),
        tx.get(s.db.doc(`forwardingUsage/${Math.floor(now / 86400_000)}`)),
        from ? tx.get(s.personRef(s.config.TRIAL_PARTICIPANT_ID).collection('trusted-numbers').where('phoneHash', '==', s.vault.hash(from)).limit(1)) : undefined
      ]);
      const c = controlDoc.data(), p = personDoc.data();
      if (key.exists || !c?.provisioned || !p || p.status === 'offboarded' || p.forwardingConsent !== forwardingConsent
        || !p.phoneVerifiedAt || from === forwardingNumber(s.config) || (quotaDoc.data()?.used ?? 0) >= 50) return;
      // Only live GPT screening can clear a caller; with it switched off every forwarded call gets voicemail.
      const eligible = s.config.LIVE_SCREENING_ENABLED && c.enabled === true && c.expiresAt > now && c.used < 10 && !c.activeCallId
        && !(c.probe?.state === 'waiting' && c.probe.expiresAt > now)
        && p.status === 'setup' && (c.allowAnyCaller === true || (!!from && c.callerHash === s.vault.hash(from)))
        && !trusted?.docs.some(d => d.data().enabled !== false) && from !== s.config.TRIAL_VERIFIED_CALLER;
      const call: ForwardingCall = { id, participantId: p.id, source: 'forwarding', provider: 'telnyx', parentSid: sid, eligible,
        createdAt: now, expiresAt: now + RETENTION_MS, callerEnc: s.vault.seal(from ?? '', `call:${id}:caller`),
        state: eligible ? 'screening' : 'voicemail', outcome: eligible ? 'screening' : 'voicemail',
        reason: eligible ? 'screening' : 'message_only', purpose: null, completedAt: null,
        events: [{ kind: eligible ? 'screening_started' : 'voicemail_offered', at: now }] };
      tx.create(s.callRef(id), call); tx.create(s.keyRef(sid), { callId: id, expiresAt: now + RETENTION_MS });
      tx.set(quotaDoc.ref, { used: (quotaDoc.data()?.used ?? 0) + 1, expiresAt: now + 2 * 86400_000 });
      if (eligible) tx.update(this.control, { used: c.used + 1, activeCallId: id });
      return call;
    });
  }
  async transition(id: string, update: (call: ForwardingCall, control: DocumentData, person: DocumentData) => Partial<ForwardingCall> | undefined) {
    const s = this.store;
    return s.db.runTransaction(async tx => {
      const [doc, ctrl, person] = await tx.getAll(s.callRef(id), this.control, s.personRef(s.config.TRIAL_PARTICIPANT_ID));
      const call = doc!.data() as ForwardingCall | undefined;
      if (!call || call.source !== 'forwarding' || call.participantId !== s.config.TRIAL_PARTICIPANT_ID) return;
      const patch = update(call, ctrl!.data() ?? {}, person!.data() ?? {});
      if (!patch) return;
      if (Object.keys(patch).length) tx.update(doc!.ref, patch);
      if (patch.state === 'ended' && ctrl!.data()?.activeCallId === id) tx.update(this.control, { activeCallId: FieldValue.delete() });
      return { ...call, ...patch };
    });
  }
  async bindChild(id: string, childSid: string, parentSid: string) {
    return this.transition(id, (call, control, person) => {
      if (call.provider !== 'telnyx' || call.parentSid !== parentSid || !['offering', 'accepting'].includes(call.state)
        || control.activeCallId !== id || !control.enabled || control.expiresAt <= this.store.now() || person.status !== 'setup'
        || (call.childSid && call.childSid !== childSid)) return;
      return call.childSid ? {} : { childSid };
    });
  }
  async whisper(id: string, childSid: string, parentSid: string) {
    return this.transition(id, (call, control, person) => {
      if (call.parentSid !== parentSid || !['offering', 'accepting'].includes(call.state) || control.activeCallId !== id || !control.enabled
        || control.expiresAt <= this.store.now() || person.status !== 'setup' || (call.childSid && call.childSid !== childSid)) return;
      if (call.state === 'accepting') return {};
      return { childSid, state: 'accepting', events: [...call.events, { kind: 'private_summary_played', at: this.store.now() }] };
    });
  }
  async accept(id: string, childSid: string, digits: string) {
    return this.transition(id, (call, control, person) => {
      if (call.state === 'accepted' && call.childSid === childSid && digits === '1') return {};
      if (call.state !== 'accepting' || call.childSid !== childSid || control.activeCallId !== id) return;
      const yes = digits === '1' && control.enabled && control.expiresAt > this.store.now() && person.status === 'setup';
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

  async requireOwner(uid: string, selected?: string) {
    const ctx = await this.store.access(uid, selected, true);
    if (ctx.participant.id !== this.store.config.TRIAL_PARTICIPANT_ID) throw new HttpError(403, 'access_denied');
    return ctx;
  }
}
