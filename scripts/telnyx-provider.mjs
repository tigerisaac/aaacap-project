import { writeFile } from 'node:fs/promises';

// Server-side operator utility; never expose the API key, request bodies, or webhook URLs in logs.
export async function telnyxRequest(config, path, method = 'GET', data) {
  if (!config.TELNYX_API_KEY || !path.startsWith('/') || path.startsWith('//')) throw new Error('telnyx_credentials_required');
  const response = await fetch(`https://api.telnyx.com/v2${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(10000),
    headers: { authorization: `Bearer ${config.TELNYX_API_KEY}`, ...(data ? { 'content-type': 'application/json' } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}) });
  if (!response.ok) throw new Error(`telnyx_http_${response.status}`);
  return response.json();
}
const base = c => `${c.PUBLIC_BASE_URL}/forwarding/${c.TRIAL_PROXY_SECRET}`;
export async function verifyTelnyxSetup(c) {
  const [numbers, application, balance] = await Promise.all([
    telnyxRequest(c, `/phone_numbers?filter[phone_number]=${encodeURIComponent(c.TELNYX_NUMBER)}`),
    telnyxRequest(c, `/texml_applications/${c.TELNYX_APPLICATION_ID}`), telnyxRequest(c, '/balance')]);
  const matches = numbers.data?.filter(n => n.phone_number === c.TELNYX_NUMBER);
  if (matches?.length !== 1 || matches[0].status !== 'active' || matches[0].connection_id !== c.TELNYX_APPLICATION_ID) throw new Error('telnyx_number_not_ready');
  const a = application.data;
  if (!a.active || a.voice_method !== 'post' || a.voice_url !== `${base(c)}/inbound` || a.voice_fallback_url !== `${base(c)}/fallback`
    || a.status_callback !== `${base(c)}/status` || a.status_callback_method !== 'post' || a.outbound?.channel_limit !== 1) throw new Error('telnyx_webhooks_not_ready');
  const p = (await telnyxRequest(c, `/outbound_voice_profiles/${a.outbound.outbound_voice_profile_id}`)).data;
  if (!p.enabled || p.concurrent_call_limit !== 1 || !p.daily_spend_limit_enabled || Number(p.daily_spend_limit) > 1
    || p.whitelisted_destinations?.length !== 1 || p.whitelisted_destinations[0] !== 'US'
    || p.call_recording?.call_recording_type !== 'none') throw new Error('telnyx_outbound_limits_not_ready');
  if (!(Number(balance.data?.available_credit) > 0)) throw new Error('telnyx_funding_required');
  return { number: matches[0], application: a };
}

export async function provisionTelnyx(c) {
  const appName = 'Shield supervised forwarding', profileName = 'Shield US callbacks';
  // Reuse exact named resources after a partial setup; never duplicate purchases or paid resources.
  const profiles = (await telnyxRequest(c, '/outbound_voice_profiles?page[size]=100')).data.filter(p => p.name === profileName);
  if (profiles.length > 1) throw new Error('ambiguous_telnyx_profile');
  const profileSettings = { name: profileName, enabled: true, traffic_type: 'conversational', service_plan: 'global',
    concurrent_call_limit: 1, whitelisted_destinations: ['US'], max_destination_rate: 0.05,
    daily_spend_limit: '1.00', daily_spend_limit_enabled: true, call_recording: { call_recording_type: 'none' } };
  const profile = (await telnyxRequest(c, profiles[0] ? `/outbound_voice_profiles/${profiles[0].id}` : '/outbound_voice_profiles', profiles[0] ? 'PATCH' : 'POST', profileSettings)).data;
  const applications = (await telnyxRequest(c, '/texml_applications?page[size]=100')).data.filter(a => a.friendly_name === appName);
  if (applications.length > 1) throw new Error('ambiguous_telnyx_application');
  const applicationSettings = { friendly_name: appName, active: true, voice_method: 'post', voice_url: `${base(c)}/inbound`,
    voice_fallback_url: `${base(c)}/fallback`, status_callback: `${base(c)}/status`, status_callback_method: 'post',
    inbound: { channel_limit: 2, shaken_stir_enabled: true, sip_subdomain_receive_settings: 'only_my_connections' },
    outbound: { channel_limit: 1, outbound_voice_profile_id: profile.id } };
  const application = (await telnyxRequest(c, applications[0] ? `/texml_applications/${applications[0].id}` : '/texml_applications', applications[0] ? 'PATCH' : 'POST', applicationSettings)).data;
  const numbers = (await telnyxRequest(c, `/phone_numbers?filter[phone_number]=${encodeURIComponent(c.TELNYX_NUMBER)}`)).data.filter(n => n.phone_number === c.TELNYX_NUMBER);
  if (numbers.length !== 1 || numbers[0].status !== 'active') throw new Error('purchased_telnyx_number_required');
  const n = numbers[0];
  if (n.connection_id && n.connection_id !== application.id) throw new Error('number_already_assigned');
  try { await writeFile(`artifacts/private/telnyx-number-${n.id}.json`, JSON.stringify(n), { mode: 0o600, flag: 'wx' }); }
  catch (e) { if (e.code !== 'EEXIST') throw e; }
  await telnyxRequest(c, `/phone_numbers/${n.id}`, 'PATCH', { connection_id: application.id, tags: ['shield-forwarding-pilot'] });
  c.TELNYX_APPLICATION_ID = application.id;
  await verifyTelnyxSetup(c);
  return c;
}
