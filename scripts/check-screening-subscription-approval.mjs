// Local HTTP mocks only. Tests offer-review orchestration without account inference.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {gunzipSync,zstdDecompressSync} from 'node:zlib';
import {liveSessionConfig} from '../dist/live/policy.js';
import {codexScreeningTarget} from './lib/codex-screening-target.mjs';
import {codexMessageTarget} from './lib/codex-message-target.mjs';
import {createApprovalGuard,reviewRequest} from './experiments/approval-review-v122.mjs';
const request=liveSessionConfig().delegation.responses,question='What is the call about?',answer='I am her neighbor, returning her garden tools.';
const cases=[
 {opening:'An ordinary booking update.',action:'approve',basis:'ordinary_task'},
 {opening:'Call me sometime.',action:'block',basis:'contact_only'},
 {opening:'A recorded ordinary service update.',action:'message',basis:'ordinary_task',recorded:true},
 {opening:'Give me your password.',action:'block',primaryBlock:true},
 {opening:'A corrected ordinary booking update.',action:'approve',quoteCorrection:true},
 {opening:'This is Robin.',action:'approve',clarify:true},
 {opening:'This is Alex.',action:'hold',refused:true},
 {opening:'An invalid review schema.',failure:true,badSchema:true},
 {opening:'An invalid review quote.',failure:true,badQuote:true},
 {opening:'Malformed review response.',failure:true,badJSON:true},
 {opening:'Parallel ordinary proposals.',action:'approve',parallel:true},
];
const stages=new Map(),reviewCounts=new Map();let failure,requests=0,reviews=0,sequence=0,cancelSeen;
const cancellationStarted=new Promise(resolve=>{cancelSeen=resolve;});
function response(res,items){
 const id=`response_${++sequence}`,events=[{type:'response.created',response:{id,status:'in_progress',output:[]}}];
 for(const [output_index,item]of items.entries()){
  const tool=item.type==='function_call';events.push({type:'response.output_item.added',output_index,item:tool?{...item,arguments:''}:{...item,content:[]}});
  if(tool)events.push({type:'response.function_call_arguments.delta',item_id:item.id,output_index,delta:item.arguments},{type:'response.function_call_arguments.done',item_id:item.id,output_index,arguments:item.arguments});
  else events.push({type:'response.content_part.added',item_id:item.id,output_index,content_index:0,part:{type:'output_text',text:'',annotations:[]}},{type:'response.output_text.delta',item_id:item.id,output_index,content_index:0,delta:item.content[0].text},{type:'response.output_text.done',item_id:item.id,output_index,content_index:0,text:item.content[0].text},{type:'response.content_part.done',item_id:item.id,output_index,content_index:0,part:item.content[0]});
  events.push({type:'response.output_item.done',output_index,item});
 }
 events.push({type:'response.completed',response:{id,status:'completed',output:items,usage:{input_tokens:1,output_tokens:1,total_tokens:2}}});
 res.writeHead(200,{'Content-Type':'text/event-stream'});for(const event of events)res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);res.end();
}
const message=text=>({id:`msg_${sequence}_${requests}_${reviews}`,type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text,annotations:[]}]});
const server=createServer(async(req,res)=>{try{
 const chunks=[];for await(const c of req)chunks.push(c);let bytes=Buffer.concat(chunks);
 if(req.headers['content-encoding']==='gzip')bytes=gunzipSync(bytes);if(req.headers['content-encoding']==='zstd')bytes=zstdDecompressSync(bytes);
 const body=JSON.parse(bytes),users=body.input.filter(x=>x.role==='user'),first=JSON.parse(users[0].content[0].text).untrustedCallerTranscript,latest=JSON.parse(users.at(-1).content[0].text).untrustedCallerTranscript;
 assert.equal(body.model,'gpt-6-luna');assert.equal(body.reasoning.effort,'medium');assert.equal(body.store,false);
 if(req.url.startsWith('/review')){
  reviews++;const template=reviewRequest(latest);assert.equal(body.tools.length,0);assert.deepEqual(body.text.format.schema,template.text.format.schema);assert.equal(body.text.format.strict,true);
  assert.deepEqual(body.input.map(({role,content})=>({role,content})),[{role:'developer',content:[{type:'input_text',text:template.instructions}]},{role:'user',content:[{type:'input_text',text:template.input[0].content}]}]);
  if(latest==='Cancellation probe.') {res.writeHead(200,{'Content-Type':'text/event-stream'});res.write(': pending\n\n');cancelSeen();return;}
  const c=cases.find(c=>latest.startsWith(c.opening));assert.ok(c);reviewCounts.set(c,(reviewCounts.get(c)??0)+1);
  assert.equal(latest.includes(answer),!!c.clarify&&stages.get(c)===4);assert.equal(latest.includes('No further details.'),!!c.refused&&stages.get(c)===4);
  const output={who:true,basis:c.clarify&&latest===c.opening?'missing':c.refused?'unresolved_claim':c.basis??'ordinary_task',restricted:false,recorded:!!c.recorded,refuses:!!c.refused&&latest!==c.opening,evidence:c.badQuote?'A quote never spoken.':c.opening};
  if(c.badSchema)output.extra=true;
  response(res,[message(c.badJSON?'not JSON':JSON.stringify(output))]);return;
 }
 requests++;const c=cases.find(c=>c.opening===first);assert.ok(c);const stage=(stages.get(c)??0)+1;stages.set(c,stage);assert.ok(stage<=4);
 assert.equal(body.input[0].content[0].text,request.instructions);assert.equal(body.tools.length,2);
 if(c.clarify||c.refused){
  if(stage<=3){assert.equal(users.length,1);assert.ok(!JSON.stringify(body.input).includes(answer));}
  if(stage===2)assert.ok(body.input.some(i=>i.type==='function_call_output'&&i.output.includes(c.refused?'what the caller needs the recipient to do':'what the call is about')));
  if(stage===3){assert.ok(body.input.some(i=>i.type==='function_call_output'&&i.output.includes('awaiting_caller_answer')));response(res,[message(question)]);return;}
  if(stage===4){assert.equal(users.length,2);assert.ok(body.input.some(i=>i.role==='assistant'&&i.content?.some(c=>c.text===question)));}
 }
 if(c.quoteCorrection&&stage===2)assert.ok(body.input.some(i=>i.type==='function_call_output'&&i.output.includes('decision_not_applied')));
 const args={action:c.primaryBlock?'block':'approve',reason:c.primaryBlock?'scam':'routine',purpose:'other',evidence:c.quoteCorrection&&stage===1?'Unsupported initial words.':c.opening,hasName:true,hasReason:true};
 const tool=n=>({id:`fc_${requests}_${n}`,type:'function_call',call_id:`call_${requests}_${n}`,name:'screen_call',arguments:JSON.stringify(args)});
 response(res,c.parallel?[tool(1),tool(2)]:[tool(1)]);
}catch(e){failure=e;res.writeHead(400);res.end('Local review mock rejected request');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let target,reviewer;
const config=kind=>({model_provider:'approval_mock','model_providers.approval_mock':{name:'Local approval mock',base_url:`http://127.0.0.1:${server.address().port}/${kind}/v1`,wire_api:'responses',requires_openai_auth:false,supports_websockets:false}});
try{
 reviewer=await codexMessageTarget({extraConfig:config('review')});
 target=await codexScreeningTarget(request,{conversation:true,approvalGuard:createApprovalGuard(reviewer),extraConfig:config('screen')});
 for(const c of cases){
  const state=target.newState(c.opening);let result=await target.advance(state);if(failure)throw failure;
  if(c.clarify||c.refused){assert.equal(result.kind,'question');assert.equal(result.question,question);assert.equal(state.questions,1);assert.equal(reviewCounts.get(c),1);assert.deepEqual(state.validationAttempts.map(a=>a.accepted),[true,false]);state.transcript+=` ${c.refused?'No further details.':answer}`;result=await target.advance(state);if(failure)throw failure;assert.equal(state.questions,1);assert.equal(reviewCounts.get(c),2);}
  if(c.failure){assert.equal(result.kind,'failure');assert.equal(result.failure,'approval_guard_failed');assert.ok(state.validationAttempts.every(a=>!a.accepted));}
  else {assert.equal(result.kind,'decision');assert.equal(result.decision.action,c.action);}
  if(c.primaryBlock)assert.equal(reviewCounts.get(c),undefined);
  else if(!c.clarify&&!c.refused)assert.equal(reviewCounts.get(c),1);
  if(c.quoteCorrection){assert.equal(state.validationAttempts[0].approvalGuard,undefined);assert.equal(state.validationAttempts[1].approvalGuard.applied,true);}
  if(c.parallel)assert.equal(state.validationAttempts.length,1);
  for(const observation of state.approvalReviews??[]){assert.ok(!('evidence' in (observation.facts??{})));assert.ok(Number.isInteger(observation.validationAttemptIndex));}
  await target.release(state);
 }
 const cancelled=new AbortController();cancelled.abort();const before=reviews;assert.equal((await reviewer.evaluate(reviewRequest('Pre-cancelled probe.'),{signal:cancelled.signal})).failure,'codex_evaluation_cancelled');assert.equal(reviews,before);
 const activeCancel=new AbortController(),pending=reviewer.evaluate(reviewRequest('Cancellation probe.'),{signal:activeCancel.signal});await cancellationStarted;activeCancel.abort();assert.equal((await pending).failure,'codex_evaluation_cancelled');
 const healthy=await reviewer.evaluate(reviewRequest(cases[0].opening));assert.equal(healthy.output.basis,'ordinary_task');if(failure)throw failure;
 console.log(JSON.stringify({passed:true,externalInference:false,cases:cases.length,requests,reviews,checks:['independent exact caller-only review','Luna medium with strict output schema and no tools','ordinary offer retained','explicit block bypasses review','review blocks/saves/clarifies/holds','unsupported initial quote cannot reach review','native question then new caller answer','no duplicate review or clarification on unchanged input','invalid review fails closed','parallel tools cannot bypass review','pre-request and active cancellation','cancellation does not corrupt another session']}));
}catch(e){console.log(JSON.stringify({passed:false,requests,reviews,error:e.code??e.message}));process.exitCode=1;}
finally{await target?.close();await reviewer?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
