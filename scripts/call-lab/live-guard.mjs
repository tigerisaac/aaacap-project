import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { capacityAliases, capacityPlan, connectedGroup, overflowAlias } from './capacity.mjs';

// Deliberately persistent: restarting never refunds a submitted/uncertain attempt.
export class LiveLedger {
  constructor(path, now=Date.now, mode='sequential') {
    if(!['single','sequential','overlap','capacity'].includes(mode))throw Error('invalid_run_mode');
    this.path=path; this.now=now;this.mode=mode;
    try { this.data=JSON.parse(readFileSync(path,'utf8')); }
    catch(e) { if(e.code!=='ENOENT')throw e; this.data={version:1,mode,id:randomUUID(),createdAt:now(),attempts:[],credentials:[],stopped:false};this.save(); }
    if(this.data.version!==1||!Array.isArray(this.data.attempts))throw Error('invalid_ledger');
    if((this.data.mode??'sequential')!==mode)throw Error('run_mode_mismatch');
  }
  save() { writeFileSync(this.path+'.tmp',JSON.stringify(this.data,null,2),{mode:0o600});renameSync(this.path+'.tmp',this.path); }
  reserve(kind,alias='person-01') {
    if(!['accept','decline'].includes(kind))throw Error('unknown_case');
    if(!(this.mode==='capacity'?capacityAliases:['person-01',...(this.mode==='overlap'?['person-02']:[])]).includes(alias))throw Error('unknown_test_recipient');
    if(this.mode==='capacity'&&kind!=='accept')throw Error('capacity_requires_accept');
    if(this.mode==='overlap'&&kind!=='accept')throw Error('overlap_requires_accept');
    if(this.data.stopped||this.now()-this.data.createdAt>1800000)throw Error('run_closed');
    if(this.activeAll().length>=(this.mode==='capacity'?5:this.mode==='overlap'?2:1))throw Error('session_active');
    if(this.mode!=='sequential'&&this.data.attempts.some(a=>a.alias===alias))throw Error('recipient_already_reserved');
    if(this.mode==='capacity'&&alias===overflowAlias&&!connectedGroup(this.activeAll()))throw Error('four_connections_required');
    if(this.data.attempts.length>=(this.mode==='single'?1:this.mode==='capacity'?5:2))throw Error('attempt_budget_exhausted');
    const a={id:randomUUID(),kind,alias,startedAt:this.now(),deadline:this.now()+(this.mode==='capacity'?capacityPlan.secondsPerSession*1000:60000),sids:[],events:[],commands:[],mediaFrames:0};
    this.data.attempts.push(a);this.save();return a;
  }
  active() { return this.data.attempts.find(a=>!a.endedAt); }
  activeAll() { return this.data.attempts.filter(a=>!a.endedAt); }
  byCallId(id) { return id?this.data.attempts.find(a=>a.callId===id):undefined; }
  byTicket(ticket) { return ticket?this.activeAll().find(a=>a.ticket===ticket):undefined; }
  known(sid) { return this.data.attempts.find(a=>a.sids.includes(sid)); }
  bind(a,sid) { if(typeof sid!=='string'||sid.length>512||!sid)throw Error('invalid_call_id');if(!a.sids.includes(sid)){a.sids.push(sid);this.save();} }
  remaining(a) { const seconds=Math.floor((a.deadline-this.now())/1000);if(seconds<1||a.endedAt||this.data.stopped)throw Error('session_expired');return Math.min(this.mode==='capacity'?90:60,seconds); }
}

export function overlapReady(attempts) {
  return attempts.length===2 && new Set(attempts.map(a=>a.alias)).size===2 &&
    attempts.every(a=>!a.endedAt&&a.outcome==='connected'&&a.events.some(e=>e.type==='call.bridged'));
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
