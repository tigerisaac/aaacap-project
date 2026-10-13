// Development v149 supplied a current-automation cue with discussed_only mode.
// Enforce the existing field contract; no new initial prompt text or labels.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {permittedDecision} from '../../dist/live/policy.js';
import {factsSchema as previousSchema,observedScreeningRequest as previousRequest,interpretFacts as previousInterpret,observeFacts as previousObserve,selfTest as previousTest} from './observed-screening-v149.mjs';
export {instructions,callerFraming} from './observed-screening-v149.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v150-experiment';
export const argumentFeedback=4;
export const factsSchema=z.object(previousSchema.shape).strict().superRefine((f,ctx)=>{
 if(f.prohibited!=='none'||f.transaction==='unexplained_alert')return;
 const issue=fields=>{for(const field of fields)ctx.addIssue({code:'custom',path:[field],message:'Inconsistent observation pair.'});};
 if(f.context==='personal_caller'&&f.identity!=='personal_relationship')issue(['identity','context']);
 if((f.recordingMode==='current')!==!!f.recordingCue.trim())issue(['recordingMode','recordingCue']);
});
export function observedScreeningRequest(base){const r=previousRequest(base),tool=r.tools.find(t=>t.name==='screen_call'),schema=z.toJSONSchema(factsSchema);assert.deepEqual(schema,tool.parameters);tool.parameters=schema;return r;}
export function interpretFacts(raw,transcript,state,options){const p=factsSchema.safeParse(raw);return p.success?previousInterpret(p.data,transcript,state,options):undefined;}
export function observeFacts(raw,transcript){const p=factsSchema.safeParse(raw);return p.success?previousObserve(p.data,transcript):{invalidFacts:true};}
export function selfTest(){
 previousTest();
 const evidence='Independent synthetic recording evidence.',base={identity:'name_or_role',context:'ordinary_task',contactInitiator:'none',claimAction:'ordinary',transaction:'none',prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'other',evidence};let checks=0,immediateBlocks=0;
 for(const context of factsSchema.shape.context.options)for(const identity of factsSchema.shape.identity.options)for(const transaction of factsSchema.shape.transaction.options)for(const prohibited of factsSchema.shape.prohibited.options)for(const recordingMode of factsSchema.shape.recordingMode.options)for(const recordingCue of ['',evidence,'Unsupported quote.']){
  const raw={...base,context,identity,transaction,prohibited,recordingMode,recordingCue},after=interpretFacts(raw,evidence,{questions:0});
  if(prohibited!=='none'||transaction==='unexplained_alert'){assert.equal(after.action,'block');assert.ok(permittedDecision(after,evidence));immediateBlocks++;}
  else if((recordingMode==='current')!==!!recordingCue.trim())assert.equal(after,undefined);
  else assert.deepEqual(after,previousInterpret(raw,evidence,{questions:0}));checks++;
 }
 for(const raw of [{...base,recordingMode:'discussed_only',recordingCue:evidence},{...base,recordingMode:'current'}])assert.deepEqual(factsSchema.safeParse(raw).error.issues.map(i=>i.path[0]),['recordingMode','recordingCue']);
 assert.equal(interpretFacts({...base,recordingMode:'current',recordingCue:evidence},evidence,{questions:0}).action,'message');
 assert.equal(interpretFacts({...base,recordingMode:'discussed_only'},evidence,{questions:0}).action,'approve');
 assert.equal(interpretFacts({...base,prohibited:'secrets',extra:true},evidence,{questions:0}),undefined);checks+=5;
 console.log(JSON.stringify({passed:true,checks,immediateBlocks,scope:'Mode/cue contradictions require correction; decisive restrictions bypass irrelevant pair correction; all consistent decisions and strict evidence remain unchanged. No inference.'}));
}
