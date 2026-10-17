import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID, generateKeyPairSync, sign } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { routes, shieldNumber, callerNumber, Tickets, adaptInitiation, browserRequest } from './metadata.mjs';
import { cases, RunBudget, rehearsalLimits } from './plan.mjs';

export async function verifyPackage(packagePath) {
  const lock=JSON.parse(await readFile(new URL('./release-lock.json',import.meta.url)));
  const files=async(dir,sub='')=>{const out=[];for(const e of await readdir(resolve(dir,sub),{withFileTypes:true})){if(e.name==='node_modules')continue;const p=sub?sub+'/'+e.name:e.name;out.push(...(e.isDirectory()?await files(dir,p):[p]));}return out;};
  assert.deepEqual((await files(packagePath)).sort(),Object.keys(lock.files).sort(),'release_file_set_changed');
  for(const [file,hash] of Object.entries(lock.files))assert.equal(createHash('sha256').update(await readFile(resolve(packagePath,file))).digest('hex'),hash,`release_changed:${file}`);
  return lock;
}
export async function createSimulator(packagePath) {
  const host=process.env.FIRESTORE_EMULATOR_HOST;
  if(!/^127\.0\.0\.1:\d+$/.test(host??''))throw Error('local_firestore_emulator_required');
  const release=await verifyPackage(packagePath),project='demo-shield-call-lab';
  const load=file=>import(pathToFileURL(resolve(packagePath,'lib',file)).href);
  const [{CloudStore},{cloudSchema},{ForwardingStore,forwardingConsent},{ForwardingLive},{enrollSharedRoute},{SharedCallControl},{CallControlProvider},{verifyTelnyx},{cloudCallDTO}]=await Promise.all(
    ['cloud/store.js','cloud/config.js','cloud/forwarding-store.js','cloud/forwarding-live.js','cloud/shared-routing.js','cloud/call-control.js','cloud/call-control-provider.js','cloud/forwarding-provider.js','cloud/api.js'].map(load));
  const keys=generateKeyPairSync('ed25519'),app=initializeApp({projectId:project},'call-lab-'+randomUUID()),db=getFirestore(app);
  const config=cloudSchema.parse({FIREBASE_WEB_API_KEY:'test',PUBLIC_BASE_URL:'https://shield-calls-isaac.web.app',TRIAL_PROXY_SECRET:'a'.repeat(64),DATA_ENCRYPTION_KEY:'b'.repeat(64),TELNYX_API_KEY:'test'.repeat(8),
    TELNYX_PUBLIC_KEY:keys.publicKey.export({type:'spki',format:'der'}).subarray(-32).toString('base64'),TELNYX_ACCOUNT_ID:randomUUID(),TELNYX_APPLICATION_ID:'123456789',TELNYX_SHARED_APPLICATION_ID:'987654321',TELNYX_NUMBER:shieldNumber,
    LIVE_SCREENING_ENABLED:true,SHARED_NUMBER_ENABLED:true,LIVE_BRIDGE_URL:'https://shield-call-lab.a.run.app'});
  // Satisfy the release schema, then keep every generated URL non-routable.
  config.PUBLIC_BASE_URL='https://shield-call-lab.invalid';config.LIVE_BRIDGE_URL='https://shield-call-lab.invalid';
  const s=new CloudStore(db,config),f=new ForwardingStore(s),tickets=new Tickets();let busy=false;
  const people=routes.map(r=>({...r,id:randomUUID()}));
  async function reset() {
    const cleared=await fetch(`http://${host}/emulator/v1/projects/${project}/databases/(default)/documents`,{method:'DELETE'});assert.ok(cleared.ok);
    for(const p of people){const now=Date.now();await s.personRef(p.id).set({id:p.id,ownerUid:p.alias,status:'setup',phoneVerifiedAt:now,forwardingConsent,shieldNumber,carrier:'tello',nameEnc:s.vault.seal(p.alias,`person:${p.id}:name`),phoneEnc:s.vault.seal(p.phone,`person:${p.id}:phone`)});
      await f.controlRef(p.id).set({provisioned:true,enabled:true,dataPlanConfirmed:true,allowAnyCaller:true,used:0,expiresAt:now+1800_000});}
    await db.doc(`shieldNumbers/${shieldNumber}`).set({state:'shared',members:[]});
    for(const p of people)await enrollSharedRoute(s,p.id,{version:randomUUID(),carrier:'tmobile',qualifiedAt:Date.now()});
  }
  async function scenario(test,target,budget) {
    budget.reserve(test.id);const commands=[],trace=[];let cc;
    const p=people[target];if(!p)throw Error('unknown_test_recipient');
    const provider=new CallControlProvider(config,()=>{throw Error('network_disabled');});
    provider.action=async(sid,name,body)=>{commands.push({sid,name,body});return {};};
    provider.request=async(path,body)=>{assert.equal(path,'/calls');assert.equal(body.to,p.phone,'recipient_changed');commands.push({name:'dial',body});return {call_control_id:randomUUID()};};
    cc=new SharedCallControl(s,provider,async()=>{});
    const event=(sid,type,patch={})=>({id:randomUUID(),event_type:type,occurred_at:new Date().toISOString(),payload:{call_control_id:sid,call_leg_id:'leg-'+sid,connection_id:config.TELNYX_SHARED_APPLICATION_ID,...(type==='call.playback.ended'?{status:'completed'}:{}),...patch}});
    const send=async e=>{trace.push(e.event_type);await cc.handle(e);};
    let c;
    try {
      const sid=randomUUID(),request=browserRequest(p.alias,tickets);
      const initial=event(sid,'call.initiated',{direction:'incoming',from:callerNumber,to:request.destinationNumber,custom_headers:request.customHeaders});
      const raw=JSON.stringify({data:initial}),timestamp=String(Math.floor(Date.now()/1000));
      const signature=sign(null,Buffer.from(`${timestamp}|${raw}`),keys.privateKey).toString('base64');
      const verified=verifyTelnyx(config.TELNYX_PUBLIC_KEY,signature,timestamp,Buffer.from(raw),Date.now());
      await send(adaptInitiation(initial,tickets,config.TELNYX_SHARED_APPLICATION_ID,verified));
      c=await f.find(sid);assert.ok(c);assert.equal(c.participantId,p.id);
      await cc.runJob(c.id+'-start');trace.push('startup_job_completed');
      if(test.response!=='caller-hangup') {
        const live=new ForwardingLive(f);await live.claim(c.id);
        const decision=test.decision==='approve'?{action:'approve',reason:'routine',purpose:'personal',evidence:'lunch tomorrow',hasName:true,hasReason:true}:test.decision==='scam'?{action:'block',reason:'scam',purpose:'other',evidence:'one-time login code',hasName:false,hasReason:true}:'silence';
        await live.finish(c.id,decision);await cc.runJob(c.id+'-outcome');trace.push('injected_screening_outcome');
        c=await cc.call(c.id);
        if(test.decision==='approve') {
          await send(event(sid,'call.playback.ended',{client_state:provider.state(c.id,'offer')}));c=await cc.call(c.id);
          assert.ok(c.childSid);assert.ok(!commands.some(x=>x.name==='bridge'),'connected_without_press_1');
          if(test.response==='hangup')await send(event(c.childSid,'call.hangup',{client_state:provider.state(c.id,'recipient')}));
          else {
            await send(event(c.childSid,'call.answered',{client_state:provider.state(c.id,'recipient')}));
            await send(event(c.childSid,'call.gather.ended',{client_state:provider.state(c.id,'accept'),digits:test.response,status:'valid'}));
          }
          c=await cc.call(c.id);
          if(test.response==='1') {
            assert.equal(c.outcome,'connected');const stop=commands.findIndex(x=>x.name==='record_stop'),bridge=commands.findIndex(x=>x.name==='bridge');assert.ok(stop>=0&&bridge>stop,'recording_not_stopped_before_bridge');
            assert.equal(cloudCallDTO({...s,now:()=>c.createdAt+8*60_000},c).outcome,'connected');
          } else {
            assert.equal(c.state,'voicemail');assert.ok(!commands.some(x=>x.name==='bridge'));
            await send(event(sid,'call.playback.ended',{client_state:provider.state(c.id,'voicemail')}));
            await cc.runJob(c.id+'-voicemail');trace.push('voicemail_job_completed');
          }
        } else assert.ok(!commands.some(x=>x.name==='dial'||x.name==='bridge'));
      }
      await send(event(c.parentSid,'call.hangup'));c=await cc.call(c.id);assert.equal(c.state,'ended');
      assert.notEqual((await f.controlRef(p.id).get()).data()?.activeCallId,c.id);
      return {case:test.id,title:test.title,target:p.alias,passed:true,outcome:c.outcome,trace,commands:commands.map(x=>x.name),evidence:'local control flow; provider, audio and screening decisions simulated',plannedSessionSeconds:120};
    } finally {budget.finish(test.id);}
  }
  return {release,async run(id='all',alias=routes[0].alias){
    if(busy)throw Error('lab_busy');if(id!=='all'&&!cases.some(c=>c.id===id))throw Error('unknown_case');
    const target=routes.findIndex(r=>r.alias===alias);if(target<0)throw Error('unknown_test_recipient');
    busy=true;
    try {await reset();const budget=new RunBudget(Date.now,rehearsalLimits);let results=[];
      if(id!=='all')results=[await scenario(cases.find(c=>c.id===id),target,budget)];
      else {for(const id of ['accept','decline','no-answer','caller-hangup','silence'])results.push(await scenario(cases.find(c=>c.id===id),0,budget));
        results.push(...await Promise.all(cases.filter(c=>c.id.startsWith('overlap-')).map(c=>scenario(c,c.target,budget))));
        results.push(await scenario(cases.find(c=>c.id==='harmful'),0,budget));}
      assert.equal(Object.keys((await db.doc('sharedCapacity/calls').get()).data()?.leases??{}).length,0);
      return {mode:'offline',realCalls:0,providerRequests:0,source:release.source,deployedApi:release.deployedApi,passed:results.length,results};
    }finally{busy=false;}},async close(){await db.terminate();await deleteApp(app);}};
}
