import { describe,it,expect } from 'vitest';
import { SharedCallControl } from '../src/cloud/call-control.js';
import { recoveryBridge,conferenceWarning,endWarningConference,connectWarningConference,stableWarningParticipants,playStableWarning,prepareWarningHandoff } from '../../scripts/call-lab/warning-recovery.mjs';
const room='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
function harness(){
  const attempt:any={id:room,warningVariant:'conference',parentSid:'caller',sids:['caller','recipient'],events:[{type:'call.hangup',role:'caller'}],commands:[]};
  const requests:any[]=[];
  let joined=false,expired=false,uncertain=false;
  const api=async(path:string,method?:string,body?:any)=>{requests.push({path,method,body});if(uncertain)throw Error('timeout');return {data:path.endsWith('/participants')?[{call_control_id:'recipient',status:joined?'joined':'joining'}]:{id:room}};};
  const args={api,ledger:{remaining(){if(expired)throw Error('expired');},save(){}},attempt,recipient:'recipient',audioURL:'https://example.test/warning.wav',state:'signed',now:()=>123};
  return {args,requests,join:()=>joined=true,expire:()=>expired=true,uncertain:()=>uncertain=true};
}
describe('bounded recipient warning recovery experiments',()=>{
  it('replaces parking only for the hold experiment and preserves the exact peer',()=>{
    const body={call_control_id:'caller',prevent_double_bridge:true,park_after_unbridge:'self'};
    expect(recoveryBridge(body,'hold-bridge')).toEqual({call_control_id:'caller',prevent_double_bridge:true,hold_after_unbridge:true});
    expect(recoveryBridge(body,'conference')).toBe(body);
  });
  it('waits for the sole recipient to join and fences both creation and playback',async()=>{
    const h=harness();expect(await conferenceWarning(h.args)).toBe(false);h.join();
    expect(await conferenceWarning(h.args)).toBe(true);await conferenceWarning(h.args);
    const creates=h.requests.filter(r=>r.path==='/conferences');expect(creates).toHaveLength(1);
    expect(creates[0].body).toMatchObject({call_control_id:'recipient',duration_minutes:1,max_participants:2,beep_enabled:'never'});
    const plays=h.requests.filter(r=>r.path.endsWith('/play'));expect(plays).toHaveLength(1);expect(plays[0].body.call_control_ids).toEqual(['recipient']);
    await endWarningConference(h.args.api,h.args.attempt);expect(h.requests.at(-1).path).toBe(`/conferences/${room}/actions/end_conference`);
  });
  it('never retries an uncertain conference creation',async()=>{
    const h=harness();h.uncertain();await expect(conferenceWarning(h.args)).rejects.toThrow('timeout');
    expect(await conferenceWarning(h.args)).toBe(false);expect(h.requests).toHaveLength(1);
  });
  it('rejects expired sessions, unbound legs and a caller that is still connected',async()=>{
    const h=harness();h.expire();await expect(conferenceWarning(h.args)).rejects.toThrow('expired');expect(h.requests).toHaveLength(0);
    for(const recipient of ['caller','stranger'])await expect(conferenceWarning({...harness().args,recipient})).rejects.toThrow('unsafe_warning_conference');
    const live=harness();live.args.attempt.events=[];await expect(conferenceWarning(live.args)).rejects.toThrow('unsafe_warning_conference');expect(live.requests).toHaveLength(0);
  });
  it('refuses to play into a conference with an unexpected participant',async()=>{
    const h=harness();h.args.attempt.conferenceId=room;h.args.attempt.conferenceSubmittedAt=1;
    h.args.api=async()=>({data:[{call_control_id:'stranger',status:'joined'}]}) as any;
    await expect(conferenceWarning(h.args)).rejects.toThrow('unexpected_conference_participant');expect(h.args.attempt.warningPlaybackAt).toBeUndefined();
  });
});

describe('warning comparison without parking',()=>{
  it('continues after an already-ended caller only with an explicit inactive provider readback',async()=>{
    const rejection=Error('telnyx_http_422');
    for(const alive of [false,true,undefined]){
      const control:any={store:{vault:{hash:()=> 'fixed-command'}},provider:{
        action:async()=>{throw rejection;},request:async()=>({is_alive:alive})}};
      const result=SharedCallControl.prototype.hangup.call(control,'caller');
      if(alive===false)await expect(result).resolves.toBeUndefined();
      else await expect(result).rejects.toBe(rejection);
    }
  });
  function setup(){
    const h=harness();h.args.attempt.warningVariant='conference-first';
    h.args.attempt.events=[{type:'call.gather.ended',role:'recipient',digits:'1'}];
    h.args.attempt.commands=['record_stop:ok'];return h;
  }
  it('requires recipient acceptance and recording stop before connecting either leg',async()=>{
    for(const missing of ['accept','record','recipient']){
      const h=setup();if(missing==='accept')h.args.attempt.events=[];
      if(missing==='record')h.args.attempt.commands=[];if(missing==='recipient')h.args.recipient='stranger';
      await expect(connectWarningConference(h.args)).rejects.toThrow('unsafe_warning_conference_connection');expect(h.requests).toHaveLength(0);
    }
    const h=setup();await connectWarningConference(h.args);
    expect(h.requests[0].body).toMatchObject({call_control_id:'recipient',duration_minutes:1,max_participants:2});
    expect(h.requests[1].body).toMatchObject({call_control_id:'caller',end_conference_on_exit:false,hold:false,mute:false});
  });
  it('does not retry uncertain creation or join and still knows the room for cleanup',async()=>{
    const h=setup();h.uncertain();await expect(connectWarningConference(h.args)).rejects.toThrow('timeout');
    await expect(connectWarningConference(h.args)).rejects.toThrow('conference_already_submitted');expect(h.requests).toHaveLength(1);
    const j=setup();const api=j.args.api;j.args.api=async(path,...rest)=>{if(path.endsWith('/join'))throw Error('timeout');return api(path,...rest);};
    await expect(connectWarningConference(j.args)).rejects.toThrow('timeout');expect(j.args.attempt.conferenceId).toBe(room);
    await expect(connectWarningConference(j.args)).rejects.toThrow('conference_already_submitted');
  });
  it('waits for actual participants and never plays while the caller remains or recipient is held',async()=>{
    const h=setup();h.args.attempt.conferenceId=room;
    let participants:any[]=[{call_control_id:'recipient',status:'joined'},{call_control_id:'caller',status:'joined'}];
    h.args.api=async(path,method,body)=>{h.requests.push({path,method,body});return {data:participants} as any;};
    expect(await stableWarningParticipants(h.args)).toBe(true);
    expect(await playStableWarning(h.args)).toBe(false);
    h.args.attempt.events.push({type:'call.hangup',role:'caller'});
    expect(await playStableWarning(h.args)).toBe(false);
    participants=[{call_control_id:'recipient',status:'joined',on_hold:true}];
    expect(await playStableWarning(h.args)).toBe(false);
    participants=[{call_control_id:'recipient',status:'joined'}];
    expect(await playStableWarning(h.args)).toBe(true);await playStableWarning(h.args);
    expect(h.requests.filter(r=>r.path.endsWith('/play'))).toHaveLength(1);
    expect(h.requests.find(r=>r.path.endsWith('/play')).body.call_control_ids).toEqual(['recipient']);
    participants.push({call_control_id:'stranger',status:'joined'});
    await expect(playStableWarning(h.args)).rejects.toThrow('unexpected_conference_participant');
  });
  it('moves only the already connected recipient before the caller is removed',async()=>{
    const h=setup();h.args.attempt.warningVariant='conference-handoff';h.args.attempt.warningAt=1;
    await expect(prepareWarningHandoff(h.args)).rejects.toThrow('unsafe_warning_handoff');expect(h.requests).toHaveLength(0);
    h.args.attempt.events.push({type:'call.bridged'});
    expect(await prepareWarningHandoff(h.args)).toBe(false);h.join();
    expect(await prepareWarningHandoff(h.args)).toBe(true);
    expect(h.requests.filter(r=>r.method==='POST')).toHaveLength(1);
    expect(h.requests[0].body.call_control_id).toBe('recipient');
    expect(await playStableWarning(h.args)).toBe(false);
    h.args.attempt.events.push({type:'call.hangup',role:'caller'});
    expect(await playStableWarning(h.args)).toBe(true);
  });
});
