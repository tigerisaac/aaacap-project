import { describe, expect, it, vi } from 'vitest';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { FirebaseAuth } from '../src/firebase-auth.js';
import { loadConfig } from '../src/config.js';

const environment = { SHIELD_MODE: 'live', PUBLIC_BASE_URL: 'https://shield.example.com',
  DATA_ENCRYPTION_KEY: 'ab'.repeat(32), DATABASE_URL: 'postgres://localhost/test',
  TWILIO_ACCOUNT_SID: `AC${'a'.repeat(32)}`, TWILIO_AUTH_TOKEN: 'synthetic-token',
  AUTH_PROVIDER: 'firebase', FIREBASE_PROJECT_ID: 'shield-test-project', FIREBASE_WEB_API_KEY: 'synthetic-project-key' };
const config = loadConfig(environment);
const claims = { uid: 'verified-user', email_verified: true } as DecodedIdToken;
const admin = () => ({ verifyIdToken: vi.fn(async () => claims), revokeRefreshTokens: vi.fn(async () => {}) });

describe('Firebase authentication', () => {
  it('uses project-scoped email links and exchanges the opaque code without returning provider metadata', async () => {
    const service = admin();
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ email: 'person@example.com' }))
      .mockResolvedValueOnce(Response.json({ idToken: 'verified-id-token', refreshToken: 'refresh-token',
        expiresIn: '3600', localId: 'private-provider-metadata' }));
    const auth = new FirebaseAuth(config, request, service);
    await auth.requestCode('person@example.com');
    expect(request.mock.calls[0]![0]).toBe('https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=synthetic-project-key');
    expect(JSON.parse(request.mock.calls[0]![1]!.body as string)).toMatchObject({
      requestType: 'EMAIL_SIGNIN', canHandleCodeInApp: true, iOSBundleId: 'org.isaaczhang.Shield',
      continueUrl: 'https://shield-test-project.firebaseapp.com/sign-in'
    });
    const result = await auth.verifyCode('person@example.com', 'synthetic_oob_code');
    expect(JSON.parse(request.mock.calls[1]![1]!.body as string)).toEqual({ email: 'person@example.com', oobCode: 'synthetic_oob_code' });
    expect(result).toEqual({ accessToken: 'verified-id-token', refreshToken: 'refresh-token', expiresIn: 3600 });
    expect(service.verifyIdToken).toHaveBeenCalledWith('verified-id-token', true);
    expect(request.mock.calls.every(([, options]) => options?.redirect === 'error' && options.signal instanceof AbortSignal)).toBe(true);
  });
  it('verifies token signature, expiry, project and revocation through the official Admin SDK before authorizing a subject', async () => {
    const service = admin();
    const auth = new FirebaseAuth(config, vi.fn(), service);
    expect(await auth.identify('opaque-token')).toEqual({ subject: 'verified-user' });
    expect(service.verifyIdToken).toHaveBeenCalledWith('opaque-token', true);
    service.verifyIdToken.mockRejectedValueOnce(new Error('expired, revoked or wrong-project token'));
    await expect(auth.identify('untrusted-token')).rejects.toMatchObject({ statusCode: 401, code: 'sign_in_required' });
    service.verifyIdToken.mockResolvedValueOnce({ ...claims, email_verified: false });
    await expect(auth.identify('unverified-email')).rejects.toMatchObject({ statusCode: 401 });
  });
  it('refreshes through the fixed secure-token endpoint and revokes sessions on sign-out', async () => {
    const service = admin();
    const request = vi.fn<typeof fetch>(async () => Response.json({ id_token: 'renewed-id-token', refresh_token: 'renewed-refresh', expires_in: '3600' }));
    const auth = new FirebaseAuth(config, request, service);
    expect(await auth.refresh('original-refresh')).toEqual({ accessToken: 'renewed-id-token', refreshToken: 'renewed-refresh', expiresIn: 3600 });
    expect(request.mock.calls[0]![0]).toBe('https://securetoken.googleapis.com/v1/token?key=synthetic-project-key');
    expect(request.mock.calls[0]![1]!.body).toBe('grant_type=refresh_token&refresh_token=original-refresh');
    await auth.logout('renewed-id-token');
    expect(service.revokeRefreshTokens).toHaveBeenCalledWith('verified-user');
  });
  it.each([400, 429, 503])('does not expose provider error details or retry a failed request (%s)', async status => {
    const request = vi.fn<typeof fetch>(async () => Response.json({ error: 'Private account detail' }, { status }));
    const auth = new FirebaseAuth(config, request, admin());
    await expect(auth.requestCode('person@example.com')).rejects.toMatchObject({
      code: status === 429 ? 'try_again_later' : status === 503 ? 'sign_in_unavailable' : 'sign_in_failed'
    });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('rejects partial sessions, including MFA challenges, without storing them', async () => {
    const request = vi.fn<typeof fetch>(async () => Response.json({ mfaPendingCredential: 'private-challenge' }));
    await expect(new FirebaseAuth(config, request, admin()).verifyCode('person@example.com', 'oob-code'))
      .rejects.toMatchObject({ code: 'sign_in_failed' });
  });
  it('requires Firebase configuration and refuses the auth emulator in live mode', () => {
    expect(loadConfig(environment).AUTH_PROVIDER).toBe('firebase');
    expect(() => loadConfig({ ...environment, FIREBASE_PROJECT_ID: '' })).toThrow();
    expect(() => loadConfig({ ...environment, FIREBASE_WEB_API_KEY: '' })).toThrow();
    expect(() => loadConfig({ ...environment, FIREBASE_PROJECT_ID: 'other.example/path' })).toThrow();
    expect(() => loadConfig({ ...environment, FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099' })).toThrow();
  });
});
