// Remove the inapplicable state: sensitive topics always get an intent judgment.
// Developed from the known development schema inconsistency, not held-out text.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {factsSchema as previousSchema,instructions,interpretFacts as previousInterpret,observeFacts as previousObserve,selfTest as previousTest} from './observed-screening-v128.mjs';
export {instructions};
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v129-experiment';
export const argumentFeedback=true;
export const factsSchema=previousSchema.extend({
 claimAction:z.enum(['unresolved','ordinary']).describe('Ordinary only when the caller states a practical purpose, informative care update or use of her established channel; otherwise unresolved. A problem description or wish to speak alone is unresolved. This field affects only substantive_claim and never exempts restricted conduct.'),
}).strict();
export function interpretFacts(raw,transcript,state,options){const p=factsSchema.safeParse(raw);return previousInterpret(p.success?p.data:undefined,transcript,state,options);}
export function observeFacts(raw,transcript){const p=factsSchema.safeParse(raw);return p.success?previousObserve(p.data,transcript):{invalidFacts:true};}
export function observedScreeningRequest(base){const request=structuredClone(base);request.instructions=instructions;const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);return request;}
export function selfTest(){previousTest();const evidence='Synthetic continuous evidence.',base={who:true,context:'substantive_claim',claimAction:'ordinary',separateContact:false,prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'other',evidence};let checks=0;
 for(const context of factsSchema.shape.context.options)for(const claimAction of factsSchema.shape.claimAction.options)for(const prohibited of factsSchema.shape.prohibited.options)for(const questions of [0,1,2]){const raw={...base,context,claimAction,prohibited};assert.deepEqual(interpretFacts(raw,evidence,{questions}),previousInterpret(raw,evidence,{questions}));checks++;}
 for(const context of factsSchema.shape.context.options){assert.equal(interpretFacts({...base,context,claimAction:'not_applicable'},evidence,{questions:0}),undefined);checks++;}
 assert.equal(interpretFacts({...base,claimAction:'unresolved'},evidence,{questions:0}).action,'continue');
 assert.equal(interpretFacts(base,evidence,{questions:1}).action,'approve');
 assert.equal(interpretFacts({...base,prohibited:'charge_alarm'},evidence,{questions:1}).action,'block');checks+=3;
 console.log(JSON.stringify({passed:true,checks,scope:'Two-state intent schema; unchanged mapping for every retained context/action/restriction combination, question budgets and charge priority; no inference.'}));
}
