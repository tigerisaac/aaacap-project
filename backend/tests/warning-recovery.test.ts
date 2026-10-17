import { describe,it,expect } from 'vitest';
import { recoveryBridge,conferenceWarning,endWarningConference } from '../../scripts/call-lab/warning-recovery.mjs';
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
