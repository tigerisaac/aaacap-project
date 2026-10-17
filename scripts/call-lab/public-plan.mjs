import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { labRequest } from './live-provider.mjs';
import { publicNumberSnapshot } from './public-number.mjs';
import { capacityPlan } from './capacity.mjs';
const capacity=process.argv.includes('--capacity-overflow'),root='artifacts/private/call-lab',runDir=root+(capacity?'/capacity-overflow':'/public-overlap');
const config=JSON.parse(await readFile('artifacts/private/firebase-runtime.json'));
const ids=JSON.parse(await readFile(root+'/telnyx/created.json'));
const api=path=>labRequest(config,path);
const binding=await publicNumberSnapshot(config,api);
const resources=await Promise.all([api('/call_control_applications/'+ids.app),api('/credential_connections/'+ids.browser),api('/outbound_voice_profiles/'+ids.profile)]);
if(resources[0].data.active||resources[1].data.active||resources[2].data.enabled)throw Error('lab_not_disabled');
await mkdir(runDir,{recursive:true,mode:0o700});
await writeFile(runDir+'/plan.json',JSON.stringify({binding,ids,checkedAt:new Date().toISOString()},null,2),{mode:0o600});
console.log(JSON.stringify({publicNumber:binding.phoneNumber,currentConnection:binding.originalConnection,testConnection:ids.app,
  calls:capacity?5:2,concurrentRecipients:capacity?4:2,overflowCallers:capacity?1:0,connectedOverlapSeconds:10,sessionDeadlineSeconds:capacity?90:60,maximumRoutingWindowSeconds:capacity?120:90,
  proposedLabChannels:capacity?{applicationInbound:5,applicationOutbound:4,browser:5,profile:10}:{application:2,browser:2,profile:4},...(capacity?{estimateUSD:capacityPlan.estimatedUSD,planningAllowanceUSD:capacityPlan.planningAllowanceUSD,measuresAccountCeiling:false}:{} ),outboundThresholdUSD:0.25,numbersPurchased:0,
  liveChangesMade:false,note:'Requires approval for a temporary public-number routing window; ordinary incoming calls may fail during the window.'},null,2));
