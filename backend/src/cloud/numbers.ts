import type { DocumentData, Transaction } from 'firebase-admin/firestore';
import type { CloudStore } from './store.js';

// One Shield number per person. The number a forwarded call arrives on is how Shield knows whose call it is, so a
// number stays with its person while they're enrolled and is quarantined, never reassigned, after they leave.

export type NumberState = 'available' | 'assigned' | 'quarantine' | 'released';
export type ShieldNumber = { state: NumberState; participantId?: string | null; telnyxNumberId?: string | null;
  assignedAt?: number | null; quarantinedAt?: number | null; releasedAt?: number | null };
export const QUARANTINE_MS = 90 * 86400_000;
export const isShieldNumber = (value: string | undefined): value is string => !!value && /^\+1[2-9]\d{9}$/.test(value);

export const numberRef = (store: CloudStore, e164: string) => store.db.collection('shieldNumbers').doc(e164);

/** The person a call to `e164` belongs to, or undefined for an unknown, available or quarantined number. */
export function assignedTo(doc: DocumentData | undefined): string | undefined {
  return doc?.state === 'assigned' && typeof doc.participantId === 'string' ? doc.participantId : undefined;
}

/** Whether `e164` is any Shield number in any state. Calls from one are never screened (loop guard). */
export async function knownShieldNumber(store: CloudStore, e164: string | undefined, tx?: Transaction) {
  if (!isShieldNumber(e164)) return false;
  const ref = numberRef(store, e164);
  return (tx ? await tx.get(ref) : await ref.get()).exists;
}
