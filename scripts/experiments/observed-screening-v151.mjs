// Known v149 development identifies an unresolved requested action, but generic
// continuation feedback often produces another topic question. Preserve the
// initial request and mapper; pass the missing fact to the existing feedback.
import assert from 'node:assert/strict';
import {permittedDecision} from '../../dist/live/policy.js';
import {factsSchema,interpretFacts,selfTest as previousTest} from './observed-screening-v150.mjs';
export {factsSchema,instructions,observedScreeningRequest,interpretFacts,observeFacts,argumentFeedback,callerFraming} from './observed-screening-v150.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v151-experiment';
export function clarificationFor(raw,transcript,state){
 const parsed=factsSchema.safeParse(raw);if(!parsed.success)return;
 const decision=permittedDecision(interpretFacts(parsed.data,transcript,state,{caution:!!state.caution}),transcript);
 if(decision?.action!=='continue')return;
 const f=parsed.data;
 if(f.context==='substantive_claim'&&f.claimAction==='unresolved')return 'requested_action';
 return f.identity==='missing'?'identity':'purpose';
}
export function selfTest(){
 previousTest();
 const evidence='Independent synthetic clarification evidence.',base={identity:'name_or_role',context:'ordinary_task',contactInitiator:'none',claimAction:'ordinary',transaction:'none',prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'other',evidence};let checks=0,guided=0;
 for(const context of factsSchema.shape.context.options)for(const identity of factsSchema.shape.identity.options)for(const claimAction of factsSchema.shape.claimAction.options)for(const transaction of factsSchema.shape.transaction.options)for(const prohibited of factsSchema.shape.prohibited.options)for(const questions of [0,1,2]){
  const raw={...base,context,identity,claimAction,transaction,prohibited},before=structuredClone(raw),state={questions},decision=interpretFacts(raw,evidence,state),hint=clarificationFor(raw,evidence,state);
  assert.deepEqual(raw,before);assert.deepEqual(state,{questions});
  if(decision?.action!=='continue')assert.equal(hint,undefined);
  else {assert.equal(hint,context==='substantive_claim'&&claimAction==='unresolved'?'requested_action':identity==='missing'?'identity':'purpose');guided++;}checks++;
 }
 // Existing policy permits clarification without a supported terminal quote.
 assert.equal(clarificationFor({...base,context:'missing'},'Unsupported speech.',{questions:0}),'purpose');
 assert.equal(clarificationFor(base,'Unsupported speech.',{questions:0}),undefined);
 assert.equal(clarificationFor({...base,context:'missing',extra:true},evidence,{questions:0}),undefined);
 assert.equal(clarificationFor({...base,identity:'missing',recordingMode:'current',recordingCue:evidence},evidence,{questions:0}),undefined);
 assert.equal(clarificationFor({...base,refersToCall:true},evidence,{questions:0,caution:true}),undefined);checks+=5;
 assert.ok(guided>0);console.log(JSON.stringify({passed:true,checks,guided,scope:'Only validated continuations receive fixed identity, purpose or requested-action guidance; no action, evidence, caution or limit change. No inference.'}));
}
