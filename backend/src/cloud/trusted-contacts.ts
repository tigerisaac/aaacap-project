import pilotLimits from './pilot-limits.json' with { type: 'json' };
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { bearer, HttpError, type AuthProvider, type Identity } from '../auth.js';
import { normalizePhone } from '../crypto.js';
import type { CloudStore, Person } from './store.js';
import { verifyTelnyx } from './forwarding-provider.js';
import { TelnyxTextSender, type TextSender } from './text-alerts.js';
import { caretakerInbox } from './caretaker-inbox.js';

const uuid = z.string().uuid().transform(value => value.toLowerCase());
const current = (d: FirebaseFirestore.DocumentData, now: number) => d.status === 'accepted' || (d.status === 'pending' && d.expiresAt > now);
const textAvailable = (store: CloudStore) => !!store.config.SMS_ALERTS;
// Keep the legacy availability flag meaningful to apps without an inbox UI.
export const trustedContactsAvailable = (store: CloudStore) => !!store.config.TELNYX_VERIFY_PROFILE_ID
  && (textAvailable(store) || !!store.config.APNS);
export const contactPhoneHash = (store: CloudStore, phone: string) => store.vault.hash(`alert-contact:${phone}`);

/** Alerts-only relationships never create grants or memberships, and never authorize call or audio APIs. */
export function registerTrustedContacts(app: FastifyInstance, store: CloudStore, auth: AuthProvider, sender: TextSender = new TelnyxTextSender(store)) {
  const identity = (request: FastifyRequest) => auth.identify(bearer(request));
  const owner = async (request: FastifyRequest) => store.access((await identity(request)).subject,
    request.headers['x-shield-participant'] === undefined ? undefined : uuid.parse(request.headers['x-shield-participant']), true);
  const verified = async (request: FastifyRequest): Promise<Identity & { verifiedPhone: string }> => {
    const user = await identity(request);
    if (!user.verifiedPhone) throw new HttpError(403, 'verified_phone_required');
    return user as Identity & { verifiedPhone: string };
  };
  const ownerDTO = (id: string, d: FirebaseFirestore.DocumentData) => ({ id,
    name: store.vault.open(d.nameEnc, `alert-contact:${id}:name`), phone: store.vault.open(d.phoneEnc, `alert-contact:${id}:phone`),
    status: d.status === 'pending' && d.expiresAt <= store.now() ? 'expired' : d.status, textAlerts: !!d.sms, appAlerts: !!d.push,
    inAppAlerts: d.inbox === true, requestDelivery: d.requestDelivery ?? 'not_sent' });

  app.get('/api/trusted-contacts', async request => {
    const ctx = await owner(request);
    const docs = await store.db.collection('alertContacts').where('participantId', '==', ctx.participant.id).get();
    return { available: trustedContactsAvailable(store), choiceRecorded: ctx.participant.trustedContactsChoice?.enabled !== undefined,
      enabled: ctx.participant.trustedContactsChoice?.enabled === true,
      textAvailable: textAvailable(store), appAvailable: !!store.config.APNS,
      inboxAvailable: !!store.config.TELNYX_VERIFY_PROFILE_ID,
      invitationURL: `${store.config.PUBLIC_BASE_URL}/trusted-contacts.html`,
      contacts: docs.docs.filter(d => d.data().status !== 'revoked').map(d => ownerDTO(d.id, d.data())) };
  });
  app.post('/api/trusted-contacts/choice', async request => {
    const ctx = await owner(request), { enabled } = z.object({ enabled: z.boolean() }).strict().parse(request.body);
    if (enabled) {
      const docs = await store.db.collection('alertContacts').where('participantId', '==', ctx.participant.id).get();
      if (!docs.docs.some(d => current(d.data(), store.now()))) throw new HttpError(409, 'trusted_contact_required');
    }
    await store.personRef(ctx.participant.id).update({ trustedContactsChoice: { enabled, updatedAt: store.now() },
      ...(!enabled ? { helperAlerts: { enabled: false, updatedAt: store.now() } } : {}) });
    return { saved: true };
  });
  app.post('/api/trusted-contacts', async request => {
    const ctx = await owner(request);
    if (!store.config.TELNYX_VERIFY_PROFILE_ID) throw new HttpError(503, 'trusted_contacts_unavailable');
    const input = z.object({ id: uuid, name: z.string().trim().min(1).max(60).regex(/^[^\p{Cc}]+$/u), phone: z.string().max(25),
      consent: z.literal(true), sendText: z.boolean().optional() }).strict().parse(request.body);
    const phone = normalizePhone(input.phone);
    if (!phone) throw new HttpError(400, 'invalid_phone');
    if (phone === store.phone(ctx.participant)) throw new HttpError(400, 'trusted_contact_self');
    const ref = store.db.collection('alertContacts').doc(input.id), hash = contactPhoneHash(store, phone);
    const existing = (await ref.get()).data();
    if (existing) {
      if (existing.ownerUid !== ctx.uid || existing.participantId !== ctx.participant.id || existing.phoneHash !== hash
        || store.vault.open(existing.nameEnc, `alert-contact:${ref.id}:name`) !== input.name) throw new HttpError(409, 'trusted_contact_conflict');
      return { contact: ownerDTO(ref.id, existing) };
    }
    await store.quota([[`contact-requests:${ctx.uid}`, 10], [`contact-recipient:${hash}`, 3], ['contact-requests:global', pilotLimits.contactRequestsTotalPerDay]]);
    const optOut = (await store.db.collection('smsOptOuts').doc(hash).get()).data();
    const data = { participantId: ctx.participant.id, ownerUid: ctx.uid, nameEnc: store.vault.seal(input.name, `alert-contact:${ref.id}:name`),
      phoneEnc: store.vault.seal(phone, `alert-contact:${ref.id}:phone`), phoneHash: hash, status: 'pending', sms: false, push: false,
      recipientUid: null, requestedAt: store.now(), expiresAt: store.now() + 30 * 86400_000, requestDelivery: 'not_sent' };
    const created = await store.db.runTransaction(async tx => {
      const [person, duplicate, contacts] = await Promise.all([tx.get(store.personRef(ctx.participant.id)), tx.get(ref),
        tx.get(store.db.collection('alertContacts').where('participantId', '==', ctx.participant.id))]);
      if (!person.exists || person.data()?.status === 'offboarded' || person.data()?.ownerUid !== ctx.uid) throw new HttpError(403, 'owner_required');
      if (duplicate.exists) {
        const d = duplicate.data()!;
        if (d.ownerUid !== ctx.uid || d.participantId !== ctx.participant.id || d.phoneHash !== hash
          || store.vault.open(d.nameEnc, `alert-contact:${ref.id}:name`) !== input.name) throw new HttpError(409, 'trusted_contact_conflict');
        return false;
      }
      const active = contacts.docs.filter(d => current(d.data(), store.now()));
      if (active.some(d => d.data().phoneHash === hash)) throw new HttpError(409, 'trusted_contact_exists');
      if (active.length >= 5) throw new HttpError(409, 'trusted_contact_limit');
      tx.create(ref, data);
      tx.update(person.ref, { trustedContactsChoice: { enabled: true, updatedAt: store.now() } });
      return true;
    });
    // Generic invitation: no owner name or call details are disclosed before the recipient verifies their number.
    if (created && input.sendText !== false && textAvailable(store) && !optOut?.stopped) {
      await ref.update({ requestDelivery: 'sending' });
      const result = await sender.send(phone, `Someone added you as a caretaker in Shield. Choose whether to receive alerts: ${store.config.PUBLIC_BASE_URL}/trusted-contacts.html Reply STOP to stop texts.`);
      await ref.update({ requestDelivery: result });
    }
    return { contact: ownerDTO(ref.id, (await ref.get()).data()!) };
  });
  app.delete('/api/trusted-contacts/:id', async request => {
    const ctx = await owner(request), ref = store.db.collection('alertContacts').doc(uuid.parse((request.params as { id: string }).id));
    await store.db.runTransaction(async tx => {
      const d = (await tx.get(ref)).data();
      if (!d || d.participantId !== ctx.participant.id) throw new HttpError(404, 'trusted_contact_unavailable');
      tx.update(ref, { status: 'revoked', sms: false, push: false, inbox: false, revokedAt: store.now(), expiresAt: store.now() + 30 * 86400_000 });
    });
    return { removed: true };
  });

  app.get('/api/contact-alerts', async request => {
    const user = await verified(request), hash = contactPhoneHash(store, user.verifiedPhone);
    const docs = await store.db.collection('alertContacts').where('phoneHash', '==', hash).get();
    const requests = [];
    for (const doc of docs.docs) {
      const d = doc.data();
      if (!current(d, store.now()) || (d.recipientUid && d.recipientUid !== user.subject)) continue;
      const person = (await store.personRef(d.participantId).get()).data() as Person | undefined;
      if (!person || person.status === 'offboarded') continue;
      requests.push({ id: doc.id, name: store.name(person), status: d.status, textAlerts: !!d.sms, appAlerts: !!d.push,
        inAppAlerts: d.inbox === true, ownerPaused: person.trustedContactsChoice?.enabled !== true });
    }
    const stopped = (await store.db.collection('smsOptOuts').doc(hash).get()).data()?.stopped === true;
    return { requests, textAvailable: textAvailable(store), appAvailable: !!store.config.APNS, textsStopped: stopped,
      inboxAvailable: !!store.config.TELNYX_VERIFY_PROFILE_ID, events: await caretakerInbox(store, user.subject, hash) };
  });
  app.post('/api/contact-alerts/:id', async request => {
    const user = await verified(request), hash = contactPhoneHash(store, user.verifiedPhone);
    const input = z.object({ accept: z.boolean(), textAlerts: z.boolean(), appAlerts: z.boolean(), inAppAlerts: z.boolean().default(false) }).strict().parse(request.body);
    if (input.accept && !input.textAlerts && !input.appAlerts && !input.inAppAlerts) throw new HttpError(400, 'alert_channel_required');
    if (input.accept && ((input.textAlerts && !textAvailable(store)) || (input.appAlerts && !store.config.APNS))) throw new HttpError(503, 'alert_channel_unavailable');
    if (input.accept && input.inAppAlerts && !store.config.TELNYX_VERIFY_PROFILE_ID) throw new HttpError(503, 'alert_channel_unavailable');
    const ref = store.db.collection('alertContacts').doc(uuid.parse((request.params as { id: string }).id));
    await store.db.runTransaction(async tx => {
      const [contact, optOut] = await tx.getAll(ref, store.db.collection('smsOptOuts').doc(hash));
      const d = contact!.data();
      if (!d || d.phoneHash !== hash || !current(d, store.now()) || (d.recipientUid && d.recipientUid !== user.subject)) throw new HttpError(404, 'trusted_contact_unavailable');
      const person = (await tx.get(store.personRef(d.participantId))).data();
      if (!person || person.status === 'offboarded' || person.ownerUid === user.subject) throw new HttpError(404, 'trusted_contact_unavailable');
      if (input.accept && input.textAlerts && optOut!.data()?.stopped) throw new HttpError(409, 'texts_stopped');
      tx.update(ref, { status: input.accept ? 'accepted' : 'declined', recipientUid: user.subject,
        sms: input.accept && input.textAlerts, push: input.accept && input.appAlerts,
        inbox: input.accept && input.inAppAlerts,
        inboxAcceptedAt: input.accept && input.inAppAlerts ? d.inbox === true ? d.inboxAcceptedAt ?? d.respondedAt : store.now() : null,
        respondedAt: store.now(),
        // Accepted consent is bound to this verified account; it is not transferable to a recycled number's account.
        expiresAt: input.accept ? null : store.now() + 30 * 86400_000 });
    });
    return { saved: true };
  });

  app.post('/public/messaging/webhook', async (request, reply) => {
    if (!request.rawFormBody || !verifyTelnyx(store.config.TELNYX_PUBLIC_KEY, request.headers['telnyx-signature-ed25519'], request.headers['telnyx-timestamp'], request.rawFormBody, store.now())) return reply.code(403).send({});
    const event = z.object({ data: z.object({ event_type: z.string(), occurred_at: z.string().datetime({ offset: true }),
      payload: z.object({ from: z.object({ phone_number: z.string() }).optional(), to: z.array(z.object({ phone_number: z.string() })).optional(),
        text: z.string().max(2000).optional(), messaging_profile_id: z.string().optional() }) }) }).parse(request.body).data;
    const sms = store.config.SMS_ALERTS, p = event.payload;
    if (!sms || event.event_type !== 'message.received' || p.messaging_profile_id !== sms.messagingProfileId || !p.to?.some(v => v.phone_number === sms.from)) return { received: true };
    const phone = p.from?.phone_number && normalizePhone(p.from.phone_number), word = p.text?.trim().toUpperCase();
    if (!phone || !word || !['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'START', 'UNSTOP'].includes(word)) return { received: true };
    const ref = store.db.collection('smsOptOuts').doc(contactPhoneHash(store, phone)), at = Date.parse(event.occurred_at);
    await store.db.runTransaction(async tx => {
      if (((await tx.get(ref)).data()?.updatedAt ?? 0) >= at) return;
      tx.set(ref, { stopped: !['START', 'UNSTOP'].includes(word), updatedAt: at });
    });
    return { received: true };
  });
}
