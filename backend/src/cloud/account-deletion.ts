import type { Query } from 'firebase-admin/firestore';
import { HttpError, type AuthProvider, type Identity } from '../auth.js';
import type { CloudStore } from './store.js';
import { contactPhoneHash } from './trusted-contacts.js';
import { ServiceAccess } from './service-access.js';

/** Account-wide deletion; selecting a shared person must never delete that person's account. */
export async function deleteAccount(store: CloudStore, auth: AuthProvider, identity: Identity, selected?: string, rememberedIds: string[] = [], serviceAccess = new ServiceAccess(store)) {
  const uid = identity.subject;
  // Fence the owned participants before any destructive work. Retain forwarding's existing
  // restoration guard until a verified offboarding flow can safely replace it.
  const people = await store.db.runTransaction(async tx => {
    const owned = await tx.get(store.db.collection('participants').where('ownerUid', '==', uid));
    const target = selected ? await tx.get(store.personRef(selected)) : undefined;
    // An already-erased selected profile must not prevent retrying a failed Auth deletion.
    if (target?.exists && target.data()?.ownerUid !== uid) throw new HttpError(403, 'owner_required');
    if (owned.docs.some(doc => doc.data().forwardingConsent)) throw new HttpError(409, 'restore_forwarding_before_deletion');
    for (const doc of owned.docs) tx.update(doc.ref, { status: 'offboarded' });
    return [...new Set([...owned.docs.map(d => d.id), ...rememberedIds])].map(id => store.personRef(id));
  });
  const remove = async (query: Query) => {
    // Bounded batches, including accounts with more than 500 historical records.
    for (;;) {
      const page = await query.limit(200).get();
      if (page.empty) return;
      const batch = store.db.batch();
      page.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
  };
  const removeGrants = async (query: Query) => {
    for (;;) {
      const page = await query.limit(200).get();
      if (page.empty) return;
      for (const grant of page.docs) {
        await remove(store.db.collection('inviteKeys').where('grantId', '==', grant.id));
        await remove(store.db.collection('memberships').where('grantId', '==', grant.id));
        await grant.ref.delete();
      }
    }
  };
  for (const person of people) {
    await removeGrants(store.db.collection('grants').where('participantId', '==', person.id));
    await remove(store.db.collectionGroup('routes').where('participantId', '==', person.id));
    // Older worker jobs are keyed by call ID but have no participantId.
    const calls = await store.db.collection('callSessions').where('participantId', '==', person.id).select().get();
    for (const call of calls.docs) {
      const batch = store.db.batch();
      for (const collection of ['voicemailChecks', 'monitoredCalls', 'monitorChecks']) batch.delete(store.db.collection(collection).doc(call.id));
      await batch.commit();
      for (const collection of ['callKeys', 'callControlJobs', 'callControlDeadlines', 'callControlCommands']) {
        await remove(store.db.collection(collection).where('callId', '==', call.id));
      }
    }
    for (const collection of ['callSessions', 'memberships', 'alertContacts', 'alertDeliveries', 'alerts',
      'forwardingAudio', 'forwardingAudioChunks', 'voicemailChecks', 'monitoredCalls', 'monitorChecks', 'forwardingProbes', 'setupChecks']) {
      await remove(store.db.collection(collection).where('participantId', '==', person.id));
    }
    // Keep provider recording-deletion jobs: workers must still erase Telnyx copies.
    // Missing/offboarded participants prevent those jobs from recreating saved audio.
    await store.db.recursiveDelete(person);
  }
  await removeGrants(store.db.collection('grants').where('granteeUid', '==', uid));
  await remove(store.db.collection('memberships').where('granteeUid', '==', uid));
  await remove(store.db.collection('alertContacts').where('ownerUid', '==', uid));
  await remove(store.db.collection('alertContacts').where('recipientUid', '==', uid));
  if (identity.verifiedPhone) {
    // Include pending requests that haven't yet been bound to an account.
    await remove(store.db.collection('alertContacts').where('phoneHash', '==', contactPhoneHash(store, identity.verifiedPhone)).where('recipientUid', '==', null));
  }
  await remove(store.db.collection('alertDeliveries').where('recipientUid', '==', uid));
  await remove(store.db.collection('devices').where('uid', '==', uid));
  // Account deletion is separate from cancelling an Apple subscription; the UI explains this.
  // Keep the durable deletion job retryable until RevenueCat has erased the customer profile.
  await serviceAccess.erase(uid);
  // Last: a transient identity-provider failure leaves the caller able to retry cleanup.
  // Minimal SMS STOP hashes and short-lived abuse counters retain their existing policies.
  await auth.deleteAccount(uid);
  return { deleted: true };
}
