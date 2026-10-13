// Known development can classify a stated sensitive topic as missing context.
// Ask what the caller needs, whether or not the topic was classified correctly.
// No initial request, action mapping, identity or terminal-decision change.
import assert from 'node:assert/strict';
import {factsSchema,clarificationFor as previousHint,selfTest as previousTest} from './observed-screening-v151.mjs';
export {factsSchema,instructions,observedScreeningRequest,interpretFacts,observeFacts,argumentFeedback,callerFraming} from './observed-screening-v151.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v152-experiment';
export function clarificationFor(raw,transcript,state){
 const hint=previousHint(raw,transcript,state);
 return hint==='purpose'?'requested_action':hint;
}
export function selfTest(){
 previousTest();
 const evidence='Independent synthetic clarification evidence.',base={identity:'name_or_role',context:'ordinary_task',contactInitiator:'none',claimAction:'ordinary',transaction:'none',prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'other',evidence};let checks=0,changed=0;
 for(const context of factsSchema.shape.context.options)for(const identity of factsSchema.shape.identity.options)for(const claimAction of factsSchema.shape.claimAction.options)for(const transaction of factsSchema.shape.transaction.options)for(const prohibited of factsSchema.shape.prohibited.options)for(const questions of [0,1,2]){
  const raw={...base,context,identity,claimAction,transaction,prohibited},state={questions},before=structuredClone(raw),prior=previousHint(raw,evidence,state),hint=clarificationFor(raw,evidence,state);
  assert.deepEqual(raw,before);assert.deepEqual(state,{questions});
  if(prior==='purpose'){assert.equal(hint,'requested_action');changed++;}else assert.equal(hint,prior);checks++;
 }
 assert.equal(clarificationFor({...base,context:'missing'},evidence,{questions:0}),'requested_action');
 assert.equal(clarificationFor({...base,identity:'missing'},evidence,{questions:0}),'identity');
 assert.equal(clarificationFor({...base,context:'missing',contactInitiator:'recipient_elsewhere'},evidence,{questions:0}),undefined);
 assert.equal(clarificationFor({...base,transaction:'unexplained_alert'},evidence,{questions:0}),undefined);
 assert.equal(clarificationFor({...base,recordingMode:'current',recordingCue:evidence},evidence,{questions:0}),undefined);
 assert.equal(clarificationFor({...base,refersToCall:true},evidence,{questions:0,caution:true}),undefined);checks+=6;
 assert.ok(changed>0);console.log(JSON.stringify({passed:true,checks,changed,scope:'Known-identity purpose clarifications ask for the caller request; identity hints and all terminal routes unchanged. No inference.'}));
}
