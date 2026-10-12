import { readFile, writeFile, mkdir, open, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { telnyxRequest } from './telnyx-provider.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dir = resolve(root, 'artifacts/private/shared-number-test');
const snapshotPath = resolve(dir, 'maintenance.json');
const restoredPath = resolve(dir, 'maintenance-restored.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const save = async (path, data) => writeFile(path, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
const exists = async path => { try { await access(path); return true; } catch { return false; } };

// Read back after every change, including a timed-out PATCH whose outcome is unknown.
// Never overwrite an assignment made by another operator.
export async function restoreAssignment(request, snapshot) {
  const path = `/phone_numbers/${snapshot.numberId}`;
  const current = (await request(path)).data;
  if (current.phone_number !== snapshot.destination) throw new Error('number_identity_changed');
  if (current.connection_id === snapshot.originalConnectionId) return;
  if (current.connection_id !== snapshot.testApplicationId) throw new Error('assignment_changed_by_another_operator');
  try { await request(path, 'PATCH', { connection_id: snapshot.originalConnectionId }); } catch { /* Read back an uncertain result. */ }
  const after = (await request(path)).data;
  if (after.connection_id !== snapshot.originalConnectionId) throw new Error('restoration_not_verified');
}

async function restore(request, snapshot) {
  await restoreAssignment(request, snapshot);
  // The original production application is never modified.
  await request(`/call_control_applications/${snapshot.testApplicationId}`, 'PATCH', { active: false });
  await save(restoredPath, { runId: snapshot.runId, restoredAt: new Date().toISOString(), assignmentVerified: true });
  console.log('RESTORED: original Shield number assignment verified; diagnostic application inactive.');
}
async function wasRestored(snapshot) {
  try { return (await read(restoredPath)).runId === snapshot.runId; } catch { return false; }
}
async function restoreWithRetry(request, snapshot) {
  // Keep retrying if the network/provider is down. A separate watchdog also retries.
  for (;;) {
    try { await restore(request, snapshot); return; }
    catch (error) {
      console.error('Restoration needs attention; retrying in 15 seconds. No provider details logged.');
      if (error.message === 'assignment_changed_by_another_operator' || error.message === 'number_identity_changed') throw error;
      await sleep(15_000);
    }
  }
}
async function healthy(base) {
  try {
    const r = await fetch(new URL('/health', base), { signal: AbortSignal.timeout(4000), redirect: 'error' });
    const body = await r.json(); return r.ok && body.ready === true && body.diagnosticOnly === true;
  } catch { return false; }
}
async function noActiveCalls(request, id) {
  const result = await request(`/connections/${id}/active_calls`);
  if (!Array.isArray(result.data) || result.data.length || Number(result.meta?.total_results ?? 0) > 0) throw new Error('active_calls_or_unknown_state');
}

async function main() {
  const mode = process.argv[2];
  if (!['run', 'restore', 'watchdog'].includes(mode)) throw new Error('use_run_or_restore');
  const credentials = await read(resolve(dir, 'credentials.json'));
  const request = (path, method, body) => telnyxRequest(credentials, path, method, body);
  if (mode === 'restore') return restoreWithRetry(request, await read(snapshotPath));
  if (mode === 'watchdog') {
    const snapshot = await read(snapshotPath);
    await save(resolve(dir, 'watchdog-ready.json'), { runId: snapshot.runId });
    while (Date.now() < snapshot.expiresAt) {
      if (await wasRestored(snapshot)) return;
      try { process.kill(snapshot.supervisorPid, 0); } catch { break; }
      await sleep(2000);
    }
    return restoreWithRetry(request, snapshot);
  }
  if (process.argv[3] !== '--owner-authorized') throw new Error('owner_authorization_required');
  await mkdir(dir, { recursive: true, mode: 0o700 });
  if (await exists(snapshotPath)) {
    const previous = await read(snapshotPath);
    if (!await wasRestored(previous)) throw new Error('previous_window_requires_restoration');
    await save(resolve(dir, `maintenance-${previous.runId}.json`), previous);
  }
  const meta = await read(resolve(dir, 'application.json'));
  const base = new URL(process.env.SHARED_TEST_WEBHOOK_BASE_URL ?? '');
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.pathname !== '/') throw new Error('https_origin_required');
  const destination = '+15074731802';
  const numbers = (await request(`/phone_numbers?filter[phone_number]=${encodeURIComponent(destination)}`)).data;
  const matches = numbers?.filter(n => n.phone_number === destination && n.status === 'active');
  if (matches?.length !== 1 || !matches[0].connection_id || matches[0].connection_id === meta.id) throw new Error('original_assignment_required');
  const number = matches[0];
  const [production, diagnostic] = await Promise.all([
    request(`/texml_applications/${number.connection_id}`), request(`/call_control_applications/${meta.id}`),
  ]);
  if (!production.data.active || diagnostic.data.application_name !== 'Shield shared-number diagnostic'
    || diagnostic.data.active !== false || Number(diagnostic.data.inbound?.channel_limit) < 2) throw new Error('application_state_invalid');
  await noActiveCalls(request, number.connection_id);
  await noActiveCalls(request, meta.id);
  const snapshot = { runId: String(Date.now()), supervisorPid: process.pid, destination, numberId: number.id,
    originalConnectionId: number.connection_id, testApplicationId: meta.id, expiresAt: Date.now() + 30 * 60_000,
    number, productionApplication: production.data, diagnosticApplication: diagnostic.data };
  await save(snapshotPath, snapshot);
  const configPath = resolve(dir, 'config.json');
  const oldConfig = await read(configPath);
  await save(resolve(dir, `config-before-${snapshot.runId}.json`), oldConfig);
  await save(configPath, { ...oldConfig, applicationId: meta.id, destination, caseId: 'overlap', productionTestUntil: snapshot.expiresAt });
  let probe, stopRequested = false;
  process.once('SIGTERM', () => { stopRequested = true; });
  process.once('SIGINT', () => { stopRequested = true; });
  // Independent process survives an unexpected supervisor exit. Both require this
  // computer and Internet access; this is not a provider-side timed assignment.
  const watchLog = await open(resolve(dir, 'watchdog.log'), 'a', 0o600);
  const watcher = spawn(process.execPath, [fileURLToPath(import.meta.url), 'watchdog'], {
    cwd: root, detached: true, stdio: ['ignore', watchLog.fd, watchLog.fd],
  });
  watcher.on('error', () => { stopRequested = true; }); watcher.unref(); await watchLog.close();
  try {
    let watchReady = false;
    for (let i = 0; i < 20; i++) {
      try { watchReady = (await read(resolve(dir, 'watchdog-ready.json'))).runId === snapshot.runId; } catch {}
      if (watchReady) break; await sleep(250);
    }
    if (!watchReady || stopRequested) throw new Error('watchdog_not_ready');
    await request(`/call_control_applications/${meta.id}`, 'PATCH', {
      active: true, webhook_event_url: new URL('/webhooks/telnyx', base).href,
    });
    const log = await open(resolve(dir, `probe-${snapshot.runId}.log`), 'a', 0o600);
    probe = spawn(process.execPath, ['--env-file=.env.shared-number-test', 'scripts/shared-number-test.mjs', 'serve-maintenance'], {
      cwd: root, stdio: ['ignore', log.fd, log.fd],
    });
    probe.on('error', () => { stopRequested = true; }); await log.close();
    let ready = false;
    for (let i = 0; i < 20; i++) {
      if (probe.exitCode !== null || stopRequested) break;
      if (await healthy('http://127.0.0.1:8789') && await healthy(base)) { ready = true; break; }
      await sleep(1000);
    }
    if (!ready) throw new Error('probe_not_ready');
    const unsigned = await fetch(new URL('/webhooks/telnyx', base), { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(4000) });
    await unsigned.body?.cancel();
    if (unsigned.status !== 403) throw new Error('unsigned_webhook_not_rejected');
    await noActiveCalls(request, number.connection_id);
    const current = (await request(`/phone_numbers/${number.id}`)).data;
    if (current.connection_id !== number.connection_id || stopRequested || await wasRestored(snapshot)
      || snapshot.expiresAt - Date.now() < 60_000) throw new Error('assignment_or_window_changed');
    await request(`/phone_numbers/${number.id}`, 'PATCH', { connection_id: meta.id });
    if ((await request(`/phone_numbers/${number.id}`)).data.connection_id !== meta.id) throw new Error('test_assignment_not_verified');
    console.log(JSON.stringify({ testReady: true, destination, expiresAt: new Date(snapshot.expiresAt).toISOString(), maxConcurrent: oldConfig.maxConcurrent }));
    while (Date.now() < snapshot.expiresAt && !stopRequested && probe.exitCode === null && !await wasRestored(snapshot)) {
      await sleep(5000);
      if (!await healthy(base)) { console.error('Test endpoint unavailable; restoring Shield.'); break; }
    }
  } finally {
    // Restore new incoming traffic before shutting down the test listener.
    await restoreWithRetry(request, snapshot);
    if (probe?.exitCode === null) probe.kill('SIGTERM');
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('Maintenance command stopped: inspect private state and restore if needed. No raw provider response logged.'); process.exitCode = 1; });
}
