import { randomUUID } from 'node:crypto';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { z } from 'zod';
import type { CloudStore } from './store.js';
import { HttpError } from '../auth.js';
import { advanceContactsRevision, contactsRevision } from './contact-revision.js';

export const sharedContactsSchema = z.object({ expectedRevision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER - 1).optional(), contacts: z.array(z.object({
  label: z.string().trim().min(1).max(60), phone: z.string().min(3).max(100)
}).strict()).max(5000) }).strict();
export function normalizeSharedPhone(raw: string) {
  const parsed = parsePhoneNumberFromString(raw, 'US');
  return parsed?.isValid() ? parsed.number : undefined;
}

/** Phone Contacts is the demo's routing list. Save only names/numbers, never other contact fields. */
export async function syncSharedContacts(store: CloudStore, participantId: string, input: z.infer<typeof sharedContactsSchema>) {
  const person = store.personRef(participantId), rows = person.collection('trusted-numbers'), token = randomUUID(), now = store.now();
  await store.db.runTransaction(async tx => {
    const p = (await tx.get(person)).data();
    if (p?.contactsSyncUntil > now) throw new HttpError(409, 'contacts_sync_busy');
    if (input.expectedRevision !== undefined && input.expectedRevision !== contactsRevision(p ?? {})) {
      throw new HttpError(409, 'contacts_changed');
    }
    // Starting a new explicit full share supersedes earlier per-contact requests,
    // including a delayed request for a row whose value needs no batch write.
    tx.update(person, { ...advanceContactsRevision(p ?? {}), contactsSyncToken: token, contactsSyncUntil: now + 60_000 });
  });
  let synced = false;
  try {
    const old = await rows.limit(5001).get();
    const desired = new Map<string, { phone: string; label: string }>();
    let skipped = 0;
    for (const entry of input.contacts) {
      const phone = normalizeSharedPhone(entry.phone);
      if (!phone) { skipped++; continue; }
      const hash = store.vault.hash(phone);
      if (!desired.has(hash)) desired.set(hash, { phone, label: entry.label });
    }
    const existing = new Map(old.docs.map(d => [d.data().phoneHash, d]));
    if (old.size + [...desired.keys()].filter(h => !existing.has(h)).length > 5000) throw new HttpError(409, 'number_limit_reached');
    const writes: { ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown> }[] = [];
    for (const [hash, entry] of desired) {
      const prior = existing.get(hash), ref = prior?.ref ?? rows.doc(randomUUID());
      if (prior && prior.data().enabled !== false && store.vault.open(prior.data().labelEnc, `contact:${ref.id}:label`) === entry.label) continue;
      writes.push({ ref, data: { labelEnc: store.vault.seal(entry.label, `contact:${ref.id}:label`),
        phoneEnc: store.vault.seal(entry.phone, `contact:${ref.id}:phone`), phoneHash: hash,
        createdAt: prior?.data().createdAt ?? now, enabled: true } });
    }
    for (const prior of old.docs) if (!desired.has(prior.data().phoneHash) && prior.data().enabled !== false) {
      writes.push({ ref: prior.ref, data: { enabled: false } });
    }
    // Each chunk checks the same lease transactionally. A late request cannot overwrite a newer sync.
    for (let i = 0; i < writes.length; i += 350) {
      await store.db.runTransaction(async tx => {
        const p = (await tx.get(person)).data();
        if (p?.contactsSyncToken !== token || p.contactsSyncUntil <= store.now()) throw new HttpError(409, 'contacts_sync_busy');
        for (const change of writes.slice(i, i + 350)) tx.set(change.ref, change.data, { merge: true });
      });
    }
    synced = true;
    return { shared: desired.size, skipped };
  } finally {
    // The app's setup check reads contactsSyncedAt to say when the shared list was last refreshed.
    await store.db.runTransaction(async tx => {
      if ((await tx.get(person)).data()?.contactsSyncToken === token) tx.update(person, { contactsSyncUntil: 0, ...(synced ? { contactsSyncedAt: store.now() } : {}) });
    });
  }
}
