import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LiveLedger } from '../../scripts/call-lab/live-guard.mjs';
import { capacityPlan, capacityComplete, connectedGroup, classifyProviderError, tonePair, capacitySipCode, readCapacityRejection } from '../../scripts/call-lab/capacity.mjs';
import { archiveSyntheticRecording } from '../../scripts/call-lab/recording-evidence.mjs';
const dirs:string[]=[];
const dir=()=>{const d=mkdtempSync(join(tmpdir(),'shield-capacity-'));dirs.push(d);return d;};
afterEach(()=>dirs.splice(0).forEach(d=>rmSync(d,{recursive:true,force:true})));
const connected=(alias:string)=>({alias,outcome:'connected',events:[{type:'call.bridged'}],commands:['record_stop:ok','bridge:ok']});
describe('bounded provider-capacity experiment',()=>{
  it('keeps room for the incoming overflow caller without claiming the account ceiling',()=>{
    expect(capacityPlan.accepted*2+1).toBeLessThan(capacityPlan.accountCeiling);
    expect(capacityPlan.sessions).toBe(5);expect(capacityPlan.appInbound).toBe(5);
    expect(capacityPlan.appOutbound).toBe(4);expect(capacityPlan.numberPurchases).toBe(0);
  });
  it('requires all four distinct bridged calls before reserving overflow and never refunds an attempt',()=>{
    let now=1000;const file=join(dir(),'ledger.json'),l=new LiveLedger(file,()=>now,'capacity');
    expect(()=>l.reserve('accept','person-05')).toThrow('four_connections_required');
    expect(()=>l.reserve('decline')).toThrow('capacity_requires_accept');
    for(let n=1;n<=4;n++){const alias=`person-0${n}`,a=l.reserve('accept',alias);Object.assign(a,connected(alias));}
    l.save();expect(connectedGroup(l.activeAll())).toBe(true);
    expect(()=>l.reserve('accept','person-01')).toThrow('recipient_already_reserved');
    const extra=l.reserve('accept','person-05');expect(extra.deadline-now).toBe(90000);
    now+=10000;expect(l.remaining(extra)).toBe(80);
    for(const a of l.activeAll())a.endedAt=now;l.save();
    expect(()=>new LiveLedger(file,()=>now,'capacity').reserve('accept','person-05')).toThrow('recipient_already_reserved');
    expect(()=>new LiveLedger(file,()=>now,'overlap')).toThrow('run_mode_mismatch');
    expect(()=>l.reserve('accept','person-06')).toThrow('unknown_test_recipient');
  });
  it('rejects a stale or duplicated connected group',()=>{
    const group=[1,2,3,4].map(n=>connected(`person-0${n}`));
    expect(connectedGroup(group)).toBe(true);
    expect(connectedGroup([...group.slice(0,3),group[0]])).toBe(false);
    expect(connectedGroup([...group.slice(0,3),{...group[3],endedAt:1}])).toBe(false);
    expect(connectedGroup([...group.slice(0,3),{...group[3],events:[]}])).toBe(false);
    expect(connectedGroup([...group.slice(0,3),{...group[3],events:[{type:'call.bridged'},{type:'call.hangup'}]}])).toBe(false);
  });
  it('does not pass on an unrelated dial failure, voicemail state alone or an interrupted original call',()=>{
    const extra:any={alias:'person-05',outcome:'voicemail',capacityRejected:true,voicemailPromptCompletedAt:12000,events:[],commands:['dial:rejected']};
    const data:any={capacityOverlapStartedAt:1000,attempts:[...[1,2,3,4].map(n=>connected(`person-0${n}`)),extra]};
    expect(capacityComplete(data,17999)).toBe(false);expect(capacityComplete(data,18000)).toBe(true);
    extra.capacityRejected=false;expect(capacityComplete(data,18000)).toBe(false);
    extra.capacityRejected=true;extra.commands.push('bridge:ok');expect(capacityComplete(data,18000)).toBe(false);extra.commands.pop();
    data.attempts[0].endedAt=17000;expect(capacityComplete(data,18000)).toBe(false);
  });
  it('preserves only sanitized provider codes and positive capacity rejection evidence',()=>{
    expect(classifyProviderError(403,{errors:[{code:'D22',detail:'Concurrent channel limit exceeded'}]})).toEqual({status:403,codes:['D22'],capacityRejected:true});
    expect(classifyProviderError(401,{errors:[{code:'bad token secret',detail:'Invalid credentials'}]})).toEqual({status:401,codes:[],capacityRejected:false});
    expect(classifyProviderError(500,{errors:[{detail:'channel limit service unavailable'}]}).capacityRejected).toBe(false);
    expect(classifyProviderError(403,{errors:[{detail:'Rate limit exceeded'}]}).capacityRejected).toBe(false);
  });
  it('keeps every audio pair distinct including the overflow caller',()=>{
    const tones=[1,2,3,4,5].flatMap(n=>Object.values(tonePair(`person-0${n}`)));
    expect(new Set(tones).size).toBe(10);expect(tonePair('person-05').caller).toBe(2200);
  });
  it('accepts asynchronous rejection only from the exact recipient leg and a channel-specific code',async()=>{
    expect(capacitySipCode('403 D3')).toBe('D3');expect(capacitySipCode('D35')).toBeNull();expect(capacitySipCode('403')).toBeNull();
    const attempt={parentSid:'parent',sids:['parent','child']};
    const records=[{connection_id:'other',call_control_id:'child',direction:'outbound',telnyx_error_code:'D3'},
      {connection_id:'lab',call_control_id:'parent',direction:'outbound',telnyx_error_code:'D3'},
      {connection_id:'lab',call_control_id:'child',direction:'outbound',telnyx_error_code:'D35'}];
    const api=async()=>({data:records});expect(await readCapacityRejection(api,attempt,'lab')).toBeNull();
    records.push({connection_id:'lab',call_control_id:'child',direction:'outbound',telnyx_error_code:'D3'});
    expect(await readCapacityRejection(api,attempt,'lab')).toEqual({source:'recipient_sip_detail_record',code:'D3'});
  });
});
describe('synthetic voicemail evidence',()=>{
  const record={call_control_id:'parent',connection_id:'lab',status:'completed',duration_millis:25000,download_urls:{mp3:'https://s3.amazonaws.com/telephony-recorder-prod/test.mp3'}};
  it('requires matching call identity and an approved recording origin before downloading',async()=>{
    let downloads=0;const fetcher=async()=>{downloads++;return new Response(new Uint8Array(200));};
    await expect(archiveSyntheticRecording(async()=>({data:record}),'id','other','lab',join(dir(),'audio.mp3'),fetcher)).rejects.toThrow('recording_identity_mismatch');
    await expect(archiveSyntheticRecording(async()=>({data:{...record,download_urls:{mp3:'https://untrusted.invalid/test'}}}),'id','parent','lab',join(dir(),'audio.mp3'),fetcher)).rejects.toThrow('recording_origin_rejected');
    expect(downloads).toBe(0);
  });
  it('archives only bounded synthetic media and records identity verification',async()=>{
    const path=join(dir(),'audio.mp3');
    const evidence=await archiveSyntheticRecording(async()=>({data:record}),'id','parent','lab',path,async()=>new Response(new Uint8Array(200)));
    expect(evidence).toEqual({durationMs:25000,bytes:200,identityVerified:true});expect(readFileSync(path).length).toBe(200);
    await expect(archiveSyntheticRecording(async()=>({data:record}),'id','parent','lab',path,async()=>new Response(new Uint8Array(2_000_001)))).rejects.toThrow('recording_too_large');
  });
});
