import { randomUUID } from 'node:crypto';
import { FieldValue, type Firestore, type DocumentData, type Transaction } from 'firebase-admin/firestore';
import { HttpError } from '../auth.js';
import { Vault } from '../crypto.js';
import { screen, type Decision, type Screener } from '../screening.js';
import { RETENTION_MS, type CloudConfig } from './config.js';

export type Person = DocumentData & { id: string; ownerUid: string; nameEnc: string; phoneEnc: string; status: string };
export type Call = DocumentData & { id: string; participantId: string; createdAt: number; expiresAt: number;
  callerEnc: string; state: string; outcome: string; reason: string; purpose: string | null;
  events: { kind: string; at: number }[]; decision?: Decision; completedAt: number | null; polls: number };
export type Access = { participant: Person; uid: string; isOwner: boolean; canListen: boolean };
const unavailable: Decision = { route: 'message', reason: 'screening_unavailable', purpose: 'unknown' };

/** Durable storage: transactions own all call transitions and trial budgets across instances. */
export class CloudStore {
  readonly vault: Vault;
  constructor(readonly db: Firestore, readonly config: CloudConfig, readonly now: () => number = Date.now) {
    this.vault = new Vault(config.DATA_ENCRYPTION_KEY);
  }
  personRef(id: string) { return this.db.collection('participants').doc(id); }
  callRef(id: string) { return this.db.collection('callSessions').doc(id); }
  keyRef(sid: string) { return this.db.collection('callKeys').doc(this.vault.hash(sid)); }
  memberRef(person: string, uid: string) { return this.db.collection('memberships').doc(this.vault.hash(`${person}:${uid}`)); }
  name(person: Person) { return this.vault.open(person.nameEnc, `person:${person.id}:name`); }
  phone(person: Person) { return this.vault.open(person.phoneEnc, `person:${person.id}:phone`); }
  async quota(keys: [string, number][]): Promise<void> {
    const now = this.now(); const day = Math.floor(now / 86400_000);
    const refs = keys.map(([key]) => this.db.collection('usage').doc(this.vault.hash(`${day}:${key}`)));
    await this.db.runTransaction(async tx => {
      const docs = await tx.getAll(...refs);
      if (docs.some((doc, index) => (doc.data()?.used ?? 0) >= keys[index]![1])) throw new HttpError(429, 'daily_limit_reached');
      docs.forEach((doc, index) => tx.set(refs[index]!, { used: (doc.data()?.used ?? 0) + 1, expiresAt: (day + 2) * 86400_000 }));
    });
  }
  async access(uid: string, selected?: string, ownerOnly = false): Promise<Access> {
    let person: Person | undefined;
    if (selected) person = (await this.personRef(selected).get()).data() as Person | undefined;
    else person = (await this.db.collection('participants').where('ownerUid', '==', uid).limit(1).get()).docs[0]?.data() as Person | undefined;
    if (!person || person.status === 'offboarded') throw new HttpError(selected ? 403 : 409, selected ? 'access_denied' : 'enrollment_required');
    if (person.ownerUid === uid) return { participant: person, uid, isOwner: true, canListen: true };
    if (ownerOnly) throw new HttpError(403, 'owner_required');
    const member = (await this.memberRef(person.id, uid).get()).data();
    if (!member?.grantId) throw new HttpError(403, 'access_denied');
    const grant = (await this.db.collection('grants').doc(member.grantId).get()).data();
    if (!grant || grant.participantId !== person.id || grant.granteeUid !== uid || !grant.acceptedAt || grant.revokedAt) {
      throw new HttpError(403, 'access_denied');
    }
    return { participant: person, uid, isOwner: false, canListen: !!grant.canListen };
  }
  async beginCall(sid: string): Promise<'accepted' | 'duplicate' | 'expired'> {
    const now = this.now(); const id = randomUUID();
    return this.db.runTransaction(async tx => {
      const [key, window, participant] = await tx.getAll(this.keyRef(sid), this.db.doc('trial/control'), this.personRef(this.config.TRIAL_PARTICIPANT_ID));
      if (key!.exists) return 'duplicate';
      const control = window!.data(); const person = participant!.data();
      // No implicit reset when an instance starts, a deployment happens, or a window expires.
      if (!control?.enabled || now >= control.expiresAt || control.used >= 10 || !person || person.status !== 'setup') return 'expired';
      const call: Call = { id, participantId: person.id, createdAt: now, expiresAt: now + RETENTION_MS,
        callerEnc: this.vault.seal(this.config.TRIAL_VERIFIED_CALLER, `call:${id}:caller`),
        state: 'screening', outcome: 'screening', reason: 'screening', purpose: null, completedAt: null,
        polls: 0, events: [{ kind: 'screening_started', at: now }] };
      tx.create(this.callRef(id), call);
      tx.create(this.keyRef(sid), { callId: id, expiresAt: now + RETENTION_MS });
      tx.update(window!.ref, { used: control.used + 1 });
      return 'accepted';
    });
  }
  private async callFor(tx: Transaction, sid: string): Promise<{ ref: ReturnType<CloudStore['callRef']>; call: Call } | null> {
    const key = await tx.get(this.keyRef(sid));
    if (!key!.data()?.callId) return null;
    const ref = this.callRef(key!.data()!.callId); const doc = await tx.get(ref);
    const call = doc.data() as Call | undefined;
    if (!call || call.participantId !== this.config.TRIAL_PARTICIPANT_ID || this.now() - call.createdAt > 120_000) return null;
    return { ref, call };
  }
  async introduction(sid: string, text: string): Promise<'queued' | 'silence' | 'duplicate'> {
    return this.db.runTransaction(async tx => {
      const found = await this.callFor(tx, sid);
      if (!found || found.call.state !== 'screening') return 'duplicate';
      const { ref, call } = found; const now = this.now();
      if (!text.trim()) {
        tx.update(ref, { state: 'ended', outcome: 'missed', reason: 'no_introduction', completedAt: now,
          events: [...call.events, { kind: 'no_introduction', at: now }] });
        return 'silence';
      }
      tx.update(ref, { state: 'evaluating', events: [...call.events, { kind: 'introduction_received', at: now }] });
      tx.create(this.db.collection('screeningJobs').doc(call.id), { callId: call.id, participantId: call.participantId,
        transcriptEnc: this.vault.seal(text, `job:${call.id}:intro`), status: 'pending', createdAt: now, expiresAt: now + 120_000 });
      return 'queued';
    });
  }
  async processJob(id: string, screener: Screener): Promise<void> {
    const jobRef = this.db.collection('screeningJobs').doc(id);
    const claimed = await this.db.runTransaction(async tx => {
      const [jobDoc, callDoc, personDoc] = await tx.getAll(jobRef, this.callRef(id), this.personRef(this.config.TRIAL_PARTICIPANT_ID));
      const job = jobDoc!.data(); const call = callDoc!.data() as Call | undefined;
      if (!job || job.status !== 'pending') return null;
      if (!call || call.state !== 'evaluating' || job.expiresAt <= this.now() || personDoc!.data()?.status !== 'setup') {
        tx.delete(jobRef); return null;
      }
      // Claim before any paid request. Redelivery never launches another extraction.
      // The encrypted introduction is removed on claim, including on process crash.
      tx.update(jobRef, { status: 'claimed', transcriptEnc: FieldValue.delete() });
      return { text: this.vault.open(job.transcriptEnc, `job:${id}:intro`), createdAt: call.createdAt };
    });
    if (!claimed) return;
    const decision = this.now() - claimed.createdAt > 100_000 ? unavailable
      : await screen(screener, claimed.text, this.config.MODEL_TIMEOUT_MS);
    await this.db.runTransaction(async tx => {
      const [callDoc, personDoc] = await tx.getAll(this.callRef(id), this.personRef(this.config.TRIAL_PARTICIPANT_ID));
      const call = callDoc!.data() as Call | undefined;
      if (call?.state === 'evaluating' && personDoc!.data()?.status === 'setup') {
        tx.update(callDoc!.ref, { decision, reason: decision.reason, purpose: decision.purpose,
          events: [...call.events, { kind: 'screening_completed', at: this.now() }] });
      }
      tx.delete(jobRef);
    });
  }
  async result(sid: string): Promise<{ kind: 'wait' | 'done' | 'duplicate'; decision?: Decision }> {
    return this.db.runTransaction(async tx => {
      const found = await this.callFor(tx, sid);
      if (!found || found.call.state !== 'evaluating') return { kind: 'duplicate' };
      const { ref, call } = found; const now = this.now();
      if (!call.decision && call.polls < 5) { tx.update(ref, { polls: call.polls + 1 }); return { kind: 'wait' }; }
      const decision = call.decision ?? unavailable;
      tx.update(ref, { state: 'ended', decision, reason: decision.reason, purpose: decision.purpose,
        outcome: decision.route === 'refuse' ? 'held' : decision.route === 'verify' ? 'verification' : 'missed',
        completedAt: now, events: [...call.events, { kind: 'trial_result_played', at: now }] });
      tx.delete(this.db.collection('screeningJobs').doc(call.id));
      return { kind: 'done', decision };
    });
  }
  /** One bounded daily invocation; all reads hide expired data immediately. */
  async cleanup(): Promise<void> {
    for (const collection of ['screeningJobs', 'callSessions', 'callKeys', 'usage', 'inviteKeys']) {
      const expired = await this.db.collection(collection).where('expiresAt', '<=', this.now()).limit(400).get();
      if (!expired.empty) { const batch = this.db.batch(); expired.docs.forEach(doc => batch.delete(doc.ref)); await batch.commit(); }
    }
  }
}
