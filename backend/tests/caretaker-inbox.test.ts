import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getShieldFirestore } from '../src/cloud/firestore.js';
import { CloudStore } from '../src/cloud/store.js';
import { cloudSchema } from '../src/cloud/config.js';
import { buildCloudApp } from '../src/cloud/app.js';
import { AlertDelivery, queueAlert, type AlertKind } from '../src/cloud/alerts.js';
import { CARETAKER_EVENT_RETENTION_MS } from '../src/cloud/caretaker-inbox.js';
import { deletionRef } from '../src/cloud/deletion-jobs.js';
import type { AuthProvider } from '../src/auth.js';

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('Caretaker inbox without background delivery (emulator)', () => {
  const project = 'demo-shield-caretaker-inbox';
  const admin = initializeApp({ projectId: project }, 'caretaker-inbox-tests'), db = getShieldFirestore(admin);
  const personID = randomUUID(), phone = '+12025550102';
  const config = cloudSchema.parse({ FIREBASE_WEB_API_KEY: 'synthetic', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app',
    TRIAL_PROXY_SECRET: 'c'.repeat(64), DATA_ENCRYPTION_KEY: 'd'.repeat(64), TELNYX_ACCOUNT_ID: randomUUID(),
    TELNYX_API_KEY: 'test'.repeat(8), TELNYX_PUBLIC_KEY: Buffer.alloc(32).toString('base64'),
    TELNYX_APPLICATION_ID: '123456789', TELNYX_VERIFY_PROFILE_ID: randomUUID() });
  const auth: AuthProvider = { async identify(token) { return { subject: token, verifiedPhone: token === 'owner' ? '+12025550101' : phone }; },
    async requestCode() {}, async verifyCode() { return {}; }, async refresh() { return {}; }, async logout() {}, async deleteAccount() {} };
  const sms = vi.fn(), push = vi.fn();
  let now: number, store: CloudStore, delivery: AlertDelivery, app: Awaited<ReturnType<typeof buildCloudApp>>;
  const headers = (uid = 'owner') => ({ authorization: `Bearer ${uid}`, 'x-shield-participant': personID });
  async function contact() {
    const id = randomUUID();
    const response = await app.inject({ method: 'POST', url: '/api/trusted-contacts', headers: headers(),
      payload: { id, name: 'Alex', phone, consent: true, sendText: false } });
    expect(response.statusCode).toBe(200); return id;
  }
  const accept = (id: string, inAppAlerts = true) => app.inject({ method: 'POST', url: `/api/contact-alerts/${id}`,
    headers: headers('recipient'), payload: { accept: inAppAlerts, textAlerts: false, appAlerts: false, inAppAlerts } });
  const inbox = (uid = 'recipient') => app.inject({ url: '/api/contact-alerts', headers: headers(uid) });
  async function event(kind: AlertKind = 'monitor_intervened') {
    const batch = db.batch(); queueAlert(store, batch, personID, kind); await batch.commit();
    return (await db.collection('alerts').get()).docs[0]?.id;
  }
  beforeEach(async () => {
    if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST!)) throw new Error('Local emulator required');
    await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: 'DELETE' });
    now = Date.parse('2026-10-19T12:00:00Z'); sms.mockReset(); push.mockReset();
    store = new CloudStore(db, structuredClone(config), () => now);
    app = await buildCloudApp(store, { auth, textSender: { send: sms } });
    delivery = new AlertDelivery(store, { send: push }, { send: sms });
    await store.personRef(personID).set({ id: personID, ownerUid: 'owner', status: 'setup',
      nameEnc: store.vault.seal('Margaret', `person:${personID}:name`), phoneEnc: store.vault.seal('+12025550101', `person:${personID}:phone`) });
  });
  afterEach(async () => { await app.close(); });
  afterAll(async () => { await db.terminate(); await deleteApp(admin); });

  it('allows a manually shared invitation and explicit inbox acceptance without SMS or APNs', async () => {
    const id = await contact();
    expect((await inbox()).json()).toMatchObject({ inboxAvailable: true, textAvailable: false, appAvailable: false, events: [] });
    expect((await accept(id)).statusCode).toBe(200);
    const queued = await event(); expect(queued).toBeDefined(); await delivery.deliver(queued!);
    const result = (await inbox()).json();
    expect(result.events).toHaveLength(1); expect(result.events[0]).toMatchObject({ name: 'Margaret', occurredAt: new Date(now).toISOString() });
    expect(Object.keys(result.events[0]).sort()).toEqual(['id', 'name', 'occurredAt']);
    expect(sms).not.toHaveBeenCalled(); expect(push).not.toHaveBeenCalled();
    expect((await db.collection('grants').get()).empty).toBe(true);
    expect((await db.collection('memberships').get()).empty).toBe(true);
    expect((await app.inject({ url: '/api/calls', headers: headers('recipient') })).statusCode).toBe(403);
  });
  it('does not create inbox events before acceptance or for an earlier intervention', async () => {
    const id = await contact(), queued = await event();
    now += 1000; expect((await accept(id)).statusCode).toBe(200); await delivery.deliver(queued!);
    expect((await inbox()).json().events).toEqual([]);
    expect((await db.collection('caretakerEvents').get()).empty).toBe(true);
  });
  it('deduplicates simultaneous workers and keeps event contents separate from call details', async () => {
    await accept(await contact()); const queued = await event();
    await Promise.all([delivery.deliver(queued!), delivery.deliver(queued!)]);
    const events = await db.collection('caretakerEvents').get(); expect(events.size).toBe(1);
    expect(Object.keys(events.docs[0]!.data()).sort()).toEqual(['contactId', 'createdAt', 'expiresAt', 'kind', 'participantId', 'recipientUid']);
    expect((await inbox('another-account')).json().events).toEqual([]);
  });
  it('never queues caretaker inbox events for ordinary calls, messages, blocks or setup changes', async () => {
    await accept(await contact());
    for (const kind of ['voicemail', 'blocked_caller', 'voicemail_removed', 'protection_paused', 'restoration_started', 'setup_check_failed'] as const) {
      expect(await event(kind)).toBeUndefined();
    }
    expect((await inbox()).json().events).toEqual([]);
  });
  it('removes read access immediately when the owner pauses or revokes the relationship', async () => {
    const id = await contact(); await accept(id); await delivery.deliver((await event())!);
    expect((await inbox()).json().events).toHaveLength(1);
    await store.personRef(personID).update({ 'trustedContactsChoice.enabled': false });
    expect((await inbox()).json().events).toEqual([]);
    await store.personRef(personID).update({ 'trustedContactsChoice.enabled': true });
    expect((await inbox()).json().events).toHaveLength(1);
    expect((await app.inject({ method: 'DELETE', url: `/api/trusted-contacts/${id}`, headers: headers() })).statusCode).toBe(200);
    expect((await inbox()).json().events).toEqual([]);
  });
  it('does not restore earlier events after declining and consenting again', async () => {
    const id = await contact(); await accept(id); await delivery.deliver((await event())!);
    now += 1000; await accept(id, false); expect((await inbox()).json().events).toEqual([]);
    // A declined relationship cannot be reactivated through the old invitation.
    expect((await accept(id)).statusCode).toBe(404);
    expect((await inbox()).json().events).toEqual([]);
  });
  it('expires saved events at 30 days and erases them during scheduled cleanup', async () => {
    await accept(await contact()); await delivery.deliver((await event())!);
    now += CARETAKER_EVENT_RETENTION_MS;
    expect((await inbox()).json().events).toEqual([]);
    await store.cleanup(); expect((await db.collection('caretakerEvents').get()).empty).toBe(true);
  });
  it('retains a job after a database failure so a retry can save the inbox event', async () => {
    await accept(await contact()); const queued = await event();
    const transaction = vi.spyOn(db, 'runTransaction').mockRejectedValueOnce(new Error('synthetic database interruption'));
    try { await expect(delivery.deliver(queued!)).rejects.toThrow('synthetic database interruption'); }
    finally { transaction.mockRestore(); }
    expect((await db.collection('alerts').doc(queued!).get()).exists).toBe(true);
    await delivery.deliver(queued!); expect((await inbox()).json().events).toHaveLength(1);
    expect((await db.collection('alerts').doc(queued!).get()).exists).toBe(false);
  });
  it('does not deliver to a recipient whose account deletion has started', async () => {
    await accept(await contact()); const queued = await event();
    await deletionRef(store, 'recipient').set({ status: 'queued' }); await delivery.deliver(queued!);
    expect((await db.collection('caretakerEvents').get()).empty).toBe(true);
  });
});
