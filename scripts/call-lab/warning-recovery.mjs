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
