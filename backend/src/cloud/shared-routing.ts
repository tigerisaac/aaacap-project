import type { DocumentData, Transaction } from 'firebase-admin/firestore';
import { HttpError } from '../auth.js';
import type { CloudStore, Person } from './store.js';
import { numberRef } from './numbers.js';
import limits from './pilot-limits.json' with { type: 'json' };

export const SHARED_CAPACITY = limits.activeCalls;
export const SHARED_ENROLLMENT_LIMIT = limits.enrolledUsers;
export const normalizeForwardedNumber = (s: string) => {
  const n = s.replace(/^\+?1(?=\d{10}$)/, '');
  return /^[2-9]\d{9}$/.test(n) ? `+1${n}` : undefined;
};
/** Only a single, unambiguous Diversion identity is usable. Never select a matching number from an ambiguous chain. */
export function forwardingIdentity(headers: unknown): string | undefined {
  if (!Array.isArray(headers) || headers.length > 32) return;
  const values = headers.filter(h => typeof h?.name === 'string' && h.name.toLowerCase() === 'diversion').map(h => h.value);
  if (!values.length || values.some(v => typeof v !== 'string' || v.length > 2048 || /[\r\n]/.test(v))) return;
  const entries = (values as string[]).flatMap(v => v.split(','));
  if (entries.length > 8) return;
  const numbers = new Set<string>();
  for (const entry of entries) {
    const uri = (entry.trim().match(/^(?:"[^"<>]*"\s*)?<((?:sips?|tel):[^<>]+)>(?:\s*;[^<>]*)?$/i)
      ?? entry.trim().match(/^((?:sips?|tel):[^<>]+)$/i))?.[1];
    const address = uri?.match(/^(?:sips?:([+\d]+)@[a-z\d.:[\]-]+(?:;[^<>]*)?|tel:([+\d]+)(?:;[^<>]*)?)$/i);
    const number = normalizeForwardedNumber(address?.[1] ?? address?.[2] ?? '');
    if (!number) return;
    numbers.add(number);
  }
  return numbers.size === 1 ? [...numbers][0] : undefined;
}
export const routeRef = (s: CloudStore, to: string, diverted: string) => numberRef(s, to).collection('routes').doc(s.vault.hash(diverted));
export type SharedBinding = { participantId: string; phone: string; version: string; routeKey: string };
export async function sharedBinding(s: CloudStore, tx: Transaction, to: string, diverted: string): Promise<SharedBinding | undefined> {
  const ref = routeRef(s, to, diverted), route = (await tx.get(ref)).data();
  if (!route?.enabled || !route.qualifiedAt || typeof route.participantId !== 'string' || typeof route.version !== 'string') return;
  const p = (await tx.get(s.personRef(route.participantId))).data();
  if (!p?.phoneVerifiedAt || p.status === 'offboarded' || p.shieldNumber !== to || s.phone(p as Person) !== diverted) return;
  return { participantId: route.participantId, phone: diverted, version: route.version, routeKey: ref.id };
}
/** Operator enrollment: ownership is already verified; qualification is evidence from supervised real forwarding calls. */
export async function enrollSharedRoute(s: CloudStore, participantId: string, evidence: { version: string; carrier: string; qualifiedAt?: number }) {
  if (!/^[a-f0-9-]{36}$/.test(evidence.version) || !['tello', 'tmobile', 'verizon'].includes(evidence.carrier)
    || (evidence.qualifiedAt !== undefined && (!Number.isSafeInteger(evidence.qualifiedAt) || evidence.qualifiedAt <= 0 || evidence.qualifiedAt > s.now()))) throw new HttpError(400, 'invalid_qualification');
  return s.db.runTransaction(async tx => {
    const person = (await tx.get(s.personRef(participantId))).data();
    if (!person?.phoneVerifiedAt || person.status !== 'setup') throw new HttpError(409, 'verified_participant_required');
    const to = s.config.TELNYX_NUMBER, phone = s.phone(person as Person), ref = routeRef(s, to, phone);
    const [poolDoc, routeDoc] = await tx.getAll(numberRef(s, to), ref);
    const pool = poolDoc!.data(), route = routeDoc!.data();
    if (pool?.state !== 'shared' && !pool?.sharedPrepared) throw new HttpError(409, 'shared_pool_not_prepared');
    if (route && route.participantId !== participantId) throw new HttpError(409, 'route_quarantined');
    const members = new Set<string>(pool.members ?? []); members.add(participantId);
    if (members.size > SHARED_ENROLLMENT_LIMIT) throw new HttpError(409, 'pilot_full');
    if (person.shieldNumber && person.shieldNumber !== to) throw new HttpError(409, 'participant_has_another_number');
    tx.set(ref, { participantId, enabled: !!evidence.qualifiedAt, ...evidence });
    tx.update(poolDoc!.ref, { members: [...members] });
    tx.update(s.personRef(participantId), { shieldNumber: to, carrier: evidence.carrier });
  });
}
/** Reservations are released only after termination is confirmed, never just because a timer elapsed. */
export function liveLeases(doc: DocumentData | undefined): Record<string, number> {
  return Object.fromEntries(Object.entries(doc?.leases ?? {}).filter((e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1])));
}
