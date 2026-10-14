// Owner-authorized, narrow production rollout. Private source/config/rollback evidence stays ignored.
// Order: prepare, worker (scoped Firebase CLI below), permissions, deploy-dispatcher, status-dispatcher,
// verify-dispatcher, deploy-api, status-api, verify-api, smoke, verify.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, cp, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { connect, Client, project, firestore, documentRoot, fields } from './firebase-client.mjs';

const dir = 'artifacts/private/monitor-hour-release', parent = `/projects/${project}/locations/us-central1`;
const identity = `shield-runtime@${project}.iam.gserviceaccount.com`;
const read = async name => JSON.parse(await readFile(`${dir}/${name}`));
const save = (name, data) => writeFile(`${dir}/${name}`, JSON.stringify(data, null, 2), { mode: 0o600 });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const cf = new Client({ urlPrefix: 'https://cloudfunctions.googleapis.com', apiVersion: 'v2' });
const run = new Client({ urlPrefix: 'https://run.googleapis.com', apiVersion: 'v2' });
const tasks = new Client({ urlPrefix: 'https://cloudtasks.googleapis.com', apiVersion: 'v2' });
const queue = `${parent}/queues/monitorScheduledCall`;
const targets = { api: 'shieldApi', dispatcher: 'monitorConnectedCall' };
const configuration = f => { const service = structuredClone(f.serviceConfig); delete service.revision;
  return { service, event: f.eventTrigger, labels: f.labels, environment: f.environment }; };
async function noActiveCalls() {
  let leases = {};
  try { leases = (await firestore().get(`${documentRoot}/sharedCapacity/calls`)).body.fields?.leases?.mapValue?.fields ?? {}; }
  catch (e) { if (e.status !== 404) throw e; }
  assert.equal(Object.keys(leases).length, 0, 'active_calls_present');
}
async function manifest(root) {
  const result = {};
  async function walk(path = '') { for (const f of await readdir(`${root}/${path}`, { withFileTypes: true })) {
    const next = path ? `${path}/${f.name}` : f.name;
    if (f.isDirectory()) await walk(next); else result[next] = hash(await readFile(`${root}/${next}`));
  } }
  await walk(); return result;
}
async function download(source) {
  const storage = new Client({ urlPrefix: 'https://storage.googleapis.com', apiVersion: 'storage/v1' });
  const r = await storage.get(`/b/${source.bucket}/o/${encodeURIComponent(source.object)}`, {
    responseType: 'stream', resolveOnHTTPError: true, queryParams: { alt: 'media', ...(source.generation ? { generation: source.generation } : {}) }
  });
  assert.ok(r.status < 400, 'source_download_failed'); const chunks = [];
  for await (const chunk of r.body) chunks.push(chunk); return Buffer.concat(chunks);
}
let phase = 'initialization';
try {
  await connect(); await mkdir(dir, { recursive: true });
  const command = process.argv[2];
  if (command === 'prepare') {
    await noActiveCalls();
    const functions = (await cf.get(`${parent}/functions`)).body.functions;
    assert.ok(!functions.some(f => f.name.endsWith('/monitorScheduledCall')), 'worker_already_exists');
    const service = (await run.get(`${parent}/services/shield-live`)).body, iam = {};
    for (const name of Object.values(targets)) {
      const f = functions.find(f => f.name.endsWith('/' + name)); assert.equal(f.state, 'ACTIVE');
      iam[name] = (await run.get('/' + f.serviceConfig.service + ':getIamPolicy')).body;
    }
    await writeFile(`${dir}/before.json`, JSON.stringify({ at: new Date().toISOString(), functions, service, iam }, null, 2), { flag: 'wx', mode: 0o600 });
    const manifests = {};
    for (const [kind, name] of Object.entries(targets)) {
      const f = functions.find(f => f.name.endsWith('/' + name));
      const bytes = await download(f.buildConfig.source.storageSource);
      await writeFile(`${dir}/${kind}-base.zip`, bytes, { mode: 0o600, flag: 'wx' });
      const entries = execFileSync('/usr/bin/unzip', ['-Z1', `${dir}/${kind}-base.zip`], { encoding: 'utf8' }).trim().split('\n');
      assert.ok(entries.every(p => !p.startsWith('/') && !p.split('/').includes('..')));
      await mkdir(`${dir}/${kind}-base`); execFileSync('/usr/bin/unzip', ['-q', `${dir}/${kind}-base.zip`, '-d', `${dir}/${kind}-base`]);
      await cp(`${dir}/${kind}-base`, `${dir}/${kind}-package`, { recursive: true, errorOnExist: true, force: false });
      const base = await manifest(`${dir}/${kind}-base`);
      const modules = kind === 'api' ? ['monitoring', 'monitor-cadence'] : ['index', 'monitoring', 'monitor-cadence', 'monitor-queue'];
      for (const module of modules) await cp(`dist/cloud/${module}.js`, `${dir}/${kind}-package/lib/cloud/${module}.js`);
      // The existing monitor policy and all warning scripts must be byte-identical.
      const before = await import(`../${dir}/${kind}-base/lib/cloud/monitoring.js`);
      const after = await import('../dist/cloud/monitoring.js');
      assert.deepEqual(after.monitorRequest('synthetic'), before.monitorRequest('synthetic'), 'monitor_policy_changed');
      for (const concern of ['code_or_password','payment_or_transfer','remote_access','identity_numbers','secrecy','investment','call_another_number','save_number','open_link']) {
        assert.equal(after.warningText(concern), before.warningText(concern));
      }
      const candidate = await manifest(`${dir}/${kind}-package`);
      const changed = Object.keys(candidate).filter(p => candidate[p] !== base[p]);
      assert.deepEqual(changed.sort(), modules.map(m => `lib/cloud/${m}.js`).sort());
      manifests[kind] = { baseRevision: f.serviceConfig.revision, base, candidate, changed };
      execFileSync('/usr/bin/zip', ['-qr', `../${kind}-candidate.zip`, '.'], { cwd: `${dir}/${kind}-package` });
    }
    // Only this new task function is deployed by the CLI; the two existing services use exact-source patches.
    await save('firebase.json', { functions: [{ source: 'dispatcher-package', codebase: 'shield', runtime: 'nodejs22', ignore: ['node_modules', '*.log', '.env*', '.git'] }] });
    await save('manifest.json', { at: new Date().toISOString(), sourceCommit: execFileSync('git', ['rev-parse','HEAD'], { encoding: 'utf8' }).trim(), manifests });
    console.log(JSON.stringify({ prepared: true, targets: Object.fromEntries(Object.entries(manifests).map(([k,v]) => [k, v.changed])), monitoringPolicyUnchanged: true }));
  } else if (command === 'permissions') {
    const f = (await cf.get(`${parent}/functions/monitorScheduledCall`)).body;
    assert.equal(f.state, 'ACTIVE'); assert.equal(f.serviceConfig.serviceAccountEmail, identity);
    let q;
    try { q = (await tasks.get(queue)).body; } catch (error) {
      if (error.status !== 404) throw error;
      q = (await tasks.post(`${parent}/queues`, { name: queue.slice(1),
        rateLimits: { maxConcurrentDispatches: 16, maxDispatchesPerSecond: 10 },
        retryConfig: { maxAttempts: 20, minBackoff: '5s', maxBackoff: '30s', maxRetryDuration: '300s', maxDoublings: 3 } })).body;
    }
    assert.equal(q.rateLimits.maxConcurrentDispatches, 16); assert.equal(q.retryConfig.maxAttempts, 20);
    const policy = (await tasks.post(`${queue}:getIamPolicy`, {})).body;
    policy.bindings ??= [];
    const member = `serviceAccount:${identity}`;
    if (!policy.bindings.some(b => b.role === 'roles/cloudtasks.enqueuer' && b.members.includes(member))) {
      policy.bindings.push({ role: 'roles/cloudtasks.enqueuer', members: [member] });
      await tasks.post(`${queue}:setIamPolicy`, { policy });
    }
    const iam = new Client({ urlPrefix: 'https://iam.googleapis.com', apiVersion: 'v1' });
    const account = `/projects/${project}/serviceAccounts/${identity}`;
    const accountPolicy = (await iam.post(`${account}:getIamPolicy`, {})).body;
    try { await writeFile(`${dir}/runtime-iam-before.json`, JSON.stringify(accountPolicy, null, 2), { flag: 'wx', mode: 0o600 }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    accountPolicy.bindings ??= [];
    if (!accountPolicy.bindings.some(b => b.role === 'roles/iam.serviceAccountUser' && b.members.includes(member))) {
      accountPolicy.bindings.push({ role: 'roles/iam.serviceAccountUser', members: [member] });
      await iam.post(`${account}:setIamPolicy`, { policy: accountPolicy });
    }
    const servicePath = '/' + f.serviceConfig.service;
    let invokers = (await run.get(servicePath + ':getIamPolicy')).body;
    // firebase-tools 15.10.1 dereferences absent bindings on a fresh private service.
    // Keep the same intended single-service-account grant without changing installed CLI code.
    invokers.bindings ??= [];
    if (!invokers.bindings.some(b => b.role === 'roles/run.invoker' && b.members.includes(member))) {
      invokers.bindings.push({ role: 'roles/run.invoker', members: [member] });
      await run.post(servicePath + ':setIamPolicy', { policy: invokers });
      invokers = (await run.get(servicePath + ':getIamPolicy')).body;
    }
    assert.ok(invokers.bindings?.some(b => b.role === 'roles/run.invoker' && b.members.includes(member)));
    assert.ok(!invokers.bindings?.some(b => b.members.some(m => ['allUsers','allAuthenticatedUsers'].includes(m))));
    await save('worker.json', { function: f, queue: q, invokers });
    console.log(JSON.stringify({ workerReady: true, revision: f.serviceConfig.revision, privateInvoker: true, queueScopedEnqueue: true }));
  } else if (/^(deploy|status|verify)-(api|dispatcher)$/.test(command)) {
    const [action, kind] = command.split('-'), before = await read('before.json');
    const base = before.functions.find(f => f.name.endsWith('/' + targets[kind])), path = '/' + base.name;
    if (action === 'deploy') {
      phase = 'active_call_guard';
      await noActiveCalls();
      phase = 'dependency_guard';
      if (kind === 'api') assert.ok((await read('dispatcher-verified.json')).verifiedAt);
      else assert.ok((await read('worker.json')).function.state === 'ACTIVE');
      const current = (await cf.get(path)).body;
      phase = 'configuration_guard';
      // A verified revision may be repaired before the producer is activated; retain the original baseline.
      let previous; try { previous = await read(`${kind}-verified.json`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      assert.equal(current.serviceConfig.revision, previous?.revision ?? base.serviceConfig.revision);
      const expectedConfig = configuration(base);
      if (kind === 'dispatcher' && previous) expectedConfig.event.retryPolicy = 'RETRY_POLICY_RETRY';
      assert.deepEqual(configuration(current), expectedConfig);
      const expected = (await read('manifest.json')).manifests[kind].candidate;
      phase = 'package_guard';
      assert.deepEqual(await manifest(`${dir}/${kind}-package`), expected);
      phase = 'upload_url_guard';
      const upload = (await cf.post(`${parent}/functions:generateUploadUrl`, {})).body;
      const url = new URL(upload.uploadUrl); assert.equal(url.hostname, 'storage.googleapis.com');
      const bytes = await readFile(`${dir}/${kind}-candidate.zip`);
      phase = 'source_upload';
      const response = await fetch(url, { method: 'PUT', redirect: 'error', headers: { 'Content-Type': 'application/zip' }, body: bytes, signal: AbortSignal.timeout(120000) });
      assert.ok(response.ok, 'source_upload_failed');
      const payload = { name: base.name, buildConfig: { source: { storageSource: upload.storageSource } } };
      const mask = ['buildConfig.source'];
      if (kind === 'dispatcher') { payload.eventTrigger = { retryPolicy: 'RETRY_POLICY_RETRY' }; mask.push('eventTrigger.retryPolicy'); }
      phase = 'function_update';
      const op = (await cf.patch(path, payload, { queryParams: { updateMask: mask.join(',') } })).body;
      await save(`${kind}-state.json`, { operation: op.name, archiveHash: hash(bytes), at: new Date().toISOString() });
      console.log(JSON.stringify({ submitted: kind, operation: op.name }));
    } else {
      const state = await read(`${kind}-state.json`), op = (await cf.get('/' + state.operation)).body;
      if (op.error) await save(`${kind}-error.json`, op);
      if (action === 'status') console.log(JSON.stringify({ target: kind, done: !!op.done, errorCode: op.error?.code }));
      else {
        phase = 'operation_completion';
        assert.ok(op.done && !op.error); const current = (await cf.get(path)).body;
        phase = 'active_revision';
        assert.equal(current.state, 'ACTIVE'); assert.notEqual(current.serviceConfig.revision, base.serviceConfig.revision);
        const expected = configuration(base); if (kind === 'dispatcher') expected.event.retryPolicy = 'RETRY_POLICY_RETRY';
        phase = 'configuration_verification';
        assert.deepEqual(configuration(current), expected);
        phase = 'source_verification';
        assert.equal(hash(await download(current.buildConfig.source.storageSource)), state.archiveHash, 'deployed_archive_mismatch');
        phase = 'iam_verification';
        assert.deepEqual((await run.get('/' + current.serviceConfig.service + ':getIamPolicy')).body, before.iam[targets[kind]]);
        await save(`${kind}-after.json`, current);
        const report = { verifiedAt: new Date().toISOString(), revision: current.serviceConfig.revision, sourceVerified: true, iamPreserved: true };
        await save(`${kind}-verified.json`, report); console.log(JSON.stringify(report));
      }
    }
  } else if (command === 'verify-worker') {
    const worker = await read('worker.json'), f = worker.function;
    assert.equal(f.state, 'ACTIVE'); assert.equal(f.serviceConfig.availableMemory, '512Mi');
    assert.equal(f.serviceConfig.timeoutSeconds, 60); assert.equal(f.serviceConfig.maxInstanceCount, 2);
    assert.equal(f.serviceConfig.maxInstanceRequestConcurrency, 8);
    const bytes = await download(f.buildConfig.source.storageSource);
    await writeFile(`${dir}/worker-deployed.zip`, bytes, { mode: 0o600 });
    const entries = execFileSync('/usr/bin/unzip', ['-Z1', `${dir}/worker-deployed.zip`], { encoding: 'utf8' }).trim().split('\n');
    assert.ok(entries.every(p => !p.startsWith('/') && !p.split('/').includes('..')));
    await mkdir(`${dir}/worker-deployed`, { recursive: true });
    execFileSync('/usr/bin/unzip', ['-oq', `${dir}/worker-deployed.zip`, '-d', `${dir}/worker-deployed`]);
    const expected = (await read('manifest.json')).manifests.dispatcher.candidate;
    assert.deepEqual(await manifest(`${dir}/worker-deployed`), expected);
    const report = { verifiedAt: new Date().toISOString(), revision: f.serviceConfig.revision, sourceVerified: true,
      files: Object.keys(expected).length, limitsVerified: true, secretVersions: f.serviceConfig.secretEnvironmentVariables.map(s => ({ key: s.key, version: s.version })) };
    await save('worker-source-verified.json', report); console.log(JSON.stringify(report));
  } else if (command === 'smoke') {
    const id = `cadence-smoke-${Date.now()}`, now = Date.now();
    // No call document or transcript: verifies dispatch/timing/deletion without model or carrier activity.
    await firestore().patch(`${documentRoot}/monitorChecks/${id}`, { fields: fields({ callId: id, createdAt: now, dueAt: now + 15000, expiresAt: now + 60000 }) }, { queryParams: { 'currentDocument.exists': false } });
    await save('smoke.json', { id, createdAt: now, dueAt: now + 15000 }); console.log(JSON.stringify({ smokeQueued: true, noCallOrTranscript: true }));
  } else if (command === 'verify') {
    const before = await read('before.json'), current = (await cf.get(`${parent}/functions`)).body.functions;
    for (const old of before.functions.filter(f => !Object.values(targets).some(n => f.name.endsWith('/' + n)))) {
      assert.equal(current.find(f => f.name === old.name)?.serviceConfig.revision, old.serviceConfig.revision, 'unrelated_function_changed');
    }
    const service = (await run.get(`${parent}/services/shield-live`)).body;
    assert.equal(service.latestReadyRevision, before.service.latestReadyRevision); assert.deepEqual(service.traffic, before.service.traffic);
    const smoke = await read('smoke.json'); assert.ok(Date.now() >= smoke.dueAt);
    let missing = false; try { await firestore().get(`${documentRoot}/monitorChecks/${smoke.id}`); } catch (e) { if (e.status === 404) missing = true; else throw e; }
    assert.ok(missing, 'scheduled_smoke_not_consumed');
    const api = await read('api-after.json');
    assert.equal((await fetch(api.serviceConfig.uri + '/public/ready', { signal: AbortSignal.timeout(20000) })).status, 200);
    const worker = await read('worker.json');
    assert.equal((await read('worker-source-verified.json')).revision, worker.function.serviceConfig.revision);
    assert.equal((await fetch(worker.function.serviceConfig.uri, { signal: AbortSignal.timeout(20000) })).status, 403);
    const report = { verifiedAt: new Date().toISOString(), api: api.serviceConfig.revision,
      dispatcher: (await read('dispatcher-verified.json')).revision, worker: worker.function.serviceConfig.revision,
      screeningBridgeUnchanged: true, unrelatedFunctionsUnchanged: true, delayedSmokeConsumed: true, realCallsTested: false };
    await save('verified.json', report); console.log(JSON.stringify(report));
  } else throw new Error('unknown_command');
} catch (error) {
  console.error(JSON.stringify({ failed: true, phase, kind: error.status ?? error.code ?? error.name,
    reason: /^[a-z_]+$/.test(error.message ?? '') ? error.message : 'release_step_failed' })); process.exitCode = 1;
}
