import { expect, it, vi } from 'vitest';
import { prepareSharedTelnyx } from '../../scripts/prepare-shared-telnyx.mjs';
import { inspectPaidPilot, paidPilotPlan } from '../../scripts/paid-pilot-plan.mjs';

const snapshot = () => ({
  config: { SHARED_NUMBER_ENABLED: true, TELNYX_SHARED_APPLICATION_ID: 'shared', TELNYX_NUMBER: '+12025550999', PUBLIC_BASE_URL: 'https://example.test', LIVE_BRIDGE_URL: 'https://bridge.example.test' },
  application: { id: 'shared', active: true, webhook_event_url: 'https://example.test/voice/shared', first_command_timeout: true, first_command_timeout_secs: 10,
    inbound: { channel_limit: 10 }, outbound: { channel_limit: 10, outbound_voice_profile_id: 'profile' } },
  profile: { id: 'profile', enabled: true, concurrent_call_limit: 10, daily_spend_limit_enabled: true, daily_spend_limit: '1.00',
    whitelisted_destinations: ['US'], max_destination_rate: 0.05, call_recording: { call_recording_type: 'none' } },
  number: { phone_number: '+12025550999', connection_id: 'shared', status: 'active' }, balance: { available_credit: '7.10' },
});

it('prepares a bounded live change plan using GET requests only and fails closed on missing readiness', async () => {
  const s = snapshot();
  const request = vi.fn(async (_c, path, method = 'GET') => {
    expect(method).toBe('GET');
    if (path === '/call_control_applications/shared') return { data: s.application };
    if (path.startsWith('/phone_numbers?')) return { data: [s.number] };
    if (path === '/balance') return { data: s.balance };
    if (path === '/outbound_voice_profiles/profile') return { data: s.profile };
    throw new Error('unexpected_request');
  });
  const plan = await inspectPaidPilot(s.config, { request, fetcher: vi.fn(async () => { throw new Error('offline'); }) });
  expect(plan.readyForPaidLaunch).toBe(false);
  expect(plan.blockers).toEqual(expect.arrayContaining(['account_outbound_limit_requires_verified_increase', 'phone_sign_in_provider', 'trusted_contact_text_provider', 'backend_capacity_release']));
  expect(plan.proposed.application).toEqual({ first_command_timeout: true, first_command_timeout_secs: 30, inbound: { channel_limit: 30 }, outbound: { channel_limit: 30 } });
  expect(plan.proposed.profile.daily_spend_limit).toBe('15.00');
  expect(plan.proposed.billing).toMatchObject({ rechargeThresholdUSD: 5, rechargeAmountUSD: 10, targetBalanceUSD: 15, totalAccountSpendCap: false });
  expect(request).toHaveBeenCalledTimes(4);
});

it('never infers account approval or real-call qualification from higher resource limits', () => {
  const s = snapshot(); s.profile.concurrent_call_limit = 30;
  s.application.inbound.channel_limit = 30; s.application.outbound.channel_limit = 30;
  expect(paidPilotPlan(s).blockers).toContain('account_outbound_limit_requires_verified_increase');
  const confirmed = paidPilotPlan({ ...s, accountOutboundLimit: 30 });
  expect(confirmed.blockers).not.toContain('account_outbound_limit_requires_verified_increase');
  expect(confirmed.blockers).toContain('qualify_real_carrier_calls');
  s.application.webhook_event_url = 'https://wrong.example.test';
  expect(() => paidPilotPlan(s)).toThrow('live_shared_binding_mismatch');
});

it('stages thirty channels without changing spend, purchasing numbers, or assigning a live DID', async () => {
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
  expect(result).toMatchObject({ inboundChannels: 30, outboundChannels: 30, active: false, assignsNumber: false, purchasesNumber: false });
  expect(writes[0]).toEqual({ path: '/outbound_voice_profiles/profile', body: { concurrent_call_limit: 30 } });
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
