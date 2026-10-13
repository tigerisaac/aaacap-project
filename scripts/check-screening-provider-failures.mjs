// Local failure-path verification; no external inference or authentication.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {codexScreeningTarget,providerFailureInfo} from './lib/codex-screening-target.mjs';
import {evaluateDialogue} from './check-screening-dialogues.mjs';
import {liveSessionConfig} from '../dist/live/policy.js';
const canary='PRIVATE_ERROR_CANARY';let checks=0;
for(const code of ['contextWindowExceeded','sessionBudgetExceeded','usageLimitExceeded','rateLimitExceeded','flexUnavailable','serverOverloaded','cyberPolicy','misalignmentPolicyViolation','tooManyDenials','internalServerError','unauthorized','badRequest','threadRollbackFailed','sandboxError','other']){
 assert.deepEqual(providerFailureInfo({codexErrorInfo:code,message:canary,additionalDetails:canary}),{code});checks++;
}
for(const code of ['httpConnectionFailed','responseStreamConnectionFailed','responseStreamDisconnected','responseTooManyFailedAttempts'])for(const httpStatusCode of [400,401,429,503,null,-1,999,3.5,canary]){
 const got=providerFailureInfo({codexErrorInfo:{[code]:{httpStatusCode,message:canary}},message:canary});
 assert.deepEqual(got,{code,...([400,401,429,503].includes(httpStatusCode)?{httpStatusCode}:{})});checks++;
}
for(const codexErrorInfo of [undefined,null,canary,1,[],{[canary]:{}},{httpConnectionFailed:{httpStatusCode:401},extra:canary}]){assert.deepEqual(providerFailureInfo({codexErrorInfo,message:canary}),{code:'unknown'});checks++;}
let requests=0;const server=createServer((req,res)=>{requests++;req.resume();res.writeHead(401,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{type:'invalid_request_error',message:canary,code:'invalid_api_key'}}));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let target;
try{
 target=await codexScreeningTarget(liveSessionConfig().delegation.responses,{conversation:true,extraConfig:{model_provider:'screening_mock','model_providers.screening_mock':{name:'Local provider failure mock',base_url:`http://127.0.0.1:${server.address().port}/v1`,wire_api:'responses',requires_openai_auth:false,supports_websockets:false}}});
 const row=await evaluateDialogue(target,{category:'legit',turns:['A synthetic caller about a routine visit.'],accept:['approve'],expectedSteps:['approve']});
 assert.equal(row.actual,'failure');assert.equal(row.failure,'codex_turn_failed');assert.equal(row.passed,false);assert.equal(row.steps.length,1);assert.ok(requests>0);assert.notEqual(row.providerFailure.code,'unknown');assert.deepEqual(row.steps[0].providerFailure,row.providerFailure);assert.ok(!JSON.stringify(row).includes(canary));assert.equal(row.continueToolCalls,0);
 console.log(JSON.stringify({passed:true,checks,requests,diagnostic:row.providerFailure,externalInference:false,checksCovered:['fixed error enums only','bounded numeric HTTP status only','provider text and unknown values discarded','native failed turn remains a failed trial','diagnostics reach synthetic result and step without affecting scoring']}));
}finally{await target?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
