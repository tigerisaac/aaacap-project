import { forwardingConsent, ForwardingStore } from '../src/cloud/forwarding-store.js';
import type { CloudStore } from '../src/cloud/store.js';

/** Test enrollment: the participant, their Shield number in the registry, and an open supervised test window. */
export async function enroll(s: CloudStore, p: { id: string; uid: string; phone: string; shieldNumber: string; now: number; name?: string;
  person?: Record<string, unknown>; control?: Record<string, unknown> | null }) {
  const f = new ForwardingStore(s);
  await s.personRef(p.id).set({ id: p.id, ownerUid: p.uid, status: 'setup', phoneVerifiedAt: p.now, forwardingConsent, shieldNumber: p.shieldNumber,
    carrier: 'tello', nameEnc: s.vault.seal(p.name ?? 'Test', `person:${p.id}:name`), phoneEnc: s.vault.seal(p.phone, `person:${p.id}:phone`), ...p.person });
  await s.db.collection('shieldNumbers').doc(p.shieldNumber).set({ state: 'assigned', participantId: p.id, assignedAt: p.now });
  if (p.control !== null) await f.controlRef(p.id).set({ provisioned: true, enabled: true, dataPlanConfirmed: true,
    restorationGuide: ['Restore saved carrier settings'], allowAnyCaller: true, used: 0, expiresAt: p.now + 1800_000, ...p.control });
  return f;
}
