import { SharedProbes } from './shared-probes.js';
import { z } from 'zod';
import { FieldPath, FieldValue } from 'firebase-admin/firestore';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { bearer, HttpError, type AuthProvider } from '../auth.js';
import { CloudStore } from './store.js';
import { ForwardingStore, forwardingConsent } from './forwarding-store.js';

import { ForwardingProbes, type ProbeDependencies } from './forwarding-probes.js';
import { TelnyxVoice } from './forwarding-provider.js';
import { activationCodes, carrierFor } from './carriers.js';
import { DEFAULT_QUIET_HOURS } from './forwarding-store.js';
import { SETUP_CHECK_LIMITS, SetupChecks, type SetupCheckDialer } from './setup-check.js';
import { CallMonitor, MONITORING_CONSENT, monitoringEnabledFor } from './monitoring.js';
import { queueAlert } from './alerts.js';
import { VoicemailCheck } from './voicemail-check.js';
import { deleteMessageAudio, readMessageAudio } from './message-audio.js';
import { registerAudioDelivery } from './audio-delivery.js';
import { startRestoration, confirmRestoration, cancelRestoration, setupReviewRequired, restorationDTO } from './restoration.js';
import { ServiceAccess } from './service-access.js';
import { hasRestorationGuide, readRestorationGuide } from './restoration-guide.js';

const at = (n?: number) => n ? new Date(n).toISOString() : null;
const stages = ['overview', 'consent', 'save', 'ring', 'settings', 'liveVoicemail', 'forward0', 'forward1', 'forward2', 'test', 'checks', 'restore'] as const;
export async function registerForwardingAPI(app: FastifyInstance, store: CloudStore, auth: AuthProvider, deps: ProbeDependencies = {}, serviceAccess = new ServiceAccess(store)) {
  registerAudioDelivery(app, store, auth);
  const probes = new ForwardingProbes(store);
  const f = new ForwardingStore(store), consent = forwardingConsent;
  const monitoringAvailable = new CallMonitor(f).available;
  const owner = async (request: FastifyRequest) => {
    const selected = request.headers['x-shield-participant'];
    return f.requireOwner((await auth.identify(bearer(request))).subject,
      selected === undefined ? undefined : z.string().uuid().parse(selected).toLowerCase());
  };
  app.get('/api/forwarding', async request => {
    const ctx = await owner(request), p = ctx.participant, control = (await f.controlRef(p.id).get()).data();
    const prepared = !!control?.provisioned && !!control.dataPlanConfirmed && hasRestorationGuide(control);
    const active = prepared && control?.enabled === true && control.expiresAt > store.now() && control.used < 10 && p.status === 'setup';
    const carrier = carrierFor(p.carrier);
    const recent = await store.db.collection('callSessions').where('participantId', '==', p.id)
      .orderBy('createdAt', 'desc').limit(10).get();
    return { participantId: p.id, carrier: carrier?.name ?? 'your carrier', carrierVerified: !!carrier?.verified, phone: store.phone(p), shieldNumber: p.shieldNumber,
      alwaysOn: p.alwaysOn === true, publicEnrollment: !!p.publicEnrollment, quietHours: p.quietHours ?? DEFAULT_QUIET_HOURS,
      setupCheckNumber: store.config.SETUP_CHECK_NUMBER ?? null,
      lastSetupCheck: control?.lastSetupCheck ? { at: at(control.lastSetupCheck.at), result: control.lastSetupCheck.result } : null,
      prepared, active, probe: probes.publicState(control), contactsSyncedAt: at(p.contactsSyncedAt), ringTestAt: at(control?.ringTestAt), forwardingTestAt: at(control?.forwardingTestAt), expiresAt: at(control?.expiresAt), remainingCalls: Math.max(0, 10 - (control?.used ?? 10)),
      liveScreening: store.config.LIVE_SCREENING_ENABLED,
      monitoring: monitoringState(p),
      voiceProvider: 'Telnyx',
      consentVersion: consent, consented: p.forwardingConsent === consent,
      phoneVerified: !!p.phoneVerifiedAt, stage: stages.includes(p.forwardingStage) ? p.forwardingStage : 'overview',
      setupReviewRequired: setupReviewRequired(control),
      restorationRequested: p.status === 'restoring' || !!p.restoration, lastTestAt: at(control?.lastTestAt),
      activationCodes: active ? activationCodes(p.carrier, p.shieldNumber) : [],
      restorationSteps: readRestorationGuide(store, p.id, control),
      readiness: control?.blocker === 'provider_upgrade_required' ? 'Phone service needs an upgrade before setup can start.'
        : !control?.provisioned ? 'The forwarding service is being prepared. Keep your phone settings unchanged.'
        : !carrier?.verified ? 'Shield hasn’t been tested with your carrier yet. Staff will help you set it up.'
        : !control.dataPlanConfirmed ? `Confirm your ${carrier.name} plan includes mobile data before forwarding.`
        : !hasRestorationGuide(control) ? 'Your original phone settings must be saved before setup can start.'
        : !active ? 'Ready for a 30-minute call test. Start it here when you’re ready.'
        : 'The supervised call-test window is open.',
      latestEvents: recent.docs.filter(d => d.data().source === 'forwarding' && d.data().expiresAt > store.now()).slice(0, 3).reverse()
        .flatMap(d => (d.data().events as { kind: string; at: number }[]).map(e => ({ kind: e.kind, at: at(e.at) }))).slice(-12)
    };
  });
  app.post('/api/forwarding/test-window', async request => {
    const ctx = await owner(request);
    z.object({ allowAnyCaller: z.literal(true) }).strict().parse(request.body);
    await serviceAccess.requireActivation(ctx.uid, ctx.participant.id);
    await probes.openWindow(ctx.participant.id); return { opened: true };
  });
  // On app launch, run the setup check if the last one is over a day old (the daily schedule covers the rest).
  app.post('/api/forwarding/setup-check', async request => {
    const ctx = await owner(request), checks = new SetupChecks(store), telnyx = new TelnyxVoice(store.config);
    const dial: SetupCheckDialer = deps.startSetupCheck ?? ((id, from, to) => telnyx.startSetupCheck(id, from, to));
    return { started: !!(await checks.start(ctx.participant.id, dial, SETUP_CHECK_LIMITS.appRecheckMs)) };
  });
  // Overnight, always-on screening sends callers Shield would offer to voicemail. The person sets the hours.
  app.post('/api/forwarding/quiet-hours', async request => {
    const ctx = await owner(request);
    const hour = z.number().int().min(0).max(23);
    const quietHours = z.object({ enabled: z.boolean(), start: hour, end: hour }).strict().parse(request.body);
    await store.personRef(ctx.participant.id).update({ quietHours }); return { quietHours };
  });
  app.post('/api/forwarding/probe', async request => {
    const ctx = await owner(request);
    const { kind } = z.object({ kind: z.enum(['ring', 'forwarding']) }).strict().parse(request.body);
    const probe = await probes.reserve(ctx.participant.id, kind), ends = f.endpoints(ctx.participant);
    if (probe && ends) {
      // No automatic retries: a timeout may still mean the provider placed the call.
      // Keep the reservation until its deadline to prevent a second billable call.
      try { await (deps.startForwardingProbe ?? ((id, from, to) => store.config.SHARED_NUMBER_ENABLED ? new SharedProbes(store).start(id, from, to) : new TelnyxVoice(store.config).startProbe(id, from, to)))(probe.id, ends.shieldNumber, ends.phone); }
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
  // The person's own choices that don't depend on having a Shield number yet (onboarding asks before staff assign one).
  const self = async (request: FastifyRequest) => {
    const selected = request.headers['x-shield-participant'];
    return store.access((await auth.identify(bearer(request))).subject, selected === undefined ? undefined : z.string().uuid().parse(selected).toLowerCase(), true);
  };
  const monitoringState = (p: FirebaseFirestore.DocumentData) => ({ available: monitoringAvailable, enabled: monitoringAvailable && monitoringEnabledFor(p),
    consentVersion: MONITORING_CONSENT, choiceRecorded: p.callMonitoring?.enabled === false || monitoringEnabledFor(p) });
  app.get('/api/forwarding/monitoring', async request => monitoringState((await self(request)).participant));
  // Owner-only, explicit opt-in to transcribing accepted calls; turning it off needs no consent.
  app.post('/api/forwarding/monitoring', async request => {
    const ctx = await self(request);
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
      await serviceAccess.requireActivation(ctx.uid, ctx.participant.id);
      const c = (await f.controlRef(ctx.participant.id).get()).data();
      if (!c?.provisioned || !c.dataPlanConfirmed || !hasRestorationGuide(c) || !c.enabled || c.expiresAt <= store.now() || !ctx.participant.phoneVerifiedAt || ctx.participant.forwardingConsent !== consent) throw new HttpError(409, 'setup_not_ready');
    }
    if (stage === 'checks') await serviceAccess.activatePilot(ctx.uid, ctx.participant.id);
    await store.personRef(ctx.participant.id).update({ forwardingStage: stage }); return { saved: true };
  });
  app.post('/api/forwarding/restore', async request => {
    const ctx = await owner(request);
    const body = z.object({ restart: z.boolean().optional() }).strict().parse(request.body ?? {});
    return startRestoration(store, ctx.uid, ctx.participant.id, body.restart);
  });
  app.get('/api/forwarding/restoration', async request => {
    const ctx = await owner(request);
    return restorationDTO(ctx.participant, (await f.controlRef(ctx.participant.id).get()).data(), store);
  });
  app.post('/api/forwarding/restoration/confirm', async request => {
    const ctx = await owner(request);
    const body = z.object({ session: z.string().uuid().transform(value => value.toLowerCase()), step: z.string().min(1).max(40) }).strict().parse(request.body);
    return confirmRestoration(store, ctx.uid, ctx.participant.id, body.session, body.step);
  });
  app.post('/api/forwarding/restoration/cancel', async request => {
    const ctx = await owner(request);
    const body = z.object({ session: z.string().uuid().transform(value => value.toLowerCase()), settingsUnchanged: z.boolean() }).strict().parse(request.body);
    return cancelRestoration(store, ctx.uid, ctx.participant.id, body.session, body.settingsUnchanged);
  });
  // Numbers Shield ended a scam from. Helpers can see the list; only the person can unblock.
  app.get('/api/blocked-numbers', async request => {
    const selected = request.headers['x-shield-participant'];
    const ctx = await store.access((await auth.identify(bearer(request))).subject, selected === undefined ? undefined : z.string().uuid().parse(selected).toLowerCase());
    const { cursor } = z.object({ cursor: z.string().min(1).max(500).regex(/^[A-Za-z0-9_-]+$/).optional() }).strict().parse(request.query);
    let query = store.personRef(ctx.participant.id).collection('blocked-numbers')
      .orderBy('createdAt', 'desc').orderBy(FieldPath.documentId(), 'desc');
    if (cursor) {
      try {
        const position = z.object({ person: z.string().uuid(), at: z.string().datetime(), id: z.string().regex(/^[a-f0-9]{64}$/) })
          .strict().parse(JSON.parse(Buffer.from(cursor, 'base64url').toString()));
        if (position.person !== ctx.participant.id) throw new Error('Wrong participant');
        query = query.startAfter(Date.parse(position.at), position.id);
      } catch { throw new HttpError(400, 'invalid_cursor'); }
    }
    const docs = (await query.limit(201).get()).docs, page = docs.slice(0, 200), last = page.at(-1), now = store.now();
    // Advance using scanned rows, even if every row in a page has expired. The boundary may later be deleted.
    return { paginationVersion: 1, nextCursor: docs.length > 200 && last
      ? Buffer.from(JSON.stringify({ person: ctx.participant.id, at: at(last.data().createdAt), id: last.id })).toString('base64url') : null,
      items: page.filter(d => d.data().expiresAt > now).map(d => ({ id: d.id, reason: d.data().reason,
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
    // A message Shield removed as a scam isn't played until someone restores it.
    const call = (await store.callRef(id).get()).data();
    if (!call?.voicemail || call.acceptedAt || call.voicemailDeletedAt || call.expiresAt <= store.now()) throw new HttpError(404, 'voicemail_not_found');
    if (call.voicemail.status === 'removed') throw new HttpError(409, 'voicemail_removed');
    if (call.voicemail.status !== 'ready') throw new HttpError(409, 'recording_unavailable');
    const bytes = await readMessageAudio(store, id, audio);
    return reply.type('audio/mpeg').send(bytes);
  });
  app.post('/api/voicemails/:id/heard', async request => {
    const id = z.string().uuid().parse((request.params as { id: string }).id).toLowerCase();
    const call = (await store.callRef(id).get()).data(); if (!call?.voicemail || call.expiresAt <= store.now()) throw new HttpError(404, 'voicemail_not_found');
    const ctx = await store.access((await auth.identify(bearer(request))).subject, call.participantId);
    if (!ctx.canListen) throw new HttpError(403, 'access_denied');
    await store.callRef(id).update({ 'voicemail.heardAt': store.now() }); return { saved: true };
  });
  // Anyone who can listen can undo Shield's removal while the audio still exists (7 days).
  app.post('/api/voicemails/:id/restore', async request => {
    const id = z.string().uuid().parse((request.params as { id: string }).id).toLowerCase();
    const call = (await store.callRef(id).get()).data(); if (!call?.voicemail || call.expiresAt <= store.now()) throw new HttpError(404, 'voicemail_not_found');
    const ctx = await store.access((await auth.identify(bearer(request))).subject, call.participantId);
    if (!ctx.canListen) throw new HttpError(403, 'access_denied');
    if (!(await new VoicemailCheck(store).restore(id))) throw new HttpError(409, 'voicemail_not_restorable');
    return { restored: true };
  });
  app.delete('/api/voicemails/:id', async request => {
    const id = z.string().uuid().parse((request.params as { id: string }).id).toLowerCase();
    const ctx = await owner(request), ref = store.callRef(id);
    await store.db.runTransaction(async tx => {
      const c = (await tx.get(ref)).data();
      if (!c || c.participantId !== ctx.participant.id) throw new HttpError(404, 'voicemail_not_found');
      tx.update(ref, { voicemail: FieldValue.delete(), voicemailDeletedAt: store.now() });
      deleteMessageAudio(store, tx, id);
      tx.delete(store.db.collection('voicemailChecks').doc(id));
    }); return { deleted: true };
  });
}
