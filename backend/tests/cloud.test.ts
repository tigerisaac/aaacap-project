import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { CloudStore } from '../src/cloud/store.js';
import { cloudSchema, RETENTION_MS } from '../src/cloud/config.js';
import { buildCloudApp } from '../src/cloud/app.js';
import { HttpError, type AuthProvider } from '../src/auth.js';
import { extractionSchema, type MessageChecker } from '../src/cloud/message-check.js';
import { stoppedTotal } from '../src/cloud/stopped-total.js';
import { deleteAccount } from '../src/cloud/account-deletion.js';
import { processAccountDeletions, deletionRef } from '../src/cloud/deletion-jobs.js';
import { contactPhoneHash } from '../src/cloud/trusted-contacts.js';

const enabled = !!process.env.FIRESTORE_EMULATOR_HOST;
describe.skipIf(!enabled)('Firebase serverless integration (Firestore emulator)', () => {
  const config = cloudSchema.parse({ FIREBASE_WEB_API_KEY: 'emulator-test', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app',
    TRIAL_PROXY_SECRET: 'c'.repeat(64), DATA_ENCRYPTION_KEY: 'd'.repeat(64),
    TELNYX_ACCOUNT_ID: 'fe8d2922-2dcf-4461-87bc-17a539688c31', TELNYX_API_KEY: 'test'.repeat(8), TELNYX_PUBLIC_KEY: `${'A'.repeat(43)}=`,
    TELNYX_APPLICATION_ID: '123456789012345678' });
  const admin = initializeApp({ projectId: 'demo-shield' }, 'cloud-tests');
  const db = getFirestore(admin);
  let now: number; let store: CloudStore; let checked: string[];
  const routine = extractionSchema.parse({ purpose: 'appointment', sensitiveAccountIssue: { value: 'absent', evidence: null },
    familyMoneyEmergency: { value: 'absent', evidence: null }, prohibitedRequests: [], uncertainty: [] });
  const checker: MessageChecker = { async extract(text) { checked.push(text); return routine; } };
  const auth: AuthProvider = {
    async identify(token) { if (!['owner', 'caregiver', 'stranger', 'other-owner'].includes(token)) throw new HttpError(401, 'sign_in_required'); return { subject: token }; },
    async requestCode() {}, async verifyCode() { return {}; }, async refresh() { return {}; }, async logout() {}, deleteAccount: vi.fn(async (_uid: string) => {})
  };
  let app: Awaited<ReturnType<typeof buildCloudApp>> | undefined;
  const PERSON = 'b0b7af93-72ad-431d-9708-f1d9564a2b36', PHONE = '+12025550101', NUMBER = '+12025550109';
  const headers = (token = 'owner') => ({ authorization: `Bearer ${token}`, 'x-shield-participant': PERSON });
  /** A finished forwarded call, as call control leaves it. */
  const seedCall = async () => {
    const id = randomUUID();
    await store.callRef(id).set({ id, participantId: PERSON, source: 'forwarding', provider: 'telnyx', parentSid: randomUUID(),
      eligible: true, createdAt: now, expiresAt: now + RETENTION_MS, callerEnc: store.vault.seal('+13125550148', `call:${id}:caller`),
      state: 'ended', outcome: 'held', reason: 'scam', purpose: 'other', completedAt: now,
      events: [{ kind: 'screening_started', at: now }, { kind: 'call_stopped', at: now }] });
    return id;
  };
  beforeEach(async () => {
    if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST!)) throw new Error('Expected local emulator');
    const cleared = await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-shield/databases/(default)/documents`, { method: 'DELETE' });
    if (!cleared.ok) throw new Error('Emulator reset failed');
    now = Date.now(); store = new CloudStore(db, config, () => now); checked = []; vi.mocked(auth.deleteAccount).mockReset();
    await store.personRef(PERSON).set({ id: PERSON, ownerUid: 'owner', status: 'setup',
      nameEnc: store.vault.seal('Isaac', `person:${PERSON}:name`),
      phoneEnc: store.vault.seal(PHONE, `person:${PERSON}:phone`), shieldNumber: NUMBER });
    app = await buildCloudApp(store, { auth, checker });
  });
  afterEach(async () => { await app?.close(); app = undefined; });
  afterAll(async () => { await db.terminate(); await deleteApp(admin); });

  it('deletes a never-enrolled login without needing a participant or trusting a supplied UID', async () => {
    const h = { authorization: 'Bearer caregiver' };
    expect((await app!.inject({ url: '/api/account/deletion', headers: h })).json()).toMatchObject({ restorationRequired: false });
    expect((await app!.inject({ method: 'POST', url: '/api/account/delete', headers: h, payload: { uid: 'owner' } })).statusCode).toBe(200);
    now += 120_001; await processAccountDeletions(store, auth);
    expect(auth.deleteAccount).toHaveBeenCalledWith('caregiver');
    expect((await store.personRef(PERSON).get()).exists).toBe(true);
    expect((await app!.inject({ method: 'POST', url: '/api/account/delete' })).statusCode).toBe(401);
  });

  it('removes helper and trusted-contact access without deleting the other person or their calls', async () => {
    const call = await seedCall();
    await db.collection('grants').doc('shared-grant').set({ participantId: PERSON, granteeUid: 'caregiver', acceptedAt: now });
    await store.memberRef(PERSON, 'caregiver').set({ participantId: PERSON, granteeUid: 'caregiver', grantId: 'shared-grant' });
    await db.collection('alertContacts').doc('contact').set({ participantId: PERSON, ownerUid: 'owner', recipientUid: 'caregiver', status: 'accepted' });
    await db.collection('devices').doc('helper-device').set({ uid: 'caregiver' });
    await db.collection('devices').doc('owner-device').set({ uid: 'owner' });
    // Legacy participant selection is never interpreted as authority to delete someone else.
    expect((await app!.inject({ method: 'POST', url: '/api/account/delete', headers: headers('caregiver') })).statusCode).toBe(403);
    expect(auth.deleteAccount).not.toHaveBeenCalled();
    expect((await app!.inject({ method: 'POST', url: '/api/account/delete', headers: { authorization: 'Bearer caregiver' } })).statusCode).toBe(200);
    now += 120_001; await processAccountDeletions(store, auth);
    expect((await db.collection('grants').get()).empty).toBe(true);
    expect((await db.collection('memberships').get()).empty).toBe(true);
    expect((await db.collection('alertContacts').get()).empty).toBe(true);
    expect((await db.collection('devices').doc('helper-device').get()).exists).toBe(false);
    expect((await db.collection('devices').doc('owner-device').get()).exists).toBe(true);
    expect((await store.callRef(call).get()).exists).toBe(true);
    expect((await store.personRef(PERSON).get()).exists).toBe(true);
  });

  it('checks every owned phone before erasure, preserving all data if one still forwards', async () => {
    const second = randomUUID();
    await store.personRef(second).set({ id: second, ownerUid: 'owner', status: 'active', forwardingConsent: 'existing-consent' });
    expect((await app!.inject({ url: '/api/account/deletion', headers: { authorization: 'Bearer owner' } })).json()).toMatchObject({ restorationRequired: true });
    expect((await app!.inject({ method: 'POST', url: '/api/account/delete', headers: headers() })).statusCode).toBe(409);
    expect((await store.personRef(PERSON).get()).data()?.status).toBe('setup');
    expect((await store.personRef(second).get()).exists).toBe(true);
    expect(auth.deleteAccount).not.toHaveBeenCalled();
  });

  it('erases unaccepted requests to a verified number without taking over a recycled number’s old relationships', async () => {
    const phone = '+12025550102', hash = contactPhoneHash(store, phone);
    await db.collection('alertContacts').doc('pending').set({ phoneHash: hash, recipientUid: null, ownerUid: 'owner', participantId: PERSON });
    await db.collection('alertContacts').doc('old-account').set({ phoneHash: hash, recipientUid: 'other-owner', ownerUid: 'owner', participantId: PERSON });
    await deleteAccount(store, auth, { subject: 'caregiver', verifiedPhone: phone });
    expect((await db.collection('alertContacts').doc('pending').get()).exists).toBe(false);
    expect((await db.collection('alertContacts').doc('old-account').get()).exists).toBe(true);
    expect((await store.personRef(PERSON).get()).exists).toBe(true);
  });

  it('erases owned data in pages, preserves provider erasure jobs and retries identity deletion safely', async () => {
    const call = await seedCall(), second = randomUUID();
    await store.personRef(second).set({ id: second, ownerUid: 'owner', status: 'setup' });
    await db.collection('grants').doc('pending-grant').set({ participantId: PERSON, granteeUid: null });
    await db.collection('inviteKeys').doc('invite').set({ grantId: 'pending-grant' });
    await db.collection('voicemailChecks').doc(call).set({ callId: call });
    await db.collection('monitoredCalls').doc(call).set({ callId: call, transcriptEnc: 'synthetic-encrypted-text' });
    await db.collection('forwardingRecordings').doc('pending-provider-erasure').set({ participantId: PERSON, callId: call, status: 'pending' });
    await db.collection('smsOptOuts').doc('minimal-stop-hash').set({ stopped: true });
    for (let offset = 0; offset < 501; offset += 200) {
      const batch = db.batch();
      for (let n = offset; n < Math.min(offset + 200, 501); n++) batch.set(db.collection('devices').doc(`device-${n}`), { uid: 'owner' });
      await batch.commit();
    }
    vi.mocked(auth.deleteAccount).mockRejectedValueOnce(new HttpError(503, 'account_deletion_unavailable'));
    const h = { authorization: 'Bearer owner' };
    const first = await app!.inject({ method: 'POST', url: '/api/account/delete', headers: h });
    expect(first.statusCode).toBe(200);
    const receipt = first.json().receipt;
    now += 120_001;
    expect(await processAccountDeletions(store, auth)).toEqual({ completed: 0, failed: 1 });
    for (const collection of ['participants', 'callSessions', 'grants', 'inviteKeys', 'voicemailChecks', 'monitoredCalls', 'devices']) {
      expect((await db.collection(collection).get()).empty).toBe(true);
    }
    expect((await db.collection('forwardingRecordings').doc('pending-provider-erasure').get()).exists).toBe(true);
    expect((await db.collection('smsOptOuts').doc('minimal-stop-hash').get()).exists).toBe(true);
    expect((await app!.inject({ method: 'POST', url: '/api/account/delete', headers: h })).statusCode).toBe(200);
    now += 60_001;
    expect(await processAccountDeletions(store, auth)).toEqual({ completed: 1, failed: 0 });
    expect(auth.deleteAccount).toHaveBeenCalledTimes(2);
    expect((await app!.inject({ method: 'POST', url: '/api/account/deletion/receipt', payload: { receipt } })).json()).toEqual({ state: 'complete' });
    expect((await deletionRef(store, 'owner').get()).data()?.uidEnc).toBeUndefined();
  });

  it('persists an idempotent deletion receipt, fences writes, and waits for in-flight work before erasure', async () => {
    const h = { authorization: 'Bearer owner' }, receipt = 'a'.repeat(64);
    const first = await app!.inject({ method: 'POST', url: '/api/account/delete', headers: h, payload: { receipt } });
    expect(first.json().receipt).toBe(receipt);
    const retry = await app!.inject({ method: 'POST', url: '/api/account/delete', headers: h, payload: { receipt: 'b'.repeat(64) } });
    expect(retry.json().receipt).toBe(receipt);
    expect((await app!.inject({ method: 'POST', url: '/api/trusted-numbers/sync', headers: headers(), payload: { contacts: [] } })).statusCode).toBe(409);
    await processAccountDeletions(store, auth);
    expect(auth.deleteAccount).not.toHaveBeenCalled();
    expect((await app!.inject({ method: 'POST', url: '/api/account/deletion/receipt', payload: { receipt } })).json()).toEqual({ state: 'pending' });
    expect((await app!.inject({ method: 'POST', url: '/api/account/deletion/receipt', payload: { receipt: 'c'.repeat(64) } })).statusCode).toBe(404);
    now += 120_001; await processAccountDeletions(store, auth);
    expect(auth.deleteAccount).toHaveBeenCalledWith('owner');
    expect((await app!.inject({ method: 'POST', url: '/api/account/deletion/receipt', payload: { receipt } })).json()).toEqual({ state: 'complete' });
  });

  it('shares only phone-list fields, deduplicates numbers and restricts the operation to the owner', async () => {
    const payload = { contacts: [{ label: 'Mom', phone: '(312) 555-0148' }, { label: 'Same number', phone: '+13125550148' }, { label: 'Incomplete', phone: '123' }] };
    expect((await app!.inject({ method: 'POST', url: '/api/trusted-numbers/sync', headers: headers('stranger'), payload })).statusCode).toBe(403);
    const synced = await app!.inject({ method: 'POST', url: '/api/trusted-numbers/sync', headers: headers(), payload });
    expect(synced.json()).toEqual({ shared: 1, skipped: 1 });
    expect((await store.personRef(PERSON).get()).data()).toMatchObject({ contactsSyncedAt: now, contactsSyncUntil: 0 });
    const saved = (await store.personRef(PERSON).collection('trusted-numbers').get()).docs;
    expect(saved).toHaveLength(1); expect(saved[0]!.data().phoneEnc).not.toContain('3125550148');
    const list = (await app!.inject({ url: '/api/trusted-numbers', headers: headers() })).json();
    expect(list.items[0]).toMatchObject({ label: 'Mom', phone: '+13125550148', enabled: true });
    expect(list.sharedAt).toBe(new Date(now).toISOString());
    expect((await app!.inject({ method: 'POST', url: '/api/trusted-numbers/sync', headers: headers(), payload: { contacts: [], photos: ['unexpected'] } })).statusCode).toBe(400);
  });
  it('can remove and restore a number without losing its original list identity', async () => {
    const sync = (contacts: {label: string; phone: string}[]) => app!.inject({ method: 'POST', url: '/api/trusted-numbers/sync', headers: headers(), payload: { contacts } });
    const entry = { label: 'Mom', phone: '+13125550148' };
    await sync([entry]);
    let list = (await app!.inject({ url: '/api/trusted-numbers', headers: headers() })).json(); const id = list.items[0].id;
    await sync([]);
    list = (await app!.inject({ url: '/api/trusted-numbers', headers: headers() })).json(); expect(list.items[0]).toMatchObject({ id, enabled: false });
    expect((await app!.inject({ method: 'PATCH', url: `/api/trusted-numbers/${id}`, headers: headers('stranger'), payload: { enabled: true } })).statusCode).toBe(403);
    await sync([entry]);
    list = (await app!.inject({ url: '/api/trusted-numbers', headers: headers() })).json(); expect(list.items).toHaveLength(1); expect(list.items[0]).toMatchObject({ id, enabled: true });
    await store.personRef(PERSON).update({ contactsSyncUntil: now + 60_000, contactsSyncToken: 'other' });
    expect((await sync([entry])).statusCode).toBe(409);
  });

  it('adds only the selected contact, retries safely and restores its original identity without replacing the calling list', async () => {
    const save = (label: string, phone = '+13125550148', token = 'owner') => app!.inject({ method: 'POST', url: '/api/trusted-numbers', headers: headers(token), payload: { label, phone } });
    expect((await save('Clinic', undefined, 'stranger')).statusCode).toBe(403);
    const first = await save('Clinic'); expect(first.statusCode).toBe(200);
    expect((await save('Clinic')).json().id).toBe(first.json().id);
    const second = await save('Neighbour', '+13125550149'); expect(second.statusCode).toBe(200);
    await app!.inject({ method: 'PATCH', url: `/api/trusted-numbers/${first.json().id}`, headers: headers(), payload: { enabled: false } });
    expect((await save('My clinic')).json().id).toBe(first.json().id);
    const list = (await app!.inject({ url: '/api/trusted-numbers', headers: headers() })).json();
    expect(list.sharedAt).toBeNull(); // Adding one person never claims the address book was shared.
    expect(list.items).toHaveLength(2);
    expect(list.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: first.json().id, label: 'My clinic', enabled: true }),
      expect.objectContaining({ id: second.json().id, label: 'Neighbour', enabled: true })
    ]));
  });

  it('fences individual contact additions, restorations and deletions while a full share owns the list', async () => {
    const payload = { label: 'Clinic', phone: '+13125550148' };
    const { id } = (await app!.inject({ method: 'POST', url: '/api/trusted-numbers', headers: headers(), payload })).json();
    await store.personRef(PERSON).update({ contactsSyncUntil: now + 60_000, contactsSyncToken: 'other' });
    for (const request of [
      { method: 'POST' as const, url: '/api/trusted-numbers', payload },
      { method: 'POST' as const, url: '/api/trusted-numbers', payload: { label: 'Neighbour', phone: '+13125550149' } },
      { method: 'PATCH' as const, url: `/api/trusted-numbers/${id}`, payload: { enabled: false } },
      { method: 'DELETE' as const, url: `/api/trusted-numbers/${id}` }
    ]) expect((await app!.inject({ ...request, headers: headers() })).json().error.code).toBe('contacts_sync_busy');
    expect((await store.personRef(PERSON).collection('trusted-numbers').get()).size).toBe(1);
  });

  it('restricts history and checks to an owner or accepted caregiver', async () => {
    const id = await seedCall();
    expect((await app!.inject({ url: '/api/overview' })).statusCode).toBe(401);
    expect((await app!.inject({ url: `/api/calls/${id}`, headers: headers('stranger') })).statusCode).toBe(403);
    const result = await app!.inject({ url: `/api/calls/${id}`, headers: headers() }); expect(result.statusCode).toBe(200);
    expect(result.json().call.id).toBe(id); expect(result.json().call.voicemail).toBeNull();
    const native = await app!.inject({ url: `/api/calls/${id.toUpperCase()}`, headers: {
      authorization: 'Bearer owner', 'x-shield-participant': PERSON.toUpperCase() } });
    expect(native.statusCode).toBe(200); expect(native.json().call.id).toBe(id);
  });
  it('accepts invitations once and enforces immediate revocation and owner-only writes', async () => {
    const created = await app!.inject({ method: 'POST', url: '/api/sharing', headers: headers(), payload: { label: 'Family', canListen: false, consent: true } });
    expect(created.statusCode).toBe(200); const { id, code } = created.json();
    const replies = await Promise.all(['caregiver', 'stranger'].map(token => app!.inject({ method: 'POST', url: '/api/sharing/accept', headers: headers(token), payload: { code } })));
    expect(replies.filter(reply => reply.statusCode === 200)).toHaveLength(1);
    const winner = replies[0]!.statusCode === 200 ? 'caregiver' : 'stranger';
    expect((await app!.inject({ url: '/api/overview', headers: headers(winner) })).statusCode).toBe(200);
    expect((await app!.inject({ method: 'POST', url: '/api/setup/pause', headers: headers(winner), payload: { paused: true } })).statusCode).toBe(403);
    expect((await app!.inject({ method: 'DELETE', url: `/api/sharing/${id}`, headers: headers() })).statusCode).toBe(200);
    expect((await app!.inject({ url: '/api/overview', headers: headers(winner) })).statusCode).toBe(403);
  });
  it('matches iOS contacts and pagination DTOs without leaking expired history', async () => {
    expect((await app!.inject({ method: 'POST', url: '/api/destinations', headers: headers(), payload: { label: 'Clinic', phone: '+13125550148', provenance: 'card' } })).statusCode).toBe(200);
    const contacts = (await app!.inject({ url: '/api/destinations', headers: headers() })).json();
    expect(contacts.items[0]).toMatchObject({ label: 'Clinic', phone: '+13125550148', provenance: 'card' }); expect(contacts.items[0].createdAt).toBeTypeOf('string');
    const id = await seedCall(); now += 31 * 86400_000;
    expect((await app!.inject({ url: '/api/calls', headers: headers() })).json().calls).toEqual([]);
    expect((await app!.inject({ url: `/api/calls/${id}`, headers: headers() })).statusCode).toBe(404);
    await store.cleanup(); expect((await store.callRef(id).get()).exists).toBe(false);
  });
  it('preserves the total beyond seven days and cleanup, without duplicate backfills or another person’s calls', async () => {
    const id = await seedCall();
    await store.callRef(id).update({ createdAt: now - 20 * 86400_000 });
    const other = await seedCall(); await store.callRef(other).update({ participantId: randomUUID() });
    const totals = await Promise.all([stoppedTotal(store, PERSON), stoppedTotal(store, PERSON)]);
    expect(totals).toEqual([1, 1]);
    const overview = (await app!.inject({ url: '/api/overview', headers: headers() })).json();
    expect(overview.counts).toMatchObject({ held: 0, stoppedTotal: 1 });
    now += 31 * 86400_000;
    await store.cleanup();
    expect((await store.callRef(id).get()).exists).toBe(false);
    expect(await stoppedTotal(store, PERSON)).toBe(1);
    expect((await app!.inject({ method: 'POST', url: '/api/account/delete', headers: headers() })).statusCode).toBe(200);
    await expect(stoppedTotal(store, PERSON)).rejects.toMatchObject({ statusCode: 403 });
    now += 120_001; await processAccountDeletions(store, auth);
    expect((await store.personRef(PERSON).collection('statistics').get()).empty).toBe(true);
  });
  it('backfills multiple pages and seeds expired history before its first cleanup', async () => {
    const batch = db.batch();
    for (let n = 0; n < 205; n++) {
      const id = randomUUID();
      batch.set(store.callRef(id), { id, participantId: PERSON, createdAt: now - 31 * 86400_000,
        expiresAt: now - 1, outcome: n % 2 ? 'verification' : 'held', events: [] });
    }
    await batch.commit();
    await store.cleanup();
    expect((await db.collection('callSessions').get()).empty).toBe(true);
    expect(await stoppedTotal(store, PERSON)).toBe(205);
    expect(await stoppedTotal(store, PERSON)).toBe(205);
  });
  it('commits quota groups atomically under contention', async () => {
    const outcomes = await Promise.allSettled(Array.from({ length: 8 }, () => store.quota([['paid-global', 3], ['paid-owner', 5]])));
    expect(outcomes.filter(value => value.status === 'fulfilled')).toHaveLength(3);
    expect((await db.collection('usage').get()).docs.map(doc => doc.data().used).sort()).toEqual([3, 3]);
  });  it('checks pasted text only with consent, without storing it, and never claims a sender is genuine', async () => {
    const payload = { text: 'Your dentist appointment is tomorrow at 3.', analysisConsent: true };
    expect((await app!.inject({ method: 'POST', url: '/api/check', payload })).statusCode).toBe(401);
    expect((await app!.inject({ method: 'POST', url: '/api/check', headers: headers(), payload: { text: payload.text } })).statusCode).toBe(400);
    const result = await app!.inject({ method: 'POST', url: '/api/check', headers: headers(), payload });
    expect(result.json()).toMatchObject({ decision: 'offer', reasonCode: 'routine', title: 'Check independently' });
    expect(result.json().detail).toContain('does not establish who sent');
    expect(checked).toEqual([payload.text]);
    expect(JSON.stringify((await db.collection('callSessions').get()).docs.map(d => d.data()))).not.toContain('dentist');
  });
  it('reports the Telnyx number in setup and no longer reports a direct-call trial window', async () => {
    const setup = (await app!.inject({ url: '/api/setup', headers: headers() })).json();
    expect(setup).toMatchObject({ shieldNumber: NUMBER, trial: null });
  });
});
