// Local mock only: checks exact structured message input/output isolation. No account inference.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {gunzipSync,zstdDecompressSync} from 'node:zlib';
import {decisionRequest,voicemailAssessmentSchema,voicemailVerdict} from '../dist/cloud/voicemail-check.js';
import {codexMessageTarget} from './lib/codex-message-target.mjs';
const samples=[{text:'Her sister would like to arrange lunch.',output:{verdict:'keep',clear:false,evidence:'',summary:'The caller says she is her sister and wants to arrange lunch.'},expected:'keep'},
 {text:'Please send me your password.',output:{verdict:'scam',clear:true,evidence:'send me your password',summary:null},expected:'scam'},
 {text:'Her appointment is tomorrow.',output:{verdict:'scam',clear:true,evidence:'invented harmful words',summary:null},expected:'keep'}];
const requests=samples.map(s=>decisionRequest(s.text));let checks=0,failure,stage="request",inputShape;
const server=createServer(async(req,res)=>{try{
 const chunks=[];for await(const chunk of req)chunks.push(chunk);let bytes=Buffer.concat(chunks);if(req.headers['content-encoding']==='gzip')bytes=gunzipSync(bytes);if(req.headers['content-encoding']==='zstd')bytes=zstdDecompressSync(bytes);
 const body=JSON.parse(bytes),index=requests.findIndex(r=>body.input?.[1]?.content?.[0]?.text===r.input[0].content);assert.ok(index>=0);const request=requests[index],sample=samples[index];
 stage='settings';assert.equal(body.model,'gpt-6-luna');assert.equal(body.reasoning.effort,'medium');assert.equal(body.store,false);assert.equal(body.tools.length,0);
 stage='input';inputShape=body.input.map(i=>({keys:Object.keys(i),role:i.role,type:i.type,contentTypes:i.content?.map(c=>c.type)}));assert.ok(body.input.every(i=>i.type==='message'&&Object.keys(i).every(k=>['type','id','role','content'].includes(k))));assert.deepEqual(body.input.map(({role,content})=>({role,content})),[{role:'developer',content:[{type:'input_text',text:request.instructions}]},{role:'user',content:[{type:'input_text',text:request.input[0].content}]}]);
 stage='schema';assert.equal(body.text.format.type,'json_schema');assert.equal(body.text.format.strict,true);assert.deepEqual(body.text.format.schema,request.text.format.schema);
 checks++;const text=JSON.stringify(sample.output),item={id:`msg_mock_${checks}`,type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text,annotations:[]}]};
 const events=[{type:'response.created',response:{id:`resp_${checks}`,status:'in_progress',output:[]}},{type:'response.output_item.added',output_index:0,item:{...item,content:[]}},{type:'response.content_part.added',item_id:item.id,output_index:0,content_index:0,part:{type:'output_text',text:'',annotations:[]}},{type:'response.output_text.delta',item_id:item.id,output_index:0,content_index:0,delta:text},{type:'response.output_text.done',item_id:item.id,output_index:0,content_index:0,text},{type:'response.content_part.done',item_id:item.id,output_index:0,content_index:0,part:item.content[0]},{type:'response.output_item.done',output_index:0,item},{type:'response.completed',response:{id:`resp_${checks}`,status:'completed',output:[item],usage:{input_tokens:1,output_tokens:1,total_tokens:2}}}];
 res.writeHead(200,{'Content-Type':'text/event-stream'});for(const event of events)res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);res.end();
}catch(e){failure=e;res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{message:'Local message mock rejected request',type:'invalid_request_error'}}));}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let target;
try{target=await codexMessageTarget({extraConfig:{model_provider:'message_mock','model_providers.message_mock':{name:'Local message mock',base_url:`http://127.0.0.1:${server.address().port}/v1`,wire_api:'responses',requires_openai_auth:false,supports_websockets:false}}});
 const results=await Promise.all(requests.map(r=>target.evaluate(r)));if(failure)throw failure;assert.equal(checks,samples.length);
 results.forEach((r,i)=>{assert.ok(!r.failure);assert.deepEqual(r.output,samples[i].output);assert.equal(voicemailVerdict({transcript:samples[i].text,duration:30,assessment:voicemailAssessmentSchema.parse(r.output)}),samples[i].expected);});
 console.log(JSON.stringify({passed:true,checks:['exact instructions and caller input','no tools or private context','exact strict output schema','separate concurrent conversations','Luna medium','unsupported removal evidence keeps message'],requests:checks,externalInference:false}));
}catch(e){console.log(JSON.stringify({passed:false,checks,stage,inputShape,errorCode:e.code??e.message}));process.exitCode=1;}finally{await target?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
