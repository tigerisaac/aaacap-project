import type { Firestore, DocumentData } from 'firebase-admin/firestore';
import { HttpError } from '../auth.js';
import { Vault } from '../crypto.js';
import type { CloudConfig } from './config.js';

export type Person = DocumentData & { id: string; ownerUid: string; nameEnc: string; phoneEnc: string; status: string };
export type Call = DocumentData & { id: string; participantId: string; createdAt: number; expiresAt: number;
  callerEnc: string; state: string; outcome: string; reason: string; purpose: string | null;
  events: { kind: string; at: number }[]; completedAt: number | null };
export type Access = { participant: Person; uid: string; isOwner: boolean; canListen: boolean };

/** Durable storage shared by the API, call webhooks and background functions. */
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
  /** One bounded daily invocation; all reads hide expired data immediately. */
  async cleanup(): Promise<void> {
    for (const collection of ['callSessions', 'callKeys', 'usage', 'inviteKeys', 'forwardingAudio', 'forwardingUsage', 'monitoredCalls', 'monitorChecks', 'alerts', 'devices']) {
      const expired = await this.db.collection(collection).where('expiresAt', '<=', this.now()).limit(400).get();
      if (!expired.empty) { const batch = this.db.batch(); expired.docs.forEach(doc => batch.delete(doc.ref)); await batch.commit(); }
    }
    const blocked = await this.db.collectionGroup('blocked-numbers').where('expiresAt', '<=', this.now()).limit(400).get();
    if (!blocked.empty) { const batch = this.db.batch(); blocked.docs.forEach(doc => batch.delete(doc.ref)); await batch.commit(); }
  }
}
