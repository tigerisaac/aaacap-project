import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { bearer, HttpError, type AuthProvider } from '../auth.js';
import { CloudStore } from './store.js';
import { ForwardingStore, forwardingConsent } from './forwarding-store.js';

import { ForwardingProbes, type ProbeDependencies } from './forwarding-probes.js';
import { forwardingNumber, TelnyxVoice } from './forwarding-provider.js';
import { CallMonitor, MONITORING_CONSENT, monitoringEnabledFor } from './monitoring.js';

const at = (n?: number) => n ? new Date(n).toISOString() : null;
const stages = ['overview', 'consent', 'save', 'ring', 'settings', 'liveVoicemail', 'forward0', 'forward1', 'forward2', 'test', 'checks', 'restore'] as const;
export async function registerForwardingAPI(app: FastifyInstance, store: CloudStore, auth: AuthProvider, deps: ProbeDependencies = {}) {
  const probes = new ForwardingProbes(store);
  const f = new ForwardingStore(store), consent = forwardingConsent;
  const monitoringAvailable = new CallMonitor(f).available;
  const owner = async (request: FastifyRequest) => {
    const selected = request.headers['x-shield-participant'];
    return f.requireOwner((await auth.identify(bearer(request))).subject,
      selected === undefined ? undefined : z.string().uuid().parse(selected).toLowerCase());
  };
  app.get('/api/forwarding', async request => {
    const ctx = await owner(request), p = ctx.participant, control = (await f.control.get()).data();
    const prepared = !!control?.provisioned && !!control.dataPlanConfirmed && !!control.restorationGuide?.length;
    const active = prepared && control?.enabled === true && control.expiresAt > store.now() && control.used < 10 && p.status === 'setup';
    const recent = await store.db.collection('callSessions').where('participantId', '==', p.id)
      .orderBy('createdAt', 'desc').limit(10).get();
    return { participantId: p.id, carrier: 'Tello', phone: store.phone(p), shieldNumber: forwardingNumber(store.config),
      prepared, active, probe: probes.publicState(control), ringTestAt: at(control?.ringTestAt), forwardingTestAt: at(control?.forwardingTestAt), expiresAt: at(control?.expiresAt), remainingCalls: Math.max(0, 10 - (control?.used ?? 10)),
      liveScreening: store.config.LIVE_SCREENING_ENABLED,
      monitoring: { available: monitoringAvailable, enabled: monitoringAvailable && monitoringEnabledFor(p), consentVersion: MONITORING_CONSENT,
        choiceRecorded: p.callMonitoring?.enabled === false || monitoringEnabledFor(p) },
      voiceProvider: 'Telnyx',
      consentVersion: consent, consented: p.forwardingConsent === consent,
      phoneVerified: !!p.phoneVerifiedAt, stage: stages.includes(p.forwardingStage) ? p.forwardingStage : 'overview',
      restorationRequested: p.status === 'restoring', lastTestAt: at(control?.lastTestAt),
      activationCodes: active ? ['61', '67', '62'].map(condition => `**${condition}*${forwardingNumber(store.config).slice(1)}#`) : [],
      restorationSteps: control?.restorationGuide ?? [],
      readiness: control?.blocker === 'provider_upgrade_required' ? 'Phone service needs an upgrade before setup can start.'
        : !control?.provisioned ? 'The forwarding service is being prepared. Keep your phone settings unchanged.'
        : !control.dataPlanConfirmed ? 'Confirm your Tello plan includes mobile data before forwarding.'
        : !control.restorationGuide?.length ? 'Your original phone settings must be saved before setup can start.'
        : !active ? 'Ready for a 30-minute call test. Start it here when you’re ready.'
        : 'The supervised call-test window is open.',
      latestEvents: recent.docs.filter(d => d.data().source === 'forwarding' && d.data().expiresAt > store.now()).slice(0, 3).reverse()
        .flatMap(d => (d.data().events as { kind: string; at: number }[]).map(e => ({ kind: e.kind, at: at(e.at) }))).slice(-12)
    };
  });
  app.post('/api/forwarding/test-window', async request => {
    await owner(request);
    z.object({ allowAnyCaller: z.literal(true) }).strict().parse(request.body);
    await probes.openWindow(); return { opened: true };
  });
  app.post('/api/forwarding/probe', async request => {
    await owner(request);
    const { kind } = z.object({ kind: z.enum(['ring', 'forwarding']) }).strict().parse(request.body);
    const probe = await probes.reserve(kind);
    if (probe) {
      // No automatic retries: a timeout may still mean the provider placed the call.
      // Keep the reservation until its deadline to prevent a second billable call.
      try { await (deps.startForwardingProbe ?? (id => new TelnyxVoice(store.config).startProbe(id)))(probe.id); }
      catch { /* The app waits for signed evidence or the bounded timeout. */ }
    }
    return { requested: true };
  });
  app.post('/api/forwarding/consent', async request => {
    const ctx = await owner(request);
    z.object({ version: z.literal(consent), accepted: z.literal(true) }).parse(request.body);
    await store.personRef(ctx.participant.id).update({ forwardingConsent: consent, forwardingConsentedAt: store.now() });
    return { recorded: true };
  });
  // Owner-only, explicit opt-in to transcribing accepted calls; turning it off needs no consent.
  app.post('/api/forwarding/monitoring', async request => {
    const ctx = await owner(request);
    const body = z.union([z.object({ enabled: z.literal(true), version: z.literal(MONITORING_CONSENT) }).strict(),
      z.object({ enabled: z.literal(false) }).strict()]).parse(request.body);
    if (body.enabled && !monitoringAvailable) throw new HttpError(409, 'monitoring_unavailable');
    await store.personRef(ctx.participant.id).update({ callMonitoring: body.enabled
      ? { enabled: true, consent: MONITORING_CONSENT, updatedAt: store.now() } : { enabled: false, updatedAt: store.now() } });
    return { enabled: body.enabled };
  });
  app.post('/api/forwarding/progress', async request => {
    const ctx = await owner(request), { stage } = z.object({ stage: z.enum(stages) }).parse(request.body);
    if (stage.startsWith('forward')) {
      const c = (await f.control.get()).data();
      if (!c?.provisioned || !c.dataPlanConfirmed || !c.restorationGuide?.length || !c.enabled || c.expiresAt <= store.now() || !ctx.participant.phoneVerifiedAt || ctx.participant.forwardingConsent !== consent) throw new HttpError(409, 'setup_not_ready');
    }
    await store.personRef(ctx.participant.id).update({ forwardingStage: stage }); return { saved: true };
  });
  app.post('/api/forwarding/restore', async request => {
    const ctx = await owner(request);
    const batch = store.db.batch(); batch.set(f.control, { enabled: false }, { merge: true });
    batch.update(store.personRef(ctx.participant.id), { status: 'restoring', forwardingStage: 'restore' }); await batch.commit();
    return { requested: true };
  });
  // Numbers Shield ended a scam from. Helpers can see the list; only the person can unblock.
  app.get('/api/blocked-numbers', async request => {
    const selected = request.headers['x-shield-participant'];
    const ctx = await store.access((await auth.identify(bearer(request))).subject, selected === undefined ? undefined : z.string().uuid().parse(selected).toLowerCase());
    const docs = await store.personRef(ctx.participant.id).collection('blocked-numbers').orderBy('createdAt', 'desc').limit(200).get();
    return { items: docs.docs.filter(d => d.data().expiresAt > store.now()).map(d => ({ id: d.id, reason: d.data().reason,
      phone: store.vault.open(d.data().phoneEnc, `blocked:${ctx.participant.id}:${d.id}`), blockedAt: at(d.data().createdAt),
      expiresAt: at(d.data().expiresAt), attempts: d.data().attempts ?? 0, lastAttemptAt: at(d.data().lastAttemptAt) })) };
  });
  app.delete('/api/blocked-numbers/:id', async request => {
    const ctx = await owner(request), { id } = z.object({ id: z.string().regex(/^[a-f0-9]{64}$/) }).parse(request.params);
    const ref = f.blockedRef(ctx.participant.id, id);
    if (!(await ref.get()).exists) throw new HttpError(404, 'blocked_number_not_found');
    await ref.delete(); return { unblocked: true };
  });
  app.get('/api/voicemails/:id/audio', async (request, reply) => {
    const id = z.string().uuid().parse((request.params as { id: string }).id).toLowerCase();
    const uid = (await auth.identify(bearer(request))).subject;
    const audio = (await store.db.collection('forwardingAudio').doc(id).get()).data();
    if (!audio || audio.expiresAt <= store.now()) throw new HttpError(404, 'voicemail_not_found');
    const ctx = await store.access(uid, audio.participantId);
    if (!ctx.canListen) throw new HttpError(403, 'access_denied');
    const bytes = Buffer.from(store.vault.open(audio.audioEnc, `voicemail:${id}`), 'base64');
    return reply.type('audio/mpeg').send(bytes);
  });
  app.post('/api/voicemails/:id/heard', async request => {
    const id = z.string().uuid().parse((request.params as { id: string }).id).toLowerCase();
    const call = (await store.callRef(id).get()).data(); if (!call?.voicemail || call.expiresAt <= store.now()) throw new HttpError(404, 'voicemail_not_found');
    const ctx = await store.access((await auth.identify(bearer(request))).subject, call.participantId);
    if (!ctx.canListen) throw new HttpError(403, 'access_denied');
    await store.callRef(id).update({ 'voicemail.heardAt': store.now() }); return { saved: true };
  });
  app.delete('/api/voicemails/:id', async request => {
    const id = z.string().uuid().parse((request.params as { id: string }).id).toLowerCase();
    const ctx = await owner(request), ref = store.callRef(id);
    await store.db.runTransaction(async tx => {
      const c = (await tx.get(ref)).data();
      if (!c || c.participantId !== ctx.participant.id) throw new HttpError(404, 'voicemail_not_found');
      tx.update(ref, { voicemail: FieldValue.delete(), voicemailDeletedAt: store.now() });
      tx.delete(store.db.collection('forwardingAudio').doc(id));
    }); return { deleted: true };
  });
}
