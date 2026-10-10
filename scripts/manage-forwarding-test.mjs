import { readFile, writeFile } from 'node:fs/promises';
import twilio from 'twilio';
import { connect, firestore, documentRoot, fields } from './firebase-client.mjs';
import { forwardingConsent } from '../dist/cloud/forwarding-store.js';
import { verifyTelnyxSetup } from './telnyx-provider.mjs';

// Explicit operator actions only; never run from an app request or on deployment.
async function main() {
  const command = process.argv[2] ?? 'status';
  if (!['status', 'provider-blocked', 'prepare', 'open', 'close'].includes(command)) throw new Error('unknown_command');
  const config = JSON.parse(await readFile('artifacts/private/firebase-runtime.json', 'utf8'));
  await connect(); const db = firestore();
  const controlPath = `${documentRoot}/forwarding/control`, personPath = `${documentRoot}/participants/${config.TRIAL_PARTICIPANT_ID}`;
  const decode = v => 'mapValue' in v ? decodeFields(v.mapValue.fields ?? {}) : 'arrayValue' in v ? (v.arrayValue.values ?? []).map(decode)
    : 'integerValue' in v ? Number(v.integerValue) : v.stringValue ?? v.booleanValue ?? null;
  const decodeFields = f => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, decode(v)]));
  const read = async path => { try { return decodeFields((await db.get(path)).body.fields ?? {}); } catch (e) { if (e.status === 404) return {}; throw e; } };
  const patch = (path, data) => db.patch(path, { fields: fields(data) }, { queryParams: new URLSearchParams(Object.keys(data).map(key => ['updateMask.fieldPaths', key])) });
  const consent = forwardingConsent(config);
  const [person, control] = await Promise.all([read(personPath), read(controlPath)]);
  if (!person.ownerUid || !person.phoneVerifiedAt) throw new Error('verified_owner_required');
  if (command === 'status') {
    console.log(JSON.stringify({ provisioned: !!control.provisioned, blocker: control.blocker ?? null,
      dataPlanConfirmed: !!control.dataPlanConfirmed, restorationGuideSaved: !!control.restorationGuide?.length,
      consented: person.forwardingConsent === consent, stage: person.forwardingStage ?? 'overview',
      active: !!control.enabled && control.expiresAt > Date.now(), used: control.used ?? 0,
      activeCall: !!control.activeCallId, expiresAt: control.expiresAt ? new Date(control.expiresAt).toISOString() : null }, null, 2)); return;
  }
  if (command === 'provider-blocked') {
    if (control.provisioned) throw new Error('already_provisioned');
    await patch(controlPath, { enabled: false, provisioned: false, blocker: 'provider_upgrade_required',
      dataPlanConfirmed: process.argv.includes('--data-confirmed') || !!control.dataPlanConfirmed });
    console.log('Recorded the provider blocker. No phone routing changed.'); return;
  }
  if (command === 'close') {
    await patch(controlPath, { enabled: false });
    await patch(personPath, { status: 'restoring', forwardingStage: 'restore' });
    console.log('Callbacks disabled. Carrier restoration and physical verification are still required.'); return;
  }
  const provider = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN, { timeout: 5000, autoRetry: false });
  let numbers = [];
  if (config.FORWARDING_PROVIDER === 'telnyx') await verifyTelnyxSetup(config);
  else {
    const [account, owned] = await Promise.all([provider.api.accounts(config.TWILIO_ACCOUNT_SID).fetch(),
      provider.incomingPhoneNumbers.list({ phoneNumber: config.TRIAL_TWILIO_NUMBER })]);
    if (account.status !== 'active' || account.type !== 'Full' || owned.length !== 1 || !owned[0].capabilities.voice) throw new Error('paid_voice_number_required');
    numbers = owned;
  }
  if (command === 'prepare') {
    if (control.activeCallId) throw new Error('call_still_active');
    const guide = JSON.parse(await readFile('artifacts/private/tello-restoration.json', 'utf8'));
    if (!guide.originalSettingsRecorded || !Array.isArray(guide.steps) || guide.steps.length < 3 || guide.steps.some(s => typeof s !== 'string' || !s.trim())) throw new Error('restoration_guide_required');
    if (config.FORWARDING_PROVIDER !== 'telnyx') {
    const number = numbers[0];
    const backup = { numberSid: number.sid, voiceUrl: number.voiceUrl, voiceMethod: number.voiceMethod,
      voiceFallbackUrl: number.voiceFallbackUrl, voiceFallbackMethod: number.voiceFallbackMethod,
      statusCallback: number.statusCallback, statusCallbackMethod: number.statusCallbackMethod };
    const backupPath = `artifacts/private/forwarding-number-${number.sid}.json`;
    try { await writeFile(backupPath, JSON.stringify(backup), { flag: 'wx', mode: 0o600 }); } catch (e) { if (e.code !== 'EEXIST') throw e; }
    const url = step => `${config.PUBLIC_BASE_URL}/forwarding/${config.TRIAL_PROXY_SECRET}/${step}`;
    await provider.incomingPhoneNumbers(number.sid).update({ voiceUrl: url('inbound'), voiceMethod: 'POST',
      voiceFallbackUrl: url('fallback'), voiceFallbackMethod: 'POST', statusCallback: url('status'), statusCallbackMethod: 'POST' });
    const saved = await provider.incomingPhoneNumbers(number.sid).fetch();
    if (saved.voiceUrl !== url('inbound') || saved.statusCallback !== url('status')) throw new Error('webhook_readback_failed');
    }
    await patch(controlPath, { provisioned: true, provider: config.FORWARDING_PROVIDER ?? 'twilio', enabled: false, blocker: null, restorationGuide: guide.steps,
      dataPlanConfirmed: !!control.dataPlanConfirmed, preparedAt: Date.now() });
    console.log('Regular voice number configured and read back. The callback window remains closed.'); return;
  }
  if (!process.argv.includes('--allow-any-caller')) throw new Error('explicit_caller_scope_required');
  if (!control.provisioned || !control.dataPlanConfirmed || !control.restorationGuide?.length || control.activeCallId
    || person.status !== 'setup' || person.forwardingConsent !== consent) throw new Error('setup_prerequisites_incomplete');
  await patch(controlPath, { enabled: true, allowAnyCaller: true, used: 0, startedAt: Date.now(), expiresAt: Date.now() + 1800_000 });
  console.log('Opened one 30-minute test window: any caller, ten screened calls, one callback at a time, five minutes per connection.');
}
main().catch(e => { console.error('Forwarding operation failed:', /^[a-z_]+$/.test(e.message ?? '') ? e.message : e.code ?? e.status ?? e.name); process.exitCode = 1; });
