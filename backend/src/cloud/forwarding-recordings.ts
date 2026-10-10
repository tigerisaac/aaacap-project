import { recordingProvider, validRecordingId, type VoiceProvider } from './forwarding-provider.js';
import { CloudStore } from './store.js';

/** Verify provider ownership, download from an approved origin, encrypt, and remove its copy. */
export async function ingestForwardingRecording(store: CloudStore, sid: string) {
  if (!validRecordingId('twilio', sid) && !validRecordingId('telnyx', sid)) throw new Error('invalid_recording_id');
  const ref = store.db.collection('forwardingRecordings').doc(sid), job = (await ref.get()).data();
  if (!job || job.status === 'done') return;
  const provider: VoiceProvider = job.provider ?? 'twilio';
  if (!['twilio', 'telnyx'].includes(provider) || !validRecordingId(provider, sid)) throw new Error('invalid_recording_provider');
  const client = recordingProvider(store.config, provider);
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
        tx.update(callRef, { voicemail: { id: job.callId, duration: job.duration, status: 'ready', heardAt: null } });
      }
      tx.update(ref, { status: 'stored' });
    });
  }
  await client.remove(sid);
  await ref.update({ status: 'done', providerDeletedAt: store.now() });
}
