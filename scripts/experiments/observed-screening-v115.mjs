// Offline factorization: caller identity and call purpose are independent.
// A personal relationship supplies social purpose without inventing a task.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {supportedEvidence} from '../../dist/live/evidence.js';
import {factsSchema as previousSchema,instructions} from './observed-screening-v114.mjs';
export {instructions,argumentFeedback} from './observed-screening-v114.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v115-experiment';
export const factsSchema=previousSchema.omit({who:true}).extend({
  identity:z.enum(['personal','named','professional','missing']).describe('Who THIS caller claims to be. Personal: their own family or social relationship with the recipient. Named: a name alone. Professional: a role or business. Missing: no identity stated. Abbreviated answers count; no verification is required. A relationship between other people is not personal identity.'),
  context:z.enum(['ordinary_task','substantive_claim','promotion','missing']).describe('Ordinary_task: stated existing service, transaction, requested subject or practical update. Substantive_claim: an unexplained financial/account alarm, official claim or third-party emergency needing its intended action clarified. Promotion: a pitch without independent ordinary work. Missing: only identity, vague/private matter or prior inquiry with no subject. Personal identity separately supplies social purpose; never invent a service task.'),
}).strict();
export function observedScreeningRequest(base){
  const request=structuredClone(base);request.instructions=instructions;
  const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);return request;
}
export function interpretFacts(value,transcript,state,{caution=false}={}){
  const parsed=factsSchema.safeParse(value);if(!parsed.success)return;
  const f=parsed.data,recorded=f.recordingMode==='current',unresolved=f.context==='substantive_claim',personal=f.identity==='personal',ordinary=personal||f.context==='ordinary_task',groundedRecording=recorded&&supportedEvidence(f.recordingCue,transcript);
  let action,reason;
  if(f.prohibited!=='none'||(f.separateContact&&f.context==='missing'&&!personal)){action='block';reason='scam';}
  else if(f.context==='promotion'&&!personal){action='block';reason=groundedRecording?'robocall':'solicitation';}
  else if(recorded&&!groundedRecording)return;
  else if(recorded){action='message';reason=unresolved?'unclear':'routine';}
  else if(caution&&f.refersToCall){action='hold';reason='unclear';}
  else if(f.identity!=='missing'&&ordinary){action='approve';reason='routine';}
  else if(f.refuses||state.questions>=2||(unresolved&&state.questions>=1)){action='hold';reason='unclear';}
  else{action='continue';reason='unclear';}
  // Personal identity supplies a social purpose by policy. A concrete ordinary
  // task outside the named UI categories is "other", not an invalid approval.
  const purpose=action==='approve'&&f.purpose==='unknown'?(personal?'personal':'other'):f.purpose;
  return {action,reason,purpose,evidence:f.evidence,hasName:f.identity!=='missing',hasReason:ordinary};
}
export function observeFacts(raw,transcript){
  const p=factsSchema.safeParse(raw);if(!p.success)return {invalidFacts:true};
  const {evidence,recordingCue,...facts}=p.data;
  return {facts,recordingCuePresent:!!recordingCue.trim(),recordingCueChars:recordingCue.length,recordingCueSupported:!recordingCue.trim()||supportedEvidence(recordingCue,transcript)};
}
export function selfTest(){
  const text='A recorded service update.',b={identity:'professional',context:'ordinary_task',separateContact:false,prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'other',evidence:text},dec=(change,state={questions:0},caution=false)=>interpretFacts({...b,...change},text,state,{caution});let checks=0;
  for(const identity of factsSchema.shape.identity.options)for(const context of factsSchema.shape.context.options)for(const prohibited of factsSchema.shape.prohibited.options.filter(x=>x!=='none')){
    assert.equal(dec({identity,context,prohibited,recordingMode:'current',recordingCue:text,refersToCall:true},{questions:0},true).action,'block');checks++;
  }
  for(const identity of factsSchema.shape.identity.options){
    assert.equal(dec({identity,context:'missing',separateContact:true}).action,identity==='personal'?'approve':'block');
    assert.equal(dec({identity,context:'missing'}).action,identity==='personal'?'approve':'continue');
    assert.equal(dec({identity,context:'promotion'}).action,identity==='personal'?'approve':'block');
    assert.equal(dec({identity}).action,identity==='missing'?'continue':'approve');checks+=4;
  }
  assert.equal(dec({recordingMode:'current',recordingCue:text}).action,'message');
  assert.equal(dec({recordingMode:'current',recordingCue:text,refersToCall:true},{questions:0},true).action,'message');
  assert.equal(dec({identity:'personal',refersToCall:true},{questions:0},true).action,'hold');
  assert.equal(dec({context:'substantive_claim'},{questions:0}).action,'continue');
  assert.equal(dec({context:'substantive_claim'},{questions:1}).action,'hold');
  assert.equal(dec({context:'missing'},{questions:2}).action,'hold');
  assert.equal(dec({context:'missing',refuses:true}).action,'hold');
  assert.equal(dec({recordingMode:'current',recordingCue:'Invented unsupported quotation.'}),undefined);
  assert.equal(dec({prohibited:'access',recordingMode:'current',recordingCue:'Invented unsupported quotation.'}).action,'block');
  assert.equal(dec({who:true}),undefined);
  assert.equal(dec({context:'personal_caller'}),undefined);
  assert.equal(dec({identity:'personal',context:'missing',purpose:'unknown'}).purpose,'personal');
  assert.equal(dec({purpose:'unknown'}).purpose,'other');
  const observed=observeFacts({...b,recordingMode:'current',recordingCue:text},text);assert.equal(Object.hasOwn(observed.facts,'recordingCue'),false);assert.equal(Object.hasOwn(observed.facts,'evidence'),false);assert.equal(observed.recordingCueSupported,true);
  console.log(JSON.stringify({passed:true,checks:checks+16,scope:'Independent identity/purpose, harmful priority, personal and ordinary callbacks, missing identity, bounded questions, caution and recording evidence; no inference.'}));
}
