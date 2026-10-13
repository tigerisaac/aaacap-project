// V141 development misses: empty invitations questioned and charge alarms saved.
// Retain the direct decision, adding only the two independent priority inputs.
// No public or held-out wording informs this change.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {factsSchema as previousSchema,instructions as previousInstructions,interpretFacts as previousInterpret,selfTest as previousTest} from './observed-screening-v141.mjs';
import {permittedDecision} from '../../dist/live/policy.js';
export const SCREENING_POLICY_VERSION='2026-10-13-direct-v142-experiment';
export const decisionMode='direct-with-priority-observations';
export const argumentFeedback=true;
export const factsSchema=previousSchema.extend({
 transaction:z.enum(['none','ordinary_update','unexplained_alert']).describe('Classify the financial event independently of the proposed action. Unexplained_alert: a purchase/debit without expected-transaction context, including an authorization check or an unspecified unexplained charge. Ordinary_update: an expected payment, receipt, completed refund or agreed-service bill, even when payment fails or is delayed. A distinct unexpected transaction remains an alert beside ordinary business. None: no such event, or a report about another caller or the personal caller’s own money.'),
 contactInvitation:z.enum(['none','contextual','unexplained']).describe('An invitation to establish or resume contact outside this call: another call/chat, joining a group or adding a contact. Contextual: an independent subject or this caller’s stated personal relationship is supplied. A sensitive topic can supply a subject while still needing clarification of the intended action. Unexplained: only the invitation, identity or role is supplied; the invitation itself supplies no subject or relationship. None: no outside contact requested, including merely asking to speak here.'),
}).strict();
export const instructions=previousInstructions.replace('Apply the rules below in order.','Assess the contact invitation and financial event independently of your proposed action. Apply the rules below in order.');
export function observedScreeningRequest(base){
 const request=structuredClone(base);request.instructions=instructions;
 const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Decide how to screen this caller and record the contact and transaction observations used for priority checks.';tool.parameters=z.toJSONSchema(factsSchema);return request;
}
export function interpretFacts(value,transcript,state,options){
 const parsed=factsSchema.safeParse(value);if(!parsed.success)return;
 const {transaction,contactInvitation,refersToCall,...decision}=parsed.data;
 if(transaction==='unexplained_alert'||contactInvitation==='unexplained')return {...decision,action:'block',reason:'scam'};
 return previousInterpret({...decision,refersToCall},transcript,state,options);
}
export function observeFacts(value){
 const parsed=factsSchema.safeParse(value);if(!parsed.success)return {invalidFacts:true};
 const {evidence,...facts}=parsed.data;return {facts};
}
export function selfTest(){
 previousTest();const text='Independent synthetic evidence.',base={action:'approve',reason:'routine',purpose:'other',hasName:true,hasReason:true,evidence:text,refersToCall:false,transaction:'none',contactInvitation:'none'};let checks=0;
 for(const transaction of factsSchema.shape.transaction.options)for(const contactInvitation of factsSchema.shape.contactInvitation.options)for(const action of ['approve','block','message','continue','hold'])for(const caution of [false,true])for(const questions of [0,2]){
  const raw={...base,transaction,contactInvitation,action,reason:action==='block'?'solicitation':['continue','hold'].includes(action)?'unclear':'routine',refersToCall:true};
  const {transaction:unusedTransaction,contactInvitation:unusedContact,...direct}=raw;const result=interpretFacts(raw,text,{questions},{caution});
  if(transaction==='unexplained_alert'||contactInvitation==='unexplained'){assert.equal(result.action,'block');assert.equal(result.reason,'scam');}
  else assert.deepEqual(result,previousInterpret(direct,text,{questions},{caution}));
  assert.ok(permittedDecision(result,text));assert.ok(!('refersToCall' in result));checks+=3;
 }
 for(const change of [{transaction:'unexplained_alert'},{contactInvitation:'unexplained'}])assert.equal(permittedDecision(interpretFacts({...base,...change},text,{questions:0}),'Unsupported words.'),undefined);
 assert.equal(interpretFacts({...base,unexpected:true},text,{questions:0}),undefined);assert.ok(!JSON.stringify(observeFacts(base)).includes(text));checks+=4;
 console.log(JSON.stringify({passed:true,checks,scope:'Charge/contact priority over all direct actions; ordinary and substantive-context paths, caution, question bounds, strict inputs and evidence remain intact. No inference.'}));
}
