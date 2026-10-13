// Known development misses: abbreviated self-identification and a requested
// practical task. Restore the claim/verification distinction without examples.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {factsSchema as previousSchema,instructions as previousInstructions,observedScreeningRequest as previousRequest,interpretFacts as previousInterpret,observeFacts as previousObserve,selfTest as previousTest} from './observed-screening-v147.mjs';
export {argumentFeedback} from './observed-screening-v147.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v148-experiment';
let text=previousInstructions;
for(const [from,to] of [
 ['Distinguish a name or role from a stated personal relationship. ', ''],
 ['Use all caller turns.','Read all turns as this incoming caller’s speech, including brief identity answers.'],
 ['An ordinary activity or result supplies purpose, including what a callback will accomplish; full private details are unnecessary.','A stated ordinary task or update supplies purpose, including what a callback will accomplish; private details are unnecessary.'],
]){assert.ok(text.includes(from));text=text.replace(from,to);}
export const instructions=text;
export const factsSchema=z.object({...previousSchema.shape,
 identity:previousSchema.shape.identity.describe('Personal_relationship: the caller claims a personal tie to the recipient, even in a brief identity answer. Name_or_role: a name, role or business type. Otherwise missing. These are claims, not verified identities. A name, familiarity or someone else’s relationship does not establish a personal tie.'),
 context:previousSchema.shape.context.describe('Personal_caller: this caller claims a personal relationship, including a brief self-identification. Ordinary_task: a stated practical task or informative update, including what separate contact will accomplish; completion, verification and private details are unnecessary. Substantive_claim: a refund/money-owed, security, official or third-party emergency claim; record its intended action separately. Promotion: a pitch without independent ordinary work. Missing: no such purpose; a role, vague private matter or unspecified inquiry alone is insufficient.'),
 claimAction:previousSchema.shape.claimAction.describe('Ordinary: a stated practical task, informative care update or use of her established channel. Classify the intended action, not whether the story is verified. A topic or wish to speak alone is unresolved. Applies only to substantive_claim and never exempts restricted conduct.'),
}).strict().superRefine((f,ctx)=>{
 if(f.prohibited==='none'&&f.transaction!=='unexplained_alert'&&f.context==='personal_caller'&&f.identity!=='personal_relationship')for(const field of ['identity','context'])ctx.addIssue({code:'custom',path:[field],message:'Identity and personal context must agree.'});
});
export function observedScreeningRequest(base){const r=previousRequest(base);r.instructions=instructions;r.tools.find(t=>t.name==='screen_call').parameters=z.toJSONSchema(factsSchema);return r;}
export function interpretFacts(raw,transcript,state,options){const p=factsSchema.safeParse(raw);return p.success?previousInterpret(p.data,transcript,state,options):undefined;}
export function observeFacts(raw,transcript){const p=factsSchema.safeParse(raw);return p.success?previousObserve(p.data,transcript):{invalidFacts:true};}
export function selfTest(){
 previousTest();
 const structural=x=>Array.isArray(x)?x.map(structural):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).filter(([k])=>k!=='description').map(([k,v])=>[k,structural(v)])):x;
 assert.deepEqual(structural(z.toJSONSchema(factsSchema)),structural(z.toJSONSchema(previousSchema)));
 const base={identity:'name_or_role',context:'personal_caller',contactInitiator:'none',claimAction:'ordinary',transaction:'none',prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'unknown',evidence:'Independent synthetic evidence.'};let checks=1;
 for(const identity of factsSchema.shape.identity.options)for(const context of factsSchema.shape.context.options)for(const transaction of factsSchema.shape.transaction.options)for(const prohibited of factsSchema.shape.prohibited.options){const f={...base,identity,context,transaction,prohibited};assert.deepEqual(interpretFacts(f,f.evidence,{questions:0}),previousInterpret(f,f.evidence,{questions:0}));checks++;}
 console.log(JSON.stringify({passed:true,checks,scope:'Only descriptions/instructions change; same schema structure, joint correction, evidence and deterministic decisions. No inference.'}));
}
