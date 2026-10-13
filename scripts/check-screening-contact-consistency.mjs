// Local mock only: verify correction of contradictory relationship observations through the subscription adapter.
// No model inference, credentials or public caller data.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {gunzipSync,zstdDecompressSync} from 'node:zlib';
import {liveSessionConfig} from '../dist/live/policy.js';
import {codexScreeningTarget} from './lib/codex-screening-target.mjs';
import {factsSchema,observedScreeningRequest,interpretFacts,argumentFeedback} from './experiments/observed-screening-v144.mjs';

const request=observedScreeningRequest(liveSessionConfig().delegation.responses);
const base={identity:'name_or_role',context:'ordinary_task',claimAction:'ordinary',transaction:'none',contactInitiator:'none',prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'unknown'};
const cases=[
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
];
const question='What is the call about?',answer='I am arranging a lift to the station.';
const stages=new Map(cases.map(c=>[c,0]));let failure,requests=0;
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
  assert.ok(stage<=(example.staged?4:example.unsupportedFirst||example.repairFirst?2:1));
  if(example.staged&&stage>=3)assert.ok(JSON.stringify(body.input).includes('awaiting_caller_answer'));
  const args={...base,...example.facts,evidence:example.opening,...(example.recorded?{recordingCue:example.opening}:{})};
  if(example.staged&&stage>=2)args.context='ordinary_task';
  if(example.staged&&stage===4){args.evidence=answer;assert.equal(body.input.filter(i=>i.role==='user').length,2);}
  if(example.unsupportedFirst&&stage===1)args.evidence='Invented evidence absent from the caller.';
  if(example.repairFirst&&stage===1){args.context='personal_caller';args.identity='name_or_role';}
  if(example.repairFirst&&stage===2){const input=JSON.stringify(body.input);assert.ok(input.includes('invalidFields')&&input.includes('identity')&&input.includes('custom'));assert.ok(!input.includes('Personal context requires a stated personal relationship.'));}
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
  target=await codexScreeningTarget(request,{conversation:true,interpretDecision:(raw,text,state)=>interpretFacts(raw,text,state,{caution:!!state.caution}),argumentSchema:factsSchema,argumentFeedback,extraConfig:{model_provider:'screening_mock','model_providers.screening_mock':{name:'Local contact consistency mock',base_url:`http://127.0.0.1:${server.address().port}/v1`,wire_api:'responses',requires_openai_auth:false,supports_websockets:false}}});
  for(const example of cases){
    const state=target.newState(example.opening);state.caution=!!example.caution;let result=await target.advance(state);if(failure)throw failure;
    if(example.staged){
      assert.equal(result.kind,'question');assert.equal(result.question,question);assert.equal(state.terminal,undefined);
      assert.equal(state.questions,1);assert.deepEqual(state.validationAttempts.map(a=>a.accepted),[true,false]);
      assert.equal(state.validationAttempts[1].awaitingCallerAnswer,true);
      state.transcript+=` ${answer}`;result=await target.advance(state);if(failure)throw failure;
      assert.equal(result.kind,'decision');assert.equal(result.decision.action,'approve');assert.equal(result.decision.purpose,'other');
      assert.equal(state.questions,1);assert.deepEqual(state.validationAttempts.map(a=>a.accepted),[true,false,true]);
    }else{
      assert.equal(result.kind,'decision');assert.equal(result.decision.action,example.action);
      if(example.purpose)assert.equal(result.decision.purpose,example.purpose);
      assert.deepEqual(state.validationAttempts.map(a=>a.accepted),example.unsupportedFirst||example.repairFirst?[false,true]:[true]);
      if(example.unsupportedFirst)assert.equal(state.validationAttempts[0].evidenceSupported,false);
    }
    await target.release(state);
  }
  assert.equal(requests,27);
  console.log(JSON.stringify({passed:true,requests,externalInference:false,checks:['inconsistent identity/context rejected with fixed field/code feedback','relationship or context can be corrected without changing caller evidence','name alone cannot substantiate personal context','empty outbound invitation blocks','current incoming call retains clarification','personal and practical callbacks remain eligible','substantive refund topic gets clarification','ordinary notices save','trusted phone callback caution holds','unchanged evidence cannot bypass pending answer','restrictions and evidence validation remain intact']}));
}catch(error){console.log(JSON.stringify({passed:false,requests,errorCode:error.code??error.message}));process.exitCode=1;}
finally{await target?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
