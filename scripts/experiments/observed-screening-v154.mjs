// Known development both loses stated service roles and infers unstated ones.
// Clarify self-identification without changing the schema or action mapper.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {factsSchema as previousSchema,instructions as previousInstructions,observedScreeningRequest as previousRequest,selfTest as previousTest} from './observed-screening-v153.mjs';
export {interpretFacts,observeFacts,argumentFeedback,callerFraming,clarificationFor} from './observed-screening-v153.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v154-experiment';
const before='Distinguish a name or role from a stated personal relationship. A name, role or business type supplies identity, not a personal relationship or purpose.';
assert.ok(previousInstructions.includes(before));
export const instructions=previousInstructions.replace(before,"Use this caller's self-identification, including a brief answer to the opening question. A stated name, role or business type supplies identity, not purpose. Do not infer identity from a task or a third party.");
export const factsSchema=previousSchema.safeExtend({
 identity:previousSchema.shape.identity.describe('Personal_relationship: a stated personal tie between this caller and the recipient. Name_or_role: the caller’s stated name, role or business type, even unnamed or abbreviated. Otherwise missing. A task or an entity being discussed does not identify the caller.'),
});
export function observedScreeningRequest(base){const r=previousRequest(base);r.instructions=instructions;r.tools.find(t=>t.name==='screen_call').parameters=z.toJSONSchema(factsSchema);return r;}
export function selfTest(){
 previousTest();
 const structural=x=>Array.isArray(x)?x.map(structural):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).filter(([k])=>k!=='description').map(([k,v])=>[k,structural(v)])):x;
 assert.deepEqual(structural(z.toJSONSchema(factsSchema)),structural(z.toJSONSchema(previousSchema)));
 const f={identity:'name_or_role',context:'personal_caller',contactInitiator:'none',claimAction:'ordinary',transaction:'none',prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'other',evidence:'Independent synthetic evidence.'};
 for(const identity of factsSchema.shape.identity.options)for(const context of factsSchema.shape.context.options)for(const prohibited of factsSchema.shape.prohibited.options)for(const transaction of factsSchema.shape.transaction.options){const raw={...f,identity,context,prohibited,transaction};assert.deepEqual(factsSchema.safeParse(raw),previousSchema.safeParse(raw));}
 console.log(JSON.stringify({passed:true,checks:406,scope:'Self-identification wording only; schema structure and inherited pair/priority validation unchanged. No inference.'}));
}
