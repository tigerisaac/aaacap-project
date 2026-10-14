import { readFile, writeFile } from 'node:fs/promises';
import { connect, firestore, documentRoot, fields } from './firebase-client.mjs';
import { forwardingConsent } from '../dist/cloud/forwarding-store.js';
import { verifyTelnyxSetup } from './telnyx-provider.mjs';

// Explicit operator actions only; never run from an app request or on deployment.
// Usage: node scripts/manage-forwarding-test.mjs <command> [--participant <id>]
//   status | provider-blocked | prepare | open --allow-any-caller | close | always-on | always-off
// Without --participant it acts on the original pilot participant (TRIAL_PARTICIPANT_ID in the private runtime file).
async function main() {
  const command = process.argv[2] ?? 'status';
  if (!['status', 'provider-blocked', 'prepare', 'open', 'close', 'always-on', 'always-off'].includes(command)) throw new Error('unknown_command');
  const config = JSON.parse(await readFile('artifacts/private/firebase-runtime.json', 'utf8'));
  const at = process.argv.indexOf('--participant'), participantId = at >= 0 ? process.argv[at + 1] : config.TRIAL_PARTICIPANT_ID;
  if (!/^[0-9a-f-]{36}$/.test(participantId ?? '')) throw new Error('participant_required');
  await connect(); const db = firestore();
  const personPath = `${documentRoot}/participants/${participantId}`, controlPath = `${personPath}/forwarding/control`;
  const decode = v => 'mapValue' in v ? decodeFields(v.mapValue.fields ?? {}) : 'arrayValue' in v ? (v.arrayValue.values ?? []).map(decode)
    : 'integerValue' in v ? Number(v.integerValue) : v.stringValue ?? v.booleanValue ?? null;
  const decodeFields = f => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, decode(v)]));
  const read = async path => { try { return decodeFields((await db.get(path)).body.fields ?? {}); } catch (e) { if (e.status === 404) return {}; throw e; } };
  const patch = (path, data) => db.patch(path, { fields: fields(data) }, { queryParams: new URLSearchParams(Object.keys(data).map(key => ['updateMask.fieldPaths', key])) });
  const consent = forwardingConsent;
  const [person, control] = await Promise.all([read(personPath), read(controlPath)]);
  if (!person.ownerUid || !person.phoneVerifiedAt) throw new Error('verified_owner_required');
  if (!/^\+1[2-9]\d{9}$/.test(person.shieldNumber ?? '')) throw new Error('shield_number_not_assigned');
  if (command === 'status') {
    console.log(JSON.stringify({ shieldNumber: person.shieldNumber, carrier: person.carrier ?? null, alwaysOn: person.alwaysOn === true,
      ringTestAt: control.ringTestAt ? new Date(control.ringTestAt).toISOString() : null,
      forwardingTestAt: control.forwardingTestAt ? new Date(control.forwardingTestAt).toISOString() : null,
      provisioned: !!control.provisioned, blocker: control.blocker ?? null,
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
    await patch(personPath, { status: 'restoring', forwardingStage: 'restore', alwaysOn: false });
    console.log('Callbacks disabled. Carrier restoration and physical verification are still required.'); return;
  }
  // Always-on screening is switched on only after this person's supervised test calls have passed.
  if (command === 'always-off') { await patch(personPath, { alwaysOn: false }); console.log('Always-on screening is off; calls go to voicemail outside test windows.'); return; }
  if (command === 'always-on') {
    if (!control.provisioned || !control.ringTestAt || !control.forwardingTestAt || person.status !== 'setup' || person.forwardingConsent !== consent
      || !process.argv.includes('--supervised-calls-passed')) throw new Error('supervised_tests_required');
    await patch(personPath, { alwaysOn: true });
    console.log('Always-on screening is on for this person. Quiet hours apply; the person can pause it in the app.'); return;
  }
  await verifyTelnyxSetup(config, person.shieldNumber);
  if (command === 'prepare') {
    if (control.activeCallId) throw new Error('call_still_active');
    // Each person's own carrier settings, recorded before forwarding: never another person's guide.
    const guidePath = participantId === config.TRIAL_PARTICIPANT_ID ? 'artifacts/private/tello-restoration.json' : `artifacts/private/restoration-${participantId}.json`;
    const guide = JSON.parse(await readFile(guidePath, 'utf8'));
    if (!guide.originalSettingsRecorded || !Array.isArray(guide.steps) || guide.steps.length < 3 || guide.steps.some(s => typeof s !== 'string' || !s.trim())) throw new Error('restoration_guide_required');
    await patch(controlPath, { provisioned: true, provider: 'telnyx', enabled: false, blocker: null, restorationGuide: guide.steps,
      dataPlanConfirmed: !!control.dataPlanConfirmed, preparedAt: Date.now() });
    console.log('Regular voice number configured and read back. The callback window remains closed.'); return;
  }
  if (!process.argv.includes('--allow-any-caller')) throw new Error('explicit_caller_scope_required');
  if (!control.provisioned || !control.dataPlanConfirmed || !control.restorationGuide?.length || control.activeCallId
    || person.status !== 'setup' || person.forwardingConsent !== consent) throw new Error('setup_prerequisites_incomplete');
  await patch(controlPath, { enabled: true, allowAnyCaller: true, used: 0, startedAt: Date.now(), expiresAt: Date.now() + 1800_000 });
  console.log('Opened one 30-minute test window: any caller, ten screened calls, one callback at a time, 60 minutes per connection.');
}
main().catch(e => { console.error('Forwarding operation failed:', /^[a-z_]+$/.test(e.message ?? '') ? e.message : e.code ?? e.status ?? e.name); process.exitCode = 1; });
