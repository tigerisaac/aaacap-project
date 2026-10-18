import { randomBytes } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import type { AuthProvider, Identity } from '../auth.js';
import { HttpError } from '../auth.js';
import type { CloudStore } from './store.js';
import { deleteAccount } from './account-deletion.js';

const SETTLE_MS = 120_000; // let already-running API/worker requests drain after fencing
export const deletionRef = (s: CloudStore, uid: string) => s.db.collection('accountDeletions').doc(s.vault.hash(`delete:${uid}`));
export async function requestAccountDeletion(s: CloudStore, identity: Identity, selected?: string, proposedReceipt?: string) {
  const ref = deletionRef(s, identity.subject);
  return s.db.runTransaction(async tx => {
    const job = await tx.get(ref);
    if (job.exists) {
      const d = job.data()!;
      return { requested: true, receipt: s.vault.open(d.receiptEnc, `deletion:${ref.id}:receipt`) };
    }
    const owned = await tx.get(s.db.collection('participants').where('ownerUid', '==', identity.subject));
    const target = selected ? await tx.get(s.personRef(selected)) : undefined;
    if (target?.exists && target.data()?.ownerUid !== identity.subject) throw new HttpError(403, 'owner_required');
    if (owned.docs.some(d => d.data().forwardingConsent)) throw new HttpError(409, 'restore_forwarding_before_deletion');
    const receipt = proposedReceipt ?? randomBytes(32).toString('hex');
    for (const d of owned.docs) tx.update(d.ref, { status: 'offboarded', alwaysOn: false });
    tx.create(ref, { state: 'pending', createdAt: s.now(), dueAt: s.now() + SETTLE_MS,
      uidEnc: s.vault.seal(identity.subject, `deletion:${ref.id}:uid`),
      ...(identity.verifiedPhone ? { phoneEnc: s.vault.seal(identity.verifiedPhone, `deletion:${ref.id}:phone`) } : {}),
      participantIds: owned.docs.map(d => d.id), receiptHash: s.vault.hash(receipt),
      receiptEnc: s.vault.seal(receipt, `deletion:${ref.id}:receipt`) });
    return { requested: true, receipt };
  });
}
export async function deletionReceipt(s: CloudStore, receipt: string) {
  const result = await s.db.collection('accountDeletions').where('receiptHash', '==', s.vault.hash(receipt)).limit(1).get();
  const d = result.docs[0]?.data();
  if (!d || d.expiresAt <= s.now()) throw new HttpError(404, 'deletion_receipt_unavailable');
  return { state: d.state === 'complete' ? 'complete' : 'pending' };
}
export async function processAccountDeletions(s: CloudStore, auth: AuthProvider) {
  const jobs = await s.db.collection('accountDeletions').where('state', '==', 'pending').where('dueAt', '<=', s.now()).orderBy('dueAt').limit(10).get();
  let completed = 0, failed = 0;
  for (const job of jobs.docs) {
    const claimed = await s.db.runTransaction(async tx => {
      const d = (await tx.get(job.ref)).data();
      if (!d || d.state !== 'pending' || d.dueAt > s.now() || d.leaseUntil > s.now()) return;
      tx.update(job.ref, { leaseUntil: s.now() + 300_000, dueAt: s.now() + 300_000 });
      return d;
    });
    if (!claimed) continue;
    try {
      const identity = { subject: s.vault.open(claimed.uidEnc, `deletion:${job.id}:uid`),
        ...(claimed.phoneEnc ? { verifiedPhone: s.vault.open(claimed.phoneEnc, `deletion:${job.id}:phone`) } : {}) };
      await deleteAccount(s, auth, identity, undefined, claimed.participantIds);
      await job.ref.update({ state: 'complete', completedAt: s.now(), expiresAt: s.now() + 7 * 86400_000,
        uidEnc: FieldValue.delete(), phoneEnc: FieldValue.delete(), participantIds: FieldValue.delete(), leaseUntil: FieldValue.delete() });
      completed += 1;
    } catch {
      // No user data or vendor error strings in receipts/logs. Retain the job to retry.
      await job.ref.update({ leaseUntil: 0, dueAt: s.now() + 60_000 });
      failed += 1;
    }
  }
  return { completed, failed };
}
