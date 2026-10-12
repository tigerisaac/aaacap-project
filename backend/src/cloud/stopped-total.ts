import { FieldPath, FieldValue, type Transaction } from 'firebase-admin/firestore';
import { HttpError } from '../auth.js';
import type { Call, CloudStore } from './store.js';

const PAGE_SIZE = 200;
const totalRef = (store: CloudStore, participantId: string) => store.personRef(participantId).collection('statistics').doc('stoppedCalls');

/** Same stopped/review outcomes as history; restored messages remain historical stops. */
export function wasStopped(call: Call): boolean {
  return ['held', 'verification'].includes(call.outcome)
    || call.events.some(event => ['call_stopped', 'blocked_caller_ended', 'voicemail_removed'].includes(event.kind));
}

/** Caller must read the call first and save this marker with its outcome in the same transaction. */
export function countStoppedCall(store: CloudStore, tx: Transaction, call: Call): { stoppedCounted?: true } {
  if (call.stoppedCounted) return {};
  tx.set(totalRef(store, call.participantId), { total: FieldValue.increment(1) }, { merge: true });
  return { stoppedCounted: true };
}

/** Seed from recoverable history once, in resumable pages. Never decrement when history expires or a message is restored. */
export async function stoppedTotal(store: CloudStore, participantId: string): Promise<number> {
  const ref = totalRef(store, participantId);
  for (;;) {
    const result = await store.db.runTransaction(async tx => {
      const [counter, person] = await tx.getAll(ref, store.personRef(participantId));
      if (!person!.exists || person!.data()?.status === 'offboarded') throw new HttpError(403, 'access_denied');
      const data = counter!.data();
      if (data?.backfilled) return { done: true, total: data.total as number };
      let query = store.db.collection('callSessions').where('participantId', '==', participantId)
        .orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
      if (data?.cursor) query = query.startAfter(data.cursor);
      const page = await tx.get(query);
      let added = 0;
      for (const doc of page.docs) {
        const call = doc.data() as Call;
        if (!call.stoppedCounted && wasStopped(call)) {
          tx.update(doc.ref, { stoppedCounted: true });
          added++;
        }
      }
      const total = (data?.total ?? 0) + added, done = page.size < PAGE_SIZE;
      tx.set(ref, { total, backfilled: done, cursor: done ? FieldValue.delete() : page.docs.at(-1)!.id }, { merge: true });
      return { done, total };
    });
    if (result.done) return result.total;
  }
}
