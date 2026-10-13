// Structural repair of v144: identity consistency cannot delay a separate,
// decisive restriction. Same initial request as v143; no semantic wording edit.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {permittedDecision} from '../../dist/live/policy.js';
import {factsSchema as previousSchema,observedScreeningRequest as previousRequest,interpretFacts as previousInterpret,observeFacts as previousObserve,selfTest as previousTest} from './observed-screening-v143.mjs';
export {instructions,argumentFeedback} from './observed-screening-v143.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v145-experiment';
const independentlyRestricted=facts=>facts.prohibited!=='none'||facts.transaction==='unexplained_alert';
export const factsSchema=previousSchema.superRefine((facts,ctx)=>{
 if(!independentlyRestricted(facts)&&facts.context==='personal_caller'&&facts.identity!=='personal_relationship')ctx.addIssue({code:'custom',path:['identity'],message:'Personal context requires a stated personal relationship.'});
});
export function observedScreeningRequest(base){
 const request=previousRequest(base),tool=request.tools.find(t=>t.name==='screen_call'),schema=z.toJSONSchema(factsSchema);
 assert.deepEqual(schema,tool.parameters,'v145_must_preserve_initial_request');tool.parameters=schema;return request;
}
export function interpretFacts(raw,transcript,state,options){const p=factsSchema.safeParse(raw);return p.success?previousInterpret(p.data,transcript,state,options):undefined;}
export function observeFacts(raw,transcript){const p=factsSchema.safeParse(raw);return p.success?previousObserve(p.data,transcript):{invalidFacts:true};}
export function selfTest(){
 previousTest();
 const evidence='Independent synthetic caller evidence.',base={identity:'name_or_role',contactInitiator:'none',context:'personal_caller',claimAction:'ordinary',transaction:'none',prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'unknown',evidence};let checks=0,immediateBlocks=0;
 for(const identity of factsSchema.shape.identity.options)for(const context of factsSchema.shape.context.options)for(const contactInitiator of factsSchema.shape.contactInitiator.options)for(const transaction of factsSchema.shape.transaction.options)for(const prohibited of factsSchema.shape.prohibited.options)for(const questions of [0,2]){
  const raw={...base,identity,context,contactInitiator,transaction,prohibited},d=interpretFacts(raw,evidence,{questions});
  const restricted=prohibited!=='none'||transaction==='unexplained_alert';
  if(restricted){assert.equal(d.action,'block');assert.ok(permittedDecision(d,evidence));immediateBlocks++;}
  else if(context==='personal_caller'&&identity!=='personal_relationship')assert.equal(d,undefined);
  else assert.deepEqual(d,previousInterpret(raw,evidence,{questions}));checks++;
 }
 for(const prohibited of factsSchema.shape.prohibited.options.filter(x=>x!=='none')){const raw={...base,prohibited};assert.equal(permittedDecision(interpretFacts(raw,evidence,{questions:0}),'Unsupported evidence.'),undefined);checks++;}
 assert.equal(interpretFacts({...base,prohibited:'secrets',extra:true},evidence,{questions:0}),undefined);assert.deepEqual(observeFacts(base,evidence),{invalidFacts:true});checks+=2;
 console.log(JSON.stringify({passed:true,checks,immediateBlocks,scope:'Independent restrictions always stop before identity correction; otherwise inconsistent facts require correction. Strict inputs and evidence remain enforced. No inference.'}));
}
