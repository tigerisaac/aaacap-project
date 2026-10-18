import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({ records: new Map<string, unknown>(), cleanup: vi.fn(), release: vi.fn(),
  deletion: vi.fn(), review: vi.fn(), audio: vi.fn(), provider: vi.fn(), read: vi.fn(), aggregate: vi.fn(), transaction: vi.fn() }));
vi.mock('firebase-functions/v2/https', () => ({ onRequest: (_options: unknown, handler: unknown) => handler }));
vi.mock('firebase-functions/v2/firestore', () => ({ onDocumentCreated: (_options: unknown, handler: unknown) => handler }));
vi.mock('firebase-functions/v2/scheduler', () => ({ onSchedule: (_options: unknown, handler: unknown) => handler }));
vi.mock('firebase-functions/v2/tasks', () => ({ onTaskDispatched: (_options: unknown, handler: unknown) => handler }));
vi.mock('firebase-functions/params', () => ({ defineSecret: () => ({ value: () => JSON.stringify({}) }) }));
vi.mock('firebase-admin/app', () => ({ getApps: () => [{}], initializeApp: () => ({}) }));
vi.mock('firebase-admin/firestore', () => ({ getFirestore: () => ({}) }));
vi.mock('../src/cloud/config.js', () => ({ cloudSchema: { parse: () => ({}) } }));
vi.mock('../src/cloud/store.js', () => {
  const query = { where: () => query, count: () => ({ get: fixture.aggregate }) };
  return { CloudStore: class {
    config = {}; now = Date.now; cleanup = fixture.cleanup;
    db = { getAll: fixture.read, collection: () => ({ doc: (id: string) => id, where: () => query }),
      runTransaction: async (run: (tx: unknown) => Promise<void>) => {
        fixture.transaction();
        return run({
          get: async (id: string) => ({ data: () => fixture.records.get(id) }),
          set: (id: string, data: unknown) => fixture.records.set(id, data)
        });
      }
    };
  } };
});
vi.mock('../src/cloud/voicemail-check.js', () => ({ VoicemailCheck: class { releaseStale = fixture.release; } }));
vi.mock('../src/cloud/deletion-jobs.js', () => ({ processAccountDeletions: fixture.deletion }));
vi.mock('../src/firebase-auth.js', () => ({ FirebaseAuth: class {} }));
vi.mock('../src/cloud/service-access.js', () => ({ ServiceAccess: class { reviewBatch = fixture.review; } }));
vi.mock('../src/cloud/message-audio.js', () => ({ MESSAGE_DELIVERY_MS: 86400_000, expireMessageAudio: fixture.audio }));
vi.mock('../src/cloud/forwarding-recordings.js', () => ({ expireProviderRecordings: fixture.provider }));

describe('exported scheduled worker completion boundaries', () => {
  beforeEach(() => {
    vi.resetModules(); fixture.records.clear();
    for (const fn of [fixture.cleanup, fixture.release, fixture.deletion, fixture.review, fixture.audio, fixture.provider]) fn.mockReset().mockResolvedValue(undefined);
    fixture.read.mockReset().mockImplementation(async (...ids: string[]) => ids.map(id => ({ data: () => fixture.records.get(id) })));
    fixture.aggregate.mockReset().mockResolvedValue({ data: () => ({ count: 0 }) });
    fixture.transaction.mockReset();
    vi.spyOn(console, 'info').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());
  it('does not acknowledge partial account deletion as scheduler success', async () => {
    fixture.deletion.mockResolvedValue({ completed: 1, failed: 1 });
    await expect((await import('../src/cloud/index.js')).finishAccountDeletions({} as never)).rejects.toThrow('scheduled_work_incomplete');
    expect(fixture.records.get('finishAccountDeletions')).toMatchObject({ status: 'incomplete', lastSucceededAt: null });
  });
  it('does not acknowledge a failed subscription review as scheduler success', async () => {
    fixture.review.mockResolvedValue({ checked: 1, failed: 1 });
    await expect((await import('../src/cloud/index.js')).reviewServiceAccess({} as never)).rejects.toThrow('scheduled_work_incomplete');
    expect(fixture.records.get('reviewServiceAccess')).toMatchObject({ status: 'incomplete' });
  });
  it('waits for the stale-message recovery step before recording cleanup completion', async () => {
    let release!: () => void, entered!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    fixture.release.mockImplementation(() => { entered(); return new Promise<void>(resolve => { release = resolve; }); });
    const pending = (await import('../src/cloud/index.js')).cleanupShield({} as never);
    await started; expect(fixture.records.size).toBe(0);
    release(); await pending;
    expect(fixture.records.get('cleanupShield')).toMatchObject({ status: 'complete' });
  });
  it('does not record audio cleanup completion when provider erasure fails', async () => {
    fixture.provider.mockRejectedValue(new Error('private-provider-body-marker'));
    await expect((await import('../src/cloud/index.js')).expireMessageDeliveries({} as never)).rejects.toThrow('scheduled_work_failed');
    expect(fixture.audio).toHaveBeenCalledOnce();
    expect(fixture.records.get('expireMessageDeliveries')).toMatchObject({ status: 'failed' });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('private-');
  });
  function seedCompletedWork() {
    const now = Date.now();
    for (const job of ['cleanupShield', 'finishAccountDeletions', 'reviewServiceAccess', 'expireMessageDeliveries']) {
      fixture.records.set(job, { startedAt: now, finishedAt: now, status: 'complete', lastSucceededAt: now });
    }
  }
  it('runs the exported health observer without invoking customer work or writing completion records', async () => {
    seedCompletedWork();
    const before = [...fixture.records];
    await (await import('../src/cloud/index.js')).checkBackgroundHealth({} as never);
    expect(fixture.read).toHaveBeenCalledOnce(); expect(fixture.aggregate).toHaveBeenCalledTimes(6);
    expect(fixture.transaction).not.toHaveBeenCalled();
    expect([...fixture.records]).toEqual(before);
    for (const work of [fixture.cleanup, fixture.release, fixture.deletion, fixture.review, fixture.audio, fixture.provider]) expect(work).not.toHaveBeenCalled();
    expect(JSON.parse(vi.mocked(console.info).mock.calls[0]![0])).toMatchObject({ event: 'shield_maintenance_health', available: true, healthy: true });
    expect(console.error).not.toHaveBeenCalled();
  });
  it.each(['completion read', 'aggregate read', 'invalid aggregate'])('fails closed when the health observer has a %s failure', async failure => {
    seedCompletedWork();
    if (failure === 'completion read') fixture.read.mockRejectedValueOnce(new Error('private-database-marker'));
    else if (failure === 'aggregate read') fixture.aggregate.mockRejectedValueOnce(new Error('private-database-marker'));
    else fixture.aggregate.mockResolvedValueOnce({ data: () => ({ count: NaN }) });
    await expect((await import('../src/cloud/index.js')).checkBackgroundHealth({} as never)).rejects.toThrow('background_health_unavailable');
    expect(console.info).not.toHaveBeenCalled();
    expect(vi.mocked(console.error).mock.calls).toHaveLength(1);
    expect(JSON.parse(vi.mocked(console.error).mock.calls[0]![0])).toEqual({ severity: 'ERROR', event: 'shield_maintenance_health', available: false, healthy: false });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('private-');
  });
});
