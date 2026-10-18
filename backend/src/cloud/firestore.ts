import type { App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const configured = new WeakSet<Firestore>();

export function getShieldFirestore(app: App) {
  const db = getFirestore(app);
  if (!configured.has(db)) {
    // Preserve ABORTED so Firestore retries the whole transaction. The legacy
    // streaming path can replay a read with a closed transaction ID instead.
    // Retain the SDK's status codes, backoff and bounded transaction attempts.
    db.settings({ gaxServerStreamingRetries: true });
    configured.add(db);
  }
  return db;
}
