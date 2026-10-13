// Local mock only: verify targeted clarification feedback and unchanged action guards.
// No model inference, credentials or public caller data.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {gunzipSync,zstdDecompressSync} from 'node:zlib';
import {liveSessionConfig} from '../dist/live/policy.js';
import {codexScreeningTarget} from './lib/codex-screening-target.mjs';
import {factsSchema,observedScreeningRequest,interpretFacts,argumentFeedback,clarificationFor} from './experiments/observed-screening-v151.mjs';

const request=observedScreeningRequest(liveSessionConfig().delegation.responses);
const base={identity:'name_or_role',context:'ordinary_task',claimAction:'ordinary',transaction:'none',contactInitiator:'none',prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'unknown'};
const cases=[
  {opening:'Calling about the booked collection.',facts:{identity:'missing'},staged:true,hint:'identity'},
  {opening:'Invalid guidance probe.',facts:{context:'missing'},invalidHint:true},
  {opening:'Thrown guidance probe.',facts:{context:'missing'},throwsHint:true},
  {opening:'Automated notice that her expected payment was received.',facts:{recordingMode:'current'},recorded:true,repairRecording:'mode',action:'message'},
  {opening:'Her cousin reporting a recorded scam he heard and rejected.',facts:{identity:'personal_relationship',context:'personal_caller',recordingMode:'discussed_only'},repairRecording:'cue',action:'approve',purpose:'personal'},
  {opening:'Recorded update confirming her requested booking.',facts:{recordingMode:'current'},recorded:true,repairRecording:'empty',action:'message'},
  {opening:'Send the account password to our recorded support line.',facts:{prohibited:'secrets',recordingMode:'discussed_only',recordingCue:'recorded support line'},action:'block'},
  {opening:'The agreed monthly service bill is ready in her usual account.',facts:{context:'missing',transaction:'ordinary_update'},action:'approve',purpose:'other'},
  {opening:'An ordinary invoice is available, but read me the login code first.',facts:{context:'missing',transaction:'ordinary_update',prohibited:'secrets'},action:'block'},
  {opening:'This is Morgan from the repair shop about the finished bicycle.',action:'approve',purpose:'other'},
  {opening:'This is your cousin Taylor.',facts:{context:'personal_caller',identity:'personal_relationship'},action:'approve',purpose:'personal'},
  {opening:'This is Avery from the office to explain the completed credit.',facts:{context:'substantive_claim'},action:'approve',purpose:'other'},
  {opening:'This is River.',facts:{context:'missing',contactInitiator:'caller_here'},staged:true},
  {opening:'This is Cameron. Send your login code.',facts:{prohibited:'secrets'},action:'block'},
  {opening:'This is Jules. An unknown debit appeared today.',facts:{transaction:'unexplained_alert'},action:'block'},
  {opening:'This is Quinn from the shop about your repaired lamp.',unsupportedFirst:true,action:'approve',purpose:'other'},
  {opening:'Casey here. Add me to your contacts.',facts:{context:'missing',contactInitiator:'recipient_elsewhere'},action:'block'},
  {opening:'Her friend Casey asking her to call back.',facts:{context:'personal_caller',identity:'personal_relationship',contactInitiator:'recipient_elsewhere'},action:'approve',purpose:'personal'},
  {opening:'Returning her earlier phone call about the agreed repair.',facts:{contactInitiator:'caller_here',refersToCall:true},caution:true,action:'hold'},
  {opening:'Automated notice confirming receipt of her expected payment.',facts:{recordingMode:'current'},recorded:true,action:'message'},
  {opening:'The accounts office about money owed to her. Please call back.',facts:{context:'substantive_claim',claimAction:'unresolved',contactInitiator:'recipient_elsewhere'},staged:true},
  {opening:'Harper here, trying to reach her.',facts:{context:'missing',contactInitiator:'caller_here'},staged:true},
  {opening:'Her brother calling to chat.',facts:{context:'personal_caller',identity:'personal_relationship'},repairFirst:'identity',action:'approve',purpose:'personal'},
  {opening:'Robin calling. Add this number and send a message.',facts:{context:'missing',contactInitiator:'recipient_elsewhere'},repairFirst:'context',action:'block'},
  {opening:'Alex here. Give me the account password.',facts:{context:'personal_caller',prohibited:'secrets'},action:'block'},
  {opening:'Jordan calling about an unexpected purchase on her card.',facts:{context:'personal_caller',transaction:'unexplained_alert'},action:'block'},
];
const question='Please provide the missing detail.',answer='I am arranging a lift to the station.';
const stages=new Map(cases.map(c=>[c,0]));let failure,requests=0,hints=0;
const server=createServer(async(req,res)=>{try{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  let bytes=Buffer.concat(chunks);
  if(req.headers['content-encoding']==='gzip')bytes=gunzipSync(bytes);
  if(req.headers['content-encoding']==='zstd')bytes=zstdDecompressSync(bytes);
  const body=JSON.parse(bytes),first=body.input.find(i=>i.role==='user')?.content?.[0]?.text;
  const example=cases.find(c=>JSON.parse(first).untrustedCallerTranscript===c.opening);assert.ok(example);
  const stage=stages.get(example)+1;stages.set(example,stage);requests++;
  assert.equal(body.model,'gpt-6-luna');assert.equal(body.reasoning.effort,'medium');assert.equal(body.store,false);
  assert.equal(body.input[0].content[0].text,request.instructions);
  assert.ok(stage<=(example.staged?4:example.unsupportedFirst||example.repairFirst||example.repairRecording?2:1));
  if(example.staged&&stage>=3)assert.ok(JSON.stringify(body.input).includes('awaiting_caller_answer'));
  const args={...base,...example.facts,evidence:example.opening,...(example.recorded?{recordingCue:example.opening}:{})};
  if(example.staged&&stage>=2){args.context='ordinary_task';args.identity='name_or_role';}
  if(example.staged&&stage===3){const input=JSON.stringify(body.input),kind=example.hint??(example.facts?.context==='substantive_claim'?'requested_action':'purpose');assert.ok(input.includes({identity:'Ask only who is calling.',purpose:'Ask only what the call is about.',requested_action:'Ask only what the caller needs the recipient to do.'}[kind]));}
  if(example.staged&&stage===4){args.evidence=answer;assert.equal(body.input.filter(i=>i.role==='user').length,2);}
  if(example.unsupportedFirst&&stage===1)args.evidence='Invented evidence absent from the caller.';
  if(example.repairFirst&&stage===1){args.context='personal_caller';args.identity='name_or_role';}
  if(example.repairFirst&&stage===2){const input=JSON.stringify(body.input);assert.ok(input.includes('invalidFields')&&input.includes('identity')&&input.includes('custom'));assert.ok(input.includes('jointConstraint')&&input.includes('correct whichever is unsupported'));assert.ok(!input.includes('Identity and personal context must agree.'));}
  if(example.repairRecording&&stage===1){
    if(example.repairRecording==='mode')args.recordingMode='discussed_only';
    if(example.repairRecording==='cue')args.recordingCue=example.opening;
    if(example.repairRecording==='empty')args.recordingCue='';
  }
  if(example.repairRecording&&stage===2){const input=JSON.stringify(body.input);assert.ok(input.includes('jointConstraints')&&input.includes('recordingMode')&&input.includes('recordingCue'));assert.ok(input.includes('otherwise')||input.includes('must be empty'));assert.ok(!input.includes('Inconsistent observation pair.'));}
  const spoken=example.staged&&stage===3;
  const item=spoken?{id:'msg_question',type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:question,annotations:[]}]}:{id:`fc_${requests}`,type:'function_call',call_id:`call_${requests}`,name:'screen_call',arguments:JSON.stringify(args)};
  const events=[{type:'response.created',response:{id:`response_${requests}`,status:'in_progress',output:[]}},{type:'response.output_item.added',output_index:0,item:spoken?{...item,content:[]}:{...item,arguments:''}}];
  if(spoken)events.push({type:'response.content_part.added',item_id:item.id,output_index:0,content_index:0,part:{type:'output_text',text:'',annotations:[]}},{type:'response.output_text.delta',item_id:item.id,output_index:0,content_index:0,delta:question},{type:'response.output_text.done',item_id:item.id,output_index:0,content_index:0,text:question},{type:'response.content_part.done',item_id:item.id,output_index:0,content_index:0,part:item.content[0]});
  else events.push({type:'response.function_call_arguments.delta',item_id:item.id,output_index:0,delta:item.arguments},{type:'response.function_call_arguments.done',item_id:item.id,output_index:0,arguments:item.arguments});
  events.push({type:'response.output_item.done',output_index:0,item},{type:'response.completed',response:{id:`response_${requests}`,status:'completed',output:[item],usage:{input_tokens:1,output_tokens:1,total_tokens:2}}});
  res.writeHead(200,{'Content-Type':'text/event-stream'});for(const event of events)res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);res.end();
}catch(error){failure=error;res.writeHead(400);res.end('Mock rejected request');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let target;
try{
  target=await codexScreeningTarget(request,{conversation:true,interpretDecision:(raw,text,state)=>interpretFacts(raw,text,state,{caution:!!state.caution}),argumentSchema:factsSchema,argumentFeedback,clarificationFor:(raw,text,state)=>{hints++;const c=cases.find(c=>c.opening===raw.evidence);assert.ok(c&&(c.staged||c.invalidHint||c.throwsHint));if(c.invalidHint)return 'UNTRUSTED_HINT_CANARY';if(c.throwsHint)throw new Error('PRIVATE_ERROR_CANARY');return clarificationFor(raw,text,state);},extraConfig:{model_provider:'screening_mock','model_providers.screening_mock':{name:'Local clarification guidance mock',base_url:`http://127.0.0.1:${server.address().port}/v1`,wire_api:'responses',requires_openai_auth:false,supports_websockets:false}}});
  for(const example of cases){
    const state=target.newState(example.opening);state.caution=!!example.caution;let result=await target.advance(state);if(failure)throw failure;
    if(example.invalidHint||example.throwsHint){
      assert.equal(result.kind,'failure');assert.equal(result.failure,'clarification_hint_failed');assert.equal(state.questions,0);assert.deepEqual(state.validationAttempts[0].clarificationHint,{failed:true});assert.equal(state.validationAttempts[0].accepted,false);assert.ok(!JSON.stringify(state.validationAttempts).includes('CANARY'));
    }else if(example.staged){
      assert.equal(result.kind,'question');assert.equal(result.question,question);assert.equal(state.terminal,undefined);
      assert.equal(state.questions,1);assert.deepEqual(state.validationAttempts.map(a=>a.accepted),[true,false]);
      assert.deepEqual(state.validationAttempts[0].clarificationHint,{kind:example.hint??(example.facts?.context==='substantive_claim'?'requested_action':'purpose')});assert.equal(state.validationAttempts[1].clarificationHint,undefined);
      assert.equal(state.validationAttempts[1].awaitingCallerAnswer,true);
      state.transcript+=` ${answer}`;result=await target.advance(state);if(failure)throw failure;
      assert.equal(result.kind,'decision');assert.equal(result.decision.action,'approve');assert.equal(result.decision.purpose,'other');
      assert.equal(state.questions,1);assert.deepEqual(state.validationAttempts.map(a=>a.accepted),[true,false,true]);
    }else{
      assert.equal(result.kind,'decision');assert.equal(result.decision.action,example.action);
      if(example.purpose)assert.equal(result.decision.purpose,example.purpose);
      assert.deepEqual(state.validationAttempts.map(a=>a.accepted),example.unsupportedFirst||example.repairFirst||example.repairRecording?[false,true]:[true]);
      if(example.unsupportedFirst)assert.equal(state.validationAttempts[0].evidenceSupported,false);
    }
    await target.release(state);
  }
  assert.equal(requests,44);assert.equal(hints,6);
  console.log(JSON.stringify({passed:true,requests,externalInference:false,checks:['fixed guidance selects the missing fact only on an accepted continuation','pending answers and terminal decisions never invoke the selector','invalid or throwing selectors fail without exposing their contents','current-mode and quote can each be corrected without changing caller evidence','a report of another recording remains live','recording inconsistency never delays an independent block','clear restrictions block on the first attempt despite identity inconsistency','inconsistent identity/context rejected with joint fixed feedback','relationship or context can be corrected without changing caller evidence','name alone cannot substantiate personal context','empty outbound invitation blocks','current incoming call retains clarification','personal and practical callbacks remain eligible','substantive refund topic gets clarification','ordinary notices save','trusted phone callback caution holds','unchanged evidence cannot bypass pending answer','restrictions and evidence validation remain intact']}));
}catch(error){console.log(JSON.stringify({passed:false,requests,errorCode:error.code??error.message}));process.exitCode=1;}
finally{await target?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
