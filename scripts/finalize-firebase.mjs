import { Client, connect, project } from './firebase-client.mjs';
await connect();
// Eventarc uses our custom runtime identity, not the default Compute identity.
// Allow only that identity to invoke this private background function.
const run = new Client({ urlPrefix: 'https://run.googleapis.com', apiVersion: 'v2' });
for (const name of ['screencall', 'ingestforwardingvoicemail', 'monitorconnectedcall']) {
const resource = `/projects/${project}/locations/us-central1/services/${name}`;
const policy = (await run.get(`${resource}:getIamPolicy`)).body;
policy.bindings ??= [];
let binding = policy.bindings.find(item => item.role === 'roles/run.invoker' && !item.condition);
if (!binding) { binding = { role: 'roles/run.invoker', members: [] }; policy.bindings.push(binding); }
const member = `serviceAccount:shield-runtime@${project}.iam.gserviceaccount.com`;
if (!binding.members.includes(member)) binding.members.push(member);
await run.post(`${resource}:setIamPolicy`, { policy });
}
console.log('Shield Eventarc identity can invoke its private screening, voicemail and call-monitoring functions.');
