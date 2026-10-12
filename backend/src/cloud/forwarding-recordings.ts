import { recordingProvider, validRecordingId } from './forwarding-provider.js';
import { CloudStore } from './store.js';
import { queueAlert } from './alerts.js';

/** Verify provider ownership, download from an approved origin, encrypt, and remove its copy. */
export async function ingestForwardingRecording(store: CloudStore, sid: string, provider?: ReturnType<typeof recordingProvider>) {
  if (!validRecordingId(sid)) throw new Error('invalid_recording_id');
  const ref = store.db.collection('forwardingRecordings').doc(sid), job = (await ref.get()).data();
  if (!job || job.status === 'done') return;
  if (job.provider !== 'telnyx') throw new Error('invalid_recording_provider');
  const client = provider ?? recordingProvider(store.config, job.transport);
  const callRef = store.callRef(job.callId), call = (await callRef.get()).data();
  if (job.status !== 'stored' && job.expiresAt > store.now() && call && !call.voicemailDeletedAt) {
    const response = await client.fetch(sid, job.parentSid);
    if (!response.ok || !response.headers.get('content-type')?.startsWith('audio/')) throw new Error('recording_unavailable');
    const reader = response.body!.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length;
      if (size > 500_000) throw new Error('recording_too_large'); chunks.push(value); } }
    finally { await reader.cancel(); }
    if (!size) throw new Error('empty_recording');
    const encrypted = store.vault.seal(Buffer.concat(chunks).toString('base64'), `voicemail:${job.callId}`);
    await store.db.runTransaction(async tx => {
      const current = (await tx.get(callRef)).data();
      if (current && !current.voicemailDeletedAt && current.expiresAt > store.now()) {
        tx.set(store.db.collection('forwardingAudio').doc(job.callId), { participantId: job.participantId, audioEnc: encrypted, expiresAt: job.expiresAt });
        // With voicemail screening on, the message stays pending until it is kept (and alerted) or removed.
        const screened = store.config.VOICEMAIL_SCREENING_ENABLED;
        tx.update(callRef, { voicemail: { id: job.callId, duration: job.duration, status: screened ? 'pending' : 'ready', heardAt: null } });
        if (screened) tx.create(store.db.collection('voicemailChecks').doc(job.callId), { callId: job.callId, createdAt: store.now(), expiresAt: job.expiresAt });
        else queueAlert(store, tx, job.participantId, 'voicemail');
      }
      tx.update(ref, { status: 'stored' });
    });
  }
  await client.remove(sid);
  await ref.update({ status: 'done', providerDeletedAt: store.now() });
}
