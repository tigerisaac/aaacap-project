import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { bearer, HttpError, type AuthProvider } from '../auth.js';
import type { CloudStore } from './store.js';
import { deleteMessageAudio, readMessageAudio } from './message-audio.js';

const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const receiptSchema = z.object({ uid: z.string(), sha256: z.string(), revision: z.string(), participantId: z.string() });

/** Download is never destructive. Only the owner's verified durable save acknowledges delivery. */
export function registerAudioDelivery(app: FastifyInstance, s: CloudStore, auth: AuthProvider) {
  app.get('/api/voicemails/:id/delivery', async (request, reply) => {
    const id = z.string().uuid().parse((request.params as { id: string }).id).toLowerCase();
    const uid = (await auth.identify(bearer(request))).subject;
    const call = (await s.callRef(id).get()).data();
    if (!call?.voicemail || call.voicemailDeletedAt || call.acceptedAt || call.expiresAt <= s.now()) throw new HttpError(404, 'voicemail_not_found');
    await s.access(uid, call.participantId, true);
    if (call.voicemail.status !== 'ready') throw new HttpError(409, 'recording_unavailable');
    const doc = await s.db.collection('forwardingAudio').doc(id).get(), audio = doc.data();
    if (!audio || audio.participantId !== call.participantId || audio.expiresAt <= s.now()) throw new HttpError(404, 'voicemail_not_found');
    const bytes = await readMessageAudio(s, id, audio), sha256 = digest(bytes);
    const revision = `${doc.updateTime!.seconds}:${doc.updateTime!.nanoseconds}`;
    const receipt = s.vault.seal(JSON.stringify({ uid, sha256, revision, participantId: call.participantId }), `audio-delivery:${id}`);
    return reply.header('Cache-Control', 'no-store').send({ audio: bytes.toString('base64'), sha256, receipt });
  });

  app.post('/api/voicemails/:id/delivered', async request => {
    const id = z.string().uuid().parse((request.params as { id: string }).id).toLowerCase();
    const uid = (await auth.identify(bearer(request))).subject;
    const body = z.object({ receipt: z.string().max(4096), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).parse(request.body);
    let proof: z.infer<typeof receiptSchema>;
    try {
      const parts = body.receipt.split('.');
      // Node's base64 decoder ignores suffixes after padding. Require the exact sealed
      // representation before decryption so malformed receipts cannot alias valid ones.
      if (parts.length !== 4 || parts[0] !== 'v1' || parts.slice(1).some(part => !part || Buffer.from(part, 'base64').toString('base64') !== part)) throw new Error('invalid_receipt');
      proof = receiptSchema.parse(JSON.parse(s.vault.open(body.receipt, `audio-delivery:${id}`)));
    }
    catch { throw new HttpError(400, 'invalid_delivery_receipt'); }
    if (proof.uid !== uid || proof.sha256 !== body.sha256) throw new HttpError(403, 'invalid_delivery_receipt');
    await s.access(uid, proof.participantId, true);
    await s.db.runTransaction(async tx => {
      const [callDoc, audioDoc, personDoc] = await tx.getAll(s.callRef(id), s.db.collection('forwardingAudio').doc(id), s.personRef(proof.participantId));
      const call = callDoc!.data(), person = personDoc!.data();
      if (!person || person.ownerUid !== uid || person.status === 'offboarded') throw new HttpError(403, 'access_denied');
      if (!call?.voicemail || call.participantId !== proof.participantId || call.voicemailDeletedAt || call.acceptedAt || call.expiresAt <= s.now()) throw new HttpError(404, 'voicemail_not_found');
      if (call.voicemail.audioDeliveredSha256 === proof.sha256 && !audioDoc!.exists) return; // Lost response; safe to retry.
      const revision = audioDoc!.updateTime && `${audioDoc!.updateTime.seconds}:${audioDoc!.updateTime.nanoseconds}`;
      if (call.voicemail.status !== 'ready' || revision !== proof.revision) throw new HttpError(409, 'delivery_changed');
      deleteMessageAudio(s, tx, id);
      tx.update(callDoc!.ref, { 'voicemail.audioDeliveredAt': s.now(), 'voicemail.audioDeliveredSha256': proof.sha256 });
    });
    return { delivered: true };
  });
}
