import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { HttpError, type AuthProvider } from '../auth.js';
import { normalizePhone } from '../crypto.js';
import type { CloudStore } from './store.js';

export interface PhoneVerifier {
  start(phone: string): Promise<string>;
  verify(id: string, code: string, phone: string): Promise<boolean>;
}

/** Provider-generated codes only. Neither the code nor provider errors are persisted or logged. */
export class TelnyxPhoneVerifier implements PhoneVerifier {
  constructor(readonly store: CloudStore, readonly request: typeof fetch = fetch) {}
  private async post(path: string, body: object) {
    try {
      const response = await this.request(`https://api.telnyx.com/v2${path}`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8000),
        headers: { authorization: `Bearer ${this.store.config.TELNYX_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify(body)
      });
      if (!response.ok) {
        await response.body?.cancel();
        if (path.endsWith('/actions/verify') && [400, 404, 422].includes(response.status)) return {};
        throw new HttpError(response.status === 429 ? 429 : 503, response.status === 429 ? 'try_again_later' : 'phone_verification_unavailable'); }
      return await response.json() as { data?: { id?: string; phone_number?: string; response_code?: string } };
    } catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(503, 'phone_verification_unavailable'); }
  }
  async start(phone: string) {
    const result = await this.post('/verifications/sms', { phone_number: phone, verify_profile_id: this.store.config.TELNYX_VERIFY_PROFILE_ID, timeout_secs: 300 });
    if (!result.data?.id || !z.string().uuid().safeParse(result.data.id).success) throw new HttpError(503, 'phone_verification_unavailable');
    return result.data.id;
  }
  async verify(id: string, code: string, phone: string) {
    const result = await this.post(`/verifications/${encodeURIComponent(id)}/actions/verify`, { code });
    return result.data?.response_code === 'accepted' && result.data.phone_number === phone;
  }
}

export function registerPhoneAuth(app: FastifyInstance, store: CloudStore, auth: AuthProvider, verifier: PhoneVerifier = new TelnyxPhoneVerifier(store)) {
  const ready = () => { if (!store.config.TELNYX_VERIFY_PROFILE_ID || !auth.signInVerifiedPhone) throw new HttpError(503, 'phone_verification_unavailable'); };
  app.post('/auth/phone/start', async request => {
    ready();
    const input = z.object({ phone: z.string().min(8).max(25) }).strict().parse(request.body);
    const phone = normalizePhone(input.phone);
    if (!phone) throw new HttpError(400, 'invalid_phone');
    await store.quota([[`phone-auth-ip:${request.ip}`, 20], [`phone-auth:${phone}`, 5], ['phone-auth:global', 100]]);
    const lock = store.db.collection('phoneAuthLimits').doc(store.vault.hash(phone));
    await store.db.runTransaction(async tx => {
      if ((await tx.get(lock)).data()?.nextAt > store.now()) throw new HttpError(429, 'phone_code_wait');
      tx.set(lock, { nextAt: store.now() + 60_000, expiresAt: store.now() + 86400_000 });
    });
    const challenge = randomBytes(32).toString('hex'), ref = store.db.collection('phoneAuthChallenges').doc(store.vault.hash(challenge));
    const providerID = await verifier.start(phone);
    await ref.create({ phoneEnc: store.vault.seal(phone, `phone-auth:${ref.id}`), providerID, attempts: 0, consumed: false, checkingUntil: 0, expiresAt: store.now() + 300_000 });
    return { challenge, expiresIn: 300, resendAfter: 60 };
  });
  app.post('/auth/phone/verify', async request => {
    ready();
    const { challenge, code } = z.object({ challenge: z.string().regex(/^[a-f0-9]{64}$/), code: z.string().regex(/^\d{4,8}$/) }).strict().parse(request.body);
    await store.quota([[`phone-verify-ip:${request.ip}`, 100]]);
    const ref = store.db.collection('phoneAuthChallenges').doc(store.vault.hash(challenge));
    const checkingID = randomBytes(16).toString('hex');
    const data = await store.db.runTransaction(async tx => {
      const d = (await tx.get(ref)).data();
      if (!d || d.expiresAt <= store.now() || d.consumed || d.attempts >= 5) throw new HttpError(401, 'phone_code_expired');
      if (d.checkingUntil > store.now()) throw new HttpError(409, 'phone_code_busy');
      tx.update(ref, { attempts: d.attempts + 1, checkingUntil: store.now() + 30_000, checkingID });
      return d;
    });
    const phone = store.vault.open(data.phoneEnc, `phone-auth:${ref.id}`);
    let verified = false;
    try {
      verified = await verifier.verify(data.providerID, code, phone);
      if (!verified) throw new HttpError(401, 'phone_code_incorrect');
      // Consume before exchanging, so concurrent requests and provider replays cannot mint another session.
      await store.db.runTransaction(async tx => {
        const latest = (await tx.get(ref)).data();
        if (!latest || latest.consumed || latest.expiresAt <= store.now() || latest.checkingID !== checkingID) throw new HttpError(401, 'phone_code_expired');
        tx.update(ref, { consumed: true, checkingUntil: 0 });
      });
      return await auth.signInVerifiedPhone!(phone);
    } finally {
      if (!verified) await store.db.runTransaction(async tx => {
        if ((await tx.get(ref)).data()?.checkingID === checkingID) tx.update(ref, { checkingUntil: 0 });
      });
    }
  });
}
