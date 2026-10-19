import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getShieldFirestore } from '../src/cloud/firestore.js';
import { CloudStore } from '../src/cloud/store.js';
import { cloudSchema, CONSENT_VERSION } from '../src/cloud/config.js';
import { buildCloudApp } from '../src/cloud/app.js';
import { accessRef } from '../src/cloud/service-access.js';
import { deletionRef } from '../src/cloud/deletion-jobs.js';
import { numberRef } from '../src/cloud/numbers.js';
import { routeRef, SHARED_ENROLLMENT_LIMIT } from '../src/cloud/shared-routing.js';
import { forwardingConsent } from '../src/cloud/forwarding-store.js';
import type { SubscriptionSnapshot } from '../src/cloud/revenuecat.js';
import type { AuthProvider } from '../src/auth.js';

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('Public purchase-to-activation safeguards (emulator)', () => {
  const project = 'demo-shield-public-enrollment';
  const admin = initializeApp({ projectId: project }, 'public-enrollment-tests'), db = getShieldFirestore(admin);
  const config = cloudSchema.parse({ FIREBASE_WEB_API_KEY: 'synthetic', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app',
    TRIAL_PROXY_SECRET: 'c'.repeat(64), DATA_ENCRYPTION_KEY: 'd'.repeat(64), TELNYX_ACCOUNT_ID: randomUUID(),
    TELNYX_API_KEY: 'test'.repeat(8), TELNYX_PUBLIC_KEY: Buffer.alloc(32).toString('base64'), TELNYX_APPLICATION_ID: '123456789',
    TELNYX_SHARED_APPLICATION_ID: '987654321', TELNYX_NUMBER: '+12025550999', TELNYX_VERIFY_PROFILE_ID: randomUUID(),
    PUBLIC_ENROLLMENT_ENABLED: true, SHARED_NUMBER_ENABLED: true, LIVE_SCREENING_ENABLED: true,
    REVENUECAT: { applePublicKey: 'appl_synthetic', secretApiKey: 'synthetic-server-credential',
      webhookAuthorization: 'synthetic-webhook-authorization-only', purchasesEnabled: true } });
  const phones: Record<string, string | undefined> = { owner: '+12025550101', other: '+12025550102', canada: '+14165550101', unverified: undefined };
  const auth: AuthProvider = { async identify(token) { return { subject: token, verifiedPhone: phones[token] }; },
    async requestCode() {}, async verifyCode() { return {}; }, async refresh() { return {}; }, async logout() {}, async deleteAccount() {} };
  let now: number, store: CloudStore, app: Awaited<ReturnType<typeof buildCloudApp>>, active: boolean;
  const subscriber = vi.fn(async (): Promise<SubscriptionSnapshot> => ({ checkedAt: now, providerAt: now, expiresAt: now + 60_000,
    accessUntil: now + 60_000, productId: 'shield_monthly', active, willRenew: active, billingIssue: false,
    sandbox: false, revoked: false, hasPurchased: active }));
  const payload = () => ({ requestId: randomUUID(), name: 'Alex', carrier: 'tello', dataPlanConfirmed: true,
    originalSettingsRecorded: true, restorationInstructions: ['Restore original unanswered setting', 'Restore original busy setting',
      'Restore original unreachable setting'], consentVersion: CONSENT_VERSION, accepted: true });
  const headers = (uid = 'owner') => ({ authorization: `Bearer ${uid}` });
  const register = (input = payload(), uid = 'owner') => app.inject({ method: 'POST', url: '/api/enrollment', headers: headers(uid), payload: input });
  const activate = (id: string, uid = 'owner') => app.inject({ method: 'POST', url: '/api/enrollment/activate', headers: headers(uid), payload: { participantId: id } });
  async function setup() {
    const response = await register(); expect(response.statusCode).toBe(200);
    const id = response.json().participantId as string;
    await store.personRef(id).update({ forwardingConsent });
    await store.personRef(id).collection('forwarding').doc('control').update({ ringTestAt: now, forwardingTestAt: now });
    await routeRef(store, config.TELNYX_NUMBER, phones.owner!).update({ enabled: true, qualification: 'forwarding_nonce', qualifiedAt: now });
    return id;
  }
  beforeEach(async () => {
    if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST!)) throw new Error('Local emulator required');
    await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: 'DELETE' });
    now = Date.parse('2026-10-19T12:00:00Z'); active = true; subscriber.mockClear();
    store = new CloudStore(db, structuredClone(config), () => now);
    app = await buildCloudApp(store, { auth, subscriptions: { subscriber, async deleteCustomer() {} } });
    await numberRef(store, config.TELNYX_NUMBER).set({ state: 'shared', sharedPrepared: true, members: [] });
  });
  afterEach(async () => { await app.close(); });
  afterAll(async () => { await db.terminate(); await deleteApp(admin); });

  it('requires authentication and a verified supported phone without creating state', async () => {
    expect((await app.inject({ url: '/api/enrollment' })).statusCode).toBe(401);
    expect((await register(payload(), 'unverified')).statusCode).toBe(403);
    expect((await register(payload(), 'canada')).json().error.code).toBe('carrier_not_supported');
    expect((await db.collection('participants').get()).empty).toBe(true);
  });
  it('offers only verified carriers and keeps setup and billing inactive after registration', async () => {
    const available = (await app.inject({ url: '/api/enrollment', headers: headers() })).json();
    expect(available.status).toBe('available');
    expect(available.carriers.map((c: { id: string }) => c.id).sort()).toEqual(['tello', 'tmobile']);
    const result = await register(), id = result.json().participantId;
    expect(result.statusCode).toBe(200);
    expect((await store.personRef(id).get()).data()).toMatchObject({ ownerUid: 'owner', alwaysOn: false, publicEnrollment: { activatedAt: null } });
    const control = (await store.personRef(id).collection('forwarding').doc('control').get()).data()!;
    expect(control.enabled).toBe(false); expect(control.restorationGuide).toBeUndefined();
    expect(store.vault.open(control.restorationGuideEnc, `restoration:${id}`)).toBe(JSON.stringify(payload().restorationInstructions));
    expect((await routeRef(store, config.TELNYX_NUMBER, phones.owner!).get()).data()).toMatchObject({ participantId: id, enabled: false });
    const account = (await accessRef(store, 'owner').get()).data()!;
    expect(account).toMatchObject({ audience: 'public', allowSandbox: false });
    expect(account.subscription).toBeUndefined(); expect(account.pilot).toBeUndefined(); expect(subscriber).not.toHaveBeenCalled();
  });
  it('returns the same setup after a lost response and rejects changed retry contents', async () => {
    const input = payload(), first = (await register(input)).json();
    expect((await register(input)).json()).toEqual({ participantId: first.participantId, created: false });
    expect((await register({ ...input, name: 'Changed' })).statusCode).toBe(409);
    expect((await db.collection('participants').get()).size).toBe(1);
    expect((await numberRef(store, config.TELNYX_NUMBER).get()).data()!.members).toEqual([first.participantId]);
  });
  it('serializes simultaneous identical registrations into one person and customer', async () => {
    const input = payload(), results = await Promise.all([register(input), register(input)]);
    expect(results.map(r => r.statusCode)).toEqual([200, 200]);
    expect(new Set(results.map(r => r.json().participantId)).size).toBe(1);
    expect((await db.collection('participants').get()).size).toBe(1);
    expect((await db.collection('billingCustomers').get()).size).toBe(1);
  });
  it('rejects forged identity, pilot, entitlement and price fields', async () => {
    for (const extra of [{ uid: 'other' }, { phone: phones.other }, { audience: 'pilot' }, { active: true }, { price: 0 }]) {
      const response = await app.inject({ method: 'POST', url: '/api/enrollment', headers: headers(), payload: { ...payload(), ...extra } });
      expect(response.statusCode).toBe(400);
    }
    expect((await db.collection('participants').get()).empty).toBe(true);
  });
  it('honors launch, purchase, carrier and account-deletion gates before creating setup', async () => {
    store.config.PUBLIC_ENROLLMENT_ENABLED = false;
    expect((await register()).statusCode).toBe(503); store.config.PUBLIC_ENROLLMENT_ENABLED = true;
    store.config.REVENUECAT!.purchasesEnabled = false;
    expect((await register()).statusCode).toBe(503); store.config.REVENUECAT!.purchasesEnabled = true;
    expect((await register({ ...payload(), carrier: 'att' })).statusCode).toBe(409);
    await deletionRef(store, 'owner').set({ status: 'queued' });
    expect((await register()).json().error.code).toBe('account_deletion_pending');
    expect((await db.collection('participants').get()).empty).toBe(true);
  });
  it('enforces the final capacity slot under concurrent registration', async () => {
    const existing = Array.from({ length: SHARED_ENROLLMENT_LIMIT - 1 }, () => randomUUID());
    await numberRef(store, config.TELNYX_NUMBER).update({ members: existing });
    const results = await Promise.all([register(), register(payload(), 'other')]);
    expect(results.map(r => r.statusCode).sort()).toEqual([200, 409]);
    expect((await numberRef(store, config.TELNYX_NUMBER).get()).data()!.members).toHaveLength(SHARED_ENROLLMENT_LIMIT);
    expect((await db.collection('participants').get()).size).toBe(1);
  });
  it('never reassigns an existing phone route to a different account', async () => {
    await routeRef(store, config.TELNYX_NUMBER, phones.owner!).set({ participantId: randomUUID(), enabled: false });
    expect((await register()).json().error.code).toBe('phone_already_enrolled');
    expect((await accessRef(store, 'owner').get()).exists).toBe(false);
  });
  it('requires fresh paid access and signed route checks before explicit activation', async () => {
    const id = (await register()).json().participantId;
    expect((await activate(id)).statusCode).toBe(409);
    expect((await store.personRef(id).get()).data()!.alwaysOn).toBe(false);
    await store.personRef(id).update({ forwardingConsent });
    await store.personRef(id).collection('forwarding').doc('control').update({ ringTestAt: now, forwardingTestAt: now });
    await routeRef(store, config.TELNYX_NUMBER, phones.owner!).update({ enabled: true, qualification: 'forwarding_nonce', qualifiedAt: now });
    active = false; expect((await activate(id)).json().error.code).toBe('service_access_required');
    active = true; expect((await activate(id)).json()).toEqual({ active: true });
    expect((await store.personRef(id).get()).data()!.alwaysOn).toBe(true);
    expect((await activate(id)).json()).toEqual({ active: true });
  });
  it('rejects activation by another owner or while deletion is pending', async () => {
    const id = await setup();
    expect((await activate(id, 'other')).statusCode).toBe(409);
    await deletionRef(store, 'owner').set({ status: 'queued' });
    expect((await activate(id)).statusCode).toBe(409);
    expect((await store.personRef(id).get()).data()!.alwaysOn).toBe(false);
  });
  it('cannot activate a route using checks older than its registration', async () => {
    const id = await setup();
    await store.personRef(id).collection('forwarding').doc('control').update({ forwardingTestAt: now - 1 });
    expect((await activate(id)).statusCode).toBe(409);
    expect((await store.personRef(id).get()).data()!.alwaysOn).toBe(false);
  });
});
