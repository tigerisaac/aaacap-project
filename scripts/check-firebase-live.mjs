import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Client, connect, project, firestore, documentRoot, fields } from './firebase-client.mjs';
import { Vault } from '../dist/crypto.js';

// Isolated synthetic account: no authentication email, real call or model request.
await connect();
const config = JSON.parse(await readFile('artifacts/private/firebase-runtime.json', 'utf8'));
const vault = new Vault(config.DATA_ENCRYPTION_KEY);
const db = firestore();
const users = new Client({ urlPrefix: 'https://identitytoolkit.googleapis.com', apiVersion: 'v1' });
const personId = randomUUID(); const callId = randomUUID(); const protectedPersonId = randomUUID();
const email = `shield-integration-${randomUUID()}@example.test`;
let uid; const results = [];
async function request(path, options = {}) {
  const response = await fetch(`${config.PUBLIC_BASE_URL}${path}`, { ...options, redirect: 'error', signal: AbortSignal.timeout(20_000) });
  const body = await response.json(); return { status: response.status, body };
}
const json = data => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
try {
  uid = (await users.post(`/projects/${project}/accounts`, { email, emailVerified: false, disabled: false })).body.localId;
  const linkResponse = await users.post(`/projects/${project}/accounts:sendOobCode`, { requestType: 'EMAIL_SIGNIN', email,
    returnOobLink: true, continueUrl: `https://${project}.firebaseapp.com/sign-in`, iOSBundleId: config.IOS_BUNDLE_ID, canHandleCodeInApp: true });
  let link = new URL(linkResponse.body.oobLink); const outer = { host: link.host, path: link.pathname };
  for (let i = 0; i < 3 && !link.searchParams.has('oobCode'); i++) link = new URL(link.searchParams.get('link'));
  assert.equal(link.searchParams.get('mode'), 'signIn');
  const session = await request('/auth/verify-code', json({ email, code: link.searchParams.get('oobCode') }));
  assert.equal(session.status, 200, `email exchange status ${session.status}`);
  assert.ok(session.body.accessToken && session.body.refreshToken);
  results.push({ check: 'real_email_link_exchange', passed: true, universalLink: outer });
  const headers = { authorization: `Bearer ${session.body.accessToken}`, 'x-shield-participant': personId.toUpperCase() };
  const empty = await request('/api/people', { headers }); assert.equal(empty.status, 200); assert.deepEqual(empty.body.people, []);
  // Shared runtimes have no single trial participant. Exercise foreign ownership using only synthetic data.
  await db.patch(`${documentRoot}/participants/${protectedPersonId}`, { fields: fields({ id: protectedPersonId, ownerUid: `synthetic-${randomUUID()}`, status: 'setup', trial: true,
    nameEnc: vault.seal('Protected integration check', `person:${protectedPersonId}:name`), phoneEnc: vault.seal('+13125550149', `person:${protectedPersonId}:phone`) }) });
  const blocked = await request('/api/overview', { headers: { ...headers, 'x-shield-participant': protectedPersonId.toUpperCase() } });
  assert.equal(blocked.status, 403); results.push({ check: 'synthetic_owner_data_isolation', passed: true });
  const now = Date.now();
  await db.patch(`${documentRoot}/participants/${personId}`, { fields: fields({ id: personId, ownerUid: uid, status: 'setup', trial: true,
    nameEnc: vault.seal('Integration check', `person:${personId}:name`), phoneEnc: vault.seal('+13125550148', `person:${personId}:phone`) }) });
  await db.patch(`${documentRoot}/callSessions/${callId}`, { fields: fields({ id: callId, participantId: personId, createdAt: now - 20 * 86400_000, expiresAt: now + 86400_000,
    callerEnc: vault.seal('+13125550148', `call:${callId}:caller`), state: 'ended', outcome: 'held', reason: 'prohibited_request',
    purpose: null, completedAt: now, polls: 0, events: [{ kind: 'integration_fixture', at: now }] }) });
  const [overview, detail, calls] = await Promise.all([request('/api/overview', { headers }), request(`/api/calls/${callId.toUpperCase()}`, { headers }), request('/api/calls?filter=held', { headers })]);
  assert.equal(overview.status, 200, `overview status ${overview.status}`);
  assert.equal(overview.body.counts.held, 0); assert.equal(overview.body.counts.stoppedTotal, 1);
  assert.equal(detail.status, 200); assert.equal(detail.body.call.id, callId);
  assert.equal(calls.status, 200); assert.equal(calls.body.calls.length, 1);
  results.push({ check: 'encrypted_firestore_history_and_native_uuid_contract', passed: true });
  await db.delete(`${documentRoot}/callSessions/${callId}`);
  const retained = await request('/api/overview', { headers });
  assert.equal(retained.status, 200); assert.equal(retained.body.counts.stoppedTotal, 1);
  assert.equal(retained.body.recent.length, 0);
  results.push({ check: 'persistent_total_survives_history_removal_and_is_not_weekly', passed: true });
  const refresh = await request('/auth/refresh', json({ refreshToken: session.body.refreshToken }));
  assert.equal(refresh.status, 200); assert.ok(refresh.body.accessToken);
  // Revocation timestamps have second precision; make this session older than revocation.
  await new Promise(resolve => setTimeout(resolve, 1200));
  const logout = await request('/auth/logout', { method: 'POST', headers }); assert.equal(logout.status, 200);
  const revoked = await request('/api/people', { headers }); assert.equal(revoked.status, 401);
  results.push({ check: 'real_token_refresh_and_revocation', passed: true });
} finally {
  // Only the exact synthetic IDs created above are removed; the owner's data is untouched.
  await db.delete(`${documentRoot}/callSessions/${callId}`);
  await db.delete(`${documentRoot}/participants/${personId}/statistics/stoppedCalls`);
  await db.delete(`${documentRoot}/participants/${personId}`);
  await db.delete(`${documentRoot}/participants/${protectedPersonId}`);
  if (uid) await users.post(`/projects/${project}/accounts:delete`, { localId: uid });
}
await writeFile('artifacts/private/firebase-live-checks.json', JSON.stringify({ testedAt: new Date().toISOString(), results }, null, 2), { mode: 0o600 });
console.log(JSON.stringify(results));
