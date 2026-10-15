import { describe, expect, it, vi } from 'vitest';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { FirebaseAuth } from '../src/firebase-auth.js';
import { cloudSchema } from '../src/cloud/config.js';

const config = { FIREBASE_PROJECT_ID: 'shield-test-project', FIREBASE_WEB_API_KEY: 'synthetic-project-key', IOS_BUNDLE_ID: 'org.isaaczhang.Shield' };
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
  it('requires the Firebase web key in runtime configuration and fails closed without it', async () => {
    expect(() => cloudSchema.shape.FIREBASE_WEB_API_KEY.parse('')).toThrow();
    const request = vi.fn<typeof fetch>();
    await expect(new FirebaseAuth({ ...config, FIREBASE_WEB_API_KEY: '' }, request, admin()).verifyCode('person@example.com', 'oob-code'))
      .rejects.toMatchObject({ code: 'sign_in_unavailable' });
    expect(request).not.toHaveBeenCalled();
  });
});

describe('Verified phone accounts', () => {
  const phone = '+12025550101';
  const phoneAdmin = () => ({ ...admin(), verifyIdToken: vi.fn(async () => ({ uid: 'phone-user', phone_number: phone } as DecodedIdToken)),
    getUserByPhoneNumber: vi.fn(async () => ({ uid: 'phone-user', disabled: false } as import('firebase-admin/auth').UserRecord)),
    createUser: vi.fn(async () => ({ uid: 'phone-user', disabled: false } as import('firebase-admin/auth').UserRecord)),
    createCustomToken: vi.fn(async () => 'synthetic-custom-token') });
  const session = () => Response.json({ idToken: 'id-token', refreshToken: 'refresh-token', expiresIn: '3600' });
  it('accepts verified phone claims without requiring an email, but rejects invalid phone claims', async () => {
    const service = phoneAdmin(), auth = new FirebaseAuth(config, vi.fn(), service);
    expect(await auth.identify('token')).toEqual({ subject: 'phone-user', verifiedPhone: phone });
    service.verifyIdToken.mockResolvedValueOnce({ uid: 'phone-user', phone_number: 'unverified-text' } as DecodedIdToken);
    await expect(auth.identify('token')).rejects.toMatchObject({ statusCode: 401 });
  });
  it('reuses the phone account and exchanges a custom token without returning it', async () => {
    const service = phoneAdmin(), request = vi.fn<typeof fetch>().mockResolvedValue(session());
    const result = await new FirebaseAuth(config, request, service).signInVerifiedPhone(phone);
    expect(service.getUserByPhoneNumber).toHaveBeenCalledWith(phone);
    expect(service.createUser).not.toHaveBeenCalled();
    expect(service.createCustomToken).toHaveBeenCalledWith('phone-user');
    expect(JSON.parse(request.mock.calls[0]![1]!.body as string)).toEqual({ token: 'synthetic-custom-token', returnSecureToken: true });
    expect(result).toEqual({ accessToken: 'id-token', refreshToken: 'refresh-token', expiresIn: 3600 });
  });
  it('creates only missing phone accounts and handles concurrent creation without reassignment', async () => {
    const service = phoneAdmin();
    service.getUserByPhoneNumber.mockRejectedValueOnce({ code: 'auth/user-not-found' });
    service.createUser.mockRejectedValueOnce({ code: 'auth/phone-number-already-exists' });
    await new FirebaseAuth(config, vi.fn<typeof fetch>().mockResolvedValue(session()), service).signInVerifiedPhone(phone);
    expect(service.createUser).toHaveBeenCalledWith({ phoneNumber: phone });
    expect(service.getUserByPhoneNumber).toHaveBeenCalledTimes(2);
    expect(service.createCustomToken).toHaveBeenCalledWith('phone-user');
  });
  it('never signs in disabled accounts or creates an account after an infrastructure error', async () => {
    const service = phoneAdmin(), request = vi.fn<typeof fetch>(), auth = new FirebaseAuth(config, request, service);
    service.getUserByPhoneNumber.mockResolvedValueOnce({ uid: 'disabled', disabled: true } as import('firebase-admin/auth').UserRecord);
    await expect(auth.signInVerifiedPhone(phone)).rejects.toMatchObject({ code: 'sign_in_failed' });
    service.getUserByPhoneNumber.mockRejectedValueOnce(new Error('private detail'));
    await expect(auth.signInVerifiedPhone(phone)).rejects.toMatchObject({ code: 'sign_in_unavailable' });
    expect(service.createUser).not.toHaveBeenCalled(); expect(service.createCustomToken).not.toHaveBeenCalled(); expect(request).not.toHaveBeenCalled();
  });
});
