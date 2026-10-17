import { createHash } from 'node:crypto';
import { getFunctions, type TaskOptions } from 'firebase-admin/functions';
import { getApps } from 'firebase-admin/app';
import type { Transaction } from 'firebase-admin/firestore';
import type { CloudStore } from './store.js';

export type CallJobPhase = 'start' | 'greet' | 'outcome' | 'voicemail' | 'deadline' | 'warning';
export const CALL_JOB_FUNCTION = 'locations/us-central1/functions/runSharedCallJob';
export const callJobId = (id: string, phase: CallJobPhase, dueAt?: number) => `${id}-${phase}${phase === 'deadline' ? `-${dueAt}` : ''}`;

/** Contentless transactional outbox. An ended media request never owns the remaining carrier work. */
export function queueCallJob(store: CloudStore, tx: Transaction, id: string, phase: CallJobPhase, dueAt = store.now()) {
  tx.create(store.db.collection('callControlJobs').doc(callJobId(id, phase, dueAt)), {
    callId: id, phase, dueAt, expiresAt: dueAt + 2 * 3600_000
  });
}

export async function dispatchCallJob(store: CloudStore, jobId: string,
  queue?: { enqueue(data: { jobId: string }, options: TaskOptions): Promise<unknown> }) {
  const job = (await store.db.collection('callControlJobs').doc(jobId).get()).data();
  if (!job || job.done || job.expiresAt <= store.now()) return;
  if (!Number.isFinite(job.dueAt)) throw new Error('call_job_missing_due_time');
  try {
    await (queue ?? getFunctions(getApps()[0]).taskQueue(CALL_JOB_FUNCTION)).enqueue({ jobId }, {
      id: createHash('sha256').update(jobId).digest('hex'), scheduleTime: new Date(job.dueAt), dispatchDeadlineSeconds: 30
    });
  } catch (error) {
    if ((error as { code?: string }).code !== 'functions/task-already-exists') throw error;
  }
}
