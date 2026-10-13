// Offline development follow-up: distinguish substantive claims from empty
// contact, name the relationship category precisely, and enforce trusted caution.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {factsSchema as previousSchema,instructions as previousInstructions} from './observed-screening-v102.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v103-experiment';
export const factsSchema=previousSchema.extend({
  context:z.enum(['stated_relationship','concrete_service','substantive_claim','missing']).describe('Stated_relationship requires a stated relationship to the recipient, never merely a caller name. Concrete_service is an ordinary task independent of promotion. Substantive_claim is a particular account, official, emergency or money event whose requested action may still need clarification. Missing is only a title, vague topic or wish to make contact.'),
  prohibited:z.enum(['none','secrets','payment','access','concealment','financial_bait','threat','override','technical_rescue']).describe('An actual prohibited request or screening override. Technical_rescue is unsolicited technical intervention. Reports, warnings, refusals and ordinary privacy are none.'),
  refersToCall:z.boolean().describe('Refers to an earlier, dropped, cut-off or missed call, or says they are calling back, returning a call or following up on a call. Earlier non-call contact alone is false.'),
}).strict();
export const instructions=previousInstructions.replace('A name or professional title alone supplies no task.','A name or professional title alone supplies neither a relationship nor a task. Personal identity is not a stated relationship to the recipient.').replace('Record a request for separate contact independently from its context: a personal or service callback differs from an empty invitation.','Record a request for separate contact independently from its context. An ordinary callback or a substantive unresolved claim has a stated purpose; an empty invitation has none. A claim can have purpose while its intended action still needs clarification.');
export function observedScreeningRequest(base){
  const request=structuredClone(base);request.instructions=instructions;
  const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);
  return request;
}
export function interpretFacts(value,_transcript,state,{caution=false}={}){
  const parsed=factsSchema.safeParse(value);if(!parsed.success)return;
  const f=parsed.data,present=f.context!=='missing',ordinary=['stated_relationship','concrete_service'].includes(f.context);
  let action,reason;
  if(f.prohibited!=='none'||(f.separateContact&&!present)){action='block';reason='scam';}
  else if(f.promotion&&!ordinary){action='block';reason=f.recorded?'robocall':'solicitation';}
  else if(f.recorded){action='message';reason=f.unresolvedClaim?'unclear':'routine';}
  else if(f.who&&present&&!f.unresolvedClaim){action=caution&&f.refersToCall?'hold':'approve';reason=action==='hold'?'unclear':'routine';}
  else if(f.refuses||state.questions>=2||(f.unresolvedClaim&&state.questions>=1)){action='hold';reason='unclear';}
  else{action='continue';reason='unclear';}
  return {action,reason,purpose:f.purpose,evidence:f.evidence,hasName:f.who,hasReason:present&&!f.unresolvedClaim};
}
export function selfTest(){
  const b={who:true,context:'concrete_service',separateContact:false,promotion:false,prohibited:'none',recorded:false,unresolvedClaim:false,refuses:false,refersToCall:false,purpose:'other',evidence:'A service update.'},dec=(change,state={questions:0},caution=false)=>interpretFacts({...b,...change},b.evidence,state,{caution});
  let checks=0;
  for(const context of factsSchema.shape.context.options)for(const recorded of [false,true])for(const prohibited of factsSchema.shape.prohibited.options.filter(x=>x!=='none')){assert.equal(dec({context,recorded,prohibited,refersToCall:true},{questions:0},true).action,'block');checks++;}
  for(const recorded of [false,true]){
    assert.equal(dec({context:'missing',separateContact:true,recorded}).action,'block');
    assert.equal(dec({context:'substantive_claim',separateContact:true,unresolvedClaim:true,recorded}).action,recorded?'message':'continue');
    assert.equal(dec({promotion:true,recorded}).action,recorded?'message':'approve');
    assert.equal(dec({context:'missing',promotion:true,recorded}).action,'block');checks+=4;
  }
  assert.equal(dec({refersToCall:true},{questions:0},true).action,'hold');
  assert.equal(dec({refersToCall:true},{questions:0},false).action,'approve');
  assert.equal(dec({refersToCall:false},{questions:0},true).action,'approve');
  assert.equal(dec({recorded:true,refersToCall:true},{questions:0},true).action,'message');
  assert.equal(dec({context:'missing'},{questions:2}).action,'hold');
  assert.equal(dec({context:'substantive_claim',unresolvedClaim:true},{questions:1}).action,'hold');
  assert.equal(dec({who:false}).action,'continue');
  assert.equal(dec({context:'missing',refuses:true}).action,'hold');
  assert.equal(dec({extra:true}),undefined);
  console.log(JSON.stringify({passed:true,checks:checks+9,scope:'General priority, substantive claims versus empty contact, service plus promotion, bounded clarification and trusted recent-call caution; no inference.'}));
}
