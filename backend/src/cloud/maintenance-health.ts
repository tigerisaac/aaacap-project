import type { CloudStore } from './store.js';
import { MESSAGE_DELIVERY_MS } from './message-audio.js';

// Fixed document IDs and bounded timestamps only. These records contain no customer identifiers.
export const MAINTENANCE_FRESHNESS_MS = {
  cleanupShield: 26 * 3600_000, // Includes the 25-hour day at the end of daylight saving time.
  finishAccountDeletions: 10 * 60_000,
  reviewServiceAccess: 90 * 60_000,
  expireMessageDeliveries: 20 * 60_000
} as const;
export type MaintenanceJob = keyof typeof MAINTENANCE_FRESHNESS_MS;
type Result = { failed?: number } | void;
type Status = 'complete' | 'incomplete' | 'failed';
type JobState = 'fresh' | 'missing' | 'stale' | 'incomplete' | 'failed' | 'invalid';
const healthRef = (store: CloudStore, job: MaintenanceJob) => store.db.collection('backgroundJobHealth').doc(job);

function emit(record: Record<string, unknown>) {
  try {
    const line = JSON.stringify(record);
    if (record.severity === 'ERROR') console.error(line); else console.info(line);
  } catch { /* A logging failure must not cause an otherwise successful customer operation to repeat. */ }
}

/** Record completion only after work settles; preserve the latest run when invocations overlap. */
export async function runMaintenanceJob(job: MaintenanceJob, getStore: () => CloudStore,
  work: (store: CloudStore) => Promise<Result>): Promise<void> {
  let store: CloudStore;
  try { store = getStore(); }
  catch {
    emit({ severity: 'ERROR', event: 'shield_maintenance_result', job, status: 'failed', category: 'initialization_failed' });
    throw new Error('scheduled_work_initialization_failed');
  }
  const startedAt = store.now();
  let status: Status = 'complete';
  try {
    const result = await work(store);
    if (result?.failed !== undefined && (!Number.isSafeInteger(result.failed) || result.failed < 0)) status = 'failed';
    else if (result?.failed) status = 'incomplete';
  } catch { status = 'failed'; }
  try {
    const ref = healthRef(store, job), finishedAt = store.now();
    await store.db.runTransaction(async tx => {
      const previous = (await tx.get(ref)).data();
      if (typeof previous?.startedAt === 'number' && previous.startedAt > startedAt) return;
      // Use the run's start time, so a very late completion cannot conceal stale work.
      const lastSucceededAt = status === 'complete' ? startedAt : previous?.lastSucceededAt ?? null;
      tx.set(ref, { startedAt, finishedAt, status, lastSucceededAt });
    });
  } catch {
    emit({ severity: 'ERROR', event: 'shield_maintenance_result', job, status: 'failed', category: 'completion_record_failed' });
    throw new Error('scheduled_work_completion_record_failed');
  }
  emit({ severity: status === 'complete' ? 'INFO' : 'ERROR', event: 'shield_maintenance_result', job, status });
  // Scheduler must not acknowledge a batch with caught item failures as successful.
  // Durable jobs retain their existing retry times; this does not redial a phone.
  if (status !== 'complete') throw new Error(status === 'incomplete' ? 'scheduled_work_incomplete' : 'scheduled_work_failed');
}

/** Read-only aggregates. A completed batch does not imply that all queued work has finished. */
export async function inspectMaintenanceHealth(store: CloudStore) {
  const now = store.now(), grace = 15 * 60_000;
  const jobs = Object.keys(MAINTENANCE_FRESHNESS_MS) as MaintenanceJob[];
  const docs = await store.db.getAll(...jobs.map(job => healthRef(store, job)));
  const jobStates = Object.fromEntries(jobs.map((job, index): [MaintenanceJob, JobState] => {
    const data = docs[index]!.data();
    if (!data) return [job, 'missing'];
    if (data.status === 'failed' || data.status === 'incomplete') return [job, data.status];
    if (data.status !== 'complete' || !Number.isSafeInteger(data.lastSucceededAt) || data.lastSucceededAt < 0 || data.lastSucceededAt > now) return [job, 'invalid'];
    return [job, now - data.lastSucceededAt > MAINTENANCE_FRESHNESS_MS[job] ? 'stale' : 'fresh'];
  })) as Record<MaintenanceJob, JobState>;
  const queries = {
    // createdAt is immutable: advancing a retry's dueAt must not reset the age of a deletion request.
    accountDeletions: store.db.collection('accountDeletions').where('state', '==', 'pending').where('createdAt', '<=', now - grace),
    audioManifests: store.db.collection('forwardingAudio').where('expiresAt', '<=', now - grace),
    audioChunks: store.db.collection('forwardingAudioChunks').where('expiresAt', '<=', now - grace),
    providerRecordings: store.db.collection('forwardingRecordings').where('status', 'in', ['pending', 'stored'])
      .where('createdAt', '<=', now - MESSAGE_DELIVERY_MS - grace),
    callDeadlines: store.db.collection('callControlDeadlines').where('dueAt', '<=', now - 5 * 60_000),
    monitoringChecks: store.db.collection('monitorChecks').where('dueAt', '<=', now - 5 * 60_000)
  };
  const names = Object.keys(queries) as (keyof typeof queries)[];
  const counts = await Promise.all(names.map(async name => {
    const count = (await queries[name].count().get()).data().count;
    if (!Number.isSafeInteger(count) || count < 0) throw new Error('invalid_background_aggregate');
    return count;
  }));
  const overdue = Object.fromEntries(names.map((name, i) => [name, counts[i]!])) as Record<keyof typeof queries, number>;
  return { healthy: Object.values(jobStates).every(state => state === 'fresh') && counts.every(count => count === 0), jobStates, overdue };
}

export async function checkMaintenanceHealth(getStore: () => CloudStore) {
  try {
    const result = await inspectMaintenanceHealth(getStore());
    emit({ severity: result.healthy ? 'INFO' : 'ERROR', event: 'shield_maintenance_health', available: true, ...result });
    return result;
  } catch {
    emit({ severity: 'ERROR', event: 'shield_maintenance_health', available: false, healthy: false });
    // Never expose raw Firestore, runtime configuration or provider errors to platform logs.
    throw new Error('background_health_unavailable');
  }
}
