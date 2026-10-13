// Offline follow-up based on synthetic development: narrower context categories,
// verbatim evidence without stitching, and caution before live clarification.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {factsSchema as previousSchema,instructions as previousInstructions} from './observed-screening-v103.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v104-experiment';
export const factsSchema=previousSchema.extend({
  context:z.enum(['social_relationship','existing_task','specific_response','substantive_claim','missing']).describe('Social_relationship: a stated personal/social relationship, not a professional role or customer status. Existing_task: a particular existing service obligation or transaction, independent of selling anything. Specific_response: answering her particular request, with its subject stated. Substantive_claim: a particular account, official, emergency or money event needing its intended action clarified. Missing: only a name, title, vague topic, contact invitation or promotional offer. A proposed review, discount or new service is not existing work.'),
  purpose:z.enum(['appointment','delivery','prescription','personal','other','unknown']).describe('Use other for a stated purpose outside the named categories; unknown only when no purpose is stated.'),
  evidence:z.string().max(240).describe('Copy one short consecutive excerpt verbatim from caller speech, at least six letters. It need not cover every fact. Never summarize or join separated passages.'),
}).strict();
export const instructions=previousInstructions.replace('Always call screen_call with the facts.','Always call screen_call with the facts and a short exact consecutive quote. Evidence need not cover every fact; never stitch separate passages together.');
export function observedScreeningRequest(base){
  const request=structuredClone(base);request.instructions=instructions;
  const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);
  return request;
}
export function interpretFacts(value,_transcript,state,{caution=false}={}){
  const parsed=factsSchema.safeParse(value);if(!parsed.success)return;
  const f=parsed.data,present=f.context!=='missing',ordinary=['social_relationship','existing_task','specific_response'].includes(f.context);
  let action,reason;
  if(f.prohibited!=='none'||(f.separateContact&&!present)){action='block';reason='scam';}
  else if(f.promotion&&!ordinary){action='block';reason=f.recorded?'robocall':'solicitation';}
  else if(f.recorded){action='message';reason=f.unresolvedClaim?'unclear':'routine';}
  else if(caution&&f.refersToCall){action='hold';reason='unclear';}
  else if(f.who&&present&&!f.unresolvedClaim){action='approve';reason='routine';}
  else if(f.refuses||state.questions>=2||(f.unresolvedClaim&&state.questions>=1)){action='hold';reason='unclear';}
  else{action='continue';reason='unclear';}
  return {action,reason,purpose:f.purpose,evidence:f.evidence,hasName:f.who,hasReason:present&&!f.unresolvedClaim};
}
export function selfTest(){
  const b={who:true,context:'existing_task',separateContact:false,promotion:false,prohibited:'none',recorded:false,unresolvedClaim:false,refuses:false,refersToCall:false,purpose:'other',evidence:'A service update.'},dec=(change,state={questions:0},caution=false)=>interpretFacts({...b,...change},b.evidence,state,{caution});
  let checks=0;
  for(const context of factsSchema.shape.context.options)for(const recorded of [false,true])for(const prohibited of factsSchema.shape.prohibited.options.filter(x=>x!=='none')){assert.equal(dec({context,recorded,prohibited,refersToCall:true},{questions:0},true).action,'block');checks++;}
  for(const recorded of [false,true]){
    assert.equal(dec({context:'missing',separateContact:true,recorded,refersToCall:true},{questions:0},true).action,'block');
    assert.equal(dec({context:'substantive_claim',separateContact:true,unresolvedClaim:true,recorded}).action,recorded?'message':'continue');
    assert.equal(dec({promotion:true,recorded}).action,recorded?'message':'approve');
    assert.equal(dec({context:'missing',promotion:true,recorded,refersToCall:true},{questions:0},true).action,'block');checks+=4;
  }
  for(const context of factsSchema.shape.context.options){assert.equal(dec({context,refersToCall:true},{questions:0},true).action,'hold');checks++;}
  assert.equal(dec({refersToCall:true},{questions:0},false).action,'approve');
  assert.equal(dec({refersToCall:false},{questions:0},true).action,'approve');
  assert.equal(dec({recorded:true,refersToCall:true},{questions:0},true).action,'message');
  assert.equal(dec({context:'missing'},{questions:2}).action,'hold');
  assert.equal(dec({context:'substantive_claim',unresolvedClaim:true},{questions:1}).action,'hold');
  assert.equal(dec({who:false}).action,'continue');
  assert.equal(dec({context:'missing',refuses:true}).action,'hold');
  assert.equal(dec({extra:true}),undefined);
  console.log(JSON.stringify({passed:true,checks:checks+8,scope:'General priority, explicit ordinary contexts, bounded clarification and trusted recent-call caution; no inference.'}));
}
