import { recordingProvider, validRecordingId } from './forwarding-provider.js';
import { FieldPath } from 'firebase-admin/firestore';
import { CloudStore } from './store.js';
import { discardCapture, MESSAGE_AUDIO_BYTES, MESSAGE_DELIVERY_MS, writeMessageAudio } from './message-audio.js';

/** Verify provider ownership, download from an approved origin, encrypt, and remove its copy. */
export async function ingestForwardingRecording(store: CloudStore, sid: string, provider?: ReturnType<typeof recordingProvider>) {
  if (!validRecordingId(sid)) throw new Error('invalid_recording_id');
  const ref = store.db.collection('forwardingRecordings').doc(sid), job = (await ref.get()).data();
  if (!job || job.status === 'done') return;
  if (job.provider !== 'telnyx') throw new Error('invalid_recording_provider');
  const client = provider ?? recordingProvider(store.config, job.transport);
  const callRef = store.callRef(job.callId), call = (await callRef.get()).data();
  const expiresAt = Math.min(job.expiresAt, job.createdAt + MESSAGE_DELIVERY_MS);
  if (expiresAt > store.now() && job.capture && !discardCapture(call) && (call!.state !== 'ended'
    || (call!.eligible && !call!.liveFinishedAt && store.now() - (call!.completedAt ?? store.now()) < 20_000))) throw new Error('capture_outcome_pending');
  const person = job.participantId ? (await store.personRef(job.participantId).get()).data() : undefined;
  if (job.status !== 'stored' && expiresAt > store.now() && call && !discardCapture(call) && !call.voicemail?.audioDeliveredAt && !call.voicemail?.audioExpiredAt && person && person.status !== 'offboarded') {
    const response = await client.fetch(sid, job.parentSid);
    if (!response.ok || !response.headers.get('content-type')?.startsWith('audio/')) throw new Error('recording_unavailable');
    const reader = response.body!.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length;
      if (size > MESSAGE_AUDIO_BYTES) throw new Error('recording_too_large'); chunks.push(value); } }
    finally { await reader.cancel(); }
    if (!size) throw new Error('empty_recording');
    const bytes = Buffer.concat(chunks);
    const duration = Number(response.headers.get('x-shield-recording-duration') ?? job.duration);
    if (!Number.isFinite(duration) || duration < 0 || duration > 245) throw new Error('recording_mismatch');
    await store.db.runTransaction(async tx => {
      const checkRef = store.db.collection('voicemailChecks').doc(job.callId);
      const [currentDoc, personDoc, jobDoc, checkDoc] = await tx.getAll(callRef, store.personRef(job.participantId), ref, checkRef);
      const current = currentDoc!.data();
      if (jobDoc!.data()?.status === 'stored' || jobDoc!.data()?.status === 'done') return;
      if (current && !discardCapture(current) && !current.voicemail?.audioDeliveredAt && !current.voicemail?.audioExpiredAt && expiresAt > store.now() && current.expiresAt > store.now() && personDoc!.exists && personDoc!.data()!.status !== 'offboarded') {
        const audioExpiresAt = Math.min(expiresAt, current.expiresAt);
        writeMessageAudio(store, tx, job.callId, job.participantId, audioExpiresAt, bytes);
        const kind = job.capture && !current.events.some((e: { kind: string }) => e.kind === 'voicemail_offered') ? 'notice' : 'voicemail';
        // Combined assessment/summary runs for every message, independently of the old removal switch.
        tx.update(callRef, { voicemail: { id: job.callId, duration, kind, status: 'pending', summaryStatus: 'pending', heardAt: null, audioExpiresAt },
          outcome: 'voicemail', events: [...current.events, { kind: kind === 'notice' ? 'notice_received' : 'voicemail_received', at: store.now() }] });
        if (!checkDoc!.exists) tx.create(checkRef, { callId: job.callId, participantId: job.participantId, createdAt: store.now(), expiresAt: current.expiresAt });
      }
      tx.update(ref, { status: 'stored' });
    });
  }
  await client.remove(sid);
  await ref.update({ status: 'done', providerDeletedAt: store.now() });
}

/** Rotate through expired jobs so a permanently failing provider deletion cannot starve later jobs. */
export async function expireProviderRecordings(store: CloudStore, ingest = (id: string) => ingestForwardingRecording(store, id)) {
  const cursorRef = store.db.doc('maintenance/audioDeletionCursor'), cursor = (await cursorRef.get()).data();
  const query = store.db.collection('forwardingRecordings').where('status', 'in', ['pending', 'stored'])
    .where('createdAt', '<=', store.now() - MESSAGE_DELIVERY_MS).orderBy('createdAt').orderBy(FieldPath.documentId()).limit(20);
  let jobs = cursor ? await query.startAfter(cursor.createdAt, cursor.id).get() : await query.get();
  if (jobs.empty && cursor) { await cursorRef.delete(); jobs = await query.get(); }
  if (jobs.empty) return;
  const last = jobs.docs.at(-1)!;
  // Advance before provider work; a timed-out invocation resumes at the next page, then wraps.
  await cursorRef.set({ createdAt: last.data().createdAt, id: last.id });
  const results = await Promise.allSettled(jobs.docs.map(doc => ingest(doc.id)));
  if (results.some(result => result.status === 'rejected')) throw new Error('recording_deletion_incomplete');
}
