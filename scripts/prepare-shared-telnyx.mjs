import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { telnyxRequest } from './telnyx-provider.mjs';

// Stages the shared application, preserves spend/destination restrictions, and never buys or assigns a number.
// node scripts/prepare-shared-telnyx.mjs <private-runtime.json> [--apply]
export async function prepareSharedTelnyx(c, { apply = false, request = telnyxRequest } = {}) {
  const legacy = (await request(c, `/texml_applications/${c.TELNYX_APPLICATION_ID}`)).data;
  const profileId = legacy?.outbound?.outbound_voice_profile_id;
  if (!profileId) throw new Error('outbound_profile_missing');
  const profile = (await request(c, `/outbound_voice_profiles/${profileId}`)).data;
  if (!profile.enabled || !profile.daily_spend_limit_enabled || profile.whitelisted_destinations?.join(',') !== 'US'
    || profile.call_recording?.call_recording_type !== 'none') throw new Error('existing_profile_safeguards_required');
  const name = 'Shield shared-number pilot';
  const apps = (await request(c, '/call_control_applications?page[size]=100')).data.filter(a => a.application_name === name);
  if (apps.length > 1) throw new Error('ambiguous_shared_application');
  const settings = { application_name: name, active: false, webhook_event_url: `${c.PUBLIC_BASE_URL}/voice/shared`, webhook_api_version: '2',
    first_command_timeout: true, first_command_timeout_secs: 10, redact_dtmf_debug_logging: true,
    inbound: { channel_limit: 10, shaken_stir_enabled: true, sip_subdomain_receive_settings: 'only_my_connections' },
    outbound: { channel_limit: 10, outbound_voice_profile_id: profileId } };
  if (apps[0]?.active) throw new Error('shared_application_already_active');
  if (!apply) return { operation: 'stage', inboundChannels: 10, outboundChannels: 10, profileChannels: 10,
    preservesSpendLimit: true, assignsNumber: false, purchasesNumber: false };
  await request(c, `/outbound_voice_profiles/${profileId}`, 'PATCH', { concurrent_call_limit: 10 });
  const app = (await request(c, apps[0] ? `/call_control_applications/${apps[0].id}` : '/call_control_applications', apps[0] ? 'PATCH' : 'POST', settings)).data;
  const verified = (await request(c, `/call_control_applications/${app.id}`)).data;
  const updatedProfile = (await request(c, `/outbound_voice_profiles/${profileId}`)).data;
  if (verified.active || verified.inbound?.channel_limit !== 10 || verified.outbound?.channel_limit !== 10 || updatedProfile.concurrent_call_limit !== 10
    || verified.webhook_event_url !== settings.webhook_event_url || updatedProfile.daily_spend_limit !== profile.daily_spend_limit
    || updatedProfile.whitelisted_destinations?.join(',') !== 'US') throw new Error('settings_readback_failed');
  return { sharedApplicationId: app.id, inboundChannels: 10, outboundChannels: 10, profileChannels: 10, active: false,
    preservesSpendLimit: true, assignsNumber: false, purchasesNumber: false };
}
if (process.argv[1]?.endsWith('/prepare-shared-telnyx.mjs')) {
  try {
    const c = JSON.parse(await readFile(process.argv[2], 'utf8'));
    const result = await prepareSharedTelnyx(c, { apply: process.argv.includes('--apply') });
    await mkdir('artifacts/private', { recursive: true });
    await writeFile('artifacts/private/shared-telnyx-stage.json', JSON.stringify({ ...result, checkedAt: new Date().toISOString() }), { mode: 0o600 });
    console.log(JSON.stringify(result));
  } catch (e) { console.error(/^[a-z_0-9]+$/.test(e.message ?? '') ? e.message : 'shared_preparation_failed'); process.exitCode = 1; }
}
