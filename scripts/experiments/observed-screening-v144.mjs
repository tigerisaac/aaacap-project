// The v143 development run exposed contradictory identity/context facts.
// Reject that combination for correction instead of silently downgrading it.
// Initial model request is byte-identical; no public/validation wording.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {factsSchema as previousSchema,observedScreeningRequest as previousRequest,interpretFacts as previousInterpret,observeFacts as previousObserve,selfTest as previousTest} from './observed-screening-v143.mjs';
export {instructions,argumentFeedback} from './observed-screening-v143.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v144-experiment';
export const factsSchema=previousSchema.superRefine((facts,ctx)=>{
 if(facts.context==='personal_caller'&&facts.identity!=='personal_relationship')ctx.addIssue({code:'custom',path:['identity'],message:'Personal context requires a stated personal relationship.'});
});
export function observedScreeningRequest(base){
 const request=previousRequest(base),tool=request.tools.find(t=>t.name==='screen_call'),schema=z.toJSONSchema(factsSchema);
 assert.deepEqual(schema,tool.parameters,'v144_must_preserve_initial_request');tool.parameters=schema;return request;
}
export function interpretFacts(raw,transcript,state,options){const p=factsSchema.safeParse(raw);return p.success?previousInterpret(p.data,transcript,state,options):undefined;}
export function observeFacts(raw,transcript){const p=factsSchema.safeParse(raw);return p.success?previousObserve(p.data,transcript):{invalidFacts:true};}
export function selfTest(){
 previousTest();
 const evidence='Independent synthetic caller evidence.',base={identity:'name_or_role',contactInitiator:'none',context:'ordinary_task',claimAction:'ordinary',transaction:'none',prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'unknown',evidence};let checks=0;
 for(const identity of factsSchema.shape.identity.options)for(const context of factsSchema.shape.context.options)for(const contactInitiator of factsSchema.shape.contactInitiator.options)for(const questions of [0,2])for(const caution of [false,true]){
  const raw={...base,identity,context,contactInitiator,refersToCall:true},d=interpretFacts(raw,evidence,{questions},{caution});
  if(context==='personal_caller'&&identity!=='personal_relationship')assert.equal(d,undefined);
  else assert.deepEqual(d,previousInterpret(raw,evidence,{questions},{caution}));checks++;
 }
 const inconsistent={...base,context:'personal_caller'};assert.deepEqual(observeFacts(inconsistent,evidence),{invalidFacts:true});
 assert.equal(factsSchema.safeParse(inconsistent).error.issues[0].path[0],'identity');
 assert.equal(interpretFacts({...inconsistent,identity:'personal_relationship'},evidence,{questions:0}).action,'approve');
 assert.equal(interpretFacts({...inconsistent,context:'missing',contactInitiator:'recipient_elsewhere'},evidence,{questions:0}).action,'block');checks+=4;
 console.log(JSON.stringify({passed:true,checks,scope:'Contradictory personal context requires correction; every consistent action is unchanged. No inference.'}));
}
