import { createHash } from 'node:crypto';
import { getFunctions, type TaskOptions } from 'firebase-admin/functions';
import type { CloudStore } from './store.js';

export const MONITOR_TASK_FUNCTION = 'locations/us-central1/functions/monitorScheduledCall';
type Queue = { enqueue(data: { jobId: string }, options: TaskOptions): Promise<unknown> };

/** Firestore is the transactional outbox; deterministic task IDs make redelivery safe. No speech enters Cloud Tasks. */
export async function dispatchMonitorCheck(store: CloudStore, jobId: string, queue?: Queue) {
  const job = (await store.db.collection('monitorChecks').doc(jobId).get()).data();
  if (!job || job.expiresAt <= store.now()) return;
  // Legacy jobs may remain during a rolling deployment. Only the new cadence jobs use this queue.
  if (!Number.isFinite(job.dueAt)) throw new Error('monitor_job_missing_due_time');
  try {
    await (queue ?? getFunctions().taskQueue(MONITOR_TASK_FUNCTION)).enqueue({ jobId }, {
      id: createHash('sha256').update(jobId).digest('hex'), scheduleTime: new Date(job.dueAt), dispatchDeadlineSeconds: 60
    });
  } catch (error) {
    if ((error as { code?: string }).code !== 'functions/task-already-exists') throw error;
  }
}
