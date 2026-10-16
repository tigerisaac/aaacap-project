import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { resolve } from 'node:path';

// Start the assembled artifact with synthetic credentials. No phone, database or model request is made.
const stage = resolve(process.argv[2] ?? 'artifacts/live-bridge');
const reservation = createServer();
await new Promise(done => reservation.listen(0, '127.0.0.1', done));
const port = reservation.address().port;
await new Promise(done => reservation.close(done));
const runtime = { FIREBASE_WEB_API_KEY: 'test', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app',
  TRIAL_PROXY_SECRET: 'a'.repeat(64), DATA_ENCRYPTION_KEY: 'b'.repeat(64), TELNYX_API_KEY: 'test'.repeat(8),
  TELNYX_PUBLIC_KEY: Buffer.alloc(32).toString('base64'), TELNYX_ACCOUNT_ID: randomUUID(), TELNYX_APPLICATION_ID: '123456789',
  TELNYX_SHARED_APPLICATION_ID: '987654321', SHARED_NUMBER_ENABLED: true, TELNYX_NUMBER: '+12025550999' };
const child = spawn(process.execPath, [`${stage}/lib/live/server.js`], { env: { ...process.env, PORT: String(port),
  GCLOUD_PROJECT: 'demo-shield-package', SHIELD_RUNTIME: JSON.stringify(runtime), OPENAI_API_KEY: 'test', SONIOX_API_KEY: 'test', SHIELD_SCREENING_MODE: process.argv.includes('--hybrid') ? 'hybrid' : 'live' }, stdio: 'ignore' });
let spawnFailed = false;
child.on('error', () => { spawnFailed = true; });
try {
  let health;
  for (let attempt = 0; attempt < 30; attempt++) {
    if (spawnFailed || child.exitCode !== null) break;
    try { const response = await fetch(`http://127.0.0.1:${port}/ready`, { signal: AbortSignal.timeout(1000) }); if (response.ok) health = await response.json(); } catch {}
    if (health) break;
    await new Promise(done => setTimeout(done, 200));
  }
  assert.equal(health?.status, 'ready', 'packaged bridge failed to start');
  assert.equal(health.sharedTransport, 'call-control-v1');
  assert.equal(health.startupProtocol, 1);
  assert.equal(health.maxSessions, 10);
  assert.equal(health.screeningMode, process.argv.includes('--hybrid') ? 'hybrid' : 'live');
  if (process.argv.includes('--hybrid')) assert.equal(health.transcriptionModel, 'stt-rt-v5');
  assert.equal(health.waitAcknowledgement, true);
  console.log(JSON.stringify({ packagedBridgeStartup: 'passed', policyVersion: health.policyVersion, maxSessions: health.maxSessions }));
} finally { child.kill(); }
