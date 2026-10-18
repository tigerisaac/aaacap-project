import { HttpError } from '../auth.js';

export const CONTACT_CHANGE_CONTRACT = 'revision-v1';

/** One revision covers the calling list, including full shares and legacy writes. */
export function contactsRevision(person: Record<string, unknown>): number {
  const value = person.contactsRevision ?? 0;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value >= Number.MAX_SAFE_INTEGER) {
    throw new HttpError(503, 'contact_revision_unavailable');
  }
  return value;
}

export function advanceContactsRevision(person: Record<string, unknown>) {
  return { contactsRevision: contactsRevision(person) + 1, contactsChange: null };
}
