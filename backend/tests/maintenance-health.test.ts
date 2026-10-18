import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { CloudStore } from '../src/cloud/store.js';
import { cloudSchema } from '../src/cloud/config.js';
import { checkMaintenanceHealth, inspectMaintenanceHealth, MAINTENANCE_FRESHNESS_MS, runMaintenanceJob } from '../src/cloud/maintenance-health.js';

const config = cloudSchema.parse({ FIREBASE_WEB_API_KEY: 'synthetic', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app',
  TRIAL_PROXY_SECRET: 'c'.repeat(64), DATA_ENCRYPTION_KEY: 'd'.repeat(64),
  TELNYX_ACCOUNT_ID: 'ab443d1b-a90e-4a11-a627-d8baac281da9', TELNYX_API_KEY: 'test'.repeat(8),
  TELNYX_PUBLIC_KEY: Buffer.alloc(32).toString('base64'), TELNYX_APPLICATION_ID: '123456789012345678' });

describe('scheduled completion and failure privacy', () => {
  let now: number, record: Record<string, unknown> | undefined, store: CloudStore;
  let transactionFails: boolean;
  const info = vi.spyOn(console, 'info'), error = vi.spyOn(console, 'error');
  beforeEach(() => {
    now = 1000; record = undefined; transactionFails = false;
    info.mockReset().mockImplementation(() => {}); error.mockReset().mockImplementation(() => {});
    const db = { collection: () => ({ doc: () => ({}) }), runTransaction: async (run: (tx: unknown) => Promise<unknown>) => {
      if (transactionFails) throw new Error('private-database-marker');
      return run({ get: async () => ({ data: () => record }), set: (_ref: unknown, data: Record<string, unknown>) => { record = data; } });
    } } as unknown as Firestore;
    store = new CloudStore(db, config, () => now);
  });
  afterAll(() => { info.mockRestore(); error.mockRestore(); });

  it('does not record success until the actual operation completes', async () => {
    let release!: () => void;
    const pending = runMaintenanceJob('cleanupShield', () => store, () => new Promise<void>(resolve => { release = resolve; }));
    expect(record).toBeUndefined(); expect(info).not.toHaveBeenCalled();
    now = 2000; release(); await pending;
    expect(record).toEqual({ startedAt: 1000, finishedAt: 2000, lastSucceededAt: 1000, status: 'complete' });
  });
  it('rejects a partial batch while preserving the last successful run', async () => {
    await runMaintenanceJob('finishAccountDeletions', () => store, async () => ({ failed: 0 })); now = 2000;
    await expect(runMaintenanceJob('finishAccountDeletions', () => store, async () => ({ failed: 1 }))).rejects.toThrow('scheduled_work_incomplete');
    expect(record).toMatchObject({ startedAt: 2000, lastSucceededAt: 1000, status: 'incomplete' });
    expect(JSON.parse(error.mock.calls[0]![0])).toEqual({ severity: 'ERROR', event: 'shield_maintenance_result',
      job: 'finishAccountDeletions', status: 'incomplete' });
  });
  it('sanitizes arbitrary provider failures before platform logging and keeps failure visible', async () => {
    await expect(runMaintenanceJob('expireMessageDeliveries', () => store, async () => {
      throw Object.assign(new Error('private-provider-body-marker'), { cause: 'private-identity-marker' });
    })).rejects.toThrow('scheduled_work_failed');
    expect(record).toMatchObject({ lastSucceededAt: null, status: 'failed' });
    expect(JSON.stringify(error.mock.calls)).not.toContain('private-'); expect(info).not.toHaveBeenCalled();
  });
  it('does not replace a newer successful run with an older late failure', async () => {
    let reject!: (error: Error) => void;
    const old = runMaintenanceJob('cleanupShield', () => store, () => new Promise((_resolve, fail) => { reject = fail; }));
    now = 2000; await runMaintenanceJob('cleanupShield', () => store, async () => {});
    now = 3000; reject(new Error('private-late-failure'));
    await expect(old).rejects.toThrow('scheduled_work_failed');
    expect(record).toEqual({ startedAt: 2000, finishedAt: 2000, lastSucceededAt: 2000, status: 'complete' });
  });
  it('does not claim success if saving completion fails', async () => {
    transactionFails = true;
    await expect(runMaintenanceJob('cleanupShield', () => store, async () => {})).rejects.toThrow('scheduled_work_completion_record_failed');
    expect(record).toBeUndefined(); expect(info).not.toHaveBeenCalled();
    expect(JSON.stringify(error.mock.calls)).not.toContain('private-');
  });
  it('keeps initialization errors and health-check errors out of logs', async () => {
    const unavailable = () => { throw new Error('private-runtime-marker'); };
    await expect(runMaintenanceJob('cleanupShield', unavailable, vi.fn())).rejects.toThrow('scheduled_work_initialization_failed');
    await expect(checkMaintenanceHealth(unavailable)).rejects.toThrow('background_health_unavailable');
    expect(JSON.stringify(error.mock.calls)).not.toContain('private-');
    expect(JSON.parse(error.mock.calls.at(-1)![0])).toEqual({ severity: 'ERROR', event: 'shield_maintenance_health', available: false, healthy: false });
  });
  it('does not retry successful customer work merely because console logging throws', async () => {
    info.mockImplementation(() => { throw new Error('logger failed'); });
    const work = vi.fn(async () => {});
    await runMaintenanceJob('cleanupShield', () => store, work);
    expect(work).toHaveBeenCalledOnce(); expect(record?.status).toBe('complete');
  });
  it('rejects invalid batch failure counts instead of claiming health', async () => {
    await expect(runMaintenanceJob('reviewServiceAccess', () => store, async () => ({ failed: NaN }))).rejects.toThrow('scheduled_work_failed');
    expect(record?.status).toBe('failed');
  });
});

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('background progress and backlog (Firestore emulator)', () => {
  const project = 'demo-shield-maintenance', admin = initializeApp({ projectId: project }, 'maintenance-tests'), db = getFirestore(admin);
  let now: number, store: CloudStore;
  const jobs = Object.keys(MAINTENANCE_FRESHNESS_MS) as (keyof typeof MAINTENANCE_FRESHNESS_MS)[];
  beforeEach(async () => {
    if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST!)) throw new Error('Local emulator required');
    const response = await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: 'DELETE' });
    expect(response.ok).toBe(true);
    now = Date.parse('2026-10-17T12:00:00Z'); store = new CloudStore(db, config, () => now);
    await Promise.all(jobs.map(job => db.collection('backgroundJobHealth').doc(job).set({ startedAt: now, finishedAt: now, status: 'complete', lastSucceededAt: now })));
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => { await db.terminate(); await deleteApp(admin); });

  it('reports fresh completed jobs and an empty backlog without writing any health data', async () => {
    const before = await db.collection('backgroundJobHealth').get();
    expect(await inspectMaintenanceHealth(store)).toEqual({ healthy: true,
      jobStates: Object.fromEntries(jobs.map(job => [job, 'fresh'])),
      overdue: { accountDeletions: 0, audioManifests: 0, audioChunks: 0, providerRecordings: 0, callDeadlines: 0, monitoringChecks: 0 } });
    const after = await db.collection('backgroundJobHealth').get();
    expect(after.docs.map(doc => doc.updateTime.toMillis())).toEqual(before.docs.map(doc => doc.updateTime.toMillis()));
  });
  it.each(jobs)('detects stale %s even when every backlog is empty', async job => {
    await db.collection('backgroundJobHealth').doc(job).update({ lastSucceededAt: now - MAINTENANCE_FRESHNESS_MS[job] - 1 });
    const result = await inspectMaintenanceHealth(store);
    expect(result.healthy).toBe(false); expect(result.jobStates[job]).toBe('stale');
  });
  it('treats absent, failed, incomplete and future-dated results as unhealthy', async () => {
    await db.collection('backgroundJobHealth').doc(jobs[0]!).delete();
    await db.collection('backgroundJobHealth').doc(jobs[1]!).update({ status: 'failed' });
    await db.collection('backgroundJobHealth').doc(jobs[2]!).update({ status: 'incomplete' });
    await db.collection('backgroundJobHealth').doc(jobs[3]!).update({ lastSucceededAt: now + 1 });
    expect((await inspectMaintenanceHealth(store)).jobStates).toEqual({ cleanupShield: 'missing', finishAccountDeletions: 'failed',
      reviewServiceAccess: 'incomplete', expireMessageDeliveries: 'invalid' });
  });
  it('measures deletion age from the original request, not the renewed lease or retry time', async () => {
    await db.collection('accountDeletions').doc('private-overdue-marker').set({ state: 'pending', createdAt: now - 16 * 60_000, dueAt: now + 300_000 });
    await db.collection('accountDeletions').doc('completed').set({ state: 'complete', createdAt: now - 3600_000 });
    await db.collection('accountDeletions').doc('settling').set({ state: 'pending', createdAt: now - 60_000 });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await checkMaintenanceHealth(() => store);
    expect(result.overdue.accountDeletions).toBe(1); expect(result.healthy).toBe(false);
    expect(JSON.stringify(error.mock.calls)).not.toContain('private-');
    expect(JSON.parse(error.mock.calls[0]![0])).toMatchObject({ event: 'shield_maintenance_health', available: true, healthy: false });
  });
  it('counts overdue audio, chunks, provider erasure, call deadlines and monitor checks with their grace periods', async () => {
    for (const collection of ['forwardingAudio', 'forwardingAudioChunks']) {
      await db.collection(collection).doc('overdue').set({ expiresAt: now - 16 * 60_000 });
      await db.collection(collection).doc('within-grace').set({ expiresAt: now - 60_000 });
    }
    for (const status of ['pending', 'stored', 'done']) await db.collection('forwardingRecordings').doc(status).set({ status, createdAt: now - 25 * 3600_000 });
    await db.collection('forwardingRecordings').doc('within-delivery').set({ status: 'pending', createdAt: now - 3600_000 });
    for (const collection of ['callControlDeadlines', 'monitorChecks']) {
      await db.collection(collection).doc('overdue').set({ dueAt: now - 6 * 60_000 });
      await db.collection(collection).doc('current').set({ dueAt: now - 60_000 });
    }
    const result = await inspectMaintenanceHealth(store);
    expect(result.overdue).toEqual({ accountDeletions: 0, audioManifests: 1, audioChunks: 1, providerRecordings: 2, callDeadlines: 1, monitoringChecks: 1 });
    expect(result.healthy).toBe(false);
  });
});
