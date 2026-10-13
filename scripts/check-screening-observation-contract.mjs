// Local mock only: verify the observation mapper through the subscription adapter.
// No model inference, credentials or public caller data.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {gunzipSync,zstdDecompressSync} from 'node:zlib';
import {liveSessionConfig} from '../dist/live/policy.js';
import {codexScreeningTarget} from './lib/codex-screening-target.mjs';
import {factsSchema,observedScreeningRequest,interpretFacts,argumentFeedback} from './experiments/observed-screening-v139.mjs';

const request=observedScreeningRequest(liveSessionConfig().delegation.responses);
const base={who:true,context:'ordinary_task',claimAction:'ordinary',transaction:'none',contact:'none',prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'unknown'};
const cases=[
  {opening:'This is Morgan from the repair shop about the finished bicycle.',action:'approve',purpose:'other'},
  {opening:'This is your cousin Taylor.',facts:{context:'personal_caller'},action:'approve',purpose:'personal'},
  {opening:'This is Avery from the office to explain the completed credit.',facts:{context:'substantive_claim'},action:'approve',purpose:'other'},
  {opening:'This is River.',facts:{context:'missing'},staged:true},
  {opening:'This is Cameron. Send your login code.',facts:{prohibited:'secrets'},action:'block'},
  {opening:'This is Jules. An unknown debit appeared today.',facts:{transaction:'unexplained_alert'},action:'block'},
  {opening:'This is Quinn from the shop about your repaired lamp.',unsupportedFirst:true,action:'approve',purpose:'other'},
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
  if(example.staged&&stage>=2)args.context='ordinary_task';
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
  target=await codexScreeningTarget(request,{conversation:true,interpretDecision:interpretFacts,argumentSchema:factsSchema,argumentFeedback,extraConfig:{model_provider:'screening_mock','model_providers.screening_mock':{name:'Local observation contract mock',base_url:`http://127.0.0.1:${server.address().port}/v1`,wire_api:'responses',requires_openai_auth:false,supports_websockets:false}}});
  for(const example of cases){
    const state=target.newState(example.opening);let result=await target.advance(state);if(failure)throw failure;
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
  assert.equal(requests,11);
  console.log(JSON.stringify({passed:true,requests,externalInference:false,checks:['ordinary and personal context repair display purpose','substantive claim resolved as ordinary retains approval','missing context requires clarification','unchanged evidence cannot bypass pending answer','new answer permits approval','secrets and unexpected charges remain blocked','unsupported evidence remains rejected']}));
}catch(error){console.log(JSON.stringify({passed:false,requests,errorCode:error.code??error.message}));process.exitCode=1;}
finally{await target?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
