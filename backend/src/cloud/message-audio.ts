import type { DocumentData, Transaction } from 'firebase-admin/firestore';
import type { CloudStore } from './store.js';

// Keep every Firestore document below 1 MiB, even after base64 and encryption.
export const MESSAGE_CAPTURE_SECONDS = 240;
export const MESSAGE_AUDIO_BYTES = 2_000_000;
export const MESSAGE_DELIVERY_MS = 24 * 3600_000;
const CHUNK_BYTES = 400_000;
export const MESSAGE_AUDIO_CHUNKS = Math.ceil(MESSAGE_AUDIO_BYTES / CHUNK_BYTES);
const chunkRef = (s: CloudStore, id: string, index: number) => s.db.collection('forwardingAudioChunks').doc(`${id}:${index}`);

export const discardCapture = (call: DocumentData | undefined) => !call || !!call.acceptedAt || !!call.voicemailDeletedAt
  || ['scam', 'robocall', 'solicitation', 'blocked_number', 'blocked_caller', 'monitor_intervened'].includes(call.reason);

export function writeMessageAudio(s: CloudStore, tx: Transaction, id: string, participantId: string, expiresAt: number, bytes: Buffer) {
  if (!bytes.length || bytes.length > MESSAGE_AUDIO_BYTES) throw new Error('recording_too_large');
  expiresAt = Math.min(expiresAt, s.now() + MESSAGE_DELIVERY_MS);
  const chunks = Math.ceil(bytes.length / CHUNK_BYTES);
  for (let i = 0; i < chunks; i++) tx.set(chunkRef(s, id, i), { participantId, expiresAt,
    audioEnc: s.vault.seal(bytes.subarray(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES).toString('base64'), `voicemail:${id}:${i}`) });
  tx.set(s.db.collection('forwardingAudio').doc(id), { participantId, expiresAt, chunks, createdAt: s.now() });
}

export async function readMessageAudio(s: CloudStore, id: string, audio: DocumentData): Promise<Buffer> {
  if (audio.expiresAt <= s.now()) throw new Error('recording_expired');
  // Read messages stored by the previous release as well.
  if (audio.audioEnc) return Buffer.from(s.vault.open(audio.audioEnc, `voicemail:${id}`), 'base64');
  if (!Number.isInteger(audio.chunks) || audio.chunks < 1 || audio.chunks > MESSAGE_AUDIO_CHUNKS) throw new Error('recording_unavailable');
  const docs = await s.db.getAll(...Array.from({ length: audio.chunks }, (_, i) => chunkRef(s, id, i)));
  return Buffer.concat(docs.map((doc, i) => {
    const chunk = doc.data();
    if (!chunk || chunk.participantId !== audio.participantId || chunk.expiresAt <= s.now()) throw new Error('recording_unavailable');
    return Buffer.from(s.vault.open(chunk.audioEnc, `voicemail:${id}:${i}`), 'base64');
  }));
}

export function deleteMessageAudio(s: CloudStore, tx: Transaction, id: string) {
  tx.delete(s.db.collection('forwardingAudio').doc(id));
  for (let i = 0; i < MESSAGE_AUDIO_CHUNKS; i++) tx.delete(chunkRef(s, id, i));
}

/** Physical deletion backstop; access stops at expiresAt, even if the scheduler is delayed. */
export async function expireMessageAudio(s: CloudStore) {
  const expired = await s.db.collection('forwardingAudio').where('expiresAt', '<=', s.now()).limit(100).get();
  for (const doc of expired.docs) await s.db.runTransaction(async tx => {
    const [audio, call] = await tx.getAll(doc.ref, s.callRef(doc.id));
    if (!audio!.exists || audio!.data()!.expiresAt > s.now()) return;
    deleteMessageAudio(s, tx, doc.id);
    if (call!.data()?.voicemail) tx.update(call!.ref, { 'voicemail.audioExpiredAt': s.now() });
  });
  // Also remove orphaned chunks left by a previous release's independent daily cleanup.
  const chunks = await s.db.collection('forwardingAudioChunks').where('expiresAt', '<=', s.now()).limit(400).get();
  if (!chunks.empty) { const batch = s.db.batch(); chunks.docs.forEach(doc => batch.delete(doc.ref)); await batch.commit(); }
}
