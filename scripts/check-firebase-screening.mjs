import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { connect, firestore, documentRoot, fields } from './firebase-client.mjs';
import { Vault } from '../dist/crypto.js';

// One synthetic introduction exercises the real event function and funded model.
// No Twilio call, transcript from a person, or visible participant history is used.
await connect(); const db = firestore();
const config = JSON.parse(await readFile('artifacts/private/firebase-runtime.json', 'utf8'));
const vault = new Vault(config.DATA_ENCRYPTION_KEY);
const id = randomUUID(); const isolatedParticipant = randomUUID(); const start = Date.now();
const callPath = `${documentRoot}/callSessions/${id}`;
const jobPath = `${documentRoot}/screeningJobs/${id}`;
const preparationPath = `${documentRoot}/screeningJobs/prepare-${id}`;
const prepare = process.argv.includes('--prepare');
let queuedAt = start; let preparationMs;
const job = () => ({ name: jobPath.slice(1), fields: fields({ callId: id, participantId: isolatedParticipant,
  transcriptEnc: vault.seal('I am calling to remind you of your dentist appointment tomorrow at ten.', `job:${id}:intro`),
  status: 'pending', createdAt: queuedAt, expiresAt: queuedAt + 120_000 }) });
let report;
try {
  await db.post(`${documentRoot}:commit`, { writes: [
    { update: { name: callPath.slice(1), fields: fields({ id, participantId: isolatedParticipant, createdAt: start,
      expiresAt: start + 120_000, callerEnc: vault.seal('+13125550148', `call:${id}:caller`), state: 'evaluating',
      outcome: 'screening', reason: 'screening', purpose: null, completedAt: null, polls: 0, events: [] }) } },
    { update: prepare ? { name: preparationPath.slice(1), fields: fields({ kind: 'prepare', callId: id,
      participantId: isolatedParticipant, createdAt: start, expiresAt: start + 120_000 }) } : job() }
  ] });
  if (prepare) {
    let ready = false;
    for (let attempt = 0; attempt < 20; attempt++) {
      try { await db.get(preparationPath); }
      catch (error) { if (error.status === 404) { ready = true; break; } throw error; }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.ok(ready, 'Per-call worker preparation did not finish');
    preparationMs = Date.now() - start;
    queuedAt = Date.now();
    await db.patch(jobPath, { fields: job().fields });
  }
  let lastStatus;
  for (let attempt = 0; attempt < 45; attempt++) {
    const call = (await db.get(callPath)).body.fields;
    const decision = call.decision?.mapValue?.fields;
    if (decision) {
      report = { testedAt: new Date().toISOString(), elapsedMs: Date.now() - queuedAt, ...(prepare ? { preparationMs } : {}),
        route: decision.route.stringValue, reason: decision.reason.stringValue,
        queueMs: Number(call.timings?.mapValue?.fields?.queueMs?.integerValue ?? 0),
        modelMs: Number(call.timings?.mapValue?.fields?.modelMs?.integerValue ?? 0) };
      assert.equal(report.route, 'offer'); assert.equal(report.reason, 'routine'); break;
    }
    try {
      const job = (await db.get(jobPath)).body.fields;
      const status = job.status?.stringValue ?? 'unknown';
      if (status !== lastStatus) { console.log(JSON.stringify({ jobStatus: status, elapsedMs: Date.now() - start })); lastStatus = status; }
    } catch (error) { if (error.status !== 404) throw error; }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.ok(report, 'Event screening did not complete within the diagnostic window');
  await writeFile('artifacts/private/firebase-screening-check.json', JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(report));
} finally {
  await db.delete(preparationPath); await db.delete(jobPath); await db.delete(callPath);
}
