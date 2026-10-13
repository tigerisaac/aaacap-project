// Offline atomic-purpose/mode experiment. Promotion is a context category, and
// recording mode distinguishes current automation from a mention of automation.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {supportedEvidence} from '../../dist/live/evidence.js';
import {factsSchema as previousSchema,instructions} from './observed-screening-v107.mjs';
export {instructions};
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v108-experiment';
export const factsSchema=previousSchema.omit({promotion:true}).extend({
  context:z.enum(['social_relationship','ordinary_task','substantive_claim','promotion','missing']).describe('Social_relationship: stated personal relationship. Ordinary_task: stated existing work, transaction or concrete requested result, independent of any added offer. Substantive_claim: explicit financial, official or third-party emergency event whose requested action is unexplained. Promotion: an offer or pitch without an independent ordinary task. Missing: only identity, role, vague topic, contact request or claimed prior inquiry.'),
  recordingMode:z.enum(['current','discussed_only','not_indicated']).describe('Current: this call operates a recording or playback/keypad menu. Discussed_only: a live caller mentions, quotes, imitates or describes automation in another interaction. Not_indicated: no current automation is established. Informative speech alone is not current automation.'),
  recordingCue:z.string().max(160).describe('For current mode, copy a short exact quote establishing current automation or menu operation. Otherwise empty.'),
}).strict();
export function observedScreeningRequest(base){
  const request=structuredClone(base);request.instructions=instructions;
  const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);return request;
}
export function interpretFacts(value,transcript,state,{caution=false}={}){
  const parsed=factsSchema.safeParse(value);if(!parsed.success)return;
  const f=parsed.data,recorded=f.recordingMode==='current',unresolved=f.context==='substantive_claim',ordinary=['social_relationship','ordinary_task'].includes(f.context),groundedRecording=recorded&&supportedEvidence(f.recordingCue,transcript);
  let action,reason;
  if(f.prohibited!=='none'||(f.separateContact&&f.context==='missing')){action='block';reason='scam';}
  else if(f.context==='promotion'){action='block';reason=groundedRecording?'robocall':'solicitation';}
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
  const text='A recorded service update.',b={who:true,context:'ordinary_task',separateContact:false,prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'other',evidence:text},dec=(change,state={questions:0},caution=false)=>interpretFacts({...b,...change},text,state,{caution});let checks=0;
  for(const context of factsSchema.shape.context.options)for(const recordingMode of factsSchema.shape.recordingMode.options)for(const prohibited of factsSchema.shape.prohibited.options.filter(x=>x!=='none')){assert.equal(dec({context,recordingMode,recordingCue:text,prohibited,refersToCall:true},{questions:0},true).action,'block');checks++;}
  for(const recordingMode of factsSchema.shape.recordingMode.options){
    const x={recordingMode,recordingCue:recordingMode==='current'?text:''};
    assert.equal(dec({...x,context:'missing',separateContact:true}).action,'block');
    assert.equal(dec({...x,context:'promotion'}).action,'block');
    assert.equal(dec({...x}).action,recordingMode==='current'?'message':'approve');
    assert.equal(dec({...x,context:'substantive_claim'}).action,recordingMode==='current'?'message':'continue');checks+=4;
  }
  assert.equal(dec({recordingMode:'current',recordingCue:''}),undefined);
  assert.equal(dec({recordingMode:'current',recordingCue:'Invented unsupported quotation.'}),undefined);
  assert.equal(dec({prohibited:'secrets',recordingMode:'current',recordingCue:''}).action,'block');
  assert.equal(dec({context:'promotion',recordingMode:'current',recordingCue:''}).action,'block');
  assert.equal(dec({context:'missing',refersToCall:true},{questions:0},true).action,'hold');
  assert.equal(dec({refersToCall:true},{questions:0},false).action,'approve');
  assert.equal(dec({recordingMode:'current',recordingCue:text,refersToCall:true},{questions:0},true).action,'message');
  assert.equal(dec({context:'missing'},{questions:2}).action,'hold');
  assert.equal(dec({context:'substantive_claim'},{questions:1}).action,'hold');
  assert.equal(dec({context:'missing'},{questions:1}).action,'continue');
  assert.equal(dec({who:false}).action,'continue');
  assert.equal(dec({context:'missing',refuses:true}).action,'hold');
  assert.equal(dec({promotion:false}),undefined);
  const observed=observeFacts({...b,recordingMode:'current',recordingCue:text},text);assert.equal(Object.hasOwn(observed.facts,'recordingCue'),false);assert.equal(Object.hasOwn(observed.facts,'evidence'),false);assert.equal(observed.recordingCueSupported,true);
  console.log(JSON.stringify({passed:true,checks:checks+16,scope:'Atomic purpose/mode, priority, quotation grounding, trusted caution, bounded questions and content-free diagnostics; no inference.'}));
}
