// Operator test plans only. This module cannot buy numbers or place calls.
export const cases = [
  { id: 'accept', title: 'Ordinary caller · press 1', target: 0, decision: 'approve', response: '1', speech: 'Hi, this is Alex. I am calling to see if you are free for lunch tomorrow.' },
  { id: 'decline', title: 'Recipient declines', target: 0, decision: 'approve', response: '2', speech: 'Hi, this is Jordan. I am returning your call about our appointment.' },
  { id: 'no-answer', title: 'Recipient does not answer', target: 0, decision: 'approve', response: 'hangup', speech: 'Hello, this is Sam. I wanted to check what time we are meeting tomorrow.' },
  { id: 'caller-hangup', title: 'Caller hangs up during screening', target: 0, response: 'caller-hangup', speech: 'Hello, I am calling about tomorrow.' },
  { id: 'harmful', title: 'Scripted harmful request', target: 0, decision: 'scam', speech: 'I need you to read me the one-time login code that just arrived on your phone.' },
  { id: 'silence', title: 'Silent caller', target: 0, decision: 'silence', speech: '' },
  { id: 'overlap-a', title: 'Overlap · first recipient', target: 0, decision: 'approve', response: '1', speech: 'Hi, this is Alex. Are you available for lunch tomorrow?' },
  { id: 'overlap-b', title: 'Overlap · second recipient', target: 1, decision: 'approve', response: '2', speech: 'Hi, this is Jordan. I am calling about the book you lent me.' }
];
export const limits = Object.freeze({ sessions: 2, concurrentSessions: 1, secondsPerSession: 60, legsPerSession: 4, budgetUSD: 0.25 });
export const rehearsalLimits = Object.freeze({ ...limits, sessions: 8, concurrentSessions: 2, secondsPerSession: 120 });
export const rates = Object.freeze({ checked: '2026-10-16', currency: 'USD', voiceApi: 0.002, sipInterface: 0.002, browser: 0.002, stream: 0.0035, recording: 0.002, sonioxTypical: 0.002,
  telnyxSource: 'https://telnyx.com/pricing/voice-api', sonioxSource: 'https://soniox.com/pricing' });
export function estimate() {
  const sessionMinutes = limits.sessions * limits.secondsPerSession / 60, legMinutes = sessionMinutes * limits.legsPerSession;
  const items = { voiceAPI: legMinutes * rates.voiceApi, sipInterfaces: legMinutes * rates.sipInterface, browserEndpoints: legMinutes * rates.browser,
    streaming: sessionMinutes * rates.stream, recording: sessionMinutes * rates.recording, sonioxTypical: sessionMinutes * rates.sonioxTypical,
    modelAllowance: 0.05, infrastructureAllowance: 0.02 };
  const estimatedUSD = Number(Object.values(items).reduce((a,b)=>a+b,0).toFixed(3));
  return { limits, sessionMinutes, legMinutes, items, estimatedUSD, contingencyUSD: Number((limits.budgetUSD-estimatedUSD).toFixed(3)), numberPurchases: 0,
    basis: 'Conservative on-net SIP plan, not a quote: all four possible legs charged for API, SIP interface and browser usage for the full duration. AI/cloud amounts are planning allowances. Excludes PSTN, number rental, taxes and unquoted surcharges. Duration/count limits are not a provider-wide dollar ceiling.',
    deferred: ['remaining six live scenarios', '10-plus-1 carrier overflow', '25-way real audio', 'calls longer than 7.5 minutes', 'mobile forwarding and restoration', 'physical iPhone delivery'], rates };
}
/** Reserve the entire worst-case workload before starting; failed/uncertain attempts never refund it. */
export class RunBudget {
  constructor(now = Date.now, policy = limits) { this.policy=policy;this.now=now;this.started=this.now();this.used=0;this.active=new Set();this.seen=new Set();this.stopped=false; }
  reserve(id) {
    if(this.stopped || this.now()-this.started>=30*60_000) throw Error('run_stopped');
    if(this.used>=this.policy.sessions) throw Error('session_limit');
    if(this.active.size>=this.policy.concurrentSessions) throw Error('concurrency_limit');
    if(this.seen.has(id)) throw Error('duplicate_session');
    this.used++;this.active.add(id);this.seen.add(id);return { deadline:this.now()+this.policy.secondsPerSession*1000, maxLegs:this.policy.legsPerSession };
  }
  finish(id) { this.active.delete(id); }
  stop() { this.stopped=true;return [...this.active]; }
}
