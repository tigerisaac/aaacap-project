import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { HttpError } from '../src/auth.js';
import { buildCloudApp } from '../src/cloud/app.js';
import { CloudStore } from '../src/cloud/store.js';
import { cloudSchema } from '../src/cloud/config.js';
import type { Firestore } from 'firebase-admin/firestore';

const config = cloudSchema.parse({ FIREBASE_WEB_API_KEY: 'emulator-test', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app',
  TRIAL_PROXY_SECRET: 'c'.repeat(64), DATA_ENCRYPTION_KEY: 'd'.repeat(64),
  TELNYX_ACCOUNT_ID: 'fe8d2922-2dcf-4461-87bc-17a539688c31', TELNYX_API_KEY: 'test'.repeat(8),
  TELNYX_PUBLIC_KEY: `${'A'.repeat(43)}=`, TELNYX_APPLICATION_ID: '123456789012345678' });

describe('API failure diagnostics at the actual error boundary', () => {
  let app: Awaited<ReturnType<typeof buildCloudApp>> | undefined;
  const log = vi.spyOn(console, 'error');
  beforeEach(() => { log.mockReset().mockImplementation(() => {}); });
  afterEach(async () => { await app?.close(); app = undefined; });
  afterAll(() => log.mockRestore());

  async function request(error: Error) {
    const db = { doc: () => ({ get: async () => { throw error; } }) } as unknown as Firestore;
    app = await buildCloudApp(new CloudStore(db, config));
    return app.inject({ url: '/public/ready?token=private-query-marker', headers: {
      authorization: 'Bearer private-auth-marker', 'x-shield-participant': 'private-account-marker'
    } });
  }

  it('records a retry category while preserving the call-busy response', async () => {
    const response = await request(new HttpError(503, 'call_busy'));
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: { code: 'call_busy' } });
    expect(log).toHaveBeenCalledOnce();
    expect(JSON.parse(log.mock.calls[0]![0])).toEqual({ severity: 'WARNING', event: 'shield_api_failure',
      stage: 'api_request', status: 503, category: 'call_busy' });
  });

  it('records an unexpected failure without leaking the error or request', async () => {
    const error = Object.assign(new TypeError('private-provider-body-marker'), { statusCode: 503,
      code: 'private-provider-code-marker', cause: { transcript: 'private-transcript-marker' },
      stack: 'private-stack-marker', toJSON() { throw new Error('must-not-serialize-error'); } });
    const response = await request(error);
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: { code: 'service_unavailable' } });
    expect(log).toHaveBeenCalledOnce();
    expect(JSON.parse(log.mock.calls[0]![0])).toEqual({ severity: 'ERROR', event: 'shield_api_failure',
      stage: 'api_request', status: 503, category: 'type_error' });
    expect(JSON.stringify(log.mock.calls)).not.toContain('private-');
  });

  it('uses a generic category for unrecognized error codes and preserves HTTP 500', async () => {
    const response = await request(new HttpError(500, 'private-code-marker'));
    expect(response.statusCode).toBe(500);
    expect(log).toHaveBeenCalledOnce();
    expect(JSON.parse(log.mock.calls[0]![0]).category).toBe('unexpected_failure');
    expect(JSON.stringify(log.mock.calls)).not.toContain('private-');
  });

  it('does not classify normal authorization failures as server failures', async () => {
    expect((await request(new HttpError(401, 'sign_in_required'))).statusCode).toBe(401);
    expect(log).not.toHaveBeenCalled();
  });

  it('does not log request validation content', async () => {
    const error = new ZodError([{ code: 'custom', path: ['private-input-marker'], message: 'private-validation-marker' }]);
    expect((await request(error)).statusCode).toBe(400);
    expect(log).not.toHaveBeenCalled();
  });

  it('preserves the failure response if writing diagnostics fails', async () => {
    log.mockImplementation(() => { throw new Error('private-logging-marker'); });
    const response = await request(new HttpError(503, 'sign_in_unavailable'));
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: { code: 'sign_in_unavailable' } });
    expect(log).toHaveBeenCalledOnce();
  });
});
