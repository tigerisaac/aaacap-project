// Development-grounded contact direction and identity kind. Start from v139;
// public and spent-validation outcomes supply no wording or exceptions.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {permittedDecision} from '../../dist/live/policy.js';
import {factsSchema as previousSchema,instructions as previousInstructions,interpretFacts as previousInterpret,observeFacts as previousObserve,selfTest as previousTest} from './observed-screening-v139.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v143-experiment';
export const argumentFeedback=true;
let text=previousInstructions;
for(const [from,to] of [
 ['A name, role or business type supplies identity, not purpose.','Distinguish a name or role from a stated personal relationship. A name or role supplies identity, not a personal relationship or purpose.'],
 ['Record contact destination independently of purpose. An invitation gains no ordinary purpose merely by proposing contact.','Record who initiates the requested contact. Speaking on this incoming call is caller_here; asking her to initiate a separate contact is recipient_elsewhere. An invitation gains no purpose merely by proposing contact.'],
]){assert.ok(text.includes(from),'v143_source_mismatch');text=text.replace(from,to);}
export const instructions=text;
const {who:unusedWho,contact:unusedContact,...shape}=previousSchema.shape;
export const factsSchema=z.object({...shape,
 identity:z.enum(['missing','name_or_role','personal_relationship']).describe('Personal_relationship only when this caller states their own personal relationship with the recipient. Otherwise name_or_role for a name, occupation or organization, or missing. Do not infer a relationship from a name, familiarity or another person’s relationship.'),
 contactInitiator:z.enum(['none','caller_here','recipient_elsewhere']).describe('Recipient_elsewhere: she is asked to start a separate call/chat, add a contact or join a channel. Caller_here: this incoming caller asks to speak or continue here, including returning her earlier call. None: no communication requested. Classify independently of purpose; contextual callbacks can still ask her to initiate contact.'),
}).strict();
function normalized(raw){
 const p=factsSchema.safeParse(raw);if(!p.success)return;
 const {identity,contactInitiator,...facts}=p.data;
 return {...facts,who:identity!=='missing',contact:contactInitiator==='recipient_elsewhere'?'elsewhere':contactInitiator==='caller_here'?'this_call':'none',context:facts.context==='personal_caller'&&identity!=='personal_relationship'?'missing':facts.context};
}
export function interpretFacts(raw,transcript,state,options){return previousInterpret(normalized(raw),transcript,state,options);}
export function observeFacts(raw,transcript){
 const p=factsSchema.safeParse(raw);if(!p.success)return {invalidFacts:true};
 const observed=previousObserve(normalized(raw),transcript),{who:unusedWho,contact:unusedContact,...facts}=observed.facts;
 return {...observed,facts:{...facts,context:p.data.context,identity:p.data.identity,contactInitiator:p.data.contactInitiator}};
}
export function observedScreeningRequest(base){
 const request=structuredClone(base);request.instructions=instructions;
 const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);return request;
}
export function selfTest(){
 previousTest();
 const evidence='Independent synthetic caller evidence.',base={identity:'name_or_role',contactInitiator:'none',context:'ordinary_task',claimAction:'ordinary',transaction:'none',prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'unknown',evidence};let checks=0;
 // Independently specified behavior at the contact boundary.
 for(const identity of factsSchema.shape.identity.options)for(const contactInitiator of factsSchema.shape.contactInitiator.options)for(const context of ['missing','personal_caller'])for(const questions of [0,2]){
  const raw={...base,identity,contactInitiator,context},d=interpretFacts(raw,evidence,{questions});
  const personal=context==='personal_caller'&&identity==='personal_relationship';
  const expected=personal?'approve':contactInitiator==='recipient_elsewhere'?'block':questions===2?'hold':'continue';
  assert.equal(d.action,expected);assert.ok(permittedDecision(d,evidence));checks+=2;
 }
 for(const contactInitiator of factsSchema.shape.contactInitiator.options)for(const transaction of factsSchema.shape.transaction.options)for(const prohibited of factsSchema.shape.prohibited.options)for(const caution of [false,true]){
  const raw={...base,contactInitiator,transaction,prohibited,refersToCall:true},d=interpretFacts(raw,evidence,{questions:1},{caution});
  const expected=transaction==='unexplained_alert'||prohibited!=='none'?'block':caution?'hold':'approve';
  assert.equal(d.action,expected);assert.ok(permittedDecision(d,evidence));checks+=2;
 }
 for(const contactInitiator of factsSchema.shape.contactInitiator.options){
  assert.equal(interpretFacts({...base,contactInitiator,context:'substantive_claim',claimAction:'unresolved'},evidence,{questions:0}).action,'continue');
  assert.equal(interpretFacts({...base,contactInitiator,context:'substantive_claim',claimAction:'unresolved'},evidence,{questions:1}).action,'hold');
  assert.equal(interpretFacts({...base,contactInitiator,recordingMode:'current',recordingCue:evidence},evidence,{questions:0}).action,'message');checks+=3;
 }
 for(const change of [{who:true},{contact:'elsewhere'},{identity:'inferred'},{contactInitiator:'unknown'}]){assert.equal(interpretFacts({...base,...change},evidence,{questions:0}),undefined);checks++;}
 const raw={...base,context:'personal_caller',contactInitiator:'recipient_elsewhere'};
 const observed=observeFacts(raw,evidence);assert.equal(observed.facts.context,'personal_caller');assert.equal(observed.facts.identity,'name_or_role');assert.equal(interpretFacts(raw,evidence,{questions:0}).action,'block');
 assert.ok(!('who' in observed.facts)&&!('contact' in observed.facts));assert.ok(!JSON.stringify(observed).includes(evidence));assert.equal(permittedDecision(interpretFacts(base,evidence,{questions:0}),'Unsupported evidence.'),undefined);checks+=6;
 console.log(JSON.stringify({passed:true,checks,scope:'Contact initiator, personal-relationship gate, ordinary callbacks, useful clarification, restrictions, notices, caution and evidence; raw observations retained. No inference.'}));
}
