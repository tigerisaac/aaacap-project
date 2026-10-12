import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { connect, firestore, documentRoot, fields } from './firebase-client.mjs';
import { rest } from './lib/firestore-rest.mjs';
import { telnyxRequest } from './telnyx-provider.mjs';
import { Vault } from '../dist/crypto.js';

// Operator-only. Every mutation defaults to a dry run. No purchases, calls, messages, or carrier-setting changes.
// prepare | enroll --participant UUID --carrier tello|tmobile|verizon | disable --participant UUID | status | cutover | rollback
// Add --confirm only after the owner approves production changes. Runtime and stage files stay ignored and private.
const arg = name => { const at = process.argv.indexOf(name); return at < 0 ? undefined : process.argv[at + 1]; };
async function main() {
  const command = process.argv[2] ?? 'status', confirm = process.argv.includes('--confirm');
  const c = JSON.parse(await readFile('artifacts/private/firebase-runtime.json', 'utf8'));
  const stage = JSON.parse(await readFile('artifacts/private/shared-telnyx-stage.json', 'utf8'));
  await connect(); const db = rest(), vault = new Vault(c.DATA_ENCRYPTION_KEY), now = Date.now();
  const poolPath = `shieldNumbers/${c.TELNYX_NUMBER}`, pool = await db.read(poolPath);
  const commit = async changes => {
    console.log(JSON.stringify({ command, dryRun: !confirm, documents: changes.length, placesCalls: false, purchasesNumbers: false }));
    if (!confirm || !changes.length) return;
    await firestore().post(`${documentRoot}:commit`, { writes: changes.map(({ path, data, existing }) => ({
      update: { name: `${documentRoot.slice(1)}/${path}`, fields: fields(data) }, updateMask: { fieldPaths: Object.keys(data) },
      currentDocument: existing ? { updateTime: existing.updateTime } : { exists: false }
    })) });
    for (const change of changes) {
      const saved = await db.read(change.path);
      if (!saved || Object.entries(change.data).some(([key, value]) => !isDeepStrictEqual(saved.data[key], value))) throw new Error('migration_readback_failed');
    }
  };
  if (command === 'prepare') {
    const id = c.TRIAL_PARTICIPANT_ID, personPath = `participants/${id}`;
    const [person, legacy, control] = await Promise.all([db.read(personPath), db.read('forwarding/control'), db.read(`${personPath}/forwarding/control`)]);
    if (!person?.data.phoneVerifiedAt || !legacy || vault.open(person.data.phoneEnc, `person:${id}:phone`) !== c.TRIAL_VERIFIED_CALLER) throw new Error('legacy_identity_not_verified');
    if (pool && !['assigned', 'shared'].includes(pool.data.state)) throw new Error('pool_conflict');
    if (pool?.data.participantId && pool.data.participantId !== id) throw new Error('pool_conflict');
    await commit([
      ...(!pool?.data.sharedPrepared ? [{ path: poolPath, existing: pool, data: { state: pool?.data.state ?? 'assigned', participantId: id, sharedPrepared: true, members: pool?.data.members ?? [], preparedAt: now } }] : []),
      ...(!person.data.shieldNumber ? [{ path: personPath, existing: person, data: { shieldNumber: c.TELNYX_NUMBER, carrier: 'tello' } }] : []),
      ...(!control ? [{ path: `${personPath}/forwarding/control`, data: legacy.data }] : [])
    ]); return;
  }
  if (command === 'status') {
    console.log(JSON.stringify({ prepared: !!pool?.data.sharedPrepared, mode: pool?.data.state ?? 'legacy', enrolled: pool?.data.members?.length ?? 0,
      capacity: 10, sharedApplicationId: stage.sharedApplicationId, deployedFlagInLocalConfig: c.SHARED_NUMBER_ENABLED === true })); return;
  }
  if (command === 'enroll' || command === 'disable') {
    const id = arg('--participant'); if (!/^[a-f0-9-]{36}$/.test(id ?? '')) throw new Error('participant_required');
    if (!pool?.data.sharedPrepared) throw new Error('prepare_pool_first');
    const path = `participants/${id}`, person = await db.read(path);
    if (!person?.data.phoneVerifiedAt || person.data.status !== 'setup') throw new Error('verified_participant_required');
    const phone = vault.open(person.data.phoneEnc, `person:${id}:phone`), routePath = `${poolPath}/routes/${vault.hash(phone)}`, route = await db.read(routePath);
    if (route && route.data.participantId !== id) throw new Error('route_quarantined');
    if (command === 'disable') {
      if (!route) throw new Error('route_missing');
      await commit([{ path: routePath, existing: route, data: { enabled: false, disabledAt: now, version: randomUUID() } }]); return;
    }
    const carrier = arg('--carrier'); if (!['tello', 'tmobile', 'verizon'].includes(carrier)) throw new Error('carrier_required');
    const members = new Set(pool.data.members ?? []); members.add(id); if (members.size > 10) throw new Error('pilot_full');
    if (person.data.shieldNumber && person.data.shieldNumber !== c.TELNYX_NUMBER) throw new Error('participant_has_another_number');
    if (route) { console.log('Already enrolled; qualification and enabled state preserved.'); return; }
    const controlPath = `${path}/forwarding/control`, control = await db.read(controlPath);
    await commit([{ path: poolPath, existing: pool, data: { members: [...members] } },
      { path, existing: person, data: { shieldNumber: c.TELNYX_NUMBER, carrier } },
      { path: routePath, data: { participantId: id, enabled: false, version: randomUUID(), carrier, enrolledAt: now } },
      ...(!control ? [{ path: controlPath, data: { provisioned: false, enabled: false, used: 0 } }] : [])]);
    return;
  }
  if (!['cutover', 'rollback'].includes(command)) throw new Error('unknown_command');
  const numbers = (await telnyxRequest(c, `/phone_numbers?filter[phone_number]=${encodeURIComponent(c.TELNYX_NUMBER)}`)).data.filter(n => n.phone_number === c.TELNYX_NUMBER);
  if (numbers.length !== 1) throw new Error('number_missing'); const number = numbers[0];
  const target = command === 'cutover' ? stage.sharedApplicationId : c.TELNYX_APPLICATION_ID;
  if (![stage.sharedApplicationId, c.TELNYX_APPLICATION_ID].includes(number.connection_id)) throw new Error('unexpected_number_assignment');
  for (const id of [stage.sharedApplicationId, c.TELNYX_APPLICATION_ID]) {
    const active = (await telnyxRequest(c, `/connections/${id}/active_calls`)).data;
    if (!Array.isArray(active) || active.length) throw new Error('active_calls_must_finish');
  }
  if (command === 'cutover') {
    if (!pool?.data.sharedPrepared || !pool.data.members?.length) throw new Error('enrollment_required');
    const ready = await fetch(`${c.PUBLIC_BASE_URL}/public/shared-ready`, { redirect: 'error', signal: AbortSignal.timeout(10000) });
    const body = await ready.json();
    if (!ready.ok || !body.enabled || body.applicationId !== stage.sharedApplicationId || body.version !== 'shared-v1') throw new Error('shared_backend_not_deployed');
    if (!c.LIVE_BRIDGE_URL) throw new Error('shared_bridge_not_configured');
    const bridgeResponse = await fetch(`${c.LIVE_BRIDGE_URL}/ready`, { redirect: 'error', signal: AbortSignal.timeout(10000) });
    const bridge = await bridgeResponse.json();
    if (!bridgeResponse.ok || bridge.sharedTransport !== 'call-control-v1' || bridge.maxSessions < 10) throw new Error('shared_bridge_not_deployed');
    const app = (await telnyxRequest(c, `/call_control_applications/${target}`)).data;
    if (app.inbound?.channel_limit !== 10 || app.outbound?.channel_limit !== 10 || app.webhook_event_url !== `${c.PUBLIC_BASE_URL}/voice/shared`) throw new Error('shared_app_not_prepared');
  }
  console.log(JSON.stringify({ command, dryRun: !confirm, sharedNumber: c.TELNYX_NUMBER, targetApplicationId: target, activeCalls: 0 }));
  if (!confirm) return;
  await mkdir('artifacts/private', { recursive: true });
  await writeFile(`artifacts/private/shared-switch-${now}.json`, JSON.stringify({ number, pool, command, at: now }), { mode: 0o600, flag: 'wx' });
  if (command === 'cutover') await telnyxRequest(c, `/call_control_applications/${target}`, 'PATCH', { active: true });
  // First prepare the registry. An unknown assignment outcome is read back before any rollback decision.
  await db.patch(poolPath, { state: command === 'cutover' ? 'shared' : 'assigned' }, { updateTime: pool.updateTime });
  try {
    await telnyxRequest(c, `/phone_numbers/${number.id}`, 'PATCH', { connection_id: target });
  } catch (error) {
    const current = (await telnyxRequest(c, `/phone_numbers/${number.id}`)).data;
    if (current.connection_id !== target) {
      if (current.connection_id === number.connection_id) await db.patch(poolPath, { state: pool.data.state });
      throw error;
    }
  }
  const final = (await telnyxRequest(c, `/phone_numbers/${number.id}`)).data;
  if (final.connection_id !== target) throw new Error('assignment_readback_failed');
  if (command === 'rollback') await telnyxRequest(c, `/call_control_applications/${stage.sharedApplicationId}`, 'PATCH', { active: false });
  console.log('Number assignment verified. No calls or messages placed.');
}
main().catch(e => { console.error(/^[a-z_0-9]+$/.test(e.message ?? '') ? e.message : 'shared_operation_failed'); process.exitCode = 1; });
