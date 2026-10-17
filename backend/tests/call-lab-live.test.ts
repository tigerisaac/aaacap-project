import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LiveLedger, guardDial, operatorRequestAllowed } from '../../scripts/call-lab/live-guard.mjs';
const dirs:string[]=[];
const path=()=>{const dir=mkdtempSync(join(tmpdir(),'shield-live-'));dirs.push(dir);return join(dir,'ledger.json');};
afterEach(()=>{for(const dir of dirs.splice(0))rmSync(dir,{recursive:true,force:true});});
describe('live call lab spending and destination boundaries',()=>{
  it('persists attempts across restart and never refunds uncertain calls',()=>{
    const file=path(),first=new LiveLedger(file);const a=first.reserve('accept');
    expect(()=>new LiveLedger(file).reserve('decline')).toThrow('session_active');
    a.endedAt=Date.now();first.save();const second=new LiveLedger(file),b=second.reserve('decline');b.endedAt=Date.now();second.save();
    expect(()=>new LiveLedger(file).reserve('accept')).toThrow('attempt_budget_exhausted');
  });
  it('blocks expired/stopped runs and unsupported scenarios',()=>{
    let now=1000;const ledger=new LiveLedger(path(),()=>now);
    expect(()=>ledger.reserve('arbitrary')).toThrow('unknown_case');
    const a=ledger.reserve('accept');now+=60000;expect(()=>ledger.remaining(a)).toThrow('session_expired');
    a.endedAt=now;ledger.data.stopped=true;expect(()=>ledger.reserve('decline')).toThrow('run_closed');
  });
  it('only replaces the fixed fictional recipient with the approved SIP endpoint',()=>{
    let now=1000;const ledger=new LiveLedger(path(),()=>now),attempt=ledger.reserve('accept');
    const context={ledger,attempt,connection:'lab',phone:'+12025550100',recipient:'sip:software_recipient@sip.telnyx.com',from:'+12025550198'};
    expect(()=>guardDial({to:'+12025550101',connection_id:'lab'},context)).toThrow('destination_or_dial_rejected');
    expect(()=>guardDial({to:context.phone,connection_id:'production'},context)).toThrow('destination_or_dial_rejected');
    now+=10000;const bounded=guardDial({to:context.phone,connection_id:'lab',time_limit_secs:3600},context);
    expect(bounded.to).toBe(context.recipient);expect(bounded.time_limit_secs).toBe(50);expect(bounded.timeout_secs).toBe(10);
    expect(()=>guardDial({to:context.phone,connection_id:'lab'},context)).toThrow('destination_or_dial_rejected');
  });
  it('rejects public hosts, cross-origin mutations and simple-form posts',()=>{
    const origin='http://127.0.0.1:1234';
    const req={method:'POST',headers:{host:'127.0.0.1:1234',origin,'content-type':'application/json'}};
    expect(operatorRequestAllowed(req,origin)).toBe(true);
    expect(operatorRequestAllowed({...req,headers:{...req.headers,origin:'https://evil.invalid'}},origin)).toBe(false);
    expect(operatorRequestAllowed({...req,headers:{...req.headers,host:'public.example'}},origin)).toBe(false);
    expect(operatorRequestAllowed({...req,headers:{...req.headers,'content-type':'text/plain'}},origin)).toBe(false);
  });
});

describe('browser test operator recovery',()=>{
  const harness=()=>{
    const elements=new Map<string,any>();const requests:string[]=[];
    const element=(id:string)=>{if(!elements.has(id))elements.set(id,{value:'accept',textContent:'',append:()=>{},disabled:false});return elements.get(id);};
    let poll:()=>Promise<void>=async()=>{};
    const context:any={document:{getElementById:element,createElement:()=>({})},window:{},setInterval:(fn:()=>Promise<void>)=>{poll=fn;},clearTimeout:()=>{},setTimeout:()=>0,
      fetch:async(path:string)=>{requests.push(path);return {ok:true,json:async()=>path==='/status'?{ready:true,used:0,limit:2,attempts:[]}:{resourcesDisabled:true}};}};
    const code=readFileSync('scripts/call-lab/web/live.js','utf8');runInNewContext(code,context);
    return {element,requests,context,poll:()=>poll()};
  };
  it('sends server stop even when local call/audio cleanup fails',async()=>{
    const h=harness();runInNewContext("callerCall={hangup(){throw Error('closed peer')}};context={close(){return Promise.reject(Error('closed audio'))}};",h.context);
    await h.element('stop').onclick();expect(h.requests).toContain('/stop');expect(h.element('status').textContent).toContain('connections disabled');
  });
  it('replaces loading status after a successful gateway response',async()=>{
    const h=harness();await h.poll();expect(h.element('status').textContent).toBe('Gateway ready. Connect the browser endpoints to begin.');
  });
  it('clears old audio evidence and call references before a new attempt',async()=>{
    const h=harness();runInNewContext("ready=true;context={resume:async()=>{}};caller={newCall(){return {}}};audioStats.caller.bytes=9000;recipientCall={};",h.context);
    await h.element('run').onclick();
    expect(runInNewContext('audioStats.caller.bytes',h.context)).toBe(0);
    expect(runInNewContext('recipientCall',h.context)).toBeUndefined();
  });
});
