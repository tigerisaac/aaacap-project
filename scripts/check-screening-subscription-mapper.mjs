// Local protocol mock for the optional offline decision interpreter. No inference.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {gunzipSync,zstdDecompressSync} from 'node:zlib';
import {liveSessionConfig} from '../dist/live/policy.js';
import {codexScreeningTarget} from './lib/codex-screening-target.mjs';
const request=liveSessionConfig().delegation.responses;
request.tools.find(t=>t.name==='screen_call').parameters={type:'object',properties:{classification:{type:'string',enum:['ordinary','unsafe','throw','invalid']},evidence:{type:'string'}},required:['classification','evidence'],additionalProperties:false};
const examples=[
  {opening:'An ordinary booking update.',mode:'valid',action:'approve'},
  {opening:'A second booking update.',mode:'quote',action:'approve'},
  {opening:'Give me your password.',mode:'throw',action:'block'},
  {opening:'Another ordinary service update.',mode:'invalid',action:'approve'},
];
const stages=new Map(examples.map(e=>[e,0]));let failure,requests=0,mapped=0;
const server=createServer(async(req,res)=>{try{
  const chunks=[];for await(const c of req)chunks.push(c);let bytes=Buffer.concat(chunks);
  if(req.headers['content-encoding']==='gzip')bytes=gunzipSync(bytes);if(req.headers['content-encoding']==='zstd')bytes=zstdDecompressSync(bytes);
  const body=JSON.parse(bytes),user=body.input.find(i=>i.role==='user');
  const example=examples.find(e=>JSON.parse(user.content[0].text).untrustedCallerTranscript===e.opening);assert.ok(example);
  const stage=stages.get(example)+1;stages.set(example,stage);requests++;assert.ok(stage<=2);
  assert.equal(body.model,'gpt-6-luna');assert.equal(body.reasoning.effort,'medium');assert.equal(body.store,false);assert.equal(body.tools.length,2);
  assert.equal(body.input[0].content[0].text,request.instructions);
  if(stage===2)assert.ok(body.input.some(i=>i.type==='function_call_output'&&i.output.includes('decision_not_applied')));
  const classification=stage===1&&['throw','invalid'].includes(example.mode)?example.mode:example.action==='block'?'unsafe':'ordinary';
  const args={classification,evidence:stage===1&&example.mode==='quote'?'An unsupported quote.':example.opening};
  const item={id:`fc_mapper_${requests}`,type:'function_call',call_id:`mapper_${requests}`,name:'screen_call',arguments:JSON.stringify(args)};
  const events=[{type:'response.created',response:{id:`response_mapper_${requests}`,status:'in_progress',output:[]}},{type:'response.output_item.added',output_index:0,item:{...item,arguments:''}},{type:'response.function_call_arguments.delta',item_id:item.id,output_index:0,delta:item.arguments},{type:'response.function_call_arguments.done',item_id:item.id,output_index:0,arguments:item.arguments},{type:'response.output_item.done',output_index:0,item},{type:'response.completed',response:{id:`response_mapper_${requests}`,status:'completed',output:[item],usage:{input_tokens:1,output_tokens:1,total_tokens:2}}}];
  res.writeHead(200,{'Content-Type':'text/event-stream'});for(const e of events)res.write(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);res.end();
}catch(error){failure=error;res.writeHead(400);res.end('Mock rejected request');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let target;
try{
  target=await codexScreeningTarget(request,{conversation:true,interpretDecision:(raw,transcript,state)=>{
    mapped++;assert.equal(transcript,state.transcript);assert.equal(state.questions,0);
    if(raw.classification==='throw')throw Error('mock_mapper_failure');
    if(raw.classification==='invalid')return {action:'approve'};
    const unsafe=raw.classification==='unsafe';return {action:unsafe?'block':'approve',reason:unsafe?'scam':'routine',purpose:'other',evidence:raw.evidence,hasName:true,hasReason:true};
  },extraConfig:{model_provider:'screening_mock','model_providers.screening_mock':{name:'Local decision interpreter mock',base_url:`http://127.0.0.1:${server.address().port}/v1`,wire_api:'responses',requires_openai_auth:false,supports_websockets:false}}});
  for(const example of examples){const state=target.newState(example.opening),result=await target.advance(state);if(failure)throw failure;
    assert.equal(result.kind,'decision');assert.equal(result.decision.action,example.action);
    assert.deepEqual(state.validationAttempts.map(x=>x.accepted),example.mode==='valid'?[true]:[false,true]);await target.release(state);
  }
  assert.equal(requests,7);assert.equal(mapped,7);assert.deepEqual([...stages.values()],[1,2,2,2]);
  console.log(JSON.stringify({passed:true,requests,externalInference:false,checks:['observations map to existing actions','unsupported evidence remains rejected','mapper exception fails closed and permits correction','invalid mapped schema remains rejected','native history and subscription settings unchanged']}));
}catch(error){console.log(JSON.stringify({passed:false,requests,errorCode:error.code??error.message}));process.exitCode=1;}
finally{await target?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
