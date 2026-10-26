import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { FieldPath } from 'firebase-admin/firestore';
import { bearer, HttpError, type AuthProvider } from '../auth.js';
import type { CloudStore, Person } from './store.js';
import { deletionRef } from './deletion-jobs.js';
import { RevenueCatProvider, type SubscriptionProvider, type SubscriptionSnapshot } from './revenuecat.js';
import commercial from './commercial-policy.json' with { type: 'json' };
import { carrierFor } from './carriers.js';
import { forwardingConsent } from './forwarding-store.js';
import { hasRestorationGuide } from './restoration-guide.js';

type AccessAccount = {
  uid: string; audience: 'public' | 'pilot'; customerId?: string; allowSandbox?: boolean;
  participantId: string; country: 'US' | 'CA'; carrier: string; approvedAt: number;
  pilot?: { grantedAt: number; activatedAt: number | null; expiresAt: number | null };
  subscription?: SubscriptionSnapshot; syncLease?: { id: string; until: number } | null;
};
export const accessRef = (store: CloudStore, uid: string) => store.db.collection('serviceAccess').doc(store.vault.hash(`access:${uid}`));
const iso = (value: number | null | undefined) => value ? new Date(value).toISOString() : null;
const customerRef = (store: CloudStore, id: string) => store.db.collection('billingCustomers').doc(id);
const emptySubscription = (now: number): SubscriptionSnapshot => ({ checkedAt: now, providerAt: now, expiresAt: null,
  accessUntil: null, productId: null, active: false, willRenew: false, billingIssue: false, sandbox: false, revoked: false, hasPurchased: false });

/** Calendar months preserve UTC time and clamp month-end (Aug 31 -> Oct 31; Dec 31 -> Feb 28/29). */
export function pilotEndDate(activatedAt: number) {
  const date = new Date(activatedAt), day = date.getUTCDate();
  date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + commercial.pilotCalendarMonths);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay)); return date.getTime();
}

export class ServiceAccess {
  private readonly provider?: SubscriptionProvider;
  constructor(private readonly store: CloudStore, provider?: SubscriptionProvider) {
    this.provider = provider ?? (store.config.REVENUECAT ? new RevenueCatProvider(store.config.REVENUECAT, store.now) : undefined);
  }

  async refresh(uid: string, force = false) {
    const store = this.store, ref = accessRef(store, uid), leaseId = randomUUID();
    const account = await store.db.runTransaction(async tx => {
      const [doc, deleting] = await tx.getAll(ref, deletionRef(store, uid));
      if (deleting!.exists) throw new HttpError(409, 'account_deletion_pending');
      const data = doc!.data() as AccessAccount | undefined;
      if (!data || data.audience !== 'public' || !data.customerId || !this.provider) return undefined;
      if (!force && data.subscription && data.subscription.checkedAt > store.now() - 60_000) return undefined;
      if (data.syncLease && data.syncLease.until > store.now()) throw new HttpError(409, 'subscription_check_in_progress');
      tx.update(ref, { syncLease: { id: leaseId, until: store.now() + 20_000 } });
      return data;
    });
    if (!account) return;
    try {
      const snapshot = await this.provider!.subscriber(account.customerId!, account.allowSandbox === true);
      await store.db.runTransaction(async tx => {
        const [doc, deleting] = await tx.getAll(ref, deletionRef(store, uid));
        if (!doc!.exists || deleting!.exists || doc!.data()!.syncLease?.id !== leaseId) return;
        const previous = doc!.data()!.subscription as SubscriptionSnapshot | undefined;
        if (previous && previous.providerAt > snapshot.providerAt) { tx.update(ref, { syncLease: null }); return; }
        tx.update(ref, { subscription: snapshot, syncLease: null,
          // An operator must restore the carrier safely; billing never hangs up an active call or changes forwarding.
          needsAccessReview: !snapshot.active && !!previous?.hasPurchased });
      });
    } catch (error) {
      await store.db.runTransaction(async tx => {
        const doc = await tx.get(ref);
        if (doc.exists && doc.data()!.syncLease?.id === leaseId) tx.update(ref, { syncLease: null });
      });
      throw error;
    }
  }

  async status(uid: string, refresh = true) {
    if (refresh) await this.refresh(uid);
    const store = this.store, account = (await accessRef(store, uid).get()).data() as AccessAccount | undefined;
    // Existing assisted users and alert-only recipients never receive a speculative paywall.
    if (!account) return { audience: 'assisted', status: 'setup_required', purchaseAllowed: false,
      hasSubscription: false, expiresAt: null, accessUntil: null, willRenew: false, billingIssue: false, revenueCat: null };
    const person = (await store.personRef(account.participantId).get()).data();
    const eligible = person?.ownerUid === uid && person.status !== 'offboarded' && person.status !== 'restoring'
      && !!person.phoneVerifiedAt && person.carrier === account.carrier && !!account.approvedAt
      && commercial.countries.includes(account.country) && carrierFor(account.carrier)?.verified === true
      && carrierFor(account.carrier)?.countries.includes(account.country) === true;
    if (account.audience === 'pilot') {
      const end = account.pilot?.expiresAt;
      return { audience: 'pilot', status: !eligible ? 'setup_required' : !account.pilot?.activatedAt ? 'awaiting_activation'
        : end && end > store.now() ? 'active' : 'expired', purchaseAllowed: false, hasSubscription: false,
        expiresAt: iso(end), accessUntil: iso(end), willRenew: false, billingIssue: false, revenueCat: null };
    }
    const config = store.config.REVENUECAT, snapshot = account.subscription ?? emptySubscription(store.now());
    const active = snapshot.active && (snapshot.accessUntil ?? 0) > store.now();
    const purchaseAllowed = !!config?.purchasesEnabled && !!eligible && !active;
    return { audience: 'public', status: active ? 'active' : !config?.purchasesEnabled ? 'unavailable' : snapshot.hasPurchased ? 'expired' : 'inactive',
      purchaseAllowed, hasSubscription: snapshot.hasPurchased, expiresAt: iso(snapshot.expiresAt), accessUntil: iso(snapshot.accessUntil),
      willRenew: snapshot.willRenew && active, billingIssue: snapshot.billingIssue,
      revenueCat: config && account.customerId ? { customerId: account.customerId, publicSDKKey: config.applePublicKey,
        entitlementId: config.entitlementId, offeringId: config.offeringId,
        monthlyProductId: config.monthlyProductId, annualProductId: config.annualProductId,
        trialOfferingId: config.trialOfferingId, trialMonthlyProductId: config.trialMonthlyProductId,
        trialAnnualProductId: config.trialAnnualProductId } : null };
  }

  /** Enforce on new activation/resume, while keeping restoration, history, deletion and existing call routing available. */
  async requireActivation(uid: string, participantId: string) {
    const account = (await accessRef(this.store, uid).get()).data() as AccessAccount | undefined;
    if (!account) return; // Explicit migration is required before applying new billing rules to the live pilot.
    if (account.participantId !== participantId) throw new HttpError(409, 'service_access_required');
    const person = (await this.store.personRef(participantId).get()).data();
    if (person?.ownerUid !== uid || person.status === 'offboarded' || person.status === 'restoring'
      || !person.phoneVerifiedAt || person.carrier !== account.carrier || !carrierFor(person.carrier)?.verified) {
      throw new HttpError(409, 'service_access_required');
    }
    const state = await this.status(uid);
    if (state.status !== 'active' && !(state.audience === 'pilot' && state.status === 'awaiting_activation')) {
      throw new HttpError(409, 'service_access_required');
    }
  }

  /** Operator-only entry point. There is deliberately no client route for granting/approving access. */
  async approve(input: { uid: string; participantId: string; country: 'US' | 'CA'; carrier: string;
    audience: 'public' | 'pilot'; operator: string; allowSandbox?: boolean }, dryRun = false) {
    const store = this.store, ref = accessRef(store, input.uid), seats = store.db.doc('serviceAccessControl/pilot');
    const customerId = randomUUID();
    return store.db.runTransaction(async tx => {
      const [existing, person, deleting, count, control] = await tx.getAll(ref, store.personRef(input.participantId), deletionRef(store, input.uid), seats,
        store.personRef(input.participantId).collection('forwarding').doc('control'));
      const country = person!.exists ? parsePhoneNumberFromString(store.phone(person!.data() as Person))?.country : undefined;
      if (deleting!.exists || person!.data()?.ownerUid !== input.uid || !person!.data()?.phoneVerifiedAt
        || person!.data()?.status !== 'setup' || person!.data()?.carrier !== input.carrier
        || !carrierFor(input.carrier)?.verified || !carrierFor(input.carrier)?.countries.includes(input.country)
        || country !== input.country || !commercial.countries.includes(input.country)
        || !control!.data()?.provisioned || !control!.data()?.dataPlanConfirmed || !hasRestorationGuide(control!.data())
        || !input.operator.trim()) throw new HttpError(409, 'verified_setup_required');
      if (existing!.exists) {
        if (existing!.data()!.audience === input.audience && existing!.data()!.participantId === input.participantId) return { audience: input.audience, existing: true, dryRun };
        throw new HttpError(409, 'service_access_already_assigned');
      }
      if (input.audience === 'pilot' && (count!.data()?.granted ?? 0) >= commercial.pilotSeats) throw new HttpError(409, 'pilot_full');
      if (dryRun) return { audience: input.audience, existing: false, dryRun };
      const data: AccessAccount = { uid: input.uid, audience: input.audience, participantId: input.participantId,
        country: input.country, carrier: input.carrier, approvedAt: store.now(),
        ...(input.audience === 'pilot' ? { pilot: { grantedAt: store.now(), activatedAt: null, expiresAt: null } }
          : { customerId, allowSandbox: input.allowSandbox === true }) };
      tx.create(ref, data);
      tx.create(ref.collection('audit').doc('approval'), { action: 'approved', at: store.now(), operator: input.operator });
      if (input.audience === 'pilot') tx.set(seats, { granted: (count!.data()?.granted ?? 0) + 1, updatedAt: store.now() });
      else tx.create(customerRef(store, customerId), { accessKey: ref.id });
      return { audience: input.audience, existing: false, dryRun };
    });
  }

  async activatePilot(uid: string, participantId: string) {
    const store = this.store, ref = accessRef(store, uid);
    await store.db.runTransaction(async tx => {
      const [doc, person, control, deleting] = await tx.getAll(ref, store.personRef(participantId),
        store.personRef(participantId).collection('forwarding').doc('control'), deletionRef(store, uid));
      const account = doc!.data() as AccessAccount | undefined;
      if (!account || account.audience !== 'pilot' || account.pilot?.activatedAt) return;
      if (deleting!.exists || account.participantId !== participantId || person!.data()?.ownerUid !== uid
        || person!.data()?.status !== 'setup' || person!.data()?.forwardingConsent !== forwardingConsent
        || !control!.data()?.ringTestAt || !control!.data()?.forwardingTestAt) {
        throw new HttpError(409, 'verified_setup_required');
      }
      tx.update(ref, { pilot: { ...account.pilot, activatedAt: store.now(), expiresAt: pilotEndDate(store.now()) } });
      tx.create(ref.collection('audit').doc('activation'), { action: 'activated', at: store.now() });
    });
  }

  async webhook(body: unknown) {
    const input = z.object({ event: z.object({ id: z.string().min(1).max(200), type: z.string().min(1).max(60),
      app_user_id: z.string().max(200).optional(), original_app_user_id: z.string().max(200).optional(),
      aliases: z.array(z.string().max(200)).max(50).optional(), transferred_from: z.array(z.string().max(200)).max(50).optional(),
      transferred_to: z.array(z.string().max(200)).max(50).optional() }) }).parse(body);
    const store = this.store, event = input.event;
    const receipt = store.db.collection('billingWebhookReceipts').doc(store.vault.hash(event.id));
    if ((await receipt.get()).exists) return;
    const ids = [...new Set([event.app_user_id, event.original_app_user_id, ...(event.aliases ?? []),
      ...(event.transferred_from ?? []), ...(event.transferred_to ?? [])])].filter((id): id is string => !!id && /^[a-f0-9-]{36}$/.test(id));
    // Resolve only existing server-owned bindings; run independent lookups together so a transfer/alias event
    // stays below the HTTP deadline. A single failed refresh leaves the event unacknowledged for provider retry.
    const customers = ids.length ? await store.db.getAll(...ids.map(id => customerRef(store, id))) : [];
    const results = await Promise.allSettled(customers.filter(doc => doc.exists).map(async doc => {
      const id = doc.id, customer = doc.data()!;
      const account = (await store.db.collection('serviceAccess').doc(customer.accessKey).get()).data() as AccessAccount | undefined;
      if (!account || account.customerId !== id || (await deletionRef(store, account.uid).get()).exists) return;
      await this.refresh(account.uid, true);
    }));
    if (results.some(result => result.status === 'rejected')) throw new HttpError(503, 'subscription_verification_unavailable');
    await receipt.set({ processedAt: store.now(), expiresAt: store.now() + 30 * 86400_000 });
  }

  async erase(uid: string) {
    const store = this.store, ref = accessRef(store, uid), account = (await ref.get()).data() as AccessAccount | undefined;
    if (account?.customerId) {
      if (!this.provider) throw new HttpError(503, 'subscription_cleanup_unavailable');
      await this.provider.deleteCustomer(account.customerId);
      await customerRef(store, account.customerId).delete();
    }
    await store.db.recursiveDelete(ref);
  }

  /** Bounded recovery for missed notifications and expired pilot access. Never changes phone routing. */
  async reviewBatch() {
    const store = this.store, cursorRef = store.db.doc('serviceAccessControl/review');
    const cursor = (await cursorRef.get()).data()?.after as string | undefined;
    let query = store.db.collection('serviceAccess').orderBy(FieldPath.documentId()).limit(25);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    let checked = 0, failed = 0;
    for (let offset = 0; offset < page.docs.length; offset += 5) {
      await Promise.all(page.docs.slice(offset, offset + 5).map(async doc => {
        const account = doc.data() as AccessAccount;
        if ((await deletionRef(store, account.uid).get()).exists) return;
        try {
          if (account.audience === 'public') {
            if (!this.provider || !account.customerId) throw new HttpError(503, 'subscription_verification_unavailable');
            await this.refresh(account.uid, true);
          } else if (account.pilot?.expiresAt && account.pilot.expiresAt <= store.now()) {
            await store.db.runTransaction(async tx => {
              const [current, deleting] = await tx.getAll(doc.ref, deletionRef(store, account.uid));
              if (current!.exists && !deleting!.exists && current!.data()!.pilot?.expiresAt <= store.now()) tx.update(doc.ref, { needsAccessReview: true });
            });
          }
          checked += 1;
        } catch { failed += 1; }
      }));
    }
    // A failed page is retried next time. Successful rechecks are idempotent.
    await cursorRef.set({ after: failed ? cursor ?? null : page.size === 25 ? page.docs.at(-1)!.id : null,
      checkedAt: store.now(), checked, failed });
    return { checked, failed };
  }
}

export function registerServiceAccess(app: FastifyInstance, store: CloudStore, auth: AuthProvider, provider?: SubscriptionProvider) {
  const access = new ServiceAccess(store, provider);
  app.get('/api/access', async request => access.status((await auth.identify(bearer(request))).subject));
  app.post('/api/access/refresh', async request => {
    z.object({}).strict().parse(request.body ?? {});
    const uid = (await auth.identify(bearer(request))).subject;
    await store.quota([[`billing-refresh:${uid}`, 200]]);
    await access.refresh(uid, true); return access.status(uid, false);
  });
  app.post('/public/revenuecat/webhook', { bodyLimit: 65_536 }, async request => {
    const expected = store.config.REVENUECAT?.webhookAuthorization, provided = request.headers.authorization;
    if (!expected || !provided || Buffer.byteLength(provided) !== Buffer.byteLength(expected)
      || !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) throw new HttpError(401, 'invalid_webhook');
    await access.webhook(request.body); return { received: true };
  });
  return access;
}
