import { randomUUID } from 'node:crypto';
import { FieldValue, type DocumentData } from 'firebase-admin/firestore';
import { HttpError } from '../auth.js';
import type { CloudStore, Person } from './store.js';
import { ForwardingStore } from './forwarding-store.js';
import { routeRef } from './shared-routing.js';

export type RestorationStep = { id: string; kind: 'code' | 'carrier' | 'settings' | 'voicemailSettings' | 'call' | 'voicemail'; code?: string };
export function restorationSteps(control: DocumentData | undefined): RestorationStep[] {
  // Only a line-specific, operator-approved plan may supply dial codes. Never
  // infer a default reset from a carrier name: it could erase custom forwarding.
  const codes = control?.restorationCodes;
  const valid = Array.isArray(codes) && codes.length > 0 && codes.length <= 5
    && codes.every(c => typeof c === 'string' && /^[*#0-9]{2,40}$/.test(c));
  return [...(valid ? codes.map((code, i) => ({ id: `carrier-${i}`, kind: 'code' as const, code }))
    : [{ id: 'carrier', kind: 'carrier' as const }]),
    { id: 'settings', kind: 'settings' }, { id: 'voicemail-settings', kind: 'voicemailSettings' },
    { id: 'call', kind: 'call' }, { id: 'voicemail', kind: 'voicemail' }];
}
export function restorationDTO(person: DocumentData, control: DocumentData | undefined) {
  const progress = person.restoration;
  return { id: progress?.id ?? null, index: progress?.index ?? 0, completed: !!progress?.completedAt,
    steps: progress?.steps ?? restorationSteps(control), instructions: control?.restorationGuide ?? [],
    carrier: person.carrier === 'tmobile' ? 'T-Mobile' : person.carrier === 'tello' ? 'Tello' : 'your carrier',
    required: !!person.forwardingConsent, evidence: progress?.completedAt ? 'owner_confirmed' : null };
}

export async function startRestoration(s: CloudStore, uid: string, id: string, restart = false) {
  const f = new ForwardingStore(s), ref = s.personRef(id);
  return s.db.runTransaction(async tx => {
    const [doc, control] = await tx.getAll(ref, f.controlRef(id));
    const p = doc!.data();
    if (!p || p.ownerUid !== uid || p.status === 'offboarded') throw new HttpError(403, 'owner_required');
    if (p.restoration && !restart) return restorationDTO(p, control!.data());
    const calls = await tx.get(s.db.collection('callSessions').where('participantId', '==', id));
    if (calls.docs.some(d => d.data().state !== 'ended' && d.data().expiresAt > s.now() && !d.data().inboundEndedAt)) throw new HttpError(409, 'call_still_active');
    const restoration = { id: randomUUID(), index: 0, startedAt: s.now(), steps: restorationSteps(control!.data()) };
    // Keep existing service available while the person changes their carrier settings.
    // Starting instructions is neither a carrier reset nor permission to stop calls.
    tx.update(ref, { restoration, forwardingStage: 'restore' });
    return restorationDTO({ ...p, restoration }, control!.data());
  });
}

export async function confirmRestoration(s: CloudStore, uid: string, id: string, session: string, step: string) {
  const f = new ForwardingStore(s), ref = s.personRef(id);
  return s.db.runTransaction(async tx => {
    const [doc, control] = await tx.getAll(ref, f.controlRef(id));
    const p = doc!.data();
    if (!p || p.ownerUid !== uid || p.status === 'offboarded') throw new HttpError(403, 'owner_required');
    const r = p.restoration;
    if (!r || r.id !== session) throw new HttpError(409, 'restoration_changed');
    const steps = r.steps as RestorationStep[];
    const requested = steps.findIndex(value => value.id === step);
    if (requested < 0 || requested > r.index) throw new HttpError(409, 'restoration_changed');
    if (requested < r.index || r.completedAt) return restorationDTO(p, control!.data()); // lost-response retry
    const index = r.index + 1, last = index === steps.length;
    const calls = last ? await tx.get(s.db.collection('callSessions').where('participantId', '==', id)) : undefined;
    if (last && calls!.docs.some(d => d.data().state !== 'ended' && d.data().expiresAt > s.now() && !d.data().inboundEndedAt)) {
      throw new HttpError(409, 'call_still_active');
    }
    if (last && calls!.docs.some(d => d.data().source === 'forwarding' && d.data().createdAt >= (r.checksStartedAt ?? r.startedAt))) {
      throw new HttpError(409, 'forwarding_still_arriving');
    }
    const route = last && p.shieldNumber && p.phoneEnc ? routeRef(s, p.shieldNumber, s.phone(p as Person)) : undefined;
    const routeDoc = route ? await tx.get(route) : undefined;
    const restoration = { ...r, index, updatedAt: s.now(),
      ...(steps[index]?.kind === 'call' ? { checksStartedAt: s.now() } : {}),
      ...(last ? { completedAt: s.now(), evidence: 'owner_confirmed' } : {}) };
    tx.update(ref, { restoration, ...(last ? { status: 'paused', alwaysOn: false, forwardingConsent: FieldValue.delete(),
      forwardingStage: 'restore', callMonitoring: { enabled: false, updatedAt: s.now() } } : {}) });
    if (last) {
      tx.set(f.controlRef(id), { enabled: false, restoredAt: s.now() }, { merge: true });
      if (routeDoc?.data()?.participantId === id) tx.update(route!, { enabled: false, disabledAt: s.now() });
    }
    // This records explicit carrier/reset and real-service confirmations by the
    // owner, corroborated against Shield's inbound records. It is not carrier telemetry.
    return restorationDTO({ ...p, restoration, ...(last ? { forwardingConsent: undefined } : {}) }, control!.data());
  });
}
