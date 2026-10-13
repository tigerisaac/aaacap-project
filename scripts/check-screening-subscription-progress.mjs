// Local mock only. No subscription inference, credentials, or public caller data.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {gunzipSync,zstdDecompressSync} from 'node:zlib';
import {liveSessionConfig} from '../dist/live/policy.js';
import {codexScreeningTarget} from './lib/codex-screening-target.mjs';
const request=liveSessionConfig().delegation.responses;
const examples=[
  {opening:'This is Robin.',attempt:'hold'},
  {opening:'This is Hayden.',attempt:'continue'},
  {opening:'Send me your login code.',attempt:'block'},
];
const question='What is the call about?',answer='I am calling about lunch tomorrow.';
const stages=new Map(examples.map(e=>[e,0]));let failure,requests=0;
const server=createServer(async(req,res)=>{try{
  const chunks=[];for await(const c of req)chunks.push(c);let bytes=Buffer.concat(chunks);
  if(req.headers['content-encoding']==='gzip')bytes=gunzipSync(bytes);if(req.headers['content-encoding']==='zstd')bytes=zstdDecompressSync(bytes);
  const body=JSON.parse(bytes),first=body.input.find(i=>i.role==='user')?.content?.[0]?.text;
  const example=examples.find(e=>JSON.parse(first).untrustedCallerTranscript===e.opening);assert.ok(example);
  const stage=stages.get(example)+1;stages.set(example,stage);requests++;
  assert.equal(body.model,'gpt-6-luna');assert.equal(body.reasoning.effort,'medium');assert.equal(body.store,false);
  assert.equal(body.input[0].content[0].text,request.instructions);assert.equal(body.tools.length,2);
  assert.ok(stage<=4);assert.equal(body.input.filter(i=>i.role==='user').length,stage===4?2:1);
  if(stage>=3)assert.ok(JSON.stringify(body.input).includes('awaiting_caller_answer'));
  if(stage===4)assert.ok(body.input.some(i=>i.role==='assistant'&&i.content?.some(c=>c.text===question)));
  const action=stage===1?'continue':stage===2?example.attempt:'approve';
  const args={action,reason:action==='block'?'scam':action==='approve'?'routine':'unclear',purpose:action==='approve'?'personal':'unknown',evidence:action==='continue'?'':action==='approve'?'lunch tomorrow':example.opening,hasName:example.attempt!=='block',hasReason:action==='approve'};
  const item=stage===3?{id:'msg_question',type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:question,annotations:[]}]}:{id:`fc_${requests}`,type:'function_call',call_id:`call_${requests}`,name:'screen_call',arguments:JSON.stringify(args)};
  const events=[{type:'response.created',response:{id:`response_${requests}`,status:'in_progress',output:[]}},{type:'response.output_item.added',output_index:0,item:stage===3?{...item,content:[]}:{...item,arguments:''}}];
  if(stage===3)events.push({type:'response.content_part.added',item_id:item.id,output_index:0,content_index:0,part:{type:'output_text',text:'',annotations:[]}},{type:'response.output_text.delta',item_id:item.id,output_index:0,content_index:0,delta:question},{type:'response.output_text.done',item_id:item.id,output_index:0,content_index:0,text:question},{type:'response.content_part.done',item_id:item.id,output_index:0,content_index:0,part:item.content[0]});
  else events.push({type:'response.function_call_arguments.delta',item_id:item.id,output_index:0,delta:item.arguments},{type:'response.function_call_arguments.done',item_id:item.id,output_index:0,arguments:item.arguments});
  events.push({type:'response.output_item.done',output_index:0,item},{type:'response.completed',response:{id:`response_${requests}`,status:'completed',output:[item],usage:{input_tokens:1,output_tokens:1,total_tokens:2}}});
  res.writeHead(200,{'Content-Type':'text/event-stream'});for(const e of events)res.write(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);res.end();
}catch(error){failure=error;res.writeHead(400);res.end('Mock rejected request');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let target;
try{
  target=await codexScreeningTarget(request,{conversation:true,extraConfig:{model_provider:'screening_mock','model_providers.screening_mock':{name:'Local clarification progress mock',base_url:`http://127.0.0.1:${server.address().port}/v1`,wire_api:'responses',requires_openai_auth:false,supports_websockets:false}}});
  for(const example of examples){
    const state=target.newState(example.opening),first=await target.advance(state);if(failure)throw failure;
    assert.equal(state.questions,1);
    if(example.attempt==='block'){assert.equal(first.kind,'decision');assert.equal(first.decision.action,'block');assert.deepEqual(state.validationAttempts.map(x=>x.accepted),[true,true]);}
    else {
      assert.equal(first.kind,'question');assert.equal(first.question,question);assert.equal(state.terminal,undefined);
      assert.deepEqual(state.validationAttempts.map(x=>x.accepted),[true,false]);assert.equal(state.validationAttempts[1].awaitingCallerAnswer,true);
      state.transcript+=` ${answer}`;const last=await target.advance(state);if(failure)throw failure;
      assert.equal(last.kind,'decision');assert.equal(last.decision.action,'approve');assert.equal(state.questions,1);assert.equal(state.validationAttempts.length,3);
    }
    await target.release(state);
  }
  assert.equal(requests,10);assert.deepEqual([...stages.values()],[4,4,2]);
  console.log(JSON.stringify({passed:true,requests,externalInference:false,checks:['same-evidence hold rejected before question','duplicate continue does not spend question budget','pending question reaches caller','new answer permits approval','explicit scam correction remains immediate','same native history and isolated instructions']}));
}catch(error){console.log(JSON.stringify({passed:false,requests,errorCode:error.code??error.message}));process.exitCode=1;}
finally{await target?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
