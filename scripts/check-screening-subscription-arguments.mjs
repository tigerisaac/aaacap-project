// Local protocol mock; no inference, caller data or authentication inspection.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {gunzipSync,zstdDecompressSync} from 'node:zlib';
import {liveSessionConfig} from '../dist/live/policy.js';
import {codexScreeningTarget} from './lib/codex-screening-target.mjs';
import {screeningArgumentIssues} from './lib/screening-argument-issues.mjs';
import {factsSchema,observedScreeningRequest} from './experiments/observed-screening-v111.mjs';
const request=observedScreeningRequest(liveSessionConfig().delegation.responses),canary='PRIVATE_VALUE_CANARY';
const normalized=value=>Array.isArray(value)?value.map(normalized):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([k])=>!['$schema','maxLength'].includes(k)).map(([k,v])=>[k,normalized(v)])):value;
const examples=[
  {id:'type',change:{who:canary},field:'who',code:'invalid_type'},
  {id:'enum',change:{context:canary},field:'context',code:'invalid_value'},
  {id:'missing',remove:'recordingMode',field:'recordingMode',code:'invalid_value'},
  {id:'extra',change:{[canary]:canary},field:'$',code:'unrecognized_keys'},
  {id:'length',change:{recordingCue:canary.repeat(20)},field:'recordingCue',code:'too_big'},
  {id:'evidence',change:{evidence:'Entirely invented evidence.'},field:null},
  {id:'legacy',change:{who:null},field:'who',code:'invalid_type',feedback:false},
  {id:'bounded',change:{who:null},field:'who',code:'invalid_type',bounded:true},
].map(e=>({...e,opening:`An ordinary appointment update for ${e.id}.`}));
const valid=e=>({who:true,context:'ordinary_task',separateContact:false,prohibited:'none',refuses:false,purpose:'appointment',refersToCall:false,recordingMode:'not_indicated',recordingCue:'',evidence:e.opening});
const hostileErrorSchema={shape:{who:{}},safeParse:()=>({success:false,error:{issues:[{code:canary,path:[canary],message:canary,keys:[canary]}]}})};
assert.deepEqual(screeningArgumentIssues(hostileErrorSchema,{}),[{field:'$',code:'invalid'}]);
assert.deepEqual(screeningArgumentIssues({shape:{who:{}},safeParse:()=>{throw Error(canary);}},{}),[{field:'$',code:'schema_check_failed'}]);
const stages=new Map();let requests=0,failure,currentFeedback;
const server=createServer(async(req,res)=>{try{
  const chunks=[];for await(const c of req)chunks.push(c);let bytes=Buffer.concat(chunks);
  if(req.headers['content-encoding']==='gzip')bytes=gunzipSync(bytes);if(req.headers['content-encoding']==='zstd')bytes=zstdDecompressSync(bytes);
  const body=JSON.parse(bytes),opening=JSON.parse(body.input.find(i=>i.role==='user').content[0].text).untrustedCallerTranscript;
  const e=examples.find(e=>e.opening===opening);assert.ok(e);const stage=(stages.get(e.id)??0)+1;stages.set(e.id,stage);requests++;
  assert.ok(stage<=(e.bounded?13:2));assert.equal(body.model,'gpt-6-luna');assert.equal(body.reasoning.effort,'medium');assert.equal(body.store,false);
  assert.equal(body.input[0].content[0].text,request.instructions);assert.equal(body.tools.length,2);
  assert.deepEqual(body.tools.find(t=>t.name==='screen_call').parameters,normalized(request.tools.find(t=>t.name==='screen_call').parameters));
  if(stage>1){
    const output=body.input.filter(i=>i.type==='function_call_output').at(-1).output;
    assert.ok(output.includes('decision_not_applied'));assert.ok(!output.includes(canary));
    if(e.feedback===false){assert.ok(output.includes('approval needs who is calling and why'));assert.ok(!output.includes('invalidFields'));}
    else if(e.field){assert.ok(output.includes(`"field":"${e.field}"`));assert.ok(output.includes(`"code":"${e.code}"`));assert.ok(output.includes('same caller evidence'));if(currentFeedback===2&&e.id==='length')assert.ok(output.includes('"maxLength":160'));if(currentFeedback===2&&e.id==='enum')assert.ok(output.includes('"allowed"'));}
    else{assert.ok(!output.includes('invalidFields'));assert.ok(output.includes('quoted evidence'));}
  }
  const args={...valid(e),...((stage===1||e.bounded)?e.change:{})};if(stage===1&&e.remove)delete args[e.remove];
  const item={id:`fc_arguments_${requests}`,type:'function_call',call_id:`arguments_${requests}`,name:'screen_call',arguments:JSON.stringify(args)};
  const events=[{type:'response.created',response:{id:`response_arguments_${requests}`,status:'in_progress',output:[]}},{type:'response.output_item.added',output_index:0,item:{...item,arguments:''}},{type:'response.function_call_arguments.delta',item_id:item.id,output_index:0,delta:item.arguments},{type:'response.function_call_arguments.done',item_id:item.id,output_index:0,arguments:item.arguments},{type:'response.output_item.done',output_index:0,item},{type:'response.completed',response:{id:`response_arguments_${requests}`,status:'completed',output:[item],usage:{input_tokens:1,output_tokens:1,total_tokens:2}}}];
  res.writeHead(200,{'Content-Type':'text/event-stream'});for(const event of events)res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);res.end();
}catch(error){failure=error;res.writeHead(400);res.end('Mock rejected request');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const targets=[];
try{
  for(const feedback of [true,false,2]){
    currentFeedback=feedback;stages.clear();
    const target=await codexScreeningTarget(request,{conversation:true,argumentSchema:factsSchema,argumentFeedback:feedback,
      // Deliberately permissive mapper: invalid input must still fail closed.
      interpretDecision:raw=>({action:'approve',reason:'routine',purpose:'appointment',evidence:raw.evidence,hasName:true,hasReason:true}),
      extraConfig:{model_provider:'screening_mock','model_providers.screening_mock':{name:'Local schema correction mock',base_url:`http://127.0.0.1:${server.address().port}/v1`,wire_api:'responses',requires_openai_auth:false,supports_websockets:false}}});targets.push(target);
    for(const e of examples.filter(e=>(e.feedback!==false)===!!feedback)){
      const state=target.newState(e.opening),result=await target.advance(state);if(failure)throw failure;
      assert.equal(state.questions,0);assert.ok(!JSON.stringify(state.validationAttempts).includes(canary));
      if(e.bounded){assert.equal(result.kind,'failure');assert.equal(result.failure,'too_many_rounds');assert.equal(state.validationAttempts.length,12);assert.ok(state.validationAttempts.every(a=>!a.accepted));}
      else{assert.equal(result.kind,'decision');assert.equal(result.decision.action,'approve');assert.deepEqual(state.validationAttempts.map(a=>a.accepted),[false,true]);}
      assert.deepEqual(state.validationAttempts[0].inputIssues,e.field?[{field:e.field,code:e.code}]:[]);await target.release(state);
    }
  }
  assert.equal(requests,52);
  console.log(JSON.stringify({passed:true,requests,externalInference:false,checks:['schema field/type/enum/length correction','no caller values or unknown keys in feedback/diagnostics','invalid input cannot bypass permissive mapper','unsupported evidence remains rejected','correction consumes no clarification','legacy and first correction feedback remain supported','declared types/enums/length bounds included in correction v2','12-attempt limit remains enforced']}));
}catch(error){console.log(JSON.stringify({passed:false,requests,errorCode:error.code??error.message}));process.exitCode=1;}
finally{for(const t of targets)await t.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
