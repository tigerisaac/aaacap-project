import limits from '../backend/src/cloud/pilot-limits.json' with { type: 'json' };
import { telnyxRequest } from './telnyx-provider.mjs';

// Read-only even when invoked from the command line. Never exports credentials or webhook URLs.
// Account concurrency and recharge must be confirmed separately in the portal; a profile limit is not an account limit.
export function paidPilotPlan({ config, application, profile, number, balance, backend = {}, bridge = {}, accountOutboundLimit }) {
  if (!config.SHARED_NUMBER_ENABLED || !application?.active || application.id !== config.TELNYX_SHARED_APPLICATION_ID
    || application.webhook_event_url !== `${config.PUBLIC_BASE_URL}/voice/shared`
    || number?.connection_id !== application.id || number?.phone_number !== config.TELNYX_NUMBER
    || number?.status !== 'active' || application.outbound?.outbound_voice_profile_id !== profile?.id) throw new Error('live_shared_binding_mismatch');
  if (!profile.enabled || !profile.daily_spend_limit_enabled || profile.whitelisted_destinations?.join(',') !== 'US'
    || profile.call_recording?.call_recording_type !== 'none' || !(Number(profile.max_destination_rate) > 0 && Number(profile.max_destination_rate) <= 0.05)) throw new Error('existing_profile_safeguards_required');
  const blockers = [];
  if (!(accountOutboundLimit >= limits.telnyxOutboundChannels)) blockers.push('account_outbound_limit_requires_verified_increase');
  if (!(application.inbound?.channel_limit >= limits.telnyxInboundChannels) || !(application.outbound?.channel_limit >= limits.telnyxOutboundChannels)) blockers.push('application_channels');
  if (!application.first_command_timeout || !(application.first_command_timeout_secs >= limits.firstCommandTimeoutSeconds)) blockers.push('first_command_timeout');
  if (!(profile.concurrent_call_limit >= limits.telnyxOutboundChannels)) blockers.push('profile_channels');
  if (Number(profile.daily_spend_limit) !== Number(limits.outboundDailySpendUSD)) blockers.push('review_outbound_spend_limit');
  if (!(Number(balance?.available_credit) >= limits.rechargeThresholdUSD)) blockers.push('funding_below_proposed_threshold');
  if (!backend.enabled || backend.limitsVersion !== limits.version || backend.capacity !== limits.activeCalls) blockers.push('backend_capacity_release');
  if (bridge.limitsVersion !== limits.version || !(bridge.maxSessions >= limits.bridgeSessionsPerInstance)) blockers.push('bridge_capacity_release');
  if (!config.TELNYX_VERIFY_PROFILE_ID) blockers.push('phone_sign_in_provider');
  if (!config.SMS_ALERTS) blockers.push('trusted_contact_text_provider');
  // These require separate evidence, not inference from an HTTP readiness response.
  blockers.push('verify_recharge_in_portal', 'verify_cloud_scaling_and_provider_quotas', 'qualify_real_carrier_calls');
  return {
    mode: 'read-only', version: limits.version, readyForPaidLaunch: false, blockers,
    observed: { inboundChannels: application.inbound?.channel_limit, outboundChannels: application.outbound?.channel_limit,
      profileChannels: profile.concurrent_call_limit, accountOutboundLimit: accountOutboundLimit ?? 'not_verified',
      outboundDailySpendUSD: profile.daily_spend_limit, availableCreditUSD: balance?.available_credit },
    proposed: {
      application: { first_command_timeout: true, first_command_timeout_secs: limits.firstCommandTimeoutSeconds,
        inbound: { channel_limit: limits.telnyxInboundChannels }, outbound: { channel_limit: limits.telnyxOutboundChannels } },
      profile: { concurrent_call_limit: limits.telnyxOutboundChannels, daily_spend_limit_enabled: true, daily_spend_limit: limits.outboundDailySpendUSD },
      billing: { rechargeThresholdUSD: limits.rechargeThresholdUSD, rechargeAmountUSD: limits.rechargeAmountUSD,
        targetBalanceUSD: limits.rechargeThresholdUSD + limits.rechargeAmountUSD, totalAccountSpendCap: false },
      bridge: { minInstances: 0, maxInstances: limits.bridgeMaxInstances, sessionsPerInstance: limits.bridgeSessionsPerInstance },
    },
    preserves: ['number assignment', 'webhook URLs', 'US-only destinations', 'destination rate cap', 'no blanket recording', 'press-1 acceptance'],
  };
}

export async function inspectPaidPilot(config, { request = telnyxRequest, fetcher = fetch, accountOutboundLimit } = {}) {
  const [applicationResult, numbers, credit] = await Promise.all([
    request(config, `/call_control_applications/${config.TELNYX_SHARED_APPLICATION_ID}`),
    request(config, `/phone_numbers?filter[phone_number]=${encodeURIComponent(config.TELNYX_NUMBER)}`), request(config, '/balance'),
  ]);
  const application = applicationResult.data;
  const profile = (await request(config, `/outbound_voice_profiles/${application.outbound.outbound_voice_profile_id}`)).data;
  const matches = numbers.data?.filter(n => n.phone_number === config.TELNYX_NUMBER);
  if (matches?.length !== 1) throw new Error('shared_number_not_unique');
  const readiness = async url => {
    try { const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(10000) }); return response.ok ? await response.json() : {}; }
    catch { return {}; }
  };
  const [backend, bridge] = await Promise.all([readiness(`${config.PUBLIC_BASE_URL}/public/shared-ready`),
    config.LIVE_BRIDGE_URL ? readiness(`${config.LIVE_BRIDGE_URL}/ready`) : {}]);
  return paidPilotPlan({ config, application, profile, number: matches[0], balance: credit.data, backend, bridge, accountOutboundLimit });
}

if (process.argv[1]?.endsWith('/paid-pilot-plan.mjs')) {
  try {
    if (process.argv.length !== 2) throw new Error('read_only_no_arguments_supported');
    const { Client, connect, project } = await import('./firebase-client.mjs');
    await connect();
    const secret = (await new Client({ urlPrefix: 'https://secretmanager.googleapis.com', apiVersion: 'v1' })
      .get(`/projects/${project}/secrets/SHIELD_RUNTIME/versions/latest:access`)).body;
    const config = JSON.parse(Buffer.from(secret.payload.data, 'base64').toString('utf8'));
    console.log(JSON.stringify(await inspectPaidPilot(config), null, 2));
  } catch (error) {
    console.error(/^[a-z_0-9]+$/.test(error.message ?? '') ? error.message : 'paid_pilot_inspection_failed'); process.exitCode = 1;
  }
}
