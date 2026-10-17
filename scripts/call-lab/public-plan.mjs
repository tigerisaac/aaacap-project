import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { labRequest } from './live-provider.mjs';
import { publicNumberSnapshot } from './public-number.mjs';
const root='artifacts/private/call-lab';
const config=JSON.parse(await readFile('artifacts/private/firebase-runtime.json'));
const ids=JSON.parse(await readFile(root+'/telnyx/created.json'));
const api=path=>labRequest(config,path);
const binding=await publicNumberSnapshot(config,api);
const resources=await Promise.all([api('/call_control_applications/'+ids.app),api('/credential_connections/'+ids.browser),api('/outbound_voice_profiles/'+ids.profile)]);
if(resources[0].data.active||resources[1].data.active||resources[2].data.enabled)throw Error('lab_not_disabled');
await mkdir(root+'/public-overlap',{recursive:true,mode:0o700});
await writeFile(root+'/public-overlap/plan.json',JSON.stringify({binding,ids,checkedAt:new Date().toISOString()},null,2),{mode:0o600});
console.log(JSON.stringify({publicNumber:binding.phoneNumber,currentConnection:binding.originalConnection,testConnection:ids.app,
  calls:2,concurrentRecipients:2,connectedOverlapSeconds:10,sessionDeadlineSeconds:60,maximumRoutingWindowSeconds:90,
  proposedLabChannels:{application:2,browser:2,profile:4},outboundThresholdUSD:0.25,numbersPurchased:0,
  liveChangesMade:false,note:'Requires approval for a temporary public-number routing window; ordinary incoming calls may fail during the window.'},null,2));
