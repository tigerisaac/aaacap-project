// Offline evidence-bearing context experiment, based on v111's restrictions.
// A quote check grounds the claimed basis; it does not verify its interpretation
// or the caller's real identity. No public or held-out wording is used.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {supportedEvidence} from '../../dist/live/evidence.js';
import {factsSchema as previousSchema,instructions as previousInstructions,interpretFacts as previousInterpret,observeFacts as previousObserve,selfTest as previousTest} from './observed-screening-v111.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v118-experiment';
export const argumentFeedback=2;
export const factsSchema=previousSchema.extend({
  contextCue:z.string().max(160).describe('Quote stating this caller’s own personal relationship or concrete independent task for ordinary context; otherwise empty. A name, title or contact invitation alone does not supply that context.'),
}).strict();
export const instructions=previousInstructions.replace('Always call screen_call with the facts and one short consecutive quote copied from caller speech.', 'Ground ordinary context in contextCue: quote the stated relationship or independent task, never infer it from a contact request. Always call screen_call with the facts and one short consecutive quote copied from caller speech.');
export function observedScreeningRequest(base){
  const request=structuredClone(base);request.instructions=instructions;
  const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);return request;
}
export function interpretFacts(value,transcript,state,options){
  const p=factsSchema.safeParse(value);if(!p.success)return;
  const {contextCue,...facts}=p.data,decision=previousInterpret(facts,transcript,state,options);
  if(decision?.action==='approve'&&!supportedEvidence(contextCue,transcript))return;
  return decision;
}
export function observeFacts(value,transcript){
  const p=factsSchema.safeParse(value);if(!p.success)return {invalidFacts:true};
  const {contextCue,...facts}=p.data;
  return {...previousObserve(facts,transcript),contextCuePresent:!!contextCue.trim(),contextCueChars:contextCue.length,contextCueSupported:!!contextCue.trim()&&supportedEvidence(contextCue,transcript)};
}
export function selfTest(){
  previousTest();
  const text='Her neighbor is calling about collecting the parcel.',base={who:true,context:'personal_caller',separateContact:false,prohibited:'none',refuses:false,purpose:'personal',refersToCall:false,recordingMode:'not_indicated',recordingCue:'',evidence:text,contextCue:'Her neighbor'};
  const dec=(change,state={questions:0},options)=>interpretFacts({...base,...change},text,state,options);let checks=0;
  assert.equal(dec({}).action,'approve');checks++;
  for(const contextCue of ['', 'Entirely invented relationship.']){
    assert.equal(dec({contextCue}),undefined);checks++;
    for(const prohibited of previousSchema.shape.prohibited.options.filter(x=>x!=='none')){assert.equal(dec({contextCue,prohibited}).action,'block');checks++;}
    assert.equal(dec({contextCue,context:'missing',separateContact:true}).action,'block');checks++;
    assert.equal(dec({contextCue,context:'missing'}).action,'continue');checks++;
    assert.equal(dec({contextCue,context:'substantive_claim'},{questions:1}).action,'hold');checks++;
    assert.equal(dec({contextCue,recordingMode:'current',recordingCue:text}).action,'message');checks++;
    assert.equal(dec({contextCue,refersToCall:true},{questions:0},{caution:true}).action,'hold');checks++;
  }
  const observed=observeFacts(base,text);assert.equal(observed.contextCueSupported,true);assert.ok(!JSON.stringify(observed).includes('Her neighbor'));assert.ok(!Object.hasOwn(observed.facts,'contextCue'));checks+=3;
  assert.equal(dec({contextCue:'x'.repeat(161)}),undefined);checks++;
  console.log(JSON.stringify({passed:true,additionalChecks:checks,scope:'Grounded approval context, harmful priority, missing context, notice/caution paths, bounded field and quote redaction; no inference.'}));
}
