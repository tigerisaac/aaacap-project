// Development-only repair: an unnamed service role supplies identity. Conflicting
// relationship/context observations receive joint, content-free correction.
// No public or spent-validation wording or decision exceptions.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {factsSchema as baseSchema,instructions as baseInstructions,observedScreeningRequest as baseRequest} from './observed-screening-v143.mjs';
import {interpretFacts as previousInterpret,observeFacts as previousObserve,selfTest as previousTest} from './observed-screening-v145.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v146-experiment';
export const argumentFeedback=3;
const old='A name or role supplies identity, not a personal relationship or purpose.';
assert.ok(baseInstructions.includes(old));
export const instructions=baseInstructions.replace(old,'A name, role or business type supplies identity, not a personal relationship or purpose.');
export const factsSchema=baseSchema.extend({
 identity:baseSchema.shape.identity.describe('Personal_relationship: this caller states their own relationship to the recipient. Name_or_role: a name, occupation, service role or business type, even unnamed. Otherwise missing. Familiarity or someone else’s relationship does not establish this caller’s relationship.'),
}).superRefine((facts,ctx)=>{
 if(facts.prohibited==='none'&&facts.transaction!=='unexplained_alert'&&facts.context==='personal_caller'&&facts.identity!=='personal_relationship'){
  for(const field of ['identity','context'])ctx.addIssue({code:'custom',path:[field],message:'Identity and personal context must agree.'});
 }
});
export function observedScreeningRequest(base){
 const request=baseRequest(base);request.instructions=instructions;
 request.tools.find(t=>t.name==='screen_call').parameters=z.toJSONSchema(factsSchema);return request;
}
export function interpretFacts(raw,transcript,state,options){const p=factsSchema.safeParse(raw);return p.success?previousInterpret(p.data,transcript,state,options):undefined;}
export function observeFacts(raw,transcript){const p=factsSchema.safeParse(raw);return p.success?previousObserve(p.data,transcript):{invalidFacts:true};}
export function selfTest(){
 previousTest();
 const evidence='Independent synthetic caller evidence.',base={identity:'name_or_role',contactInitiator:'none',context:'personal_caller',claimAction:'ordinary',transaction:'none',prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'unknown',evidence};let checks=0;
 for(const identity of factsSchema.shape.identity.options)for(const context of factsSchema.shape.context.options)for(const transaction of factsSchema.shape.transaction.options)for(const prohibited of factsSchema.shape.prohibited.options){
  const raw={...base,identity,context,transaction,prohibited};
  assert.deepEqual(interpretFacts(raw,evidence,{questions:0}),previousInterpret(raw,evidence,{questions:0}));checks++;
 }
 assert.deepEqual(factsSchema.safeParse(base).error.issues.map(i=>i.path[0]),['identity','context']);
 assert.equal(interpretFacts({...base,context:'ordinary_task'},evidence,{questions:0}).action,'approve');
 assert.equal(interpretFacts({...base,identity:'personal_relationship'},evidence,{questions:0}).action,'approve');
 assert.equal(interpretFacts({...base,prohibited:'secrets'},evidence,{questions:0}).action,'block');checks+=4;
 console.log(JSON.stringify({passed:true,checks,scope:'Same deterministic actions and restriction priority; joint identity/context diagnostic; unnamed service role wording. No inference.'}));
}
