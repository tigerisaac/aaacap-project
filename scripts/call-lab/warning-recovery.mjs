// Isolated recovery experiments. Never dials and only uses the reserved recipient leg.
export function recoveryBridge(body, variant) {
  if(variant!=='hold-bridge')return body;
  const {park_after_unbridge,...rest}=body;
  return {...rest,hold_after_unbridge:true};
}
export async function conferenceWarning({api,ledger,attempt:a,recipient,audioURL,state,now=Date.now}) {
  ledger.remaining(a);
  if(a.warningVariant!=='conference'||!recipient||recipient===a.parentSid||!a.sids.includes(recipient)
    ||!a.events.some(e=>e.type==='call.hangup'&&e.role==='caller'))throw Error('unsafe_warning_conference');
  if(!a.conferenceSubmittedAt){
    // Persist before submission: an uncertain response must never create another room.
    a.conferenceSubmittedAt=now();ledger.save();
    const result=await api('/conferences','POST',{call_control_id:recipient,name:`shield-warning-lab-${a.id}`,
      command_id:a.id,client_state:state,beep_enabled:'never',comfort_noise:false,
      duration_minutes:1,max_participants:2,start_conference_on_create:true});
    if(!/^[a-f0-9-]{36}$/i.test(result.data?.id))throw Error('invalid_conference_response');
    a.conferenceId=result.data.id;ledger.save();
  }
  if(!a.conferenceId)return false;
  const participants=(await api(`/conferences/${a.conferenceId}/participants`)).data;
  if(participants.some(p=>p.status!=='left'&&p.call_control_id!==recipient))throw Error('unexpected_conference_participant');
  if(!participants.some(p=>p.call_control_id===recipient&&p.status==='joined'))return false;
  if(!a.warningPlaybackAt){
    ledger.remaining(a);
    a.warningPlaybackAt=now();ledger.save(); // Play has no documented idempotency key; submit once.
    await api(`/conferences/${a.conferenceId}/actions/play`,'POST',{audio_url:audioURL,call_control_ids:[recipient],loop:1});
    a.commands.push('conference_play:ok');ledger.save();
  }
  return true;
}
export async function endWarningConference(api,a) {
  if(!a.conferenceId)return;
  await api(`/conferences/${a.conferenceId}/actions/end_conference`,'POST',{});
}

// Isolated comparison: establish the conversation without ever parking the recipient.
export async function connectWarningConference({api,ledger,attempt:a,recipient,now=Date.now}) {
  ledger.remaining(a);
  if(a.warningVariant!=='conference-first'||!a.parentSid||recipient===a.parentSid||!a.sids.includes(recipient)
    ||!a.events.some(e=>e.type==='call.gather.ended'&&e.role==='recipient'&&e.digits==='1')
    ||!a.commands.includes('record_stop:ok'))throw Error('unsafe_warning_conference_connection');
  if(a.conferenceSubmittedAt)throw Error('conference_already_submitted');
  a.conferenceSubmittedAt=now();ledger.save();
  const result=await api('/conferences','POST',{call_control_id:recipient,name:`shield-warning-lab-${a.id}`,
    command_id:a.id,beep_enabled:'never',comfort_noise:false,duration_minutes:1,max_participants:2,start_conference_on_create:true});
  if(!/^[a-f0-9-]{36}$/i.test(result.data?.id))throw Error('invalid_conference_response');
  a.conferenceId=result.data.id;ledger.save();
  ledger.remaining(a);
  a.conferenceJoinSubmittedAt=now();ledger.save();
  await api(`/conferences/${a.conferenceId}/actions/join`,'POST',{call_control_id:a.parentSid,
    command_id:a.id,end_conference_on_exit:false,start_conference_on_enter:true,hold:false,mute:false,beep_enabled:'never'});
  return result.data;
}

export async function stableWarningParticipants({api,attempt:a,recipient,afterHangup=false}) {
  if(!['conference-first','conference-handoff'].includes(a.warningVariant)||!a.conferenceId||!recipient||recipient===a.parentSid||!a.sids.includes(recipient))throw Error('unsafe_warning_conference');
  const participants=(await api(`/conferences/${a.conferenceId}/participants`)).data;
  const active=participants.filter(p=>p.status!=='left');
  if(active.some(p=>![a.parentSid,recipient].includes(p.call_control_id)))throw Error('unexpected_conference_participant');
  const ready=id=>active.some(p=>p.call_control_id===id&&p.status==='joined'&&!p.on_hold&&!p.muted);
  return ready(recipient)&&(afterHangup?!active.some(p=>p.call_control_id===a.parentSid):ready(a.parentSid));
}

export async function prepareWarningHandoff({api,ledger,attempt:a,recipient,now=Date.now}) {
  ledger.remaining(a);
  if(a.warningVariant!=='conference-handoff'||!a.warningAt||!recipient||recipient===a.parentSid||!a.sids.includes(recipient)
    ||!a.events.some(e=>e.type==='call.bridged')||!a.commands.includes('record_stop:ok'))throw Error('unsafe_warning_handoff');
  if(!a.conferenceSubmittedAt){
    a.conferenceSubmittedAt=now();ledger.save();
    const result=await api('/conferences','POST',{call_control_id:recipient,name:`shield-warning-lab-${a.id}`,
      command_id:a.id,beep_enabled:'never',comfort_noise:false,duration_minutes:1,max_participants:2,start_conference_on_create:true});
    if(!/^[a-f0-9-]{36}$/i.test(result.data?.id))throw Error('invalid_conference_response');
    a.conferenceId=result.data.id;ledger.save();
  }
  if(!a.conferenceId)return false;
  const participants=(await api(`/conferences/${a.conferenceId}/participants`)).data.filter(p=>p.status!=='left');
  if(participants.some(p=>p.call_control_id!==recipient))throw Error('unexpected_conference_participant');
  return participants.some(p=>p.status==='joined'&&!p.on_hold&&!p.muted);
}

export async function playStableWarning(args) {
  const {api,ledger,attempt:a,recipient,audioURL,now=Date.now}=args;
  ledger.remaining(a);
  if(!a.events.some(e=>e.type==='call.hangup'&&e.role==='caller'))return false;
  if(!await stableWarningParticipants({...args,afterHangup:true}))return false;
  if(!a.warningPlaybackAt){
    ledger.remaining(a);a.warningPlaybackAt=now();ledger.save();
    await api(`/conferences/${a.conferenceId}/actions/play`,'POST',{audio_url:audioURL,call_control_ids:[recipient],loop:1});
    a.commands.push('conference_play:ok');ledger.save();
  }
  return true;
}
