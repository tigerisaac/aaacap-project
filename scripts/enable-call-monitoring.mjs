// Offer connected-call protection: sets CALL_MONITORING_ENABLED in the runtime secret. The owner must still opt in
// from the app. Usage: node scripts/enable-call-monitoring.mjs [--off]. Never prints configuration values.
import { Client, connect, project } from './firebase-client.mjs';
import { cloudSchema } from '../dist/cloud/config.js';
const enabled = !process.argv.includes('--off');
try {
  await connect();
  const secrets = new Client({ urlPrefix: 'https://secretmanager.googleapis.com', apiVersion: 'v1' });
  const path = `/projects/${project}/secrets/SHIELD_RUNTIME`;
  const stored = (await secrets.get(`${path}/versions/latest:access`)).body;
  const current = JSON.parse(Buffer.from(stored.payload.data, 'base64').toString());
  const updated = cloudSchema.parse({ ...current, CALL_MONITORING_ENABLED: enabled });
  let version = stored.name;
  if (current.CALL_MONITORING_ENABLED !== enabled) {
    version = (await secrets.post(`${path}:addVersion`, { payload: { data: Buffer.from(JSON.stringify({ ...current, CALL_MONITORING_ENABLED: enabled })).toString('base64') } })).body.name;
  }
  console.log(JSON.stringify({ callMonitoringOffered: enabled, runtimeVersion: version.split('/').at(-1), redeployFunctionsToApply: true }));
} catch (error) {
  console.error('Monitoring update failed:', /^[a-z_]+$/.test(error.message ?? '') ? error.message : error.status ?? error.code ?? error.name);
  process.exitCode = 1;
}
