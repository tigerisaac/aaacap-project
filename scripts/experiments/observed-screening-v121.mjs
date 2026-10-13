// Offline enum-name experiment from v120. The category means a stated
// relationship, not merely a private individual. No new decision rule or field.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {factsSchema as previousSchema,instructions,interpretFacts as previousInterpret,observeFacts as previousObserve,selfTest as previousTest} from './observed-screening-v120.mjs';
export {instructions,argumentFeedback} from './observed-screening-v120.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v121-experiment';
export const factsSchema=previousSchema.extend({
  context:z.enum(previousSchema.shape.context.options.map(x=>x==='personal_caller'?'caller_relationship_stated':x)).describe(previousSchema.shape.context.description.replace('Personal_caller:', 'Caller_relationship_stated:')),
}).strict();
export function observedScreeningRequest(base){
  const request=structuredClone(base);request.instructions=instructions;
  const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);return request;
}
function previousFacts(value){
  const parsed=factsSchema.safeParse(value);if(!parsed.success)return;
  return {...parsed.data,context:parsed.data.context==='caller_relationship_stated'?'personal_caller':parsed.data.context};
}
export function interpretFacts(value,transcript,state,options){
  const facts=previousFacts(value);if(facts)return previousInterpret(facts,transcript,state,options);
}
export function observeFacts(value,transcript){
  const facts=previousFacts(value);if(!facts)return {invalidFacts:true};
  const observed=previousObserve(facts,transcript);observed.facts.context=value.context;return observed;
}
export function selfTest(){
  previousTest();
  const evidence='A synthetic caller statement.',base={who:true,context:'caller_relationship_stated',separateContact:false,prohibited:'none',refuses:false,purpose:'personal',refersToCall:false,recordingMode:'not_indicated',recordingCue:'',evidence};let checks=0;
  for(const context of factsSchema.shape.context.options)for(const separateContact of [false,true])for(const questions of [0,1,2])for(const caution of [false,true]){
    const facts={...base,context,separateContact,refersToCall:true},previous={...facts,context:context==='caller_relationship_stated'?'personal_caller':context};
    assert.deepEqual(interpretFacts(facts,evidence,{questions},{caution}),previousInterpret(previous,evidence,{questions},{caution}));checks++;
  }
  assert.equal(interpretFacts({...base,context:'personal_caller'},evidence,{questions:0}),undefined);checks++;
  const observed=observeFacts(base,evidence);assert.equal(observed.facts.context,'caller_relationship_stated');assert.ok(!JSON.stringify(observed).includes(evidence));checks+=2;
  console.log(JSON.stringify({passed:true,additionalChecks:checks,scope:'Enum alias preserves mapping and caution; old enum rejected; observations redact evidence.'}));
}
