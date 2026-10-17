// Conservative same-account browser test. This is not a measured account ceiling.
export const capacityPlan=Object.freeze({mode:'capacity',accepted:4,sessions:5,accountCeiling:10,
  appInbound:5,appOutbound:4,browserInbound:5,browserOutbound:5,profileOutbound:10,
  secondsPerSession:90,routingWindowMs:120000,overlapMs:10000,voicemailCaptureMs:6000,
  estimatedUSD:[.06,.10],planningAllowanceUSD:.15,numberPurchases:0});
export const capacityAliases=Object.freeze(Array.from({length:5},(_,i)=>`person-0${i+1}`));
export const overflowAlias='person-05';
export function tonePair(alias) {
  const i=Number(alias.slice(-2))-1;
  if(!Number.isInteger(i)||i<0||i>=5)throw Error('unknown_test_recipient');
  // Preserve the two original pairs; all five pairs remain distinguishable.
  return {caller:440+i*440,recipient:660+i*440};
}
export function connectedGroup(attempts) {
  const accepted=attempts.filter(a=>capacityAliases.slice(0,4).includes(a.alias));
  return accepted.length===4&&new Set(accepted.map(a=>a.alias)).size===4&&
    accepted.every(a=>!a.endedAt&&a.outcome==='connected'&&a.events.some(e=>e.type==='call.bridged')&&!a.events.some(e=>e.type==='call.hangup'));
}
export function capacityComplete(data,now=Date.now()) {
  const extra=data.attempts.find(a=>a.alias===overflowAlias);
  return connectedGroup(data.attempts)&&!!data.capacityOverlapStartedAt&&
    now-data.capacityOverlapStartedAt>=capacityPlan.overlapMs&&extra?.outcome==='voicemail'&&
    !!extra.voicemailPromptCompletedAt&&now-extra.voicemailPromptCompletedAt>=capacityPlan.voicemailCaptureMs&&
    extra.capacityRejected===true&&!extra.commands.includes('bridge:ok');
}
export function classifyProviderError(status,payload) {
  const errors=Array.isArray(payload?.errors)?payload.errors:[];
  return {status,codes:errors.map(e=>String(e.code??'')).filter(s=>/^[a-zA-Z0-9_-]{1,40}$/.test(s)),
    capacityRejected:status>=400&&status<500&&errors.some(e=>
      /(?:channel|concurrent).*(?:limit|exceed)|(?:limit|exceed).*(?:channel|concurrent)/i.test(String(e.title??'')+' '+String(e.detail??'')))};
}
// Official Telnyx SIP channel-limit codes. A bare 403/busy is insufficient.
export function capacitySipCode(value) {
  const match=String(value??'').match(/(?:^|\s)(D1|D2|D3|D10|D22)(?=$|\s)/);
  return match?.[1]??null;
}
export async function readCapacityRejection(api,attempt,connection) {
  const children=attempt.sids.filter(sid=>sid!==attempt.parentSid);
  if(!children.length)return null;
  const q=new URLSearchParams({'filter[record_type]':'sip-trunking','filter[connection_id]':connection,'filter[date_range]':'today','sort':'-started_at','page[size]':'50'});
  const response=await api('/detail_records?'+q);
  for(const r of response.data??[]){
    if(String(r.connection_id)!==connection||!children.includes(r.call_control_id)||r.direction!=='outbound')continue;
    const code=capacitySipCode(r.telnyx_error_code);
    if(code)return {source:'recipient_sip_detail_record',code};
  }
  return null;
}
