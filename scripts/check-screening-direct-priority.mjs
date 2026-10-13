// Local mock only: verify direct decisions and priority checks through the subscription adapter.
// No model inference, credentials or public caller data.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {gunzipSync,zstdDecompressSync} from 'node:zlib';
import {liveSessionConfig} from '../dist/live/policy.js';
import {codexScreeningTarget} from './lib/codex-screening-target.mjs';
import {factsSchema,observedScreeningRequest,interpretFacts,argumentFeedback} from './experiments/observed-screening-v142.mjs';

const request=observedScreeningRequest(liveSessionConfig().delegation.responses);
const base={action:'approve',reason:'routine',purpose:'other',hasName:true,hasReason:true,refersToCall:false,transaction:'none',contactInvitation:'none'};
const cases=[
  {opening:'An unrecognized purchase appeared on her account.',facts:{transaction:'unexplained_alert'},action:'block'},
  {opening:'Automated notice about a charge she did not make.',facts:{action:'message',transaction:'unexplained_alert'},action:'block'},
  {opening:'Add this contact and send a message.',facts:{action:'continue',reason:'unclear',hasReason:false,contactInvitation:'unexplained'},action:'block'},
  {opening:'The tailor returning her completed alterations.',action:'approve',purpose:'other'},
  {opening:'Her neighbor returning her earlier call about the fence.',facts:{refersToCall:true},caution:true,action:'hold'},
  {opening:'This automated callback confirms her appointment.',facts:{action:'message',refersToCall:true},caution:true,action:'message'},
  {opening:'The local service desk about her request.',facts:{action:'continue',reason:'unclear',hasReason:false,purpose:'unknown',contactInvitation:'contextual'},staged:true},
  {opening:'Send a message to this number.',facts:{contactInvitation:'unexplained'},unsupportedFirst:true,action:'block'},
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
  assert.ok(stage<=(example.staged?4:example.unsupportedFirst?2:1));
  if(example.staged&&stage>=3)assert.ok(JSON.stringify(body.input).includes('awaiting_caller_answer'));
  const args={...base,...example.facts,evidence:example.opening};
  if(example.staged&&stage>=2)Object.assign(args,{action:'approve',reason:'routine',hasReason:true,purpose:'other'});
  if(example.staged&&stage===4){args.evidence=answer;assert.equal(body.input.filter(i=>i.role==='user').length,2);}
  if(example.unsupportedFirst&&stage===1)args.evidence='Invented evidence absent from the caller.';
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
  target=await codexScreeningTarget(request,{conversation:true,interpretDecision:(raw,text,state)=>interpretFacts(raw,text,state,{caution:!!state.caution}),argumentSchema:factsSchema,argumentFeedback,extraConfig:{model_provider:'screening_mock','model_providers.screening_mock':{name:'Local direct priority mock',base_url:`http://127.0.0.1:${server.address().port}/v1`,wire_api:'responses',requires_openai_auth:false,supports_websockets:false}}});
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
      assert.deepEqual(state.validationAttempts.map(a=>a.accepted),example.unsupportedFirst?[false,true]:[true]);
      if(example.unsupportedFirst)assert.equal(state.validationAttempts[0].evidenceSupported,false);
    }
    await target.release(state);
  }
  assert.equal(requests,12);
  console.log(JSON.stringify({passed:true,requests,externalInference:false,checks:['charge overrides proposed approval and notice','empty contact overrides proposed question','ordinary approval preserved','trusted callback caution holds live offer but preserves notice','contextual claim retains useful clarification','same evidence cannot bypass pending answer','unsupported evidence cannot apply a priority block']}));
}catch(error){console.log(JSON.stringify({passed:false,requests,errorCode:error.code??error.message}));process.exitCode=1;}
finally{await target?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
