import { randomBytes, randomUUID } from 'node:crypto';
import { FieldPath, type Query } from 'firebase-admin/firestore';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { bearer, HttpError, type AuthProvider } from '../auth.js';
import { normalizePhone } from '../crypto.js';
import { purposes, reasonCopy, screen, type Screener } from '../screening.js';
import { CONSENT_VERSION, RETENTION_MS } from './config.js';
import { CloudStore, type Call, type Person } from './store.js';
import { normalizeSharedPhone, sharedContactsSchema, syncSharedContacts } from './shared-contacts.js';

// Swift's UUID.uuidString uses uppercase; Firestore document IDs are case-sensitive.
const uuid = z.string().uuid().transform(value => value.toLowerCase());
const at = (value: number | null | undefined) => value ? new Date(value).toISOString() : null;
const contactSchema = z.object({ label: z.string().trim().min(1).max(60), phone: z.string().min(8).max(25) });

export function cloudCallDTO(store: CloudStore, call: Call) {
  const forwarding = call.source === 'forwarding';
  const abandoned = call.state !== 'ended' && store.now() - call.createdAt > (forwarding ? 450_000 : 120_000);
  const reason = abandoned ? 'screening_unavailable' : call.reason;
  const copy = reasonCopy[reason] ?? reasonCopy.uncertain!;
  return { id: call.id, occurredAt: at(call.createdAt),
    callerNumber: store.vault.open(call.callerEnc, `call:${call.id}:caller`),
    title: reason === 'routine' ? (purposes[call.purpose as keyof typeof purposes] ?? copy.title) : copy.title,
    outcome: abandoned ? 'missed' : call.outcome, reasonCode: reason,
    detail: reason === 'routine' ? (forwarding ? 'The introduction looked routine. Connection requires you to answer and press 1.' : 'The introduction looked routine. Transfers are not enabled in this trial; no call was connected.') : copy.detail,
    nextStep: reason === 'routine' ? 'This result does not verify the caller’s identity.' : copy.action,
    monitored: !!call.monitoringStartedAt, acceptedAt: at(call.acceptedAt), endedAt: at(call.completedAt ?? (abandoned ? call.createdAt + (forwarding ? 450_000 : 120_000) : null)), voicemail: call.voicemail ? { ...call.voicemail, heardAt: at(call.voicemail.heardAt) } : null };
}

export async function registerCloudAPI(app: FastifyInstance, store: CloudStore, auth: AuthProvider, screener: Screener) {
  const identify = async (request: FastifyRequest) => (await auth.identify(bearer(request))).subject;
  const access = async (request: FastifyRequest, owner = false) => {
    const raw = request.headers['x-shield-participant'];
    const selected = raw === undefined ? undefined : uuid.parse(raw);
    return store.access(await identify(request), selected, owner);
  };
  const getId = (request: FastifyRequest) => uuid.parse((request.params as { id: string }).id);
  const activeCalls = (id: string) => store.db.collection('callSessions').where('participantId', '==', id)
    .where('createdAt', '>', store.now() - RETENTION_MS);

  app.get('/public/config', async () => ({ mode: 'trial', signInMethod: 'email-link', consentVersion: CONSENT_VERSION,
    supportEmail: null, messageFilteringAvailable: false, notificationsAvailable: false,
    privacyPath: '/privacy', termsPath: '/service-info' }));
  app.post('/auth/request-code', async request => {
    const { email } = z.object({ email: z.string().email().max(254) }).parse(request.body);
    await store.quota([[`auth-ip:${request.ip}`, 30], [`auth-email:${email.toLowerCase()}`, 5], ['auth:global', 200]]);
    await auth.requestCode(email); return { sent: true };
  });
  app.post('/auth/verify-code', async request => {
    const { email, code } = z.object({ email: z.string().email().max(254), code: z.string().min(16).max(2048).regex(/^[a-zA-Z0-9_-]+$/) }).parse(request.body);
    await store.quota([[`verify-ip:${request.ip}`, 50], [`verify-email:${email.toLowerCase()}`, 20]]);
    return auth.verifyCode(email, code);
  });
  app.post('/auth/refresh', async request => {
    const { refreshToken } = z.object({ refreshToken: z.string().min(10).max(4096) }).parse(request.body);
    await store.quota([[`refresh-ip:${request.ip}`, 300]]);
    return auth.refresh(refreshToken);
  });
  app.post('/auth/logout', async request => { await auth.logout(bearer(request)); return { signedOut: true }; });

  app.get('/api/people', async request => {
    const uid = await identify(request);
    const [own, members] = await Promise.all([
      store.db.collection('participants').where('ownerUid', '==', uid).limit(10).get(),
      store.db.collection('memberships').where('granteeUid', '==', uid).limit(30).get()
    ]);
    const people = own.docs.map(doc => doc.data() as Person).filter(person => person.status !== 'offboarded')
      .map(person => ({ id: person.id, name: store.name(person), isOwner: true, canListen: true }));
    for (const member of members.docs) {
      try {
        const ctx = await store.access(uid, member.data().participantId);
        if (!people.some(person => person.id === ctx.participant.id)) people.push({ id: ctx.participant.id,
          name: store.name(ctx.participant), isOwner: ctx.isOwner, canListen: ctx.canListen });
      } catch (error) { if (!(error instanceof HttpError && error.statusCode === 403)) throw error; }
    }
    return { people, isDemo: false };
  });
  app.get('/api/overview', async request => {
    const ctx = await access(request); const id = ctx.participant.id;
    const week = store.db.collection('callSessions').where('participantId', '==', id)
      .where('createdAt', '>=', store.now() - 7 * 86400_000).orderBy('createdAt', 'desc');
    const [total, held, recent, connected, messages] = await Promise.all([week.count().get(), week.where('outcome', 'in', ['held', 'verification']).count().get(),
      activeCalls(id).orderBy('createdAt', 'desc').orderBy(FieldPath.documentId(), 'desc').limit(6).get(), week.where('outcome', '==', 'connected').count().get(), week.where('outcome', '==', 'voicemail').count().get()]);
    return { name: store.name(ctx.participant), status: ctx.participant.status, lastTestAt: null, isTrial: true,
      isDemo: false, isOwner: ctx.isOwner, canListen: ctx.canListen,
      counts: { total: total.data().count, held: held.data().count, connected: connected.data().count, messages: messages.data().count },
      recent: recent.docs.map(doc => cloudCallDTO(store, doc.data() as Call)) };
  });
  app.get('/api/calls', async request => {
    const ctx = await access(request);
    const data = z.object({ filter: z.enum(['all', 'held', 'connected', 'voicemail']).default('all'), cursor: z.string().max(500).optional() }).parse(request.query);

    let query: Query = activeCalls(ctx.participant.id);
    if (['connected', 'voicemail'].includes(data.filter)) query = query.where('outcome', '==', data.filter);
    if (data.filter === 'held') query = query.where('outcome', 'in', ['held', 'verification']);
    query = query.orderBy('createdAt', 'desc').orderBy(FieldPath.documentId(), 'desc');
    if (data.cursor) {
      try {
        const cursor = z.object({ at: z.string().datetime(), id: uuid }).parse(JSON.parse(Buffer.from(data.cursor, 'base64url').toString()));
        query = query.startAfter(Date.parse(cursor.at), cursor.id);
      } catch { throw new HttpError(400, 'invalid_cursor'); }
    }
    const docs = (await query.limit(31).get()).docs; const page = docs.slice(0, 30); const last = page.at(-1)?.data();
    return { calls: page.map(doc => cloudCallDTO(store, doc.data() as Call)), nextCursor: docs.length > 30 && last
      ? Buffer.from(JSON.stringify({ at: at(last.createdAt), id: last.id })).toString('base64url') : null };
  });
  app.get('/api/calls/:id', async request => {
    const ctx = await access(request); const call = (await store.callRef(getId(request)).get()).data() as Call | undefined;
    if (!call || call.participantId !== ctx.participant.id || call.expiresAt <= store.now()) throw new HttpError(404, 'call_not_found');
    return { call: cloudCallDTO(store, call), events: call.events.map(event => ({ kind: event.kind, at: at(event.at) })) };
  });
  app.get('/api/setup', async request => {
    const ctx = await access(request, true); const p = ctx.participant;
    const trial = (await store.db.doc('trial/control').get()).data();
    return { participantId: p.id, name: store.name(p), phone: store.phone(p), shieldNumber: store.config.TRIAL_TWILIO_NUMBER,
      status: p.status, isOwner: true, isTrial: true, consentVersion: CONSENT_VERSION, consented: p.consentVersion === CONSENT_VERSION,
      phoneVerified: !!p.phoneVerifiedAt, lastTestAt: null, restoredAt: null, routingTestUntil: null,
      liveServiceEnabled: false, carrierProfile: null, supportEmail: null,
      trial: { active: !!trial?.enabled && trial.expiresAt > store.now() && trial.used < 10,
        expiresAt: at(trial?.expiresAt), remainingCalls: Math.max(0, 10 - (trial?.used ?? 10)) } };
  });
  app.post('/api/setup/consent', async request => {
    const ctx = await access(request, true);
    const { version } = z.object({ version: z.literal(CONSENT_VERSION), accepted: z.literal(true) }).parse(request.body);
    await store.personRef(ctx.participant.id).update({ consentVersion: version, consentedAt: store.now() }); return { recorded: true };
  });
  app.post('/api/setup/pause', async request => {
    const ctx = await access(request, true); const { paused } = z.object({ paused: z.boolean() }).parse(request.body);
    if (ctx.participant.status === 'restoring') throw new HttpError(409, 'restoration_in_progress');
    await store.personRef(ctx.participant.id).update({ status: paused ? 'paused' : 'setup' }); return { updated: true };
  });
  app.post('/api/setup/restore', async request => {
    await access(request, true); throw new HttpError(409, 'trial_has_no_forwarding');
  });
  app.post('/api/account/delete', async request => {
    const ctx = await access(request, true);
    if (ctx.participant.forwardingConsent) throw new HttpError(409, 'restore_forwarding_before_deletion');
    // Direct-call trial has no carrier changes.
    await store.personRef(ctx.participant.id).update({ status: 'offboarded' });
    for (const collection of ['callSessions', 'screeningJobs', 'grants', 'memberships']) {
      const docs = await store.db.collection(collection).where('participantId', '==', ctx.participant.id).get();
      if (!docs.empty) {
        const writer = store.db.bulkWriter(); docs.docs.forEach(doc => writer.delete(doc.ref)); await writer.close();
      }
    }
    await store.db.recursiveDelete(store.personRef(ctx.participant.id));
    await auth.logout(bearer(request));
    return { deleted: true };
  });

  app.post('/api/trusted-numbers/sync', async request => {
    const ctx = await access(request, true);
    return syncSharedContacts(store, ctx.participant.id, sharedContactsSchema.parse(request.body));
  });
  app.patch('/api/trusted-numbers/:id', async request => {
    const ctx = await access(request, true), id = getId(request);
    const { enabled } = z.object({ enabled: z.boolean() }).strict().parse(request.body);
    await store.db.runTransaction(async tx => {
      const ref = store.personRef(ctx.participant.id).collection('trusted-numbers').doc(id);
      const [person, row] = await tx.getAll(store.personRef(ctx.participant.id), ref);
      if (!row!.exists) throw new HttpError(404, 'contact_not_found');
      if (person!.data()?.contactsSyncUntil > store.now()) throw new HttpError(409, 'contacts_sync_busy');
      tx.update(ref, { enabled });
    });
    return { saved: true };
  });

  for (const collection of ['trusted-numbers', 'destinations']) {
    const rows = (id: string) => store.personRef(id).collection(collection);
    app.get(`/api/${collection}`, async request => {
      const ctx = await access(request, true); const docs = await rows(ctx.participant.id).orderBy('createdAt').limit(collection === 'trusted-numbers' ? 5000 : 100).get();
      return { items: docs.docs.map(doc => ({ id: doc.id, createdAt: at(doc.data().createdAt),
        label: store.vault.open(doc.data().labelEnc, `contact:${doc.id}:label`), phone: store.vault.open(doc.data().phoneEnc, `contact:${doc.id}:phone`),
        provenance: collection === 'destinations' ? doc.data().provenance : null, enabled: doc.data().enabled !== false })) };
    });
    app.post(`/api/${collection}`, async request => {
      const ctx = await access(request, true);
      const data = (collection === 'destinations' ? contactSchema.extend({ provenance: z.enum(['card', 'statement', 'official_website', 'known_person']) }) : contactSchema).parse(request.body);
      const phone = collection === 'trusted-numbers' ? normalizeSharedPhone(data.phone) : normalizePhone(data.phone); if (!phone) throw new HttpError(400, 'invalid_phone');
      const id = randomUUID(); const hash = store.vault.hash(phone);
      await store.db.runTransaction(async tx => {
        const maximum = collection === 'trusted-numbers' ? 5000 : 100;
        const existing = await tx.get(rows(ctx.participant.id).limit(maximum + 1));
        if (existing.size >= maximum) throw new HttpError(409, 'number_limit_reached');
        if (existing.docs.some(doc => doc.data().phoneHash === hash)) throw new HttpError(409, 'number_already_saved');
        tx.create(rows(ctx.participant.id).doc(id), { labelEnc: store.vault.seal(data.label, `contact:${id}:label`),
          phoneEnc: store.vault.seal(phone, `contact:${id}:phone`), phoneHash: hash, createdAt: store.now(),
          ...('provenance' in data ? { provenance: data.provenance } : {}) });
      });
      return { id };
    });
    app.delete(`/api/${collection}/:id`, async request => {
      const ctx = await access(request, true); await rows(ctx.participant.id).doc(getId(request)).delete(); return { deleted: true };
    });
  }
  app.get('/api/sharing', async request => {
    const ctx = await access(request, true);
    const docs = await store.db.collection('grants').where('participantId', '==', ctx.participant.id).get();
    return { grants: docs.docs.filter(doc => !doc.data().revokedAt && (doc.data().acceptedAt || doc.data().expiresAt > store.now()))
      .map(doc => ({ id: doc.id, label: store.vault.open(doc.data().labelEnc, `grant:${doc.id}:label`),
        canListen: doc.data().canListen, accepted: !!doc.data().acceptedAt, expiresAt: at(doc.data().expiresAt) })) };
  });
  app.post('/api/sharing', async request => {
    const ctx = await access(request, true);
    const data = z.object({ label: z.string().trim().min(1).max(60), canListen: z.boolean(), consent: z.literal(true) }).parse(request.body);
    await store.quota([[`invites:${ctx.participant.id}`, 10]]);
    const id = randomUUID(); const code = randomBytes(24).toString('base64url'); const expiresAt = store.now() + 2 * 86400_000;
    const batch = store.db.batch();
    batch.create(store.db.collection('grants').doc(id), { participantId: ctx.participant.id,
      labelEnc: store.vault.seal(data.label, `grant:${id}:label`), canListen: data.canListen, expiresAt,
      acceptedAt: null, granteeUid: null, revokedAt: null });
    batch.create(store.db.collection('inviteKeys').doc(store.vault.hash(code)), { grantId: id, expiresAt });
    await batch.commit(); return { id, code };
  });
  app.post('/api/sharing/accept', async request => {
    const uid = await identify(request); const { code } = z.object({ code: z.string().min(20).max(100) }).parse(request.body);
    await store.quota([[`invite-accept:${uid}`, 20]]);
    const participantId = await store.db.runTransaction(async tx => {
      const keyRef = store.db.collection('inviteKeys').doc(store.vault.hash(code)); const key = (await tx.get(keyRef)).data();
      if (!key || key.expiresAt <= store.now()) throw new HttpError(404, 'invite_unavailable');
      const grantRef = store.db.collection('grants').doc(key.grantId); const grant = (await tx.get(grantRef)).data();
      if (!grant || grant.acceptedAt || grant.revokedAt || grant.expiresAt <= store.now()) throw new HttpError(404, 'invite_unavailable');
      const [person, member] = await tx.getAll(store.personRef(grant.participantId), store.memberRef(grant.participantId, uid));
      if (!person!.exists || person!.data()!.ownerUid === uid || person!.data()!.status === 'offboarded' || member!.exists) throw new HttpError(409, 'invite_unavailable');
      tx.update(grantRef, { granteeUid: uid, acceptedAt: store.now() });
      tx.create(member!.ref, { participantId: grant.participantId, granteeUid: uid, grantId: grantRef.id }); tx.delete(keyRef);
      return grant.participantId;
    });
    return { participantId };
  });
  app.delete('/api/sharing/:id', async request => {
    const ctx = await access(request, true); const ref = store.db.collection('grants').doc(getId(request));
    await store.db.runTransaction(async tx => {
      const grant = (await tx.get(ref)).data();
      if (!grant || grant.participantId !== ctx.participant.id) throw new HttpError(404, 'invite_unavailable');
      tx.update(ref, { revokedAt: store.now() });
      if (grant.granteeUid) tx.delete(store.memberRef(ctx.participant.id, grant.granteeUid));
    });
    return { revoked: true };
  });
  app.post('/api/check', async request => {
    const ctx = await access(request);
    const { text } = z.object({ text: z.string().trim().min(3).max(6000), analysisConsent: z.literal(true) }).parse(request.body);
    await store.quota([[`manual:${ctx.uid}`, 30], ['classifications:global', 100]]);
    const decision = await screen(screener, text, store.config.MODEL_TIMEOUT_MS);
    const copy: Record<string, [string, string]> = {
      routine: ['Check independently', 'No listed sensitive request was detected. This does not establish who sent the message.'],
      prohibited_request: ['Don’t act on this yet', 'A request involving sensitive information, device access, money, or secrecy was detected.'],
      sensitive_issue: ['Verify independently', 'Contact the organization through a number you already know.'],
      family_emergency: ['Check with someone you know', 'Contact your relative independently before sending money.'],
      uncertain: ['Not enough information', 'This text could not be understood reliably. Verify independently.'],
      screening_unavailable: ['Check unavailable', 'The check did not finish. This message has not been assessed.']
    };
    const [title, detail] = copy[decision.reason] ?? copy.uncertain!;
    return { decision: decision.route, reasonCode: decision.reason, title, detail,
      nextStep: 'Contact the sender through a number or app you already trust.', isDemo: false };
  });
  app.post('/api/devices', async request => { await access(request); return { registered: false }; });
}
