// Offline development revision: one context classification replaces a redundant
// unresolved-claim flag; quoted recording evidence must concern the current call.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {supportedEvidence} from '../../dist/live/evidence.js';
import {factsSchema as previousSchema,instructions as previousInstructions} from './observed-screening-v105.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v106-experiment';
export const factsSchema=previousSchema.omit({unresolvedClaim:true}).extend({
  context:z.enum(['social_relationship','ordinary_task','substantive_claim','missing']).describe('Social_relationship: a stated personal/social relationship. Ordinary_task: stated existing work, transaction or concrete requested result, independent of promotion. Substantive_claim: an explicitly stated financial, official or third-party emergency event whose requested action is still unexplained. Roles, vague topics and claims to be responding supply neither a task nor an event; use missing. Offers alone are also missing.'),
  recordingCue:z.string().max(160).describe('Copy an exact short quote explicitly presenting the CURRENT call as a recording or menu; otherwise empty. Mentions of earlier, hypothetical or other calls are not current-call cues. An informative style is not evidence of recording.'),
}).strict();
export const instructions=previousInstructions.replace('A claimed identity is not verified.','A claimed identity is not verified. Attribute reported events to their speakers and time; classify this caller and this call, not another interaction.');
export function observedScreeningRequest(base){
  const request=structuredClone(base);request.instructions=instructions;
  const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);return request;
}
export function interpretFacts(value,transcript,state,{caution=false}={}){
  const parsed=factsSchema.safeParse(value);if(!parsed.success)return;
  const f=parsed.data,recorded=!!f.recordingCue.trim(),unresolved=f.context==='substantive_claim',present=f.context!=='missing',ordinary=['social_relationship','ordinary_task'].includes(f.context),groundedRecording=recorded&&supportedEvidence(f.recordingCue,transcript);
  let action,reason;
  if(f.prohibited!=='none'||(f.separateContact&&!present)){action='block';reason='scam';}
  else if(f.promotion&&!ordinary){action='block';reason=groundedRecording?'robocall':'solicitation';}
  else if(recorded&&!groundedRecording)return;
  else if(recorded){action='message';reason=unresolved?'unclear':'routine';}
  else if(caution&&f.refersToCall){action='hold';reason='unclear';}
  else if(f.who&&ordinary){action='approve';reason='routine';}
  else if(f.refuses||state.questions>=2||(unresolved&&state.questions>=1)){action='hold';reason='unclear';}
  else{action='continue';reason='unclear';}
  return {action,reason,purpose:f.purpose,evidence:f.evidence,hasName:f.who,hasReason:ordinary};
}
export function observeFacts(raw,transcript){
  const p=factsSchema.safeParse(raw);if(!p.success)return {invalidFacts:true};
  const {evidence,recordingCue,...facts}=p.data;
  return {facts,recordingCuePresent:!!recordingCue.trim(),recordingCueChars:recordingCue.length,recordingCueSupported:!recordingCue.trim()||supportedEvidence(recordingCue,transcript)};
}
export function selfTest(){
  const text='A recorded service update.',b={who:true,context:'ordinary_task',separateContact:false,promotion:false,prohibited:'none',recordingCue:'',refuses:false,refersToCall:false,purpose:'other',evidence:text},dec=(change,state={questions:0},caution=false)=>interpretFacts({...b,...change},text,state,{caution});let checks=0;
  for(const context of factsSchema.shape.context.options)for(const recordingCue of ['',text])for(const prohibited of factsSchema.shape.prohibited.options.filter(x=>x!=='none')){assert.equal(dec({context,recordingCue,prohibited,refersToCall:true},{questions:0},true).action,'block');checks++;}
  for(const recordingCue of ['',text]){
    assert.equal(dec({context:'missing',separateContact:true,recordingCue}).action,'block');
    assert.equal(dec({context:'substantive_claim',recordingCue}).action,recordingCue?'message':'continue');
    assert.equal(dec({promotion:true,recordingCue}).action,recordingCue?'message':'approve');
    assert.equal(dec({context:'missing',promotion:true,recordingCue}).action,'block');checks+=4;
  }
  assert.equal(dec({recordingCue:'Invented unsupported quotation.'}),undefined);
  assert.equal(dec({prohibited:'secrets',recordingCue:'Invented unsupported quotation.'}).action,'block');
  assert.equal(dec({context:'missing',promotion:true,recordingCue:'Invented unsupported quotation.'}).action,'block');
  assert.equal(dec({context:'missing',refersToCall:true},{questions:0},true).action,'hold');
  assert.equal(dec({refersToCall:true},{questions:0},false).action,'approve');
  assert.equal(dec({recordingCue:text,refersToCall:true},{questions:0},true).action,'message');
  assert.equal(dec({context:'missing'},{questions:2}).action,'hold');
  assert.equal(dec({context:'substantive_claim'},{questions:1}).action,'hold');
  assert.equal(dec({context:'missing'},{questions:1}).action,'continue');
  assert.equal(dec({who:false}).action,'continue');
  assert.equal(dec({context:'missing',refuses:true}).action,'hold');
  assert.equal(dec({unresolvedClaim:false}),undefined);
  const observed=observeFacts({...b,recordingCue:text},text);assert.equal(Object.hasOwn(observed.facts,'recordingCue'),false);assert.equal(Object.hasOwn(observed.facts,'evidence'),false);assert.equal(observed.recordingCueSupported,true);
  console.log(JSON.stringify({passed:true,checks:checks+15,scope:'Unified context, priority, quotation grounding, trusted caution, bounded questions and content-free diagnostics; no inference.'}));
}
