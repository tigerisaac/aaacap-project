import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import limits from '../backend/src/cloud/pilot-limits.json' with { type: 'json' };

// Import the assembled API with synthetic configuration. Only public configuration
// routes are invoked: no database, provider, SMS, model or phone requests.
const stage = resolve(process.argv[2] ?? 'artifacts/private/paid-pilot-25-release/api');
const load = file => import(pathToFileURL(`${stage}/lib/${file}`).href);
const [{ buildCloudApp }, { CloudStore }, { cloudSchema }, { VOICEMAIL_POLICY_VERSION }] = await Promise.all([
  load('cloud/app.js'), load('cloud/store.js'), load('cloud/config.js'), load('cloud/voicemail-check.js'),
]);
const admin = initializeApp({ projectId: 'demo-shield-package' });
const db = getFirestore(admin);
const config = cloudSchema.parse({ FIREBASE_WEB_API_KEY: 'test', PUBLIC_BASE_URL: 'https://shield-calls-isaac.web.app',
  TRIAL_PROXY_SECRET: 'a'.repeat(64), DATA_ENCRYPTION_KEY: 'b'.repeat(64), TELNYX_API_KEY: 'test'.repeat(8),
  TELNYX_PUBLIC_KEY: Buffer.alloc(32).toString('base64'), TELNYX_ACCOUNT_ID: '00000000-0000-4000-8000-000000000001',
  TELNYX_APPLICATION_ID: '123456789', TELNYX_SHARED_APPLICATION_ID: '987654321', TELNYX_NUMBER: '+12025550999', SHARED_NUMBER_ENABLED: true,
  TELNYX_VERIFY_PROFILE_ID: '00000000-0000-4000-8000-000000000002',
  SMS_ALERTS: { messagingProfileId: '00000000-0000-4000-8000-000000000003', from: '+12025550998' },
});
let app;
try {
  app = await buildCloudApp(new CloudStore(db, config));
  const response = await app.inject({ url: '/public/shared-ready' });
  assert.equal(response.statusCode, 200);
  const ready = response.json();
  assert.equal(ready.limitsVersion, limits.version);
  assert.equal(ready.capacity, 25); assert.equal(ready.enrollmentLimit, 25);
  assert.equal(ready.phoneSignInConfigured, true); assert.equal(ready.textAlertsConfigured, true);
  const features = (await app.inject({ url: '/public/config' })).json();
  assert.equal(features.phoneSignInAvailable, true); assert.equal(features.trustedContactsAvailable, true);
  assert.equal(VOICEMAIL_POLICY_VERSION, '2026-10-12-voicemail-v4');
  console.log(JSON.stringify({ packagedAPIStartup: 'passed', capacity: ready.capacity, preservedMessagePolicy: VOICEMAIL_POLICY_VERSION, providerRequests: 0 }));
} finally { await app?.close(); await db.terminate(); await deleteApp(admin); }
