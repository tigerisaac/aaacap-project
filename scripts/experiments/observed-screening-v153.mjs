// Known development misreads social/informative purpose and outside contact.
// Clarify those concepts without changing facts, action priority or safeguards.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {factsSchema as previousSchema,instructions as previousInstructions,observedScreeningRequest as previousRequest,selfTest as previousTest} from './observed-screening-v152.mjs';
export {interpretFacts,observeFacts,argumentFeedback,callerFraming,clarificationFor} from './observed-screening-v152.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v153-experiment';
let text=previousInstructions;
for(const [from,to] of [
 ['An ordinary activity or result supplies purpose, including what a callback will accomplish; full private details are unnecessary.','An ordinary social, informative or practical purpose suffices without a stated relationship or private details, including the purpose of a callback.'],
 ['Speaking on this incoming call is caller_here; asking her to initiate a separate contact is recipient_elsewhere.','Caller_here means conversation on this call; recipient_elsewhere means any request to initiate contact outside it, whatever the destination or medium.'],
]){assert.ok(text.includes(from));text=text.replace(from,to);}
export const instructions=text;
export const factsSchema=previousSchema.safeExtend({
 context:previousSchema.shape.context.describe('Personal_caller: this caller states a personal relationship, supplying social context. Ordinary_task: an ordinary social, informative or practical purpose, including what separate contact will accomplish; no relationship or private details required. Substantive_claim: a refund/money-owed, account-security, official or third-party emergency claim; record its intended action in claimAction. Promotion: a pitch without independent ordinary work. Missing: no such purpose; identity, vague private matters or merely establishing contact are insufficient.'),
 contactInitiator:previousSchema.shape.contactInitiator.describe('Recipient_elsewhere: any request for her to initiate contact outside this call, whatever the destination or medium. Caller_here: speaking or continuing on this incoming call, including returning her earlier call. None: no communication requested. Classify independently of purpose; contextual callbacks can still ask her to initiate contact.'),
});
export function observedScreeningRequest(base){const r=previousRequest(base);r.instructions=instructions;r.tools.find(t=>t.name==='screen_call').parameters=z.toJSONSchema(factsSchema);return r;}
export function selfTest(){
 previousTest();
 const structural=x=>Array.isArray(x)?x.map(structural):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).filter(([k])=>k!=='description').map(([k,v])=>[k,structural(v)])):x;
 assert.deepEqual(structural(z.toJSONSchema(factsSchema)),structural(z.toJSONSchema(previousSchema)));
 const f={identity:'name_or_role',context:'personal_caller',contactInitiator:'none',claimAction:'ordinary',transaction:'none',prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'other',evidence:'Independent synthetic evidence.'};
 for(const context of previousSchema.shape.context.options)for(const identity of previousSchema.shape.identity.options)for(const recordingMode of previousSchema.shape.recordingMode.options)for(const recordingCue of ['',f.evidence]){
  const raw={...f,context,identity,recordingMode,recordingCue};assert.deepEqual(factsSchema.safeParse(raw),previousSchema.safeParse(raw));
 }
 console.log(JSON.stringify({passed:true,checks:91,scope:'Description-only change retains schema structure and cross-field validation; previous mapper, evidence, clarification and priority tests pass. No inference.'}));
}
