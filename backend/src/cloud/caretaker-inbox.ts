import type { CloudStore, Person } from './store.js';

export const CARETAKER_EVENT_RETENTION_MS = 30 * 86400_000;

/** The inbox is separate from call history. Recheck current consent on every read. */
export async function caretakerInbox(store: CloudStore, uid: string, phoneHash: string) {
  return store.db.runTransaction(async tx => {
    const rows = await tx.get(store.db.collection('caretakerEvents').where('recipientUid', '==', uid)
      .orderBy('createdAt', 'desc').limit(50));
    const current = rows.docs.filter(row => row.data().kind === 'monitor_intervened' && row.data().expiresAt > store.now());
    if (!current.length) return [];
    const references = new Map(current.flatMap(row => [store.db.collection('alertContacts').doc(row.data().contactId),
      store.personRef(row.data().participantId)]).map(ref => [ref.path, ref]));
    const related = await tx.getAll(...references.values());
    const byPath = new Map(related.map(doc => [doc.ref.path, doc.data()]));
    return current.flatMap(row => {
      const event = row.data(), c = byPath.get(`alertContacts/${event.contactId}`);
      const p = byPath.get(`participants/${event.participantId}`) as Person | undefined;
      if (!c || c.status !== 'accepted' || c.recipientUid !== uid || c.phoneHash !== phoneHash || !c.inbox
        || c.participantId !== event.participantId || (c.inboxAcceptedAt ?? c.respondedAt) > event.createdAt
        || !p || p.status === 'offboarded' || p.trustedContactsChoice?.enabled !== true) return [];
      return [{ id: row.id, name: store.name(p), occurredAt: new Date(event.createdAt).toISOString() }];
    });
  });
}
