import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({ runtime: '', build: vi.fn(), inject: vi.fn() }));
// Exercise the exported handler body with inert registration and provider adapters.
vi.mock('firebase-functions/v2/https', () => ({ onRequest: (_options: unknown, handler: unknown) => handler }));
vi.mock('firebase-functions/v2/firestore', () => ({ onDocumentCreated: (_options: unknown, handler: unknown) => handler }));
vi.mock('firebase-functions/v2/scheduler', () => ({ onSchedule: (_options: unknown, handler: unknown) => handler }));
vi.mock('firebase-functions/v2/tasks', () => ({ onTaskDispatched: (_options: unknown, handler: unknown) => handler }));
vi.mock('firebase-functions/params', () => ({ defineSecret: (name: string) => ({
  value: () => name === 'SHIELD_RUNTIME' ? fixture.runtime : 'synthetic-openai-marker'
}) }));
vi.mock('firebase-admin/app', () => ({ getApps: () => [{}], initializeApp: () => ({}) }));
vi.mock('firebase-admin/firestore', () => ({ getFirestore: () => ({ settings: vi.fn() }) }));
vi.mock('../src/cloud/app.js', () => ({ buildCloudApp: fixture.build }));

const config = { FIREBASE_WEB_API_KEY: 'emulator-test', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app',
  TRIAL_PROXY_SECRET: 'c'.repeat(64), DATA_ENCRYPTION_KEY: 'd'.repeat(64),
  TELNYX_ACCOUNT_ID: 'fe8d2922-2dcf-4461-87bc-17a539688c31', TELNYX_API_KEY: 'test'.repeat(8),
  TELNYX_PUBLIC_KEY: `${'A'.repeat(43)}=`, TELNYX_APPLICATION_ID: '123456789012345678' };

describe('API initialization and dispatch failure diagnostics', () => {
  const log = vi.spyOn(console, 'error');
  beforeEach(() => {
    vi.resetModules(); log.mockReset().mockImplementation(() => {});
    fixture.runtime = JSON.stringify(config);
    fixture.inject.mockReset().mockResolvedValue({ statusCode: 200, headers: {}, rawPayload: Buffer.from('ready') });
    fixture.build.mockReset().mockResolvedValue({ inject: fixture.inject });
  });
  afterAll(() => log.mockRestore());

  async function invoke(handler: typeof import('../src/cloud/index.js').shieldApi) {
    const response = { status: vi.fn(), set: vi.fn(), setHeader: vi.fn(), send: vi.fn() };
    response.status.mockReturnValue(response); response.set.mockReturnValue(response);
    await handler({ method: 'GET', originalUrl: '/public/ready?token=private-query-marker',
      headers: { authorization: 'Bearer private-auth-marker' }, ip: 'private-ip-marker' } as never, response as never);
    return response;
  }

  it('classifies invalid runtime configuration and allows a later initialization retry', async () => {
    fixture.runtime = JSON.stringify({ ...config, TELNYX_VERIFY_PROFILE_ID: 'private-invalid-profile-marker' });
    const { shieldApi } = await import('../src/cloud/index.js');
    const failed = await invoke(shieldApi);
    expect(failed.status).toHaveBeenCalledWith(503);
    expect(failed.send).toHaveBeenCalledWith({ error: { code: 'service_unavailable' } });
    expect(log).toHaveBeenCalledOnce();
    expect(JSON.parse(log.mock.calls[0]![0])).toEqual({ severity: 'ERROR', event: 'shield_api_failure',
      stage: 'api_initialization', status: 503, category: 'runtime_configuration_invalid' });
    expect(JSON.stringify(log.mock.calls)).not.toContain('private-');
    fixture.runtime = JSON.stringify(config);
    expect((await invoke(shieldApi)).status).toHaveBeenCalledWith(200);
    expect(fixture.build).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledOnce();
  });

  it('classifies malformed runtime JSON without logging its contents', async () => {
    fixture.runtime = '{private-runtime-marker';
    const response = await invoke((await import('../src/cloud/index.js')).shieldApi);
    expect(response.status).toHaveBeenCalledWith(503);
    expect(JSON.parse(log.mock.calls[0]![0])).toMatchObject({ stage: 'api_initialization', category: 'parse_failure' });
    expect(JSON.stringify(log.mock.calls)).not.toContain('private-');
  });

  it('separates dispatch failure from initialization without logging request or provider data', async () => {
    fixture.inject.mockRejectedValue(Object.assign(new Error('private-provider-marker'), {
      request: { url: 'private-signed-url-marker' }, cause: { transcript: 'private-transcript-marker' }
    }));
    const response = await invoke((await import('../src/cloud/index.js')).shieldApi);
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(response.send).toHaveBeenCalledWith({ error: { code: 'service_unavailable' } });
    expect(JSON.parse(log.mock.calls[0]![0])).toEqual({ severity: 'ERROR', event: 'shield_api_failure',
      stage: 'api_dispatch', status: 503, category: 'unexpected_failure' });
    expect(JSON.stringify(log.mock.calls)).not.toContain('private-');
  });

  it('does not duplicate a completed error response handled by the app', async () => {
    fixture.inject.mockResolvedValue({ statusCode: 503, headers: {}, rawPayload: Buffer.from('handled') });
    const response = await invoke((await import('../src/cloud/index.js')).shieldApi);
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.send).toHaveBeenCalledWith(Buffer.from('handled'));
    expect(log).not.toHaveBeenCalled();
  });
});
