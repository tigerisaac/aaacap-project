import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getShieldFirestore } from '../src/cloud/firestore.js';
import { CloudStore } from '../src/cloud/store.js';
import { cloudSchema } from '../src/cloud/config.js';
import { buildCloudApp } from '../src/cloud/app.js';
import { ServiceAccess, accessRef, pilotEndDate } from '../src/cloud/service-access.js';
import { deletionRef } from '../src/cloud/deletion-jobs.js';
import { forwardingConsent } from '../src/cloud/forwarding-store.js';
import { deleteAccount } from '../src/cloud/account-deletion.js';
import type { SubscriptionSnapshot } from '../src/cloud/revenuecat.js';
import { HttpError, type AuthProvider } from '../src/auth.js';

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('Service access and subscriptions (emulator)', () => {
  const project = 'demo-shield-service-access', admin = initializeApp({ projectId: project }, 'service-access-tests'), db = getShieldFirestore(admin);
  const personID = 'ab443d1b-a90e-4a11-a627-d8baac281da9';
  const config = cloudSchema.parse({ FIREBASE_WEB_API_KEY: 'synthetic', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app',
    TRIAL_PROXY_SECRET: 'c'.repeat(64), DATA_ENCRYPTION_KEY: 'd'.repeat(64), TELNYX_ACCOUNT_ID: personID,
    TELNYX_API_KEY: 'test'.repeat(8), TELNYX_PUBLIC_KEY: Buffer.alloc(32).toString('base64'), TELNYX_APPLICATION_ID: '123456789012345678',
    REVENUECAT: { applePublicKey: 'appl_synthetic', secretApiKey: 'synthetic-server-credential',
      webhookAuthorization: 'synthetic-webhook-authorization-only', purchasesEnabled: true } });
  const auth: AuthProvider = { async identify(token) { return { subject: token }; }, async requestCode() {},
    async verifyCode() { return {}; }, async refresh() { return {}; }, async logout() {}, async deleteAccount() {} };
  const subscriber = vi.fn(async (_id: string, _sandbox: boolean): Promise<SubscriptionSnapshot> => snapshot());
  const deleteCustomer = vi.fn(async (_id: string) => {});
  const provider = { subscriber, deleteCustomer };
  let now: number, store: CloudStore, access: ServiceAccess, app: Awaited<ReturnType<typeof buildCloudApp>>;
  const headers = (uid = 'owner') => ({ authorization: `Bearer ${uid}` });
  const snapshot = (active = true): SubscriptionSnapshot => ({ checkedAt: now, providerAt: now, expiresAt: now + 60_000,
    accessUntil: now + 60_000, productId: 'shield_monthly', active, willRenew: true, billingIssue: false, sandbox: false, revoked: false, hasPurchased: true });
  const approve = (audience: 'public' | 'pilot' = 'public', uid = 'owner', id = personID) =>
    access.approve({ uid, participantId: id, country: 'US', carrier: 'tello', audience, operator: 'synthetic-operator' });
  async function person(uid = 'owner', id = personID, phone = '+12025550101') {
    await store.personRef(id).set({ id, ownerUid: uid, status: 'setup', nameEnc: store.vault.seal('Alex', `person:${id}:name`),
      phoneEnc: store.vault.seal(phone, `person:${id}:phone`), phoneVerifiedAt: now, carrier: 'tello', forwardingConsent });
    await store.personRef(id).collection('forwarding').doc('control').set({ provisioned: true, dataPlanConfirmed: true, restorationGuide: ['Synthetic step'] });
  }
  async function hook(event: Record<string, unknown>, authorization = config.REVENUECAT!.webhookAuthorization) {
    return app.inject({ method: 'POST', url: '/public/revenuecat/webhook', headers: { authorization }, payload: { event } });
  }
  beforeEach(async () => {
    if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST!)) throw new Error('Local emulator required');
    await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: 'DELETE' });
    now = Date.parse('2026-10-17T12:00:00Z'); subscriber.mockReset(); subscriber.mockImplementation(async () => snapshot()); deleteCustomer.mockReset();
    store = new CloudStore(db, config, () => now); access = new ServiceAccess(store, provider);
    app = await buildCloudApp(store, { auth, subscriptions: provider }); await person();
  });
  afterEach(async () => { await app.close(); });
  afterAll(async () => { await db.terminate(); await deleteApp(admin); });

  it('leaves existing assisted users alone and rejects client-supplied entitlement flags', async () => {
    expect((await app.inject({ url: '/api/access' })).statusCode).toBe(401);
    const state = (await app.inject({ url: '/api/access', headers: headers() })).json();
    expect(state).toMatchObject({ audience: 'assisted', purchaseAllowed: false, revenueCat: null });
    expect(subscriber).not.toHaveBeenCalled(); await access.requireActivation('owner', personID);
    const forged = await app.inject({ method: 'POST', url: '/api/access/refresh', headers: headers(), payload: { active: true, uid: 'other', audience: 'pilot' } });
    expect(forged.statusCode).toBe(400);
    expect((await accessRef(store, 'owner').get()).exists).toBe(false);
  });
  it('requires verified ownership, country, carrier and prepared restoration before approving a purchase', async () => {
    await expect(access.approve({ uid: 'other', participantId: personID, country: 'US', carrier: 'tello', audience: 'public', operator: 'staff' })).rejects.toThrow('verified_setup_required');
    await store.personRef(personID).update({ carrier: 'att' });
    await expect(access.approve({ uid: 'owner', participantId: personID, country: 'US', carrier: 'att', audience: 'public', operator: 'staff' })).rejects.toThrow('verified_setup_required');
    await person('owner', personID, '+14165550101');
    await expect(approve()).rejects.toThrow('verified_setup_required');
    await expect(access.approve({ uid: 'owner', participantId: personID, country: 'CA', carrier: 'tello', audience: 'public', operator: 'staff' })).rejects.toThrow('verified_setup_required');
    await person(); await store.personRef(personID).collection('forwarding').doc('control').update({ restorationGuide: [] });
    await expect(approve()).rejects.toThrow('verified_setup_required');
    expect((await accessRef(store, 'owner').get()).exists).toBe(false);
  });
  it('supports an approval dry run and binds only an opaque customer ID to this authenticated account', async () => {
    await access.approve({ uid: 'owner', participantId: personID, country: 'US', carrier: 'tello', audience: 'public', operator: 'staff' }, true);
    expect((await db.collection('serviceAccess').get()).empty).toBe(true);
    await approve(); const data = (await accessRef(store, 'owner').get()).data()!;
    expect(data.customerId).toMatch(/^[a-f0-9-]{36}$/); expect(data.customerId).not.toBe('owner');
    const state = (await app.inject({ url: '/api/access', headers: headers() })).json();
    expect(state).toMatchObject({ audience: 'public', status: 'active', purchaseAllowed: false });
    expect(state.revenueCat.customerId).toBe(data.customerId);
    expect(JSON.stringify(state)).not.toContain(config.REVENUECAT!.secretApiKey);
    expect(JSON.stringify(state)).not.toContain(config.REVENUECAT!.webhookAuthorization);
    expect((await app.inject({ url: '/api/access', headers: headers('other') })).json().revenueCat).toBe(null);
    expect(subscriber).toHaveBeenCalledExactlyOnceWith(data.customerId, false);
  });
  it('never enables purchases when the runtime switch is off or the person is no longer eligible', async () => {
    subscriber.mockImplementation(async () => snapshot(false)); await approve();
    expect((await access.status('owner')).purchaseAllowed).toBe(true);
    const disabled = new ServiceAccess(new CloudStore(db, { ...config, REVENUECAT: { ...config.REVENUECAT!, purchasesEnabled: false } }, () => now), provider);
    expect(await disabled.status('owner')).toMatchObject({ purchaseAllowed: false, status: 'unavailable' });
    await store.personRef(personID).update({ carrier: 'att' });
    expect((await access.status('owner')).purchaseAllowed).toBe(false);
    await expect(access.requireActivation('owner', personID)).rejects.toThrow('service_access_required');
  });
  it('keeps expired access out of activation without changing carrier routing or history', async () => {
    await approve(); await access.status('owner');
    now += 60_001; subscriber.mockImplementation(async () => ({ ...snapshot(false), expiresAt: now - 1, accessUntil: now - 1 }));
    await expect(access.requireActivation('owner', personID)).rejects.toThrow('service_access_required');
    expect((await store.personRef(personID).get()).data()!.status).toBe('setup');
    expect((await accessRef(store, 'owner').get()).data()!.needsAccessReview).toBe(true);
  });
  it('keeps Apple cancellation guidance available for deletion during a provider outage', async () => {
    await approve(); subscriber.mockRejectedValue(new HttpError(503, 'subscription_verification_unavailable'));
    const deletion = await app.inject({ url: '/api/account/deletion', headers: headers() });
    expect(deletion.statusCode).toBe(200);
    expect(deletion.json()).toMatchObject({ subscriptionAudience: 'public', restorationRequired: true });
    expect(subscriber).not.toHaveBeenCalled();
    expect((await app.inject({ url: '/api/access', headers: headers() })).statusCode).toBe(503);
  });
  it('caps the pilot at ten accounts with idempotent grants and no public billing configuration', async () => {
    await approve('pilot'); await approve('pilot');
    for (let i = 1; i < 9; i++) { const id = randomUUID(); await person(`pilot${i}`, id); await approve('pilot', `pilot${i}`, id); }
    const last = [randomUUID(), randomUUID()];
    await Promise.all(last.map((id, i) => person(`last${i}`, id)));
    const attempts = await Promise.allSettled(last.map((id, i) => approve('pilot', `last${i}`, id)));
    expect(attempts.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect((attempts.find(result => result.status === 'rejected') as PromiseRejectedResult).reason.message).toBe('pilot_full');
    expect((await db.doc('serviceAccessControl/pilot').get()).data()!.granted).toBe(10);
    expect((await access.status('owner'))).toMatchObject({ audience: 'pilot', status: 'awaiting_activation', purchaseAllowed: false, hasSubscription: false, revenueCat: null });
    expect((await app.inject({ url: '/api/account/deletion', headers: headers() })).json().subscriptionAudience).toBe('pilot');
    expect(subscriber).not.toHaveBeenCalled(); expect((await db.collection('billingCustomers').get()).empty).toBe(true);
  });
  it('starts the pilot only after both server checks and consent, with a persisted non-renewing end date', async () => {
    await approve('pilot'); await expect(access.activatePilot('owner', personID)).rejects.toThrow('verified_setup_required');
    await store.personRef(personID).collection('forwarding').doc('control').update({ ringTestAt: now, forwardingTestAt: now });
    await store.personRef(personID).update({ forwardingConsent: 'stale' });
    await expect(access.activatePilot('owner', personID)).rejects.toThrow('verified_setup_required');
    await store.personRef(personID).update({ forwardingConsent }); await access.activatePilot('owner', personID);
    const end = pilotEndDate(now); now += 60_000; await access.activatePilot('owner', personID);
    expect(await new ServiceAccess(store, provider).status('owner')).toMatchObject({ status: 'active', accessUntil: new Date(end).toISOString(), willRenew: false, revenueCat: null });
    now = end; expect((await access.status('owner')).status).toBe('expired');
    await expect(access.requireActivation('owner', personID)).rejects.toThrow('service_access_required');
    expect(subscriber).not.toHaveBeenCalled();
  });
  it('authenticates, re-queries and deduplicates webhooks instead of trusting their entitlement claims', async () => {
    await approve(); const customerId = (await accessRef(store, 'owner').get()).data()!.customerId;
    const event = { id: 'event-1', type: 'INITIAL_PURCHASE', app_user_id: customerId, entitlement_ids: ['shield_access'], expiration_at_ms: now + 99999999 };
    expect((await hook(event, 'wrong')).statusCode).toBe(401); expect(subscriber).not.toHaveBeenCalled();
    subscriber.mockImplementation(async () => snapshot(false));
    expect((await hook(event)).statusCode).toBe(200); expect((await access.status('owner', false)).status).toBe('expired');
    expect((await hook(event)).statusCode).toBe(200); expect(subscriber).toHaveBeenCalledTimes(1);
    const receipt = (await db.collection('billingWebhookReceipts').get()).docs[0]!.data();
    expect(Object.keys(receipt).sort()).toEqual(['expiresAt', 'processedAt']);
    expect((await hook({ id: 'unknown', type: 'TEST', app_user_id: randomUUID() })).statusCode).toBe(200);
    expect(subscriber).toHaveBeenCalledTimes(1);
  });
  it('rechecks both existing accounts after a transfer and ignores an unbound alias', async () => {
    await approve(); const otherID = randomUUID(); await person('other', otherID); await approve('public', 'other', otherID);
    const first = (await accessRef(store, 'owner').get()).data()!.customerId, second = (await accessRef(store, 'other').get()).data()!.customerId;
    subscriber.mockImplementation(async id => snapshot(id === second));
    expect((await hook({ id: 'transfer', type: 'TRANSFER', transferred_from: [first], transferred_to: [second, randomUUID()] })).statusCode).toBe(200);
    expect((await access.status('owner', false)).status).toBe('expired'); expect((await access.status('other', false)).status).toBe('active');
    expect(subscriber).toHaveBeenCalledTimes(2);
  });
  it('keeps a failed webhook retryable and serializes competing account refreshes', async () => {
    await approve(); const customerId = (await accessRef(store, 'owner').get()).data()!.customerId;
    subscriber.mockRejectedValueOnce(new Error('provider private message'));
    expect((await hook({ id: 'retry', type: 'RENEWAL', app_user_id: customerId })).statusCode).toBe(503);
    expect((await db.collection('billingWebhookReceipts').get()).empty).toBe(true);
    expect((await hook({ id: 'retry', type: 'RENEWAL', app_user_id: customerId })).statusCode).toBe(200);
    let release!: (value: SubscriptionSnapshot) => void, started!: () => void;
    const waiting = new Promise<void>(resolve => { started = resolve; });
    subscriber.mockImplementationOnce(async () => { started(); return new Promise<SubscriptionSnapshot>(resolve => { release = resolve; }); });
    const pending = access.refresh('owner', true); await waiting;
    await expect(access.refresh('owner', true)).rejects.toThrow('subscription_check_in_progress');
    release(snapshot()); await pending;
  });
  it('does not overwrite a newer provider snapshot with an older response', async () => {
    await approve(); await access.refresh('owner'); now += 1000;
    subscriber.mockImplementation(async () => ({ ...snapshot(false), providerAt: now - 2000 }));
    await access.refresh('owner', true); expect((await access.status('owner', false)).status).toBe('active');
  });
  it('recovers missed billing events and flags expired pilots without changing a phone', async () => {
    await approve(); await access.refresh('owner');
    const pilotID = randomUUID(); await person('pilot', pilotID); await approve('pilot', 'pilot', pilotID);
    await accessRef(store, 'pilot').update({ pilot: { grantedAt: now - 10_000, activatedAt: now - 10_000, expiresAt: now - 1 } });
    subscriber.mockImplementation(async () => snapshot(false));
    expect(await access.reviewBatch()).toEqual({ checked: 2, failed: 0 });
    expect((await accessRef(store, 'owner').get()).data()!.needsAccessReview).toBe(true);
    expect((await accessRef(store, 'pilot').get()).data()!.needsAccessReview).toBe(true);
    expect((await store.personRef(pilotID).get()).data()!.status).toBe('setup');
    subscriber.mockRejectedValueOnce(new Error('private provider error'));
    expect((await access.reviewBatch()).failed).toBe(1);
    expect((await db.doc('serviceAccessControl/review').get()).data()).toMatchObject({ after: null, failed: 1 });
  });
  it('reports unconfigured public subscriptions as failed instead of silently advancing past them', async () => {
    await approve();
    const unconfigured = new ServiceAccess(new CloudStore(db, { ...config, REVENUECAT: undefined }, () => now));
    expect(await unconfigured.reviewBatch()).toEqual({ checked: 0, failed: 1 });
    expect((await db.doc('serviceAccessControl/review').get()).data()).toMatchObject({ after: null, failed: 1 });
    await accessRef(store, 'owner').update({ customerId: null });
    expect(await access.reviewBatch()).toEqual({ checked: 0, failed: 1 });
    expect(subscriber).not.toHaveBeenCalled();
  });
  it('fences deletion during a lookup and keeps failed provider erasure retryable', async () => {
    await approve(); const customerId = (await accessRef(store, 'owner').get()).data()!.customerId;
    subscriber.mockImplementationOnce(async () => { await deletionRef(store, 'owner').set({ status: 'queued' }); return snapshot(); });
    await access.refresh('owner'); expect((await accessRef(store, 'owner').get()).data()!.subscription).toBeUndefined();
    await expect(access.refresh('owner')).rejects.toThrow('account_deletion_pending');
    deleteCustomer.mockRejectedValueOnce(new Error('temporary'));
    await expect(access.erase('owner')).rejects.toThrow('temporary'); expect((await accessRef(store, 'owner').get()).exists).toBe(true);
    await access.erase('owner'); expect((await accessRef(store, 'owner').get()).exists).toBe(false);
    expect((await db.collection('billingCustomers').doc(customerId).get()).exists).toBe(false);
    expect(deleteCustomer).toHaveBeenCalledTimes(2);
    expect((await hook({ id: 'after-delete', type: 'RENEWAL', app_user_id: customerId })).statusCode).toBe(200);
    expect(subscriber).toHaveBeenCalledTimes(1);
  });
  it('does not delete the login before provider erasure succeeds, and retries after participant cleanup', async () => {
    await approve(); await store.personRef(personID).update({ forwardingConsent: null });
    const identityDelete = vi.fn(async (_uid: string) => {}), deletionAuth = { ...auth, deleteAccount: identityDelete };
    deleteCustomer.mockRejectedValueOnce(new Error('temporary'));
    await expect(deleteAccount(store, deletionAuth, { subject: 'owner' }, undefined, [], access)).rejects.toThrow('temporary');
    expect(identityDelete).not.toHaveBeenCalled(); expect((await store.personRef(personID).get()).exists).toBe(false);
    await deleteAccount(store, deletionAuth, { subject: 'owner' }, undefined, [], access);
    expect(identityDelete).toHaveBeenCalledExactlyOnceWith('owner');
    expect((await accessRef(store, 'owner').get()).exists).toBe(false);
  });
});
