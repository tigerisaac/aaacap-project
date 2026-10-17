import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

// Deliberately persistent: restarting never refunds a submitted/uncertain attempt.
export class LiveLedger {
  constructor(path, now=Date.now) {
    this.path=path; this.now=now;
    try { this.data=JSON.parse(readFileSync(path,'utf8')); }
    catch(e) { if(e.code!=='ENOENT')throw e; this.data={version:1,id:randomUUID(),createdAt:now(),attempts:[],credentials:[],stopped:false};this.save(); }
    if(this.data.version!==1||!Array.isArray(this.data.attempts))throw Error('invalid_ledger');
  }
  save() { writeFileSync(this.path+'.tmp',JSON.stringify(this.data,null,2),{mode:0o600});renameSync(this.path+'.tmp',this.path); }
  reserve(kind) {
    if(!['accept','decline'].includes(kind))throw Error('unknown_case');
    if(this.data.stopped||this.now()-this.data.createdAt>1800000)throw Error('run_closed');
    if(this.data.attempts.some(a=>!a.endedAt))throw Error('session_active');
    if(this.data.attempts.length>=2)throw Error('attempt_budget_exhausted');
    const a={id:randomUUID(),kind,startedAt:this.now(),deadline:this.now()+60000,sids:[],events:[],commands:[],mediaFrames:0};
    this.data.attempts.push(a);this.save();return a;
  }
  active() { return this.data.attempts.find(a=>!a.endedAt); }
  known(sid) { return this.data.attempts.find(a=>a.sids.includes(sid)); }
  bind(a,sid) { if(typeof sid!=='string'||sid.length>512||!sid)throw Error('invalid_call_id');if(!a.sids.includes(sid)){a.sids.push(sid);this.save();} }
  remaining(a) { const seconds=Math.floor((a.deadline-this.now())/1000);if(seconds<1||a.endedAt||this.data.stopped)throw Error('session_expired');return Math.min(60,seconds); }
}

export function guardDial(body, {ledger,attempt,connection,phone,recipient,from}) {
  if(body.to!==phone||body.connection_id!==connection||attempt.dialSubmitted)throw Error('destination_or_dial_rejected');
  if(!/^sip:[a-zA-Z0-9_-]+@sip\.telnyx\.com$/.test(recipient))throw Error('invalid_test_recipient');
  const seconds=ledger.remaining(attempt);
  // Fence BEFORE the network request. Unknown outcomes must never be retried.
  attempt.dialSubmitted=true;ledger.save();
  return {...body,to:recipient,from,time_limit_secs:seconds,timeout_secs:Math.min(10,seconds)};
}

export function operatorRequestAllowed(req,origin) {
  return req.headers.host===new URL(origin).host && (req.method==='GET'||
    (req.method==='POST'&&req.headers.origin===origin&&req.headers['content-type']?.startsWith('application/json')));
}
