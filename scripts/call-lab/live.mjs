import { readFile,writeFile,mkdir,appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomBytes,randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { WebSocketServer } from 'ws';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { verifyPackage } from './simulator.mjs';
import { Tickets,adaptInitiation,routes,shieldNumber } from './metadata.mjs';
import { LiveLedger,guardDial,operatorRequestAllowed,overlapReady } from './live-guard.mjs';
import { labRequest as telnyxRequest } from './live-provider.mjs';
import { publicNumberSnapshot,restorePublicNumber } from './public-number.mjs';
import { capacityPlan, connectedGroup, capacityComplete, overflowAlias, readCapacityRejection } from './capacity.mjs';
import { archiveSyntheticRecording } from './recording-evidence.mjs';

const root=resolve('artifacts/private/call-lab');
const warningFollowup=process.argv.includes('--warning-audio-followup');
const warning=process.argv.includes('--warning-audio')||warningFollowup;
const capacity=process.argv.includes('--capacity-overflow'),overlap=process.argv.includes('--public-overlap');
if((capacity&&overlap)||(warning&&(capacity||overlap)))throw Error('conflicting_run_modes');
const publicRun=capacity||overlap,runRoot=capacity?resolve(root,'capacity-overflow'):overlap?resolve(root,'public-overlap'):warning?resolve(root,warningFollowup?'warning-audio-followup-2026-10-17':'warning-audio-2026-10-17'):root;
await mkdir(runRoot,{recursive:true,mode:0o700});
if(!process.argv.includes('--inside')) {
  if(!process.argv.includes(capacity?'--authorized-five-calls':'--authorized-two-calls'))throw Error('explicit_call_authorization_required');
  if(publicRun&&!process.argv.includes('--authorized-public-number-window'))throw Error('public_number_window_approval_required');
  const child=spawn(process.execPath,['node_modules/firebase-tools/lib/bin/firebase.js','emulators:exec','--config',warning?'scripts/call-lab/warning-firebase.json':'scripts/call-lab/live-firebase.json','--only','firestore','--project','demo-shield-call-live',`node scripts/call-lab/live.mjs --inside${capacity?' --capacity-overflow --authorized-five-calls --authorized-public-number-window':overlap?' --public-overlap --authorized-public-number-window':warning?` ${warningFollowup?'--warning-audio-followup':'--warning-audio'} --authorized-two-calls`:' --authorized-two-calls'}`],
    {stdio:'inherit',env:{...process.env,SHIELD_LAB_RUN_DIR:runRoot,GCLOUD_PROJECT:'demo-shield-call-live',METADATA_SERVER_DETECTION:'none'}});
  child.on('exit',code=>{process.exitCode=code??1;});
} else {
  try { await start(); }catch(e) {
    await writeFile(runRoot+'/gateway-error.txt',e.stack??String(e),{mode:0o600});
    console.error('Isolated gateway failed; private diagnostics saved.');process.exitCode=1;
  }
}

async function start() {
  if(!process.argv.includes(capacity?'--authorized-five-calls':'--authorized-two-calls')&&!overlap)throw Error('explicit_call_authorization_required');
  if(publicRun&&!process.argv.includes('--authorized-public-number-window'))throw Error('public_number_window_approval_required');
  if(process.env.FIRESTORE_EMULATOR_HOST!==(warning?'127.0.0.1:8298':'127.0.0.1:8098'))throw Error('dedicated_emulator_required');
  const packagePath=resolve('artifacts/private/backend-reliability-release/api');
  const release=await verifyPackage(packagePath);
  // Warning mode deliberately replays the current intervention commands on the frozen transport.
  const warningURL='https://shield-calls-isaac.web.app/speech/soniox-grace-2026-10-12/warning-payment_or_transfer.wav';
  const runtime=JSON.parse(await readFile('artifacts/private/firebase-runtime.json'));
  const ids=JSON.parse(await readFile(root+'/telnyx/created.json'));
  const ledger=new LiveLedger(runRoot+'/live-ledger.json',Date.now,capacity?'capacity':overlap?'overlap':'sequential');
  if(ledger.data.stopped||ledger.data.attempts.length)throw Error('existing_run_requires_review');
  const api=(path,method='GET',body)=>telnyxRequest(runtime,path,method,body);
  const [appBefore,browserBefore,profileBefore]=await Promise.all([
    api(`/call_control_applications/${ids.app}`),api(`/credential_connections/${ids.browser}`),api(`/outbound_voice_profiles/${ids.profile}`)]);
  if(appBefore.data.application_name!=='Shield call lab receiver'||browserBefore.data.connection_name!=='Shield call lab browser'||profileBefore.data.name!=='Shield call lab outbound'
    ||appBefore.data.active||browserBefore.data.active||profileBefore.data.enabled)throw Error('isolated_disabled_resources_required');
  if(appBefore.data.outbound.outbound_voice_profile_id!==ids.profile||browserBefore.data.outbound.outbound_voice_profile_id!==ids.profile
    ||!profileBefore.data.daily_spend_limit_enabled||Number(profileBefore.data.daily_spend_limit)>.25)throw Error('isolated_profile_required');
  const numbers=(await api('/phone_numbers?page[size]=250')).data;
  if(numbers.some(n=>[ids.app,ids.browser].includes(n.connection_id)))throw Error('test_connection_has_phone_number');
  ledger.data.balanceBefore=(await api('/balance')).data.balance;ledger.data.heartbeat=Date.now();ledger.save();
  const watchdog=spawn(process.execPath,['scripts/call-lab/live-watchdog.mjs'],{stdio:'ignore',detached:true,env:{...process.env,SHIELD_LAB_RUN_DIR:runRoot}});watchdog.unref();
  const beat=setInterval(()=>{ledger.data.heartbeat=Date.now();ledger.save();},2000);
  let stopping=false,armed=false,tunnel,publicOrigin,cc,f,s,live,provider,publicServer,operator;
  const tickets=new Tickets(),credentials={},queue={tail:Promise.resolve()},sockets=new Set();
  const serial=fn=>{const task=queue.tail.then(fn);queue.tail=task.catch(()=>{});return task;};
  const record=(a,key,value)=>{a[key].push(value);ledger.save();};
  const fail=async e=>{await writeFile(runRoot+'/gateway-error.txt',e.stack??String(e),{mode:0o600});ledger.data.error='gateway_error';ledger.save();await stop();};
  async function end(a) {
    if(a.ending)return;a.ending=true;ledger.save();
    for(const sid of a.sids)try {await api(`/calls/${encodeURIComponent(sid)}/actions/hangup`,'POST',{});}catch{}
    const checks=await Promise.all(a.sids.map(async sid=>{try{return !(await api(`/calls/${encodeURIComponent(sid)}`)).data.is_alive;}catch{return false;}}));
    a.allLegsEnded=checks.every(Boolean);a.endedAt=Date.now();ledger.save();
    if(!a.allLegsEnded)await stop();
  }
  async function stop() {
    if(stopping)return;stopping=true;armed=false;ledger.data.stopped=true;ledger.save();
    for(const a of ledger.data.attempts.filter(a=>!a.endedAt))await end(a);
    try{ledger.data.publicNumberRestored=await restorePublicNumber(runtime,api,ledger.data.publicBinding,ids.app);ledger.save();}
    catch{ledger.data.publicNumberRestored=false;ledger.save();return;} // Independent watchdog keeps retrying.
    const results=await Promise.allSettled([
      api(`/call_control_applications/${ids.app}`,'PATCH',{active:false,inbound:{channel_limit:1},outbound:{channel_limit:1,outbound_voice_profile_id:ids.profile},webhook_event_url:'https://shield-call-lab.invalid/telnyx/events'}),
      api(`/credential_connections/${ids.browser}`,'PATCH',{active:false,inbound:{channel_limit:1},outbound:{channel_limit:1,outbound_voice_profile_id:ids.profile}}),api(`/outbound_voice_profiles/${ids.profile}`,'PATCH',{enabled:false,concurrent_call_limit:2}),
      ...ledger.data.credentials.map(id=>api(`/telephony_credentials/${id}`,'DELETE'))]);
    ledger.data.resourcesDisabled=results.slice(0,3).every(r=>r.status==='fulfilled');
    ledger.data.credentialsRevoked=results.slice(3).every(r=>r.status==='fulfilled');
    try{ledger.data.balanceAfter=(await api('/balance')).data.balance;}catch{}
    for(const a of ledger.data.attempts)for(const id of a.recordings??[])try{
      if(capacity&&a.alias===overflowAlias){try{a.recordingEvidence=await archiveSyntheticRecording(api,id,a.parentSid,ids.app,runRoot+'/overflow-synthetic.mp3');}catch{a.recordingEvidenceError=true;}}
      await api(`/recordings/${id}`,'DELETE');a.recordingsDeleted=(a.recordingsDeleted??0)+1;}catch{}
    ledger.save();clearInterval(beat);for(const ws of sockets)ws.close();tunnel?.kill();publicServer?.close();
  }
  process.once('SIGINT',()=>void stop());process.once('SIGTERM',()=>void stop());
  try {
  const load=file=>import(pathToFileURL(resolve(packagePath,'lib/cloud',file+'.js')).href);
  const [{CloudStore},{cloudSchema},{ForwardingStore,forwardingConsent},{ForwardingLive,validStreamTicket},{enrollSharedRoute},{SharedCallControl},{CallControlProvider},{verifyTelnyx}]=await Promise.all(
    ['store','config','forwarding-store','forwarding-live','shared-routing','call-control','call-control-provider','forwarding-provider'].map(load));
  const config=cloudSchema.parse({FIREBASE_WEB_API_KEY:'test',PUBLIC_BASE_URL:'https://shield-calls-isaac.web.app',TRIAL_PROXY_SECRET:randomBytes(32).toString('hex'),DATA_ENCRYPTION_KEY:randomBytes(32).toString('hex'),TELNYX_API_KEY:runtime.TELNYX_API_KEY,
    TELNYX_PUBLIC_KEY:runtime.TELNYX_PUBLIC_KEY,TELNYX_ACCOUNT_ID:runtime.TELNYX_ACCOUNT_ID,TELNYX_APPLICATION_ID:ids.app,TELNYX_SHARED_APPLICATION_ID:ids.app,TELNYX_NUMBER:shieldNumber,
    LIVE_SCREENING_ENABLED:true,SHARED_NUMBER_ENABLED:true,LIVE_BRIDGE_URL:'https://shield-call-lab.a.run.app',MESSAGE_CAPTURE_SECONDS:60});
  const db=getFirestore(initializeApp({projectId:'demo-shield-call-live'},'isolated-live-'+randomUUID()));
  s=new CloudStore(db,config);f=new ForwardingStore(s);live=new ForwardingLive(f);
  const people=routes.slice(0,capacity?5:overlap?2:1).map(r=>({...r,id:randomUUID()}));
  for(const person of people){const now=Date.now();await s.personRef(person.id).set({id:person.id,ownerUid:person.alias,status:'setup',phoneVerifiedAt:now,forwardingConsent,shieldNumber,carrier:'tello',nameEnc:s.vault.seal(person.alias,`person:${person.id}:name`),phoneEnc:s.vault.seal(person.phone,`person:${person.id}:phone`)});
  await f.controlRef(person.id).set({provisioned:true,enabled:true,dataPlanConfirmed:true,allowAnyCaller:true,used:0,expiresAt:now+1800000});}
  await db.doc(`shieldNumbers/${shieldNumber}`).set({state:'shared',members:[]});
  for(const person of people)await enrollSharedRoute(s,person.id,{version:randomUUID(),carrier:'tmobile',qualifiedAt:Date.now()});
  provider=new CallControlProvider(config);
  provider.action=async(sid,action,body)=>{
    const a=ledger.known(sid);if(!a)throw Error('unknown_call');
    if(action!=='hangup')ledger.remaining(a);
    if(!['answer','hangup','playback_start','playback_stop','gather_using_audio','gather_using_speak','speak','record_stop','record_start','streaming_start','streaming_stop','bridge'].includes(action))throw Error('action_rejected');
    if(action==='bridge'&&(!a.sids.includes(body.call_control_id)||!a.events.some(e=>e.type==='call.gather.ended'&&e.digits==='1')||!a.commands.includes('record_stop:ok')))throw Error('unsafe_bridge');
    const result=(await api(`/calls/${encodeURIComponent(sid)}/actions/${action}`,'POST',body)).data;
    record(a,'commands',action+':ok');return result;
  };
  provider.request=async(path,body,method='GET')=>{
    if(path==='/calls') {
      const state=provider.readState(body.client_state),a=ledger.byCallId(state?.id);
      const person=people.find(p=>p.alias===a?.alias),recipient=person&&`sip:${credentials[person.alias]?.recipient.sip_username}@sip.telnyx.com`;
      if(!a||!person||!recipient||state?.phase!=='recipient')throw Error('no_session');
      const bounded=guardDial(body,{ledger,attempt:a,connection:ids.app,phone:person.phone,recipient,from:runtime.TELNYX_NUMBER});
      try{const result=(await api(path,'POST',bounded)).data;ledger.bind(a,result.call_control_id);record(a,'commands','dial:ok');return result;}
      catch(e){a.dialError=e.provider??{status:null,capacityRejected:false};a.capacityRejected=e.provider?.capacityRejected===true;record(a,'commands','dial:rejected');throw e;}
    }
    const match=path.match(/^\/calls\/([^/]+)$/);if(method==='GET'&&match&&ledger.known(decodeURIComponent(match[1])))return (await api(path)).data;
    throw Error('provider_path_rejected');
  };
  cc=new SharedCallControl(s,provider,async()=>{});
  const json=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(data));};
  const body=async req=>{const chunks=[];let size=0;for await(const b of req){size+=b.length;if(size>65536)throw Error('body_too_large');chunks.push(b);}return Buffer.concat(chunks);};
  publicServer=createServer(async(req,res)=>{
    if(req.method==='GET'&&req.url==='/health')return json(res,200,{isolated:true,ready:armed});
    if(req.method!=='POST'||req.url!=='/telnyx/events')return json(res,404,{});
    try {
      const raw=await body(req);
      if(!verifyTelnyx(config.TELNYX_PUBLIC_KEY,req.headers['telnyx-signature-ed25519'],req.headers['telnyx-timestamp'],raw,Date.now()))return json(res,403,{});
      const event=JSON.parse(raw).data,p=event?.payload;
      if(!p||String(p.connection_id)!==ids.app)return json(res,403,{});
      await serial(async()=>{
        let a=ledger.known(p.call_control_id),adapted=event;
        if(!a&&event.event_type==='call.initiated'&&p.direction==='incoming') {
          a=ledger.byTicket(p.custom_headers?.find(h=>h.name?.toLowerCase()==='x-shield-lab-ticket')?.value);if(!armed||!a)throw Error('no_reservation');ledger.remaining(a);
          if(publicRun&&p.to!==runtime.TELNYX_NUMBER)throw Error('wrong_public_number');
          if(publicRun)a.publicNumberMatched=true;
          adapted=adaptInitiation(event,tickets,ids.app,true);if(a.parentSid&&a.parentSid!==p.call_control_id)throw Error('duplicate_parent');
          a.parentSid=p.call_control_id;ledger.bind(a,p.call_control_id);
        }
        if(!a) {
          const state=provider.readState(p.client_state);a=ledger.byCallId(state?.id);
          if(!a?.dialSubmitted||state?.id!==a.callId||state?.phase!=='recipient')throw Error('unknown_event');
          ledger.bind(a,p.call_control_id);
        }
        record(a,'events',{type:event.event_type,at:Date.now(),providerAt:event.occurred_at,role:p.call_control_id===a.parentSid?'caller':'recipient',...(p.status?{status:p.status}:{}),...(event.event_type==='call.gather.ended'?{digits:p.digits}:{}),...(event.event_type==='call.hangup'?{cause:p.hangup_cause}:{}),...(provider.readState(p.client_state)?.phase?{phase:provider.readState(p.client_state).phase}:{}),...(event.event_type==='call.cost'?{cost:p.total_cost}:{} )});
        if(event.event_type==='call.recording.saved'&&/^[a-f0-9-]{36}$/i.test(p.recording_id)){a.recordings=[...new Set([...(a.recordings??[]),p.recording_id])];ledger.save();}
        await cc.handle(adapted);
        if(!a.callId){const c=await f.find(a.parentSid);if(c){a.callId=c.id;ledger.save();}}
      });
      json(res,200,{});
    }catch(e){json(res,400,{});await writeFile(runRoot+'/webhook-error.txt',e.stack??String(e),{mode:0o600});}
  });
  const wss=new WebSocketServer({noServer:true,maxPayload:65536});
  publicServer.on('upgrade',async(req,socket,head)=>{
    const m=req.url?.match(/^\/media\/([a-f0-9-]+)\/(\d+)\/([a-f0-9]+)$/);
    const a=ledger.byCallId(m?.[1]);
    if(!m||!a||a.callId!==m[1]||!validStreamTicket(config,m[1],Number(m[2]),m[3])||a.streamClaimed){socket.destroy();return;}
    a.streamClaimed=true;ledger.save();
    wss.handleUpgrade(req,socket,head,ws=>{sockets.add(ws);ws.once('close',()=>sockets.delete(ws));
      let prepared=false;const ready=serial(async()=>{await live.claim(a.callId,'lab-fixed-decision');await cc.screeningReady(a.callId);prepared=true;});
      ws.on('message',async raw=>{try{await ready;const msg=JSON.parse(raw.toString());if(msg.event==='media'&&prepared){a.mediaFrames++;ledger.save();}}catch(e){void fail(e);}});
    });
  });
  await new Promise(done=>publicServer.listen(0,'127.0.0.1',done));
  tunnel=spawn(root+'/tools/cloudflared',['tunnel','--url',`http://127.0.0.1:${publicServer.address().port}`,'--no-autoupdate'],{stdio:['ignore','pipe','pipe']});
  publicOrigin=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('tunnel_timeout')),30000);const take=data=>{const m=data.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);if(m){clearTimeout(timer);resolve(m[0]);}};tunnel.stdout.on('data',take);tunnel.stderr.on('data',take);tunnel.once('error',reject);});
  config.PUBLIC_BASE_URL=publicOrigin;config.LIVE_BRIDGE_URL=publicOrigin;
  for(const person of people){credentials[person.alias]={};for(const role of ['caller','recipient']) {
    const c=(await api('/telephony_credentials','POST',{connection_id:ids.browser,name:`Shield lab ${person.alias} ${role}`,expires_at:new Date(Date.now()+1800000).toISOString()})).data;
    ledger.data.credentials.push(c.id);ledger.save();credentials[person.alias][role]=c;
  }
  }
  // Only these three explicitly isolated resources are ever enabled or modified.
  const channels=capacity?5:overlap?2:1,appOutbound=capacity?4:channels,profileOutbound=capacity?10:channels*2;
  await api(`/call_control_applications/${ids.app}`,'PATCH',{active:true,inbound:{channel_limit:channels},outbound:{channel_limit:appOutbound,outbound_voice_profile_id:ids.profile},webhook_event_url:publicOrigin+'/telnyx/events'});
  await api(`/credential_connections/${ids.browser}`,'PATCH',{active:true,inbound:{channel_limit:channels},outbound:{channel_limit:channels,outbound_voice_profile_id:ids.profile}});
  await api(`/outbound_voice_profiles/${ids.profile}`,'PATCH',{enabled:true,concurrent_call_limit:profileOutbound});
  const [appReady,browserReady,profileReady]=(await Promise.all([api(`/call_control_applications/${ids.app}`),api(`/credential_connections/${ids.browser}`),api(`/outbound_voice_profiles/${ids.profile}`)])).map(r=>r.data);
  if(!appReady.active||!browserReady.active||!profileReady.enabled||appReady.inbound.channel_limit!==channels||appReady.outbound.channel_limit!==appOutbound||browserReady.inbound.channel_limit!==channels||browserReady.outbound.channel_limit!==channels
    ||appReady.outbound.outbound_voice_profile_id!==ids.profile||browserReady.outbound.outbound_voice_profile_id!==ids.profile||appReady.inbound.sip_subdomain_receive_settings!=='only_my_connections'||browserReady.sip_uri_calling_preference!=='internal'
    ||profileReady.concurrent_call_limit!==profileOutbound||!profileReady.daily_spend_limit_enabled||Number(profileReady.daily_spend_limit)>.25)throw Error('lab_activation_readback_failed');
  armed=true;
  const status=()=>({ready:armed,mode:warning?'warning':ledger.mode,stopped:ledger.data.stopped,release:release.deployedApi,used:ledger.data.attempts.length,limit:capacity?5:2,secondsPerSession:capacity?90:60,capacityReady:capacity&&connectedGroup(ledger.activeAll()),capacityOverlapStartedAt:ledger.data.capacityOverlapStartedAt,capacityVerifiedAt:ledger.data.capacityVerifiedAt,overlapStartedAt:ledger.data.overlapStartedAt,overlapVerifiedAt:ledger.data.overlapVerifiedAt,publicNumberRestored:ledger.data.publicNumberRestored,
    attempts:ledger.data.attempts.map(a=>({alias:a.alias,kind:a.kind,ended:!!a.endedAt,secondsRemaining:Math.max(0,Math.ceil((a.deadline-Date.now())/1000)),events:a.events,commands:a.commands,mediaFrames:a.mediaFrames,outcome:a.outcome,state:a.state,warningAt:a.warningAt,warningPlaybackAt:a.warningPlaybackAt,warningVariant:a.warningVariant,voicemailPromptCompletedAt:a.voicemailPromptCompletedAt,allLegsEnded:a.allLegsEnded,recordings:a.recordings?.length??0})),resourcesDisabled:ledger.data.resourcesDisabled});
  operator=createServer(async(req,res)=>{
    const origin=`http://127.0.0.1:${operator.address().port}`;
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' wss://*.telnyx.com https://*.telnyx.com; media-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'");
    if(!operatorRequestAllowed(req,origin))return json(res,403,{});
    try {
      const assets={'/':['live.html','text/html'],'/live.js':['live.js','text/javascript'],'/style.css':['style.css','text/css']};
      if(req.method==='GET'&&assets[req.url]){res.writeHead(200,{'content-type':assets[req.url][1]});return res.end(await readFile(new URL('./web/'+assets[req.url][0],import.meta.url)));}
      if(req.method==='GET'&&req.url==='/sdk.js'){res.writeHead(200,{'content-type':'text/javascript'});return res.end(await readFile(root+'/tools/package/lib/bundle.js'));}
      if(req.method==='GET'&&req.url==='/status')return json(res,200,status());
      if(req.method!=='POST')return json(res,404,{});
      const data=JSON.parse(await body(req));
      const person=people.find(p=>p.alias===(data.alias??'person-01'));
      if(req.url==='/credentials'){
        if(!armed||!person)throw Error('not_armed');const result={};
        for(const role of ['caller','recipient']){const r=await fetch(`https://api.telnyx.com/v2/telephony_credentials/${credentials[person.alias][role].id}/token`,{method:'POST',headers:{authorization:`Bearer ${runtime.TELNYX_API_KEY}`},redirect:'error',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('token_failed');result[role]=await r.text();}
        return json(res,200,result);
      }
      if(req.url==='/reserve'){
        return await serial(async()=>{
        if(!armed||!person)throw Error('not_armed');if(warning&&data.kind!=='accept')throw Error('warning_requires_accept');const a=ledger.reserve(data.kind,person.alias);if(warning)a.warningVariant=(warningFollowup?['uncached-self','speech-self']:['baseline','after-park'])[ledger.data.attempts.length-1];a.ticket=tickets.issue(person.alias);ledger.save();
        if(publicRun&&!ledger.data.publicBinding){
          // Save rollback BEFORE submitting the live change. The watchdog also owns restoration.
          ledger.data.publicBinding={...await publicNumberSnapshot(runtime,api),restoreBy:Date.now()+(capacity?capacityPlan.routingWindowMs:90000)};ledger.save();
          await api(`/phone_numbers/${ledger.data.publicBinding.id}`,'PATCH',{connection_id:ids.app});
          if((await api(`/phone_numbers/${ledger.data.publicBinding.id}`)).data.connection_id!==ids.app)throw Error('public_number_switch_unconfirmed');
        }
        return json(res,200,{destinationNumber:publicRun?runtime.TELNYX_NUMBER:`sip:shield@${appBefore.data.inbound.sip_subdomain}.sip.telnyx.com`,...(publicRun?{callerNumber:runtime.TELNYX_NUMBER}:{}),customHeaders:[{name:'X-Shield-Lab-Ticket',value:a.ticket}],deadline:a.deadline});
        });
      }
      if(req.url==='/finish'){const a=ledger.activeAll().find(a=>a.alias===person?.alias);if(a)await end(a);return json(res,200,status());}
      if(req.url==='/warning-audio'){
        const a=ledger.data.attempts.filter(a=>a.alias===person?.alias).at(-1);
        if(!warning||!a||Date.now()>a.deadline+5000||!Number.isInteger(data.sequence)||data.sequence!==(a.audioChunks??0)||typeof data.audio!=='string'||data.audio.length>60000||data.sequence>=65)throw Error('audio_rejected');
        const bytes=Buffer.from(data.audio,'base64');await appendFile(runRoot+`/recipient-${ledger.data.attempts.indexOf(a)+1}.webm`,bytes,{mode:0o600});a.audioChunks=(a.audioChunks??0)+1;ledger.save();return json(res,200,{});
      }
      if(req.url==='/evidence'){
        const a=ledger.activeAll().find(a=>a.alias===person?.alias);
        if((!publicRun&&!warning)||!person)throw Error('no_overlap');
        if(!a||(!warning&&!(capacity?ledger.data.capacityOverlapStartedAt:ledger.data.overlapStartedAt)))return json(res,200,{accepted:false});
        const tone=x=>x&&Number.isFinite(x.hz)&&x.hz>=0&&x.hz<=24000&&Number.isFinite(x.db)&&x.db>=-160&&x.db<=0?{hz:x.hz,db:x.db}:null;
        a.browserEvidence??=[];if(a.browserEvidence.length<60)a.browserEvidence.push({at:Date.now(),caller:tone(data.caller),recipient:tone(data.recipient),...(warning&&Number.isFinite(data.recipientEnergy)&&data.recipientEnergy>=0&&Number.isFinite(data.recipientBytes)&&data.recipientBytes>=0?{recipientEnergy:data.recipientEnergy,recipientBytes:data.recipientBytes}:{})});ledger.save();return json(res,200,{});
      }
      if(req.url==='/stop'){await stop();return json(res,200,status());}
      return json(res,404,{});
    }catch(e){if(ledger.data.publicBinding&&!['attempt_budget_exhausted','recipient_already_reserved','session_active','four_connections_required'].includes(e.message))void fail(e);return json(res,400,{error:/^[a-z_]+$/.test(e.message)?e.message:'request_failed'});}
  });
  await new Promise(done=>operator.listen(0,'127.0.0.1',done));
  await writeFile(runRoot+'/gateway-address.json',JSON.stringify({operator:`http://127.0.0.1:${operator.address().port}`,publicOrigin}),{mode:0o600});
  console.log(`Isolated live call lab: http://127.0.0.1:${operator.address().port}`);
  let polling=false;
  setInterval(async()=>{
    if(polling||stopping)return;polling=true;
    try{await serial(async()=>{
      const active=ledger.activeAll();if(!active.length)return;
      const jobs=await db.collection('callControlJobs').get();
      for(const job of jobs.docs){const j=job.data();if(!j.done&&j.dueAt<=Date.now())await cc.runJob(job.id);}
      for(const a of active){
      if(Date.now()>=a.deadline){await end(a);if(publicRun)await stop();continue;}
      if(!a.callId)continue;const c=await cc.call(a.callId);a.outcome=c.outcome;a.state=c.state;
      if(c.greetingCompletedAt&&Date.now()-c.greetingCompletedAt>=1500&&a.mediaFrames>20&&!a.decisionInjected){a.decisionInjected=true;ledger.save();await live.finish(c.id,{action:'approve',reason:'routine',purpose:'personal',evidence:'synthetic test fixture',hasName:true,hasReason:true});}
      if(c.outcome==='connected'&&!a.connectedAt)a.connectedAt=Date.now();
      if(warning&&a.connectedAt&&Date.now()-a.connectedAt>3000&&!a.warningAt){
        a.warningAt=Date.now();ledger.save();
        await s.callRef(c.id).update({monitorIntervenedAt:a.warningAt,monitorConcern:'payment_or_transfer',reason:'monitor_intervened'});
        await provider.action(c.parentSid,'hangup',{command_id:s.vault.hash(`${c.id}:intervene`)});
      }
      if(warning&&a.warningAt&&!a.warningPlaybackAt){
        const parked=a.events.find(e=>e.type==='call.hold'&&e.role==='recipient');
        if(a.warningVariant==='baseline'||(parked&&Date.now()-parked.at>=750)){
          a.warningPlaybackAt=Date.now();ledger.save();
          if(a.warningVariant==='speech-self'){
            const {warningText}=await load('monitoring');
            await s.callRef(c.id).update({'announcementFallbacks.warning':true});
            await provider.action(c.childSid,'speak',{payload:warningText('payment_or_transfer'),voice:'AWS.Polly.Joanna',target_legs:'self',client_state:provider.state(c.id,'warning-backup'),command_id:s.vault.hash(`${c.id}:warning-backup`)});
          } else await provider.action(c.childSid,'playback_start',{audio_url:warningURL,audio_type:'wav',cache_audio:a.warningVariant!=='uncached-self',...(a.warningVariant==='uncached-self'?{target_legs:'self',stop:'all'}:{}),client_state:provider.state(c.id,'warning'),command_id:s.vault.hash(`${c.id}:warning`)});
        }
      }
      if(warning&&((a.warningPlaybackAt&&Date.now()-a.warningPlaybackAt>16500)||c.state==='ended'))await end(a);
      if(!publicRun&&!warning&&a.connectedAt&&Date.now()-a.connectedAt>4000)await end(a);
      if(c.state==='voicemail'&&!a.voicemailAt)a.voicemailAt=Date.now();
      if(!capacity&&a.voicemailAt&&Date.now()-a.voicemailAt>12000)await end(a);
      if(c.voicemailPromptCompletedAt)a.voicemailPromptCompletedAt=c.voicemailPromptCompletedAt;
      ledger.save();
      }
      if(capacity&&!ledger.data.capacityVerifiedAt){
        const extra=ledger.activeAll().find(a=>a.alias===overflowAlias);
        if(extra?.outcome==='connected')throw Error('overflow_connected_unexpectedly');
        if(extra?.outcome==='voicemail'&&!extra.capacityRejected&&Date.now()-(extra.lastRejectionCheck??0)>2000){
          extra.lastRejectionCheck=Date.now();
          try{const evidence=await readCapacityRejection(api,extra,ids.app);if(evidence){extra.capacityRejectionEvidence=evidence;extra.capacityRejected=true;}}catch{extra.rejectionReadbackError=true;}
          ledger.save();
        }
        if(extra?.voicemailPromptCompletedAt&&Date.now()-extra.voicemailPromptCompletedAt>=20000&&!extra.capacityRejected)throw Error('unverified_capacity_rejection');
        if(connectedGroup(ledger.activeAll())&&!ledger.data.capacityOverlapStartedAt){ledger.data.capacityOverlapStartedAt=Date.now();ledger.save();}
        if(ledger.data.capacityOverlapStartedAt&&!connectedGroup(ledger.activeAll()))throw Error('capacity_leg_ended_early');
        if(capacityComplete(ledger.data)){
          const accepted=ledger.activeAll().filter(a=>a.alias!==overflowAlias),extra=ledger.activeAll().find(a=>a.alias===overflowAlias);
          const sids=[...accepted.flatMap(a=>a.sids),extra.parentSid];
          const alive=await Promise.all(sids.map(async sid=>(await api(`/calls/${encodeURIComponent(sid)}`)).data.is_alive));
          if(sids.length!==9||!alive.every(Boolean))throw Error('capacity_leg_ended_early');
          ledger.data.capacityVerifiedAt=Date.now();ledger.save();
          for(const a of ledger.activeAll())await end(a);
          setTimeout(()=>void stop(),5000);
        }
      }
      if(overlap&&overlapReady(ledger.activeAll())){
        if(!ledger.data.overlapStartedAt){ledger.data.overlapStartedAt=Date.now();ledger.save();}
        if(Date.now()-ledger.data.overlapStartedAt>=10000){
          const alive=await Promise.all(ledger.activeAll().flatMap(a=>a.sids).map(async sid=>(await api(`/calls/${encodeURIComponent(sid)}`)).data.is_alive));
          if(alive.length!==4||!alive.every(Boolean))throw Error('overlap_leg_ended_early');
          ledger.data.overlapVerifiedAt=Date.now();ledger.save();
          for(const a of ledger.activeAll())await end(a);
          // Wait briefly for hangup/recording/cost callbacks before closing the tunnel.
          setTimeout(()=>void stop(),5000);
        }
      }
    });}catch(e){if(!['call_busy'].includes(e.message))void fail(e);}finally{polling=false;}
  },300);
  } catch(e) { await stop();throw e; }
}
