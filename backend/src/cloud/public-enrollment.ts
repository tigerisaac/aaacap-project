import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { bearer, HttpError, type AuthProvider, type Identity } from '../auth.js';
import type { CloudStore, Person } from './store.js';
import { carrierFor, carrierIds } from './carriers.js';
import { deletionRef } from './deletion-jobs.js';
import { numberRef } from './numbers.js';
import { routeRef, SHARED_ENROLLMENT_LIMIT } from './shared-routing.js';
import { accessRef, type ServiceAccess } from './service-access.js';
import { CONSENT_VERSION } from './config.js';
import { forwardingConsent } from './forwarding-store.js';
import { hasRestorationGuide } from './restoration-guide.js';
import commercial from './commercial-policy.json' with { type: 'json' };

const inputSchema = z.object({
  requestId: z.string().uuid().transform(value => value.toLowerCase()),
  name: z.string().trim().min(1).max(60).regex(/^[^\p{Cc}]+$/u),
  carrier: z.enum(['tello', 'tmobile', 'att', 'verizon']),
  dataPlanConfirmed: z.literal(true), originalSettingsRecorded: z.literal(true),
  // Three original conditions: unanswered, busy and unreachable. Never infer reset codes.
  restorationInstructions: z.array(z.string().trim().min(10).max(1000).regex(/^[^\p{Cc}]+$/u)).length(3),
  consentVersion: z.literal(CONSENT_VERSION), accepted: z.literal(true),
}).strict();

const phoneFor = (identity: Identity) => {
  const phone = identity.verifiedPhone && parsePhoneNumberFromString(identity.verifiedPhone);
  if (!phone || !phone.isValid()) throw new HttpError(403, 'verified_phone_required');
  return phone;
};
const availability = (store: CloudStore) => !store.config.PUBLIC_ENROLLMENT_ENABLED ? 'public_enrollment_unavailable'
  : !store.config.SHARED_NUMBER_ENABLED || !store.config.TELNYX_SHARED_APPLICATION_ID || !store.config.LIVE_SCREENING_ENABLED
    || !store.config.TELNYX_VERIFY_PROFILE_ID ? 'public_enrollment_unavailable'
    : !store.config.REVENUECAT?.purchasesEnabled ? 'subscriptions_unavailable' : null;

/** Creates setup, never a paid entitlement or a qualified phone route. Pilot grants remain operator-only. */
export function registerPublicEnrollment(app: FastifyInstance, store: CloudStore, auth: AuthProvider, serviceAccess: ServiceAccess) {
  const identify = (request: FastifyRequest) => auth.identify(bearer(request));

  app.get('/api/enrollment', async request => {
    const identity = await identify(request), phone = phoneFor(identity);
    const [people, pool, access] = await Promise.all([
      store.db.collection('participants').where('ownerUid', '==', identity.subject).get(),
      numberRef(store, store.config.TELNYX_NUMBER).get(), accessRef(store, identity.subject).get(),
    ]);
    const person = people.docs.find(doc => doc.data().status !== 'offboarded');
    const country = phone.country ?? null;
    const carriers = carrierIds.filter(id => carrierFor(id)?.verified && carrierFor(id)?.countries.includes(country ?? ''))
      .map(id => ({ id, name: carrierFor(id)!.name }));
    const reason = availability(store) ?? (!country || !commercial.countries.includes(country) || !carriers.length ? 'carrier_not_supported'
      : access.exists ? 'enrollment_already_assigned'
      : pool.data()?.state !== 'shared' || !pool.data()?.sharedPrepared ? 'public_enrollment_unavailable'
      : (pool.data()?.members?.length ?? 0) >= SHARED_ENROLLMENT_LIMIT ? 'enrollment_full' : null);
    return { status: person ? 'enrolled' : reason ? 'unavailable' : 'available', reason: person ? null : reason,
      participantId: person?.id ?? null, phone: phone.number, country, carriers,
      consentVersion: CONSENT_VERSION, supportEmail: commercial.supportEmail };
  });

  app.post('/api/enrollment', async request => {
    const identity = await identify(request), phone = phoneFor(identity), input = inputSchema.parse(request.body);
    const country = phone.country, carrier = carrierFor(input.carrier);
    if (!country || !commercial.countries.includes(country) || !carrier?.verified || !carrier.countries.includes(country)) {
      throw new HttpError(409, 'carrier_not_supported');
    }
    const key = accessRef(store, identity.subject), personId = randomUUID(), customerId = randomUUID(), version = randomUUID();
    const fingerprint = store.vault.hash(JSON.stringify({ ...input, phone: phone.number }));
    await store.quota([[`enrollment:${identity.subject}`, 10], ['enrollment:global', 100]]);
    return store.db.runTransaction(async tx => {
      const [account, deleting, pool, route, reservedNumber] = await tx.getAll(key, deletionRef(store, identity.subject),
        numberRef(store, store.config.TELNYX_NUMBER), routeRef(store, store.config.TELNYX_NUMBER, phone.number), numberRef(store, phone.number));
      if (deleting!.exists) throw new HttpError(409, 'account_deletion_pending');
      if (account!.exists) {
        const prior = account!.data()!;
        if (prior.enrollmentRequestId === input.requestId && prior.enrollmentFingerprint === fingerprint) {
          return { participantId: prior.participantId, created: false };
        }
        throw new HttpError(409, 'enrollment_already_assigned');
      }
      const unavailable = availability(store);
      if (unavailable) throw new HttpError(503, unavailable);
      if (pool!.data()?.state !== 'shared' || !pool!.data()?.sharedPrepared) throw new HttpError(409, 'public_enrollment_unavailable');
      if (route!.exists || reservedNumber!.exists) throw new HttpError(409, 'phone_already_enrolled');
      const owned = await tx.get(store.db.collection('participants').where('ownerUid', '==', identity.subject));
      if (!owned.empty) throw new HttpError(409, 'enrollment_already_assigned');
      // Legacy participants predate phone hashes. Never claim a verified line from another account.
      const live = await tx.get(store.db.collection('participants').where('status', 'in', ['setup', 'paused', 'restoring']));
      if (live.docs.some(doc => doc.data().phoneEnc && store.phone(doc.data() as Person) === phone.number)) {
        throw new HttpError(409, 'phone_already_enrolled');
      }
      const members = new Set<string>(pool!.data()!.members ?? []);
      if (members.size >= SHARED_ENROLLMENT_LIMIT) throw new HttpError(409, 'enrollment_full');
      const now = store.now(), person = store.personRef(personId);
      tx.create(person, { id: personId, ownerUid: identity.subject, status: 'setup', createdAt: now,
        nameEnc: store.vault.seal(input.name, `person:${personId}:name`), phoneEnc: store.vault.seal(phone.number, `person:${personId}:phone`),
        phoneVerifiedAt: now, carrier: input.carrier, shieldNumber: store.config.TELNYX_NUMBER,
        consentVersion: CONSENT_VERSION, consentedAt: now, forwardingStage: 'overview', alwaysOn: false,
        // Missing monitoring consent stays off and lets the existing explicit choice appear.
        publicEnrollment: { createdAt: now, activatedAt: null } });
      tx.create(person.collection('forwarding').doc('control'), { provisioned: true, provider: 'telnyx', preparedAt: now,
        enabled: false, used: 0, dataPlanConfirmed: true, originalSettingsRecordedAt: now,
        restorationGuideEnc: store.vault.seal(JSON.stringify(input.restorationInstructions), `restoration:${personId}`) });
      tx.create(route!.ref, { participantId: personId, carrier: input.carrier, version, enrolledAt: now, enabled: false });
      members.add(personId); tx.update(pool!.ref, { members: [...members] });
      tx.create(key, { uid: identity.subject, audience: 'public', participantId: personId, country, carrier: input.carrier,
        approvedAt: now, customerId, allowSandbox: false, enrollmentRequestId: input.requestId, enrollmentFingerprint: fingerprint });
      tx.create(key.collection('audit').doc('approval'), { action: 'public_setup_created', at: now, source: 'verified_phone' });
      tx.create(store.db.collection('billingCustomers').doc(customerId), { accessKey: key.id });
      return { participantId: personId, created: true };
    });
  });

  app.post('/api/enrollment/activate', async request => {
    const identity = await identify(request), phone = phoneFor(identity);
    const { participantId } = z.object({ participantId: z.string().uuid().transform(value => value.toLowerCase()) }).strict().parse(request.body);
    await serviceAccess.refresh(identity.subject, true);
    return store.db.runTransaction(async tx => {
      const [account, person, control, deleting, route] = await tx.getAll(accessRef(store, identity.subject),
        store.personRef(participantId), store.personRef(participantId).collection('forwarding').doc('control'),
        deletionRef(store, identity.subject), routeRef(store, store.config.TELNYX_NUMBER, phone.number));
      const a = account!.data(), p = person!.data(), c = control!.data(), r = route!.data(), now = store.now();
      if (deleting!.exists || !p || p.ownerUid !== identity.subject || !p.publicEnrollment || p.status !== 'setup'
        || p.restoration || store.phone(p as Person) !== phone.number) throw new HttpError(409, 'setup_not_ready');
      if (!store.config.REVENUECAT || !store.config.LIVE_SCREENING_ENABLED || !store.config.SHARED_NUMBER_ENABLED
        || a?.audience !== 'public' || a.participantId !== participantId || a.carrier !== p.carrier || a.country !== phone.country
        || !a.subscription?.active || !(a.subscription.accessUntil > now)
        || !(a.subscription.checkedAt >= now - 60_000)) throw new HttpError(409, 'service_access_required');
      if (p.forwardingConsent !== forwardingConsent || !p.phoneVerifiedAt || p.shieldNumber !== store.config.TELNYX_NUMBER
        || !carrierFor(p.carrier)?.verified || !carrierFor(p.carrier)?.countries.includes(phone.country ?? '')
        || !c?.provisioned || !c.dataPlanConfirmed || !hasRestorationGuide(c) || c.activeCallId
        || !(c.ringTestAt >= p.publicEnrollment.createdAt) || !(c.forwardingTestAt >= p.publicEnrollment.createdAt)
        || r?.participantId !== participantId || !r.enabled || r.disabledAt || r.qualification !== 'forwarding_nonce'
        || !(r.qualifiedAt >= p.publicEnrollment.createdAt)) throw new HttpError(409, 'setup_not_ready');
      tx.update(person!.ref, { alwaysOn: true, forwardingStage: 'checks',
        'publicEnrollment.activatedAt': p.publicEnrollment.activatedAt ?? now });
      tx.update(control!.ref, { enabled: false });
      return { active: true };
    });
  });
}
