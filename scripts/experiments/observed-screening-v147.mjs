// Known development: an ordinary bill update was observed accurately while
// context was marked missing. Reuse that explicit purpose without new wording.
import assert from 'node:assert/strict';
import {permittedDecision} from '../../dist/live/policy.js';
import {factsSchema,interpretFacts as previousInterpret,observeFacts,selfTest as previousTest} from './observed-screening-v146.mjs';
export {factsSchema,instructions,observedScreeningRequest,argumentFeedback,observeFacts} from './observed-screening-v146.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v147-experiment';
export function interpretFacts(raw,transcript,state,options){
 const p=factsSchema.safeParse(raw);if(!p.success)return;
 const f=p.data;
 return previousInterpret(f.context==='missing'&&f.transaction==='ordinary_update'?{...f,context:'ordinary_task'}:f,transcript,state,options);
}
export function selfTest(){
 previousTest();
 const evidence='Independent ordinary financial update.',base={identity:'name_or_role',contactInitiator:'none',context:'missing',claimAction:'unresolved',transaction:'ordinary_update',prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'unknown',evidence};let checks=0,repairs=0;
 for(const identity of factsSchema.shape.identity.options)for(const context of factsSchema.shape.context.options)for(const contactInitiator of factsSchema.shape.contactInitiator.options)for(const transaction of factsSchema.shape.transaction.options)for(const prohibited of factsSchema.shape.prohibited.options)for(const questions of [0,2])for(const caution of [false,true]){
  const raw={...base,identity,context,contactInitiator,transaction,prohibited,refersToCall:true},before=previousInterpret(raw,evidence,{questions},{caution}),after=interpretFacts(raw,evidence,{questions},{caution});
  if(prohibited!=='none'||transaction==='unexplained_alert')assert.equal(after.action,'block');
  else if(context==='missing'&&transaction==='ordinary_update'){
   assert.equal(after.action,caution?'hold':identity!=='missing'?'approve':questions===2?'hold':'continue');
   if(before.action!==after.action)repairs++;
  }else assert.deepEqual(after,before);
  if(after)assert.ok(permittedDecision(after,evidence));checks++;
 }
 for(const contactInitiator of factsSchema.shape.contactInitiator.options){
  const raw={...base,contactInitiator,recordingMode:'current',recordingCue:evidence};assert.equal(interpretFacts(raw,evidence,{questions:0}).action,'message');
  assert.equal(interpretFacts({...raw,recordingCue:''},evidence,{questions:0}),undefined);checks+=2;
 }
 assert.equal(interpretFacts({...base,context:'substantive_claim'},evidence,{questions:0}).action,'continue');
 assert.equal(interpretFacts({...base,context:'promotion'},evidence,{questions:0}).action,'block');
 assert.equal(interpretFacts({...base,transaction:'none',contactInitiator:'recipient_elsewhere'},evidence,{questions:0}).action,'block');
 assert.equal(permittedDecision(interpretFacts(base,evidence,{questions:0}),'Unrelated speech.'),undefined);
 assert.equal(interpretFacts({...base,extra:true},evidence,{questions:0}),undefined);
 assert.equal(observeFacts(base,evidence).facts.context,'missing');checks+=6;
 assert.ok(repairs>0);console.log(JSON.stringify({passed:true,checks,repairs,scope:'Only missing context can use an observed ordinary financial event; identity, charges, restricted conduct, unresolved claims, notices, caution and evidence remain enforced. Raw observations unchanged. No inference.'}));
}
