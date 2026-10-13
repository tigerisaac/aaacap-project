import { mkdir, readFile, writeFile, rename, chmod } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { telnyxRequest } from './telnyx-provider.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dir = resolve(root, 'artifacts/private/shared-number-test');
const configFile = resolve(dir, 'config.json');
const envFile = resolve(root, '.env.shared-number-test');
const mode = process.argv[2];
if (mode === 'init') {
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const config = { applicationId: 'REPLACE_WITH_TEST_CALL_CONTROL_APP_ID', destination: 'REPLACE_WITH_TEST_NUMBER_E164',
    lineA: 'REPLACE_WITH_VERIZON_E164', lineB: 'REPLACE_WITH_TMOBILE_E164',
    caseId: 'direct', holdSeconds: 120, maxCalls: 40, maxConcurrent: 2 };
  try {
    await writeFile(configFile, JSON.stringify(config, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    await writeFile(envFile, 'SHARED_TEST_TELNYX_API_KEY=\nSHARED_TEST_TELNYX_PUBLIC_KEY=\nSHARED_TEST_WEBHOOK_BASE_URL=\n', { flag: 'wx', mode: 0o600 });
    console.log('Created private config and environment templates. See docs/SHARED-NUMBER-TEST.md.');
  } catch { console.error('Templates already exist or could not be created; existing files were preserved.'); process.exitCode = 1; }
} else if (mode === 'check' || mode === 'serve' || mode === 'serve-maintenance') {
  try { await run(); } catch { console.error('Test setup failed. Check the private config, credentials, test application and guide. No raw provider response is printed.'); process.exitCode = 1; }
} else {
  console.log('Usage: node scripts/shared-number-test.mjs init|check|serve\nFor check/serve, load .env.shared-number-test with Node --env-file. Build first.');
  process.exitCode = mode === '--help' ? 0 : 1;
}

async function run() {
  const { probeConfig, SharedNumberProbe, createProbeServer } = await import('../dist/diagnostics/shared-number.js');
  const config = probeConfig.parse(JSON.parse(await readFile(configFile, 'utf8')));
  let maintenance;
  if (config.destination === '+15074731802') {
    maintenance = JSON.parse(await readFile(resolve(dir, 'maintenance.json'), 'utf8'));
    if (maintenance.destination !== config.destination || maintenance.testApplicationId !== config.applicationId
      || maintenance.expiresAt !== config.productionTestUntil || !maintenance.originalConnectionId
      || maintenance.originalConnectionId === config.applicationId) throw new Error('restoration_snapshot_required');
  }
  if (mode === 'serve-maintenance' && !maintenance) throw new Error('maintenance_required');
  const key = process.env.SHARED_TEST_TELNYX_API_KEY;
  const publicKey = process.env.SHARED_TEST_TELNYX_PUBLIC_KEY;
  if (!key || !publicKey || Buffer.from(publicKey, 'base64').length !== 32) throw new Error('credentials_required');
  const base = new URL(process.env.SHARED_TEST_WEBHOOK_BASE_URL ?? '');
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.pathname !== '/') throw new Error('https_origin_required');
  const webhook = new URL('/webhooks/telnyx', base).href;
  const credentials = { TELNYX_API_KEY: key };
  // GET-only preflight. Only the separate maintenance supervisor changes assignments.
  const [application, numbers] = await Promise.all([
    telnyxRequest(credentials, `/call_control_applications/${config.applicationId}`),
    telnyxRequest(credentials, `/phone_numbers?filter[phone_number]=${encodeURIComponent(config.destination)}`),
  ]);
  const a = application.data;
  const matches = numbers.data?.filter(n => n.phone_number === config.destination);
  const checks = {
    testApplication: a?.application_name === 'Shield shared-number diagnostic' && a?.active === true,
    webhook: a?.webhook_api_version === '2' && a?.webhook_event_url === webhook && !a?.webhook_event_failover_url,
    inboundCapacity: Number(a?.inbound?.channel_limit) >= config.maxConcurrent,
    unansweredTimeout: a?.first_command_timeout === true && Number(a?.first_command_timeout_secs) >= 10 && Number(a?.first_command_timeout_secs) <= 60,
    privateSipIngress: a?.inbound?.sip_subdomain_receive_settings === 'only_my_connections',
    assignedTestNumber: matches?.length === 1 && matches[0].status === 'active' && (matches[0].connection_id === config.applicationId
      || (mode === 'serve-maintenance' && matches[0].connection_id === maintenance?.originalConnectionId)),
  };
  console.log(JSON.stringify({ preflight: checks }));
  if (!Object.values(checks).every(Boolean)) throw new Error('preflight_failed');
  if (mode === 'check') return;
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const reportFile = resolve(dir, `report-${new Date().toISOString().replaceAll(':', '-')}.json`);
  let saveQueue = Promise.resolve();
  let reportFailure = false;
  let latestSummary = '';
  const probe = new SharedNumberProbe(config, async (id, action, body) => {
    // This command surface cannot dial, transfer, bridge, record or stream a call.
    if (!['answer', 'gather_using_audio', 'playback_start', 'hangup'].includes(action)) throw new Error('action_not_allowed');
    const response = await fetch(`https://api.telnyx.com/v2/calls/${encodeURIComponent(id)}/actions/${action}`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(4000),
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('provider_command_failed');
    await response.body?.cancel();
  }, () => {
    const report = probe.report();
    saveQueue = saveQueue.then(async () => {
      await writeFile(reportFile + '.tmp', JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
      await chmod(reportFile + '.tmp', 0o600);
      await rename(reportFile + '.tmp', reportFile);
    }).catch(() => { reportFailure = true; console.error('Report write failed; stop testing and check disk permissions.'); });
    const summary = JSON.stringify({ caseId: config.caseId, calls: report.calls,
      outcomes: report.rows.map(r => ({ test: r.probeId.slice(0, 8), expected: r.expected, observed: r.observation.candidate ?? r.observation.kind, result: r.result })),
      confirmedMatchedOverlapAB: report.confirmedMatchedOverlapAB, commandFailures: report.commandFailures });
    if (summary !== latestSummary) { console.log(summary); latestSummary = summary; }
  });
  const server = createProbeServer(probe, publicKey);
  await server.listen({ host: '127.0.0.1', port: 8789 });
  console.log(`Diagnostic ready on localhost port 8789. Calls last at most ${config.holdSeconds} seconds. Keep this terminal open; callers must hang up manually after ${config.holdSeconds + 30} seconds if still connected.`);
  console.log('Reports are private under artifacts/private/shared-number-test. Stop with Ctrl-C after restoring both test lines.');
  let stopping = false;
  const stop = async () => {
    if (stopping) return; stopping = true;
    console.log('Stopping: requesting hangup for remaining test calls. Restore forwarding and confirm all callers disconnected.');
    await server.close(); await saveQueue;
    if (reportFailure || probe.report().commandFailures) process.exitCode = 1;
  };
  process.once('SIGINT', () => { void stop(); });
  process.once('SIGTERM', () => { void stop(); });
  // Supervised experiment only: never leave an unattended public answering service.
  const stopTimer = setTimeout(() => { void stop(); }, Math.min(30 * 60 * 1000, (config.productionTestUntil ?? Infinity) - Date.now()));
  stopTimer.unref();
}
