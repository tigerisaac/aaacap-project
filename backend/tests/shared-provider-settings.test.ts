import { expect, it, vi } from 'vitest';
import { prepareSharedTelnyx } from '../../scripts/prepare-shared-telnyx.mjs';

it('stages ten channels without changing spend, purchasing numbers, or assigning a live DID', async () => {
  const writes: { path: string; body: any }[] = [];
  const profile = { enabled: true, concurrent_call_limit: 1, daily_spend_limit: '1.00', daily_spend_limit_enabled: true, whitelisted_destinations: ['US'], call_recording: { call_recording_type: 'none' } };
  let application: any;
  const request = vi.fn(async (_c, path, method = 'GET', body) => {
    if (method !== 'GET') writes.push({ path, body });
    if (path === '/texml_applications/legacy') return { data: { outbound: { outbound_voice_profile_id: 'profile' } } };
    if (path === '/outbound_voice_profiles/profile') { if (body) Object.assign(profile, body); return { data: profile }; }
    if (path === '/call_control_applications?page[size]=100') return { data: [] };
    if (path === '/call_control_applications') { application = { id: 'shared', ...body }; return { data: application }; }
    if (path === '/call_control_applications/shared') return { data: application };
    throw new Error('unexpected_request');
  });
  const result = await prepareSharedTelnyx({ TELNYX_APPLICATION_ID: 'legacy', PUBLIC_BASE_URL: 'https://example.test' }, { apply: true, request });
  expect(result).toMatchObject({ inboundChannels: 10, outboundChannels: 10, active: false, assignsNumber: false, purchasesNumber: false });
  expect(writes[0]).toEqual({ path: '/outbound_voice_profiles/profile', body: { concurrent_call_limit: 10 } });
  expect(profile.daily_spend_limit).toBe('1.00');
  expect(writes.some(w => /phone_numbers|number_orders/.test(w.path))).toBe(false);
  expect(application.inbound.sip_subdomain_receive_settings).toBe('only_my_connections');
});
it('refuses to prepare a profile without its existing spending and destination restrictions', async () => {
  const request = vi.fn(async (_c, path) => ({ data: path.startsWith('/texml') ? { outbound: { outbound_voice_profile_id: 'profile' } } : { enabled: true } }));
  await expect(prepareSharedTelnyx({ TELNYX_APPLICATION_ID: 'legacy' }, { apply: true, request })).rejects.toThrow('existing_profile_safeguards_required');
  expect(request.mock.calls.every(c => c.length < 3 || c[2] === 'GET')).toBe(true);
});

it('escapes plus signs in Firestore document URLs without changing the resource hierarchy', async () => {
  // @ts-expect-error Operator helper is JavaScript.
  const { docPath } = await import('../../scripts/lib/firestore-rest.mjs');
  expect(docPath('shieldNumbers/+12025550999/routes/hash')).toContain('/documents/shieldNumbers/%2B12025550999/routes/hash');
});
