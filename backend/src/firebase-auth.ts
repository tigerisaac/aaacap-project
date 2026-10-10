import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { z } from 'zod';
import { HttpError, type AuthProvider, type Identity } from './auth.js';
import type { CloudConfig } from './cloud/config.js';

type FirebaseAdmin = Pick<Auth, 'verifyIdToken' | 'revokeRefreshTokens'>;
const sessionSchema = z.object({ idToken: z.string().min(1), refreshToken: z.string().min(1),
  expiresIn: z.coerce.number().int().positive().max(86400) });

export class FirebaseAuth implements AuthProvider {
  private admin?: FirebaseAdmin;
  constructor(private readonly config: Pick<CloudConfig, 'FIREBASE_PROJECT_ID' | 'FIREBASE_WEB_API_KEY' | 'IOS_BUNDLE_ID'>,
    private readonly request: typeof fetch = fetch, admin?: FirebaseAdmin) {
    this.admin = admin;
  }
  private service(): FirebaseAdmin {
    if (!this.admin) {
      const name = `shield-${this.config.FIREBASE_PROJECT_ID}`;
      const app = getApps().find(item => item.name === name) ?? initializeApp({
        projectId: this.config.FIREBASE_PROJECT_ID, credential: applicationDefault()
      }, name);
      this.admin = getAuth(app);
    }
    return this.admin;
  }
  private async provider(path: string, body: Record<string, unknown>, refresh = false): Promise<unknown> {
    const key = this.config.FIREBASE_WEB_API_KEY;
    if (!key || !this.config.FIREBASE_PROJECT_ID) throw new HttpError(503, 'sign_in_unavailable');
    const endpoint = refresh ? 'https://securetoken.googleapis.com/v1/token' : `https://identitytoolkit.googleapis.com/v1/accounts:${path}`;
    try {
      const response = await this.request(`${endpoint}?key=${encodeURIComponent(key)}`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
        headers: { 'content-type': refresh ? 'application/x-www-form-urlencoded' : 'application/json' },
        body: refresh ? new URLSearchParams(body as Record<string, string>).toString() : JSON.stringify(body)
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new HttpError(response.status === 429 ? 429 : response.status >= 500 ? 503 : 401,
          response.status === 429 ? 'try_again_later' : response.status >= 500 ? 'sign_in_unavailable' : 'sign_in_failed');
      }
      return await response.json();
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(503, 'sign_in_unavailable');
    }
  }
  async identify(token: string): Promise<Identity> {
    try {
      // Official SDK checks signatures, project audience/issuer and expiry.
      // checkRevoked=true also rejects disabled users and revoked sessions.
      const claims = await this.service().verifyIdToken(token, true);
      if (!claims.uid || !claims.email_verified) throw new Error('unverified_identity');
      return { subject: claims.uid };
    } catch { throw new HttpError(401, 'sign_in_required'); }
  }
  async requestCode(email: string): Promise<void> {
    await this.provider('sendOobCode', { requestType: 'EMAIL_SIGNIN', email,
      continueUrl: `https://${this.config.FIREBASE_PROJECT_ID}.firebaseapp.com/sign-in`,
      iOSBundleId: this.config.IOS_BUNDLE_ID, canHandleCodeInApp: true });
  }
  async verifyCode(email: string, token: string): Promise<Record<string, unknown>> {
    return this.session(await this.provider('signInWithEmailLink', { email, oobCode: token }));
  }
  async refresh(token: string): Promise<Record<string, unknown>> {
    const value = z.object({ id_token: z.string(), refresh_token: z.string(), expires_in: z.string() })
      .safeParse(await this.provider('', { grant_type: 'refresh_token', refresh_token: token }, true));
    if (!value.success) throw new HttpError(401, 'sign_in_failed');
    return this.session({ idToken: value.data.id_token, refreshToken: value.data.refresh_token, expiresIn: value.data.expires_in });
  }
  async logout(token: string): Promise<void> {
    const identity = await this.identify(token);
    try { await this.service().revokeRefreshTokens(identity.subject); }
    catch { throw new HttpError(503, 'sign_in_unavailable'); }
  }
  private async session(value: unknown): Promise<Record<string, unknown>> {
    const parsed = sessionSchema.safeParse(value);
    if (!parsed.success) throw new HttpError(401, 'sign_in_failed');
    await this.identify(parsed.data.idToken);
    return { accessToken: parsed.data.idToken, refreshToken: parsed.data.refreshToken, expiresIn: parsed.data.expiresIn };
  }
}
