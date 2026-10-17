import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { labRequest as telnyxRequest } from './live-provider.mjs';
const root=resolve('artifacts/private/call-lab'),config=JSON.parse(readFileSync('artifacts/private/firebase-runtime.json'));
const ids=JSON.parse(readFileSync(root+'/telnyx/created.json'));
const ledgerPath=root+'/live-ledger.json';
let busy=false;
async function tick() {
  if(busy)return;busy=true;
  try {
    const d=JSON.parse(readFileSync(ledgerPath)),now=Date.now();
    const stale=!d.heartbeat||now-d.heartbeat>12000;
    const expired=d.attempts.filter(a=>!a.endedAt&&(stale||d.stopped||a.deadline<=now));
    for(const a of expired)for(const sid of a.sids) {
      try {await telnyxRequest(config,`/calls/${encodeURIComponent(sid)}/actions/hangup`,'POST',{});}catch{}
    }
    if(stale||d.stopped) {
      const results=await Promise.allSettled([
        telnyxRequest(config,`/call_control_applications/${ids.app}`,'PATCH',{active:false}),
        telnyxRequest(config,`/credential_connections/${ids.browser}`,'PATCH',{active:false}),
        telnyxRequest(config,`/outbound_voice_profiles/${ids.profile}`,'PATCH',{enabled:false}),
        ...d.credentials.map(id=>telnyxRequest(config,`/telephony_credentials/${encodeURIComponent(id)}`,'DELETE'))
      ]);
      // Keep retrying if disabling a resource failed. Do not write the gateway's ledger.
      if(results.slice(0,3).every(r=>r.status==='fulfilled'))process.exit(0);
    }
  }catch{}finally{busy=false;}
}
setInterval(tick,2000);void tick();
