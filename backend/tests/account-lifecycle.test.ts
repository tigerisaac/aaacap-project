import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { type Firestore } from 'firebase-admin/firestore';
import { getShieldFirestore } from '../src/cloud/firestore.js';
import { FirebaseAuth } from '../src/firebase-auth.js';
import { buildCloudApp } from '../src/cloud/app.js';
import { cloudSchema } from '../src/cloud/config.js';
import { CloudStore } from '../src/cloud/store.js';
import { deletionRef, processAccountDeletions } from '../src/cloud/deletion-jobs.js';
import { contactPhoneHash } from '../src/cloud/trusted-contacts.js';

const enabled = process.env.SHIELD_ACCOUNT_EMULATOR_TESTS === '1';
const project = 'demo-shield-accounts';
const phone = '+12025550101', otherPhone = '+12025550102';
type Session = { uid: string; token: string; refresh: string };

// Actual Firebase Auth and Firestore emulators. No Firebase identity methods are
// mocked, except the deliberately lost delete response in its retry test.
describe.skipIf(!enabled)('Account lifecycle with Firebase Auth and Firestore emulators', () => {
  const config = cloudSchema.parse({ FIREBASE_PROJECT_ID: project, FIREBASE_WEB_API_KEY: 'emulator-only',
    TRIAL_PROXY_SECRET: 'c'.repeat(64), DATA_ENCRYPTION_KEY: 'd'.repeat(64),
    PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app',
    TELNYX_ACCOUNT_ID: 'fe8d2922-2dcf-4461-87bc-17a539688c31', TELNYX_API_KEY: 'test'.repeat(8),
    TELNYX_PUBLIC_KEY: `${'A'.repeat(43)}=`, TELNYX_APPLICATION_ID: '123456789012345678' });
  let admin: App, identityProvider: Auth, db: Firestore, auth: FirebaseAuth, store: CloudStore;
  let app: Awaited<ReturnType<typeof buildCloudApp>> | undefined;
  let now: number, current: Session, other: Session;
  let authHost: string, firestoreHost: string;

  // Only the injected test transport rewrites Google's REST endpoints. Production
  // FirebaseAuth stays unchanged and cannot acquire an emulator endpoint remotely.
  const localProvider: typeof fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (!['identitytoolkit.googleapis.com', 'securetoken.googleapis.com'].includes(url.hostname)) {
      throw new Error('Unexpected identity endpoint in local test');
    }
    return fetch(`http://${authHost}/${url.hostname}${url.pathname}${url.search}`, init);
  };

  beforeAll(() => {
    authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '';
    firestoreHost = process.env.FIRESTORE_EMULATOR_HOST ?? '';
    if (authHost !== '127.0.0.1:9199' || firestoreHost !== '127.0.0.1:8189'
        || process.env.GCLOUD_PROJECT !== project) throw new Error('Dedicated local demo emulators are required');
    admin = initializeApp({ projectId: project }, 'account-lifecycle-tests');
    identityProvider = getAuth(admin); db = getShieldFirestore(admin);
    auth = new FirebaseAuth(config, localProvider, identityProvider);
  });

  const signIn = async (number: string): Promise<Session> => {
    // The upstream phone verification boundary is synthetic; no SMS is requested.
    // The existing Firebase account lookup/create, custom-token exchange and ID
    // token/revocation checks all run against Firebase's emulator.
    const value = await auth.signInVerifiedPhone(number);
    const token = String(value.accessToken), refresh = String(value.refreshToken);
    return { uid: (await auth.identify(token)).subject, token, refresh };
  };
  const headers = (session = current) => ({ authorization: `Bearer ${session.token}` });
  const person = async (uid: string, number = phone) => {
    const id = randomUUID();
    await store.personRef(id).set({ id, ownerUid: uid, status: 'setup',
      nameEnc: store.vault.seal('Synthetic person', `person:${id}:name`),
      phoneEnc: store.vault.seal(number, `person:${id}:phone`) });
    return id;
  };
  const requestDeletion = async () => {
    // Client-supplied UIDs confer no authority over the other account.
    const response = await app!.inject({ method: 'POST', url: '/api/account/delete', headers: headers(), payload: { uid: other.uid } });
    expect(response.statusCode).toBe(200);
    const receipt: unknown = response.json().receipt;
    if (typeof receipt !== 'string' || !/^[a-f0-9]{64}$/.test(receipt)) throw new Error('Missing deletion receipt');
    return receipt;
  };
  const receiptState = async (receipt: string) => {
    const response = await app!.inject({ method: 'POST', url: '/api/account/deletion/receipt', payload: { receipt } });
    expect(response.statusCode).toBe(200);
    return response.json().state;
  };
  const expectOldSessionsRejected = async (session: Session) => {
    expect((await app!.inject({ url: '/api/people', headers: headers(session) })).statusCode).toBe(401);
    expect((await app!.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken: session.refresh } })).statusCode).toBe(401);
    await expect(identityProvider.getUser(session.uid)).rejects.toMatchObject({ code: 'auth/user-not-found' });
  };

  beforeEach(async () => {
    for (const url of [
      `http://${authHost}/emulator/v1/projects/${project}/accounts`,
      `http://${firestoreHost}/emulator/v1/projects/${project}/databases/(default)/documents`,
    ]) {
      const response = await fetch(url, { method: 'DELETE' });
      if (!response.ok) throw new Error('Local demo reset failed');
    }
    now = Date.now(); store = new CloudStore(db, config, () => now);
    current = await signIn(phone); other = await signIn(otherPhone);
    app = await buildCloudApp(store, { auth,
      checker: { async extract() { throw new Error('No model call is allowed in identity lifecycle tests'); } } });
  });
  afterEach(async () => { await app?.close(); app = undefined; });
  afterAll(async () => { await db?.terminate(); if (admin) await deleteApp(admin); });

  it.each(['never-enrolled', 'helper', 'alert-only', 'owner', 'multiple-owned-phones'] as const)(
    'erases the %s account and its sessions while preserving other people', async role => {
      const otherPerson = await person(other.uid, otherPhone), otherCall = randomUUID();
      await store.callRef(otherCall).set({ participantId: otherPerson, marker: 'other-person-history' });
      const owned = role === 'owner' ? [await person(current.uid)] : role === 'multiple-owned-phones'
        ? [await person(current.uid), await person(current.uid)] : [];
      for (const id of owned) {
        await store.personRef(id).collection('trusted-numbers').doc('saved').set({ marker: 'private-contact' });
        await store.callRef(randomUUID()).set({ participantId: id, marker: 'owned-history' });
      }
      if (role === 'helper') {
        await db.collection('grants').doc('history-grant').set({ participantId: otherPerson, granteeUid: current.uid });
        await store.memberRef(otherPerson, current.uid).set({ participantId: otherPerson, granteeUid: current.uid, grantId: 'history-grant' });
        const wrong = await app!.inject({ method: 'POST', url: '/api/account/delete',
          headers: { ...headers(), 'x-shield-participant': otherPerson } });
        expect(wrong.statusCode).toBe(403);
      }
      if (role === 'alert-only' || role === 'helper') {
        await db.collection('alertContacts').doc('accepted').set({ participantId: otherPerson, ownerUid: other.uid, recipientUid: current.uid });
        await db.collection('alertContacts').doc('pending').set({ participantId: otherPerson, ownerUid: other.uid,
          recipientUid: null, phoneHash: contactPhoneHash(store, phone) });
        await db.collection('alertDeliveries').doc('queued').set({ recipientUid: current.uid });
      }
      await db.collection('devices').doc('this-phone').set({ uid: current.uid });
      await db.collection('devices').doc('second-phone').set({ uid: current.uid });
      await db.collection('devices').doc('other-phone').set({ uid: other.uid });

      const receipt = await requestDeletion();
      expect(await receiptState(receipt)).toBe('pending');
      expect((await app!.inject({ url: '/api/people', headers: headers() })).statusCode).toBe(409);
      await processAccountDeletions(store, auth);
      expect((await identityProvider.getUser(current.uid)).uid).toBe(current.uid);
      now += 120_001;
      await Promise.all([processAccountDeletions(store, auth), processAccountDeletions(store, auth)]);
      expect(await receiptState(receipt)).toBe('complete');
      await expectOldSessionsRejected(current);
      expect((await db.collection('participants').where('ownerUid', '==', current.uid).get()).empty).toBe(true);
      expect((await db.collection('devices').where('uid', '==', current.uid).get()).empty).toBe(true);
      expect((await db.collection('grants').where('granteeUid', '==', current.uid).get()).empty).toBe(true);
      expect((await db.collection('memberships').where('granteeUid', '==', current.uid).get()).empty).toBe(true);
      expect((await db.collection('alertContacts').get()).empty).toBe(true);
      expect((await db.collection('alertDeliveries').where('recipientUid', '==', current.uid).get()).empty).toBe(true);
      for (const id of owned) {
        expect((await store.personRef(id).collection('trusted-numbers').get()).empty).toBe(true);
        expect((await db.collection('callSessions').where('participantId', '==', id).get()).empty).toBe(true);
      }
      expect((await identityProvider.getUser(other.uid)).uid).toBe(other.uid);
      expect((await store.personRef(otherPerson).get()).exists).toBe(true);
      expect((await store.callRef(otherCall).get()).data()?.marker).toBe('other-person-history');
      expect((await db.collection('devices').doc('other-phone').get()).exists).toBe(true);
      expect((await app!.inject({ url: '/api/people', headers: headers(other) })).statusCode).toBe(200);
    });

  it('rejects deletion when any owned phone still forwards, without deleting the identity or another phone', async () => {
    const first = await person(current.uid), second = await person(current.uid);
    await store.personRef(second).update({ forwardingConsent: 'synthetic-existing-consent', alwaysOn: true });
    const response = await app!.inject({ method: 'POST', url: '/api/account/delete',
      headers: { ...headers(), 'x-shield-participant': first } });
    expect(response.statusCode).toBe(409);
    expect((await deletionRef(store, current.uid).get()).exists).toBe(false);
    await processAccountDeletions(store, auth);
    expect((await identityProvider.getUser(current.uid)).uid).toBe(current.uid);
    expect((await store.personRef(first).get()).data()?.status).toBe('setup');
    expect((await store.personRef(second).get()).data()?.alwaysOn).toBe(true);
    expect((await app!.inject({ url: '/api/people', headers: headers() })).statusCode).toBe(200);
  });

  it('finishes from the receipt after Firebase deleted the user but its response was lost', async () => {
    await person(current.uid);
    const receipt = await requestDeletion();
    let loseResponse = true;
    const uncertainAuth = new FirebaseAuth(config, localProvider, {
      verifyIdToken: identityProvider.verifyIdToken.bind(identityProvider),
      revokeRefreshTokens: identityProvider.revokeRefreshTokens.bind(identityProvider),
      async deleteUser(uid) {
        await identityProvider.deleteUser(uid);
        if (loseResponse) { loseResponse = false; throw new Error('Synthetic lost response after emulator deletion'); }
      },
    });
    now += 120_001; await processAccountDeletions(store, uncertainAuth);
    await expectOldSessionsRejected(current);
    expect(await receiptState(receipt)).toBe('pending');
    now += 60_001; await processAccountDeletions(store, uncertainAuth);
    expect(await receiptState(receipt)).toBe('complete');
    const record = (await deletionRef(store, current.uid).get()).data()!;
    expect(record.uidEnc).toBeUndefined(); expect(record.phoneEnc).toBeUndefined();
    expect(record.participantIds).toBeUndefined();
  });

  it('recreates the same verified phone as a new identity without restoring deleted access or history', async () => {
    const oldPerson = await person(current.uid), old = current;
    const receipt = await requestDeletion();
    now += 120_001; await processAccountDeletions(store, auth);
    expect(await receiptState(receipt)).toBe('complete');
    const replacement = await signIn(phone);
    expect(replacement.uid).not.toBe(old.uid);
    const people = await app!.inject({ url: '/api/people', headers: headers(replacement) });
    expect(people.statusCode).toBe(200); expect(people.json().people).toEqual([]);
    expect((await app!.inject({ url: '/api/calls', headers: { ...headers(replacement), 'x-shield-participant': oldPerson } })).statusCode).toBe(403);
    await expectOldSessionsRejected(old);
    expect(await receiptState(receipt)).toBe('complete');
  });
});
