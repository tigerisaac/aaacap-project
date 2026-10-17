import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { labRequest as telnyxRequest } from './live-provider.mjs';
import { endWarningConference } from './warning-recovery.mjs';
import { restorePublicNumber } from './public-number.mjs';
const root=resolve('artifacts/private/call-lab'),config=JSON.parse(readFileSync('artifacts/private/firebase-runtime.json'));
const ids=JSON.parse(readFileSync(root+'/telnyx/created.json'));
const ledgerPath=process.env.SHIELD_LAB_RUN_DIR?resolve(process.env.SHIELD_LAB_RUN_DIR,'live-ledger.json'):root+'/live-ledger.json';
let busy=false;
async function tick() {
  if(busy)return;busy=true;
  try {
    const d=JSON.parse(readFileSync(ledgerPath)),now=Date.now();
    const stale=!d.heartbeat||now-d.heartbeat>12000||!!(d.publicBinding&&now>=d.publicBinding.restoreBy);
    const expired=d.attempts.filter(a=>!a.endedAt&&(stale||d.stopped||a.deadline<=now));
    for(const a of expired){
      try{await endWarningConference((path,method,body)=>telnyxRequest(config,path,method,body),a);}catch{}
      for(const sid of a.sids) {
      try {await telnyxRequest(config,`/calls/${encodeURIComponent(sid)}/actions/hangup`,'POST',{});}catch{}
    }
    }
    if(stale||d.stopped) {
      // Restore the live number before disabling the test receiver. On failure keep retrying.
      if(!await restorePublicNumber(config,(path,method,body)=>telnyxRequest(config,path,method,body),d.publicBinding,ids.app))return;
      const results=await Promise.allSettled([
        telnyxRequest(config,`/call_control_applications/${ids.app}`,'PATCH',{active:false,inbound:{channel_limit:1},outbound:{channel_limit:1,outbound_voice_profile_id:ids.profile},webhook_event_url:'https://shield-call-lab.invalid/telnyx/events'}),
        telnyxRequest(config,`/credential_connections/${ids.browser}`,'PATCH',{active:false,inbound:{channel_limit:1},outbound:{channel_limit:1,outbound_voice_profile_id:ids.profile}}),
        telnyxRequest(config,`/outbound_voice_profiles/${ids.profile}`,'PATCH',{enabled:false,concurrent_call_limit:2}),
        ...d.credentials.map(id=>telnyxRequest(config,`/telephony_credentials/${encodeURIComponent(id)}`,'DELETE'))
      ]);
      // Keep retrying if disabling a resource failed. Do not write the gateway's ledger.
      if(results.slice(0,3).every(r=>r.status==='fulfilled'))process.exit(0);
    }
  }catch{}finally{busy=false;}
}
setInterval(tick,2000);void tick();
