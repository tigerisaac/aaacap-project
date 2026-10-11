import { readFile } from 'node:fs/promises';
import { connect } from './firebase-client.mjs';
import { rest } from './lib/firestore-rest.mjs';
import { Vault } from '../dist/crypto.js';

// One-time move of the single-person pilot to the ten-person layout. COPY ONLY: the old forwarding/control
// document stays, so the deployed single-person code keeps working until the new code is deployed.
// Usage: node scripts/migrate-to-registry.mjs            (dry run: prints the plan, writes nothing)
//        node scripts/migrate-to-registry.mjs --confirm  (writes; owner approval required, it changes production)
// Never prints phone numbers other than Shield's own.
async function main() {
  const confirm = process.argv.includes('--confirm');
  const config = JSON.parse(await readFile('artifacts/private/firebase-runtime.json', 'utf8'));
  const { TRIAL_PARTICIPANT_ID: id, TELNYX_NUMBER: number, TRIAL_VERIFIED_CALLER: phone } = config;
  if (!/^[0-9a-f-]{36}$/.test(id ?? '') || !/^\+1[2-9]\d{9}$/.test(number ?? '') || !/^\+1\d{10}$/.test(phone ?? '')) throw new Error('single_person_config_required');
  await connect();
  const db = rest(), vault = new Vault(config.DATA_ENCRYPTION_KEY);
  const [person, legacyControl, control, registry] = await Promise.all([db.read(`participants/${id}`), db.read('forwarding/control'),
    db.read(`participants/${id}/forwarding/control`), db.read(`shieldNumbers/${number}`)]);
  if (!person) throw new Error('participant_missing');
  // The dial target moves from the runtime secret to the participant record: they must already agree.
  if (vault.open(person.data.phoneEnc, `person:${id}:phone`) !== phone) throw new Error('participant_phone_differs_from_runtime');
  if (registry && (registry.data.state !== 'assigned' || registry.data.participantId !== id)) throw new Error('number_registered_to_someone_else');
  if (person.data.shieldNumber && person.data.shieldNumber !== number) throw new Error('participant_has_another_number');
  const plan = [
    !registry && { write: `shieldNumbers/${number}`, data: { state: 'assigned', participantId: id, assignedAt: Date.now() } },
    !control && legacyControl && { write: `participants/${id}/forwarding/control`, data: legacyControl.data, note: 'copy of forwarding/control' },
    !person.data.shieldNumber && { write: `participants/${id}`, data: { shieldNumber: number, carrier: 'tello' } }
  ].filter(Boolean);
  console.log(JSON.stringify({ shieldNumber: number, participantPhoneMatches: true, plan: plan.map(p => ({ write: p.write, fields: Object.keys(p.data), note: p.note })) }, null, 2));
  if (!plan.length) { console.log('Already migrated. Nothing to write.'); return; }
  if (!confirm) { console.log('Dry run. Re-run with --confirm to write.'); return; }
  for (const step of plan) await db.patch(step.write, step.data, step.write.startsWith('participants/') && !step.write.endsWith('control') ? {} : { exists: false });
  console.log('Migrated. forwarding/control was left in place; deploy the ten-person code next, then re-verify the line with a real call.');
}
main().catch(e => { console.error('Migration failed:', /^[a-z_]+$/.test(e.message ?? '') ? e.message : e.code ?? e.status ?? e.name); process.exitCode = 1; });
