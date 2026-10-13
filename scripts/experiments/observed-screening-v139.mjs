// Repair the fact-mapper/decision-validator contract without changing the model
// request or action priority. Known ordinary context supplies a display purpose.
import assert from 'node:assert/strict';
import {permittedDecision} from '../../dist/live/policy.js';
import {factsSchema,interpretFacts as previousInterpret,observeFacts,selfTest as previousTest} from './observed-screening-v138.mjs';
export {factsSchema,observedScreeningRequest,instructions,observeFacts,argumentFeedback} from './observed-screening-v138.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v139-experiment';
export function interpretFacts(raw,transcript,state,options){
 const decision=previousInterpret(raw,transcript,state,options);
 if(decision?.action!=='approve'||decision.purpose!=='unknown')return decision;
 return {...decision,purpose:raw.context==='personal_caller'?'personal':'other'};
}
export function selfTest(){
 previousTest();
 const evidence='Synthetic caller evidence for contract verification.',base={who:true,context:'ordinary_task',claimAction:'ordinary',transaction:'none',contact:'none',prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'unknown',evidence};let checks=0,repairs=0;
 for(const context of factsSchema.shape.context.options)for(const claimAction of factsSchema.shape.claimAction.options)for(const transaction of factsSchema.shape.transaction.options)for(const prohibited of factsSchema.shape.prohibited.options)for(const recordingMode of factsSchema.shape.recordingMode.options)for(const who of [false,true])for(const caution of [false,true])for(const questions of [0,1,2]){
  const raw={...base,context,claimAction,transaction,prohibited,recordingMode,recordingCue:recordingMode==='current'?evidence:'',who,refersToCall:true},state={questions},before=previousInterpret(raw,evidence,state,{caution}),after=interpretFacts(raw,evidence,state,{caution});
  assert.ok(before&&after);assert.deepEqual({...after,purpose:before.purpose},before);
  assert.ok(permittedDecision(after,evidence),'every grounded mapped action must satisfy the decision contract');
  if(before.action==='approve'){assert.equal(permittedDecision(before,evidence),undefined);assert.notEqual(after.purpose,'unknown');repairs++;}else assert.deepEqual(after,before);
  checks++;
 }
 for(const purpose of factsSchema.shape.purpose.options.filter(p=>p!=='unknown'))for(const context of factsSchema.shape.context.options){const raw={...base,context,purpose};assert.deepEqual(interpretFacts(raw,evidence,{questions:0}),previousInterpret(raw,evidence,{questions:0}));checks++;}
 for(const contact of factsSchema.shape.contact.options)for(const refuses of [false,true])for(const context of ['missing','substantive_claim'])for(const claimAction of factsSchema.shape.claimAction.options){const raw={...base,context,claimAction,contact,refuses};const before=previousInterpret(raw,evidence,{questions:1}),after=interpretFacts(raw,evidence,{questions:1});assert.equal(after.action,before.action);checks++;}
 for(const context of ['personal_caller','ordinary_task','substantive_claim']){const raw={...base,context},d=interpretFacts(raw,evidence,{questions:0});assert.equal(permittedDecision(d,'Unrelated evidence.'),undefined);assert.equal(interpretFacts({...raw,extra:true},evidence,{questions:0}),undefined);assert.equal(interpretFacts({...raw,recordingMode:'current',recordingCue:''},evidence,{questions:0}),undefined);checks+=3;}
 const observed=observeFacts({...base,context:'personal_caller'},evidence);assert.equal(observed.facts.purpose,'unknown');assert.ok(!JSON.stringify(observed).includes(evidence));checks+=2;
 assert.ok(repairs>0);console.log(JSON.stringify({passed:true,checks,repairs,scope:'Grounded mapper outputs meet the production validator; action/priority/evidence/caution/budgets unchanged; original observations retained. No inference.'}));
}
