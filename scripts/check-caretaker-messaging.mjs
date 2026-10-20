import { pathToFileURL } from 'node:url';
import { Client, connect, project } from './firebase-client.mjs';
import { telnyxRequest } from './telnyx-provider.mjs';

// This command only reads provider/configuration state. It never sends, buys,
// registers a business, attaches a number, writes a secret or deploys a service.
export const caretakerMessagingPlan = () => ({
  activationReady: false,
  sender: 'Use Shield’s existing Telnyx number; do not buy, port or replace a number',
  preserveVoice: ['Attach only messaging_profile_id through the messaging settings endpoint',
    'Preserve the voice connection, webhooks, application, outbound profile, channel limits and voice spend cap',
    'Read back and compare all voice settings before and after activation'],
  sharedAccountBalance: 'SMS and voice use the same Telnyx balance; keep a separate SMS spending cap and sufficient credit',
  profile: { name: 'Shield caretaker alerts', enabled: false, whitelisted_destinations: ['US', 'CA'],
    webhook_api_version: '2', webhook_url: 'https://shield-calls-isaac.web.app/public/messaging/webhook',
    mobile_only: true, daily_spend_limit_enabled: true, daily_spend_limit: '2.00' },
  proposedSpendLimitRequiresApproval: true,
  prerequisites: ['Complete provider brand/campaign approval for Shield’s existing sender',
    'Verify STOP/START handling and signed delivery webhooks', 'Approve the scoped API, worker and Hosting rollout',
    'Approve consenting test recipients before actual SMS testing'],
  runtimeSettingAfterApproval: { SMS_ALERTS: { messagingProfileId: '<approved profile>', from: '<approved sender>' } }
});

export async function checkCaretakerMessaging() {
  await connect();
  const functions = new Client({ urlPrefix: 'https://cloudfunctions.googleapis.com', apiVersion: 'v2' });
  const api = (await functions.get(`/projects/${project}/locations/us-central1/functions/shieldApi`)).body;
  const binding = api.serviceConfig.secretEnvironmentVariables.find(v => v.key === 'SHIELD_RUNTIME');
  if (!binding) throw new Error('runtime_binding_missing');
  const secrets = new Client({ urlPrefix: 'https://secretmanager.googleapis.com', apiVersion: 'v1' });
  const secret = (await secrets.get(`/projects/${binding.projectId}/secrets/${binding.secret}/versions/${binding.version}:access`)).body;
  const config = JSON.parse(Buffer.from(secret.payload.data, 'base64').toString());
  const sender = config.SMS_ALERTS?.from ?? config.TELNYX_NUMBER;
  const [numbers, profiles, brands] = await Promise.all([
    telnyxRequest(config, `/phone_numbers?filter[phone_number]=${encodeURIComponent(sender)}`),
    telnyxRequest(config, '/messaging_profiles?page[size]=100'), telnyxRequest(config, '/10dlc/brand?recordsPerPage=100')]);
  const number = numbers.data?.find(n => n.phone_number === sender);
  const messaging = number ? (await telnyxRequest(config, `/phone_numbers/${encodeURIComponent(number.id)}/messaging`)).data : undefined;
  const profile = profiles.data?.find(p => p.id === config.SMS_ALERTS?.messagingProfileId);
  const application = config.SHARED_NUMBER_ENABLED && config.TELNYX_SHARED_APPLICATION_ID
    ? (await telnyxRequest(config, `/call_control_applications/${config.TELNYX_SHARED_APPLICATION_ID}`)).data : undefined;
  const voiceProfile = application?.outbound?.outbound_voice_profile_id
    ? (await telnyxRequest(config, `/outbound_voice_profiles/${application.outbound.outbound_voice_profile_id}`)).data : undefined;
  // Only fixed flags/counts leave this function. Never serialize provider bodies,
  // addresses, private numbers, business identities, keys or message records.
  return { observedAt: new Date().toISOString(), readOnly: true, activationReady: false,
    apiRevision: api.serviceConfig.revision, phoneSignInConfigured: !!config.TELNYX_VERIFY_PROFILE_ID,
    textAlertsConfigured: !!config.SMS_ALERTS, usingShieldVoiceNumber: sender === config.TELNYX_NUMBER,
    selectedNumberFound: !!number, numberType: ['local', 'toll_free', 'mobile'].includes(number?.phone_number_type) ? number.phone_number_type : 'other',
    hasMessagingProfile: !!messaging?.messaging_profile_id, messagingProfileCount: profiles.meta?.total_results ?? profiles.data?.length ?? 0,
    registeredBrandCount: brands.totalRecords ?? brands.records?.length ?? 0,
    configuredProfileEnabled: profile?.enabled === true,
    configuredProfileWebhookMatches: profile?.webhook_url === `${config.PUBLIC_BASE_URL}/public/messaging/webhook` && profile?.webhook_api_version === '2',
    configuredSpendLimitEnabled: profile?.daily_spend_limit_enabled === true,
    voice: { expectedConnectionAttached: !!number && number.connection_id === config.TELNYX_SHARED_APPLICATION_ID,
      applicationActive: application?.active === true, inboundChannels: application?.inbound?.channel_limit ?? null,
      outboundChannels: application?.outbound?.channel_limit ?? null, accountOutboundChannels: voiceProfile?.concurrent_call_limit ?? null,
      voiceSpendCapEnabled: voiceProfile?.daily_spend_limit_enabled === true,
      noVoiceSettingsChanged: true },
    limits: 'Configuration observations do not establish campaign approval, deployed source parity, STOP/START or handset delivery. Activation is never inferred automatically.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const command = process.argv[2] ?? 'check';
    if (!['check', '--plan'].includes(command)) throw new Error('use_check_or_plan');
    console.log(JSON.stringify(command === '--plan' ? caretakerMessagingPlan() : await checkCaretakerMessaging(), null, 2));
  } catch (error) {
    console.error(JSON.stringify({ failed: true, reason: /^[a-z_]+$/.test(error.message ?? '') ? error.message : 'messaging_check_failed' }));
    process.exitCode = 1;
  }
}
