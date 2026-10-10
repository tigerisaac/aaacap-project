import { liveScreeningCases } from './fixtures/live-screening-cases.mjs';
import { DECISION_MODEL } from '../dist/live/research.js';
import { SCREENING_POLICY_VERSION } from '../dist/live/policy.js';
import { readFile, writeFile } from 'node:fs/promises';
import { Client, connect, project } from './firebase-client.mjs';
import { cloudSchema } from '../dist/cloud/config.js';

// Enable the already-approved demo only after the intended bridge and actor tests pass.
try {
  for (const { name } of liveScreeningCases) {
    const result=JSON.parse(await readFile(`artifacts/live-eval/${name}.json`,'utf8'));
    if(!result.passed || result.decisionModel !== DECISION_MODEL || result.policyVersion !== SCREENING_POLICY_VERSION) throw new Error('voice_checks_incomplete');
  }
  await connect();
  const run=new Client({urlPrefix:'https://run.googleapis.com',apiVersion:'v2'});
  const service=(await run.get(`/projects/${project}/locations/us-central1/services/shield-live`)).body;
  const deployment=JSON.parse(await readFile('artifacts/private/live-deploy.json','utf8'));
  if(service.terminalCondition?.state!=='CONDITION_SUCCEEDED'||service.template.containers[0].image!==deployment.image) throw new Error('current_bridge_not_deployed');
  const health=await fetch(`${service.uri}/ready`,{signal:AbortSignal.timeout(10000)});
  const readiness = health.ok ? await health.json() : {};
  if(readiness.model !== 'gpt-live-1' || readiness.decisionModel !== DECISION_MODEL || readiness.policyVersion !== SCREENING_POLICY_VERSION) throw new Error('bridge_health_failed');
  const secrets=new Client({urlPrefix:'https://secretmanager.googleapis.com',apiVersion:'v1'});
  const path=`/projects/${project}/secrets/SHIELD_RUNTIME`;
  const stored=(await secrets.get(`${path}/versions/latest:access`)).body;
  const current=JSON.parse(Buffer.from(stored.payload.data,'base64').toString());
  const updated={...current,LIVE_SCREENING_ENABLED:true,LIVE_BRIDGE_URL:service.uri};
  cloudSchema.parse(updated);
  let version=stored.name;
  if(!current.LIVE_SCREENING_ENABLED||current.LIVE_BRIDGE_URL!==service.uri) {
    version=(await secrets.post(`${path}:addVersion`,{payload:{data:Buffer.from(JSON.stringify(updated)).toString('base64')}})).body.name;
  }
  await writeFile('artifacts/private/firebase-runtime.json',JSON.stringify(updated),{mode:0o600});
  console.log(JSON.stringify({enabled:true,bridge:service.uri,runtimeVersion:version.split('/').at(-1),routingDeploymentRequired:true}));
} catch(error) {
  console.error('Live activation failed:',/^[a-z_]+$/.test(error.message??'')?error.message:error.status??error.code??error.name);
  process.exitCode=1;
}
