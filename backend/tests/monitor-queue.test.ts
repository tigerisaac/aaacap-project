import { describe, expect, it, vi } from 'vitest';
import { dispatchMonitorCheck } from '../src/cloud/monitor-queue.js';
import type { CloudStore } from '../src/cloud/store.js';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFunctions, type Functions } from 'firebase-admin/functions';

vi.mock('firebase-admin/functions', () => ({ getFunctions: vi.fn() }));

const store = (job?: Record<string, unknown>) => ({ now: () => 100,
  db: { collection: () => ({ doc: () => ({ get: async () => ({ data: () => job }) }) }) } }) as unknown as CloudStore;
describe('durable monitoring timer outbox', () => {
  it('uses the already initialized named Firebase app when there is no default app', async () => {
    const app = initializeApp({ projectId: 'demo-monitor-queue' }, 'named-monitor-queue');
    const enqueue = vi.fn().mockResolvedValue(undefined), taskQueue = vi.fn(() => ({ enqueue }));
    vi.mocked(getFunctions).mockReturnValue({ taskQueue } as unknown as Functions);
    try {
      await dispatchMonitorCheck(store({ dueAt: 5000, expiresAt: 10000 }), 'synthetic-named-app');
      expect(getFunctions).toHaveBeenCalledWith(app); expect(enqueue).toHaveBeenCalledOnce();
    } finally { await deleteApp(app); }
  });
  it('uses the same contentless task ID on duplicate outbox delivery', async () => {
    const s = store({ callId: 'synthetic', dueAt: 5000, expiresAt: 10000 });
    const enqueue = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce({ code: 'functions/task-already-exists' });
    await dispatchMonitorCheck(s, 'synthetic-1', { enqueue });
    await dispatchMonitorCheck(s, 'synthetic-1', { enqueue });
    expect(enqueue.mock.calls[0]).toEqual(enqueue.mock.calls[1]);
    expect(enqueue.mock.calls[0]![0]).toEqual({ jobId: 'synthetic-1' });
    expect(enqueue.mock.calls[0]![1]).toMatchObject({ id: expect.stringMatching(/^[a-f0-9]{64}$/), scheduleTime: new Date(5000), dispatchDeadlineSeconds: 60 });
  });
  it('does not enqueue a deleted or expired call job, and does not swallow queue failures', async () => {
    const enqueue = vi.fn().mockRejectedValue(new Error('unavailable'));
    await dispatchMonitorCheck(store(), 'gone', { enqueue });
    await dispatchMonitorCheck(store({ dueAt: 0, expiresAt: 99 }), 'expired', { enqueue });
    expect(enqueue).not.toHaveBeenCalled();
    await expect(dispatchMonitorCheck(store({ dueAt: 5000, expiresAt: 10000 }), 'live', { enqueue })).rejects.toThrow('unavailable');
  });
});
