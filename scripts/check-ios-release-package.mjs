import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import commercial from '../backend/src/cloud/commercial-policy.json' with { type: 'json' };

// Exercise the assembled package, including its JSON/audio dependencies. Synthetic
// configuration and unauthenticated requests only: no provider or database access.
const stage = resolve(process.argv[2] ?? 'artifacts/firebase-functions');
// Use the same Admin SDK instance as the package's Firestore factory. Mixing a
// root credential instance with a separately installed SDK fails its type guard.
const { initializeApp, deleteApp } = createRequire(`${stage}/package.json`)('firebase-admin/app');
const load = file => import(pathToFileURL(`${stage}/lib/${file}`).href);
const [{ buildCloudApp }, { CloudStore }, { cloudSchema }, functions, { getShieldFirestore }] = await Promise.all([
  load('cloud/app.js'), load('cloud/store.js'), load('cloud/config.js'), load('cloud/index.js'), load('cloud/firestore.js'),
]);
assert.equal(typeof functions.finishAccountDeletions, 'function');
assert.equal(typeof functions.reviewServiceAccess, 'function');
const admin = initializeApp({ projectId: 'demo-shield-release-package' });
const db = getShieldFirestore(admin);
const config = cloudSchema.parse({ FIREBASE_WEB_API_KEY: 'synthetic', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app',
  TRIAL_PROXY_SECRET: 'a'.repeat(64), DATA_ENCRYPTION_KEY: 'b'.repeat(64), TELNYX_API_KEY: 'synthetic'.repeat(8),
  TELNYX_PUBLIC_KEY: Buffer.alloc(32).toString('base64'), TELNYX_ACCOUNT_ID: '00000000-0000-4000-8000-000000000001',
  TELNYX_APPLICATION_ID: '123456789', TELNYX_NUMBER: '+12025550999',
});
let app;
try {
  app = await buildCloudApp(new CloudStore(db, config));
  const response = await app.inject({ url: '/public/config' });
  assert.equal(response.statusCode, 200);
  const features = response.json();
  assert.equal(features.supportEmail, commercial.supportEmail);
  assert.equal(features.trustedContactsAvailable, false);
  assert.equal(features.messageFilteringAvailable, false);
  const privacy = await app.inject({ url: '/privacy' });
  assert.equal(privacy.statusCode, 200);
  for (const term of [commercial.operator, commercial.supportEmail, 'RevenueCat', 'Share contacts once', 'Caretaker consent does not grant']) {
    assert.ok(privacy.body.includes(term), `packaged_privacy_missing:${term}`);
  }
  for (const [method, url] of [['GET', '/api/access'], ['POST', '/api/access/refresh'],
    ['GET', '/api/account/deletion'], ['POST', '/public/revenuecat/webhook']]) {
    assert.equal((await app.inject({ method, url })).statusCode, 401, `packaged_auth_guard:${url}`);
  }
  console.log(JSON.stringify({ packagedStartup: 'passed', accountAndBillingWorkers: 'present',
    policyVersion: commercial.version, providerRequests: 0, databaseRequests: 0, deployed: false }));
} finally { await app?.close(); await db.terminate(); await deleteApp(admin); }
