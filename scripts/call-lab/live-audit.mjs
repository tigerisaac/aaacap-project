import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import { labRequest } from './live-provider.mjs';
const base='artifacts/private/call-lab',root=process.argv.includes('--public-overlap')?base+'/public-overlap':base,read=async path=>JSON.parse(await readFile(path));
const config=await read('artifacts/private/firebase-runtime.json'),ids=await read(base+'/telnyx/created.json'),before=await read(base+'/telnyx/before.json'),ledger=await read(root+'/live-ledger.json');
const api=path=>labRequest(config,path);
const paths={app:'/call_control_applications',browser:'/credential_connections',profile:'/outbound_voice_profiles'};
const stable=x=>{const y=structuredClone(x);delete y.updated_at;delete y.connections_count;return y;};
for(const [kind,path] of Object.entries(paths)){
  const response=await api(path+'?page[size]=100');assert.ok(response.meta?.total_pages<=1);
  for(const original of before[kind])assert.deepEqual(stable(response.data.find(x=>x.id===original.id)),stable(original),'existing_resource_changed');
  const isolated=response.data.find(x=>x.id===ids[kind]);assert.equal(kind==='profile'?isolated.enabled:isolated.active,false);
  if(kind==='app')assert.equal(isolated.webhook_event_url,'https://shield-call-lab.invalid/telnyx/events');
}
const binding=xs=>xs.map(x=>({id:x.id,number:x.phone_number,connection:x.connection_id})).sort((a,b)=>a.id.localeCompare(b.id));
assert.deepEqual(binding((await api('/phone_numbers?page[size]=250')).data),binding(before.numbers));
const missing=async path=>{try{await api(path);return false;}catch(e){if(e.message==='telnyx_http_404')return true;throw e;}};
for(const id of ledger.credentials)assert.ok(await missing('/telephony_credentials/'+id),'credential_not_revoked');
for(const a of ledger.attempts){
  for(const sid of a.sids)assert.equal((await api('/calls/'+encodeURIComponent(sid))).data.is_alive,false);
  for(const id of a.recordings??[])assert.ok(await missing('/recordings/'+id),'recording_not_removed');
}
const balance=(await api('/balance')).data;
const audit={checkedAt:new Date().toISOString(),productionSettingsUnchanged:true,numberAssignmentsUnchanged:true,testConnectionsDisabled:true,testProfileDisabled:true,temporaryCredentialsRevoked:true,allCallLegsEnded:true,providerRecordingsRemoved:true,
  balanceBefore:ledger.balanceBefore,balanceAfter:balance.balance,balanceDifferenceUSD:Number(ledger.balanceBefore)-Number(balance.balance)};
await writeFile(root+'/live-audit.json',JSON.stringify(audit,null,2),{mode:0o600});console.log(JSON.stringify(audit,null,2));
