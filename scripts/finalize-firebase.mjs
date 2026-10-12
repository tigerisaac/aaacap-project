import { Client, connect, project } from './firebase-client.mjs';
await connect();
// Eventarc uses our custom runtime identity, not the default Compute identity.
// Allow only that identity to invoke this private background function.
const run = new Client({ urlPrefix: 'https://run.googleapis.com', apiVersion: 'v2' });
// Every Firestore-triggered function in backend/src/cloud/index.ts must be listed here, or Eventarc can't run it.
for (const name of ['ingestforwardingvoicemail', 'monitorconnectedcall', 'checkforwardingvoicemail', 'sendshieldalert']) {
const resource = `/projects/${project}/locations/us-central1/services/${name}`;
const policy = (await run.get(`${resource}:getIamPolicy`)).body;
policy.bindings ??= [];
let binding = policy.bindings.find(item => item.role === 'roles/run.invoker' && !item.condition);
if (!binding) { binding = { role: 'roles/run.invoker', members: [] }; policy.bindings.push(binding); }
const member = `serviceAccount:shield-runtime@${project}.iam.gserviceaccount.com`;
if (!binding.members.includes(member)) binding.members.push(member);
await run.post(`${resource}:setIamPolicy`, { policy });
}
console.log('Shield Eventarc identity can invoke its private voicemail, voicemail-check, call-monitoring and alert functions.');

// Address scheduled v2 functions by their Cloud Run URL, with an exactly matching OIDC audience.
// The cloudfunctions.net alias rejected authenticated invocations for the new shared-call sweep.
const scheduler = new Client({ urlPrefix: 'https://cloudscheduler.googleapis.com', apiVersion: 'v1' });
for (const [functionName, serviceName] of [['cleanupShield', 'cleanupshield'], ['dailySetupChecks', 'dailysetupchecks'], ['expireSharedCalls', 'expiresharedcalls']]) {
  const path = `/projects/${project}/locations/us-central1/jobs/firebase-schedule-${functionName}-us-central1`;
  const job = (await scheduler.get(path)).body;
  const service = (await run.get(`/projects/${project}/locations/us-central1/services/${serviceName}`)).body;
  const target = `${service.uri.replace(/\/$/, '')}/`;
  if (job.httpTarget?.oidcToken?.serviceAccountEmail !== `shield-runtime@${project}.iam.gserviceaccount.com`) throw new Error('unexpected_scheduler_identity');
  if (job.httpTarget.uri !== target || job.httpTarget.oidcToken.audience !== target) {
    await scheduler.patch(path, { name: path.slice(1), httpTarget: { ...job.httpTarget, uri: target,
      oidcToken: { ...job.httpTarget.oidcToken, audience: target } } },
      { queryParams: { updateMask: 'httpTarget.uri,httpTarget.oidcToken.audience' } });
  }
}
console.log('Private scheduled functions use the matching Cloud Run target and OIDC audience.');
