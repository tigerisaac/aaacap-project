import { spawnSync } from 'node:child_process';
import { tonePair, overflowAlias } from './capacity.mjs';
import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import { labRequest } from './live-provider.mjs';
const capacity=process.argv.includes('--capacity-overflow'),overlap=process.argv.includes('--public-overlap'),base='artifacts/private/call-lab',root=capacity?base+'/capacity-overflow':overlap?base+'/public-overlap':base;
const config=JSON.parse(await readFile('artifacts/private/firebase-runtime.json'));
const ledger=JSON.parse(await readFile(root+'/live-ledger.json'));
const ids=JSON.parse(await readFile(base+'/telnyx/created.json'));
const api=(path,method='GET')=>labRequest(config,path,method);
assert.equal(ledger.attempts.length,capacity?5:2);
const report={checkedAt:new Date().toISOString(),source:'2933563',deployedApi:'shieldapi-00025-wec',tests:[],providerCallCostUSD:0,numbersPurchased:0,aiScreeningTested:false};
if(capacity){assert.equal(ledger.mode,'capacity');assert.ok(ledger.capacityVerifiedAt-ledger.capacityOverlapStartedAt>=10000);report.publicNumber=config.TELNYX_NUMBER;report.connectedOverlapMs=ledger.capacityVerifiedAt-ledger.capacityOverlapStartedAt;report.testRecipientLimit=4;report.accountCeilingVerified=false;assert.equal(ledger.publicNumberRestored,true);}
if(overlap){assert.equal(ledger.mode,'overlap');assert.ok(ledger.overlapVerifiedAt-ledger.overlapStartedAt>=10000);report.publicNumber=config.TELNYX_NUMBER;report.connectedOverlapMs=ledger.overlapVerifiedAt-ledger.overlapStartedAt;}
for(const a of ledger.attempts){
  assert.ok(a.endedAt&&a.allLegsEnded);assert.ok(a.endedAt-a.startedAt<(capacity?90000:60000));assert.ok(a.mediaFrames>0);
  for(const sid of a.sids)assert.equal((await api(`/calls/${encodeURIComponent(sid)}`)).data.is_alive,false);
  const isOverflow=capacity&&a.alias===overflowAlias;
  const digit=a.kind==='accept'?'1':'2';if(!isOverflow)assert.ok(a.events.some(e=>e.type==='call.gather.ended'&&e.digits===digit));
  if(overlap||capacity){
    assert.equal(a.publicNumberMatched,true);
    const pair=tonePair(a.alias),expected={caller:pair.recipient,recipient:pair.caller};
    const verified=(a.browserEvidence??[]).filter(sample=>['caller','recipient'].every(role=>sample[role]?.db>-70&&Math.abs(sample[role].hz-expected[role])<35));
    if(!isOverflow)assert.ok(verified.length>=5,'insufficient_isolated_two_way_audio_evidence');
  }
  if(!isOverflow&&a.kind==='accept'){assert.equal(a.outcome,'connected');assert.ok(a.events.some(e=>e.type==='call.bridged'));assert.ok(a.commands.indexOf('record_stop:ok')>=0&&a.commands.indexOf('record_stop:ok')<a.commands.indexOf('bridge:ok'));}
  else{assert.equal(a.outcome,'voicemail');assert.ok(!a.commands.includes('bridge:ok'));}
  if(isOverflow){
    assert.equal(a.capacityRejected,true);assert.ok(a.commands.includes('dial:rejected')||a.capacityRejectionEvidence?.source==='recipient_sip_detail_record');
    assert.ok(a.voicemailPromptCompletedAt&&a.endedAt-a.voicemailPromptCompletedAt>=6000);
    assert.equal(a.recordingEvidence?.identityVerified,true);assert.ok(a.recordingEvidence.durationMs>6000);
    const decoded=spawnSync('ffmpeg',['-v','error','-sseof','-4','-i',root+'/overflow-synthetic.mp3','-f','f32le','-ac','1','-ar','8000','pipe:1'],{maxBuffer:200000});
    assert.equal(decoded.status,0,'voicemail_decode_failed');assert.ok(decoded.stdout.length>16000,'voicemail_audio_missing');
    let energy=0;for(let i=0;i+4<=decoded.stdout.length;i+=4){const x=decoded.stdout.readFloatLE(i);energy+=x*x;}
    const rms=Math.sqrt(energy/(decoded.stdout.length/4));assert.ok(Number.isFinite(rms)&&rms>.001,'voicemail_audio_silent');
    report.voicemail={providerCapacityRejected:true,promptCompleted:true,recordingDecoded:true,tailRms:rms};
  }
  const recordings=[];
  for(const id of a.recordings??[]){
    let r;try{r=(await api(`/recordings/${id}`)).data;}catch(e){if((overlap||capacity)&&e.message==='telnyx_http_404'&&a.recordingsDeleted>0){recordings.push({removedAfterTest:true});continue;}throw e;}
    assert.equal(r.call_control_id,a.parentSid);assert.equal(r.connection_id,ids.app);assert.equal(r.status,'completed');assert.ok(r.duration_millis>0&&r.duration_millis<=60000);
    const url=new URL(r.download_urls?.mp3);
    assert.ok(url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&url.hostname==='s3.amazonaws.com'&&url.pathname.startsWith('/telephony-recorder-prod/'));
    const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(10000)});assert.ok(response.ok);
    const bytes=Buffer.from(await response.arrayBuffer());assert.ok(bytes.length>100);
    await writeFile(`${root}/${overlap?a.alias+'-':''}${a.kind}-synthetic.mp3`,bytes,{mode:0o600});
    recordings.push({durationMs:r.duration_millis,bytes:bytes.length});
  }
  assert.ok(recordings.length>0);
  const cost=a.events.filter(e=>e.type==='call.cost').reduce((sum,e)=>sum+Number(e.cost??0),0);report.providerCallCostUSD+=cost;
  report.tests.push({case:isOverflow?'capacity-voicemail':a.kind,...((overlap||capacity)?{recipient:a.alias,publicNumberMatched:a.publicNumberMatched}:{}),passed:true,elapsedMs:a.endedAt-a.startedAt,streamFrames:a.mediaFrames,recordings,reportedCallCostUSD:cost,allLegsEnded:true});
}
await writeFile(root+'/live-report.json',JSON.stringify(report,null,2),{mode:0o600});console.log(JSON.stringify(report,null,2));
