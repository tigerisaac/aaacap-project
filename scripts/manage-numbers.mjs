import { readFile } from 'node:fs/promises';
import { connect } from './firebase-client.mjs';
import { rest } from './lib/firestore-rest.mjs';
import { telnyxRequest } from './telnyx-provider.mjs';

// Shield number registry: one number per enrolled person (docs/TEN-PERSON-PILOT-PLAN.md). Operator-only and it changes
// production (and buys or releases paid numbers), so every write needs --confirm and the owner's approval.
//   list
//   buy --area 512 [--count 1] --confirm      order local numbers onto the Shield TeXML application; they start `available`
//   assign <+1...> --participant <id> --carrier tello --confirm
//   quarantine <+1...> --confirm               when a person leaves; never reassigned while quarantined
//   release <+1...> --confirm                  only after 90 days in quarantine and 30 days without a call
const QUARANTINE_MS = 90 * 86400_000, QUIET_MS = 30 * 86400_000;
const CARRIERS = ['tello', 'tmobile', 'att'];
const arg = name => { const at = process.argv.indexOf(name); return at >= 0 ? process.argv[at + 1] : undefined; };
const e164 = value => { if (!/^\+1[2-9]\d{9}$/.test(value ?? '')) throw new Error('shield_number_required'); return value; };

async function main() {
  const [command, target] = process.argv.slice(2), confirm = process.argv.includes('--confirm');
  if (!['list', 'buy', 'assign', 'quarantine', 'release'].includes(command)) throw new Error('unknown_command');
  const config = JSON.parse(await readFile('artifacts/private/firebase-runtime.json', 'utf8'));
  await connect(); const db = rest(), now = Date.now();
  const write = async (description, action) => { if (!confirm) { console.log(`Dry run: would ${description}. Re-run with --confirm.`); return; } await action(); console.log(`Done: ${description}.`); };

  if (command === 'list') {
    const rows = await db.list('shieldNumbers');
    console.log(JSON.stringify(rows.map(r => ({ number: r.id, state: r.data.state, participantId: r.data.participantId ?? null,
      since: new Date(r.data.quarantinedAt ?? r.data.assignedAt ?? r.data.createdAt ?? 0).toISOString() })), null, 2)); return;
  }
  if (command === 'buy') {
    const area = arg('--area') ?? '512', count = Math.min(5, Math.max(1, Number(arg('--count')) || 1));
    if (!/^[2-9]\d{2}$/.test(area)) throw new Error('area_code_required');
    const found = (await telnyxRequest(config, `/available_phone_numbers?filter[national_destination_code]=${area}&filter[country_code]=US&filter[features][]=voice&filter[limit]=${count}`)).data ?? [];
    if (found.length < count) throw new Error('not_enough_numbers_available');
    const numbers = found.slice(0, count).map(n => n.phone_number);
    await write(`order ${numbers.join(', ')} on the Shield application`, async () => {
      await telnyxRequest(config, '/number_orders', 'POST', { phone_numbers: numbers.map(phone_number => ({ phone_number })), connection_id: config.TELNYX_APPLICATION_ID });
      // Orders complete asynchronously; a number joins the registry as available, unassigned, right away.
      for (const number of numbers) await db.patch(`shieldNumbers/${number}`, { state: 'available', participantId: null, createdAt: now }, { exists: false });
    }); return;
  }
  const number = e164(target), entry = await db.read(`shieldNumbers/${number}`);
  if (!entry) throw new Error('number_not_registered');
  if (command === 'assign') {
    const participantId = arg('--participant'), carrier = arg('--carrier');
    if (!/^[0-9a-f-]{36}$/.test(participantId ?? '')) throw new Error('participant_required');
    if (!CARRIERS.includes(carrier)) throw new Error('carrier_required');
    if (entry.data.state !== 'available') throw new Error('number_not_available');
    const person = await db.read(`participants/${participantId}`);
    if (!person || person.data.status === 'offboarded') throw new Error('participant_missing');
    if (person.data.shieldNumber) throw new Error('participant_already_has_a_number');
    const owned = (await telnyxRequest(config, `/phone_numbers?filter[phone_number]=${encodeURIComponent(number)}`)).data?.filter(n => n.phone_number === number);
    if (owned?.length !== 1 || owned[0].status !== 'active' || owned[0].connection_id !== config.TELNYX_APPLICATION_ID) throw new Error('telnyx_number_not_ready');
    await write(`assign ${number} to ${participantId} (${carrier})`, async () => {
      await db.patch(`shieldNumbers/${number}`, { state: 'assigned', participantId, assignedAt: now, telnyxNumberId: owned[0].id }, { updateTime: entry.updateTime });
      await db.patch(`participants/${participantId}`, { shieldNumber: number, carrier }, { updateTime: person.updateTime });
      await db.patch(`participants/${participantId}/forwarding/control`, { provisioned: false, enabled: false, used: 0 }, { exists: false }).catch(e => { if (e.status !== 409 && e.status !== 400) throw e; });
    }); return;
  }
  if (command === 'quarantine') {
    if (entry.data.state !== 'assigned') throw new Error('number_not_assigned');
    await write(`quarantine ${number}; calls to it will be refused and logged`, () =>
      db.patch(`shieldNumbers/${number}`, { state: 'quarantine', quarantinedAt: now }, { updateTime: entry.updateTime })); return;
  }
  // Release: never while forwarding may still point here. Telnyx could resell it and a stranger would get her calls.
  if (entry.data.state !== 'quarantine' || !(now - entry.data.quarantinedAt >= QUARANTINE_MS)) throw new Error('quarantine_not_finished');
  if (entry.data.lastCalledAt && now - entry.data.lastCalledAt < QUIET_MS) throw new Error('number_still_receiving_calls');
  if (!entry.data.telnyxNumberId) throw new Error('telnyx_number_id_missing');
  await write(`release ${number} back to Telnyx`, async () => {
    await telnyxRequest(config, `/phone_numbers/${entry.data.telnyxNumberId}`, 'DELETE');
    await db.patch(`shieldNumbers/${number}`, { state: 'released', releasedAt: now, participantId: null }, { updateTime: entry.updateTime });
  });
}
main().catch(e => { console.error('Number operation failed:', /^[a-z_]+$/.test(e.message ?? '') ? e.message : e.code ?? e.status ?? e.name); process.exitCode = 1; });
