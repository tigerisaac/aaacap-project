// Separate a sensitive topic from whether its requested action is explained.
// This implements the existing clarification policy as an explicit observation.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {factsSchema as previousSchema,instructions as previousInstructions,interpretFacts as previousInterpret,observeFacts as previousObserve,selfTest as previousTest} from './observed-screening-v127.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v128-experiment';
export const argumentFeedback=true;
let text=previousInstructions;
for(const [from,to] of [
 ['An unsolicited unexpected-charge or unauthorized-purchase announcement about her account is charge_alarm, even without a demand. A bare charge announcement without expected-purchase or agreed-service context counts.', 'An unsolicited announcement of an unexpected, unauthorized or unconfirmed purchase/debit on her account is charge_alarm, whether attempted or completed, even without a demand. A bare charge announcement without expected-purchase or agreed-service context counts.'],
 ['Other live account-security, official or third-party emergency claims need their intended action clarified; a problem description or reassurance is insufficient. Practical help or direction to a channel she already has can resolve it.', 'For other account-security, official or third-party emergency claims, record claimAction separately from the topic. A problem description, reassurance or wish to speak leaves the action unresolved. A stated practical purpose, informative care update or direction to her established channel resolves it; the underlying problem need not be resolved. Restricted requests and charge alarms still block.'],
]){assert.ok(text.includes(from),'v128_source_mismatch');text=text.replace(from,to);}
export const instructions=text;
export const factsSchema=previousSchema.extend({
 context:previousSchema.shape.context.describe('Personal_caller: this caller states their own personal relationship with the recipient; a name alone is insufficient. Ordinary_task: concrete existing service, transaction, requested result or practical update. Substantive_claim: another account-security, official or third-party emergency claim; use claimAction to record whether its intended action is explained. Promotion: a pitch without independent ordinary work. Missing: a role, vague/private subject or prior inquiry without its task. Never infer a task from identity.'),
 claimAction:z.enum(['unresolved','ordinary','not_applicable']).describe('For substantive_claim: ordinary only if the caller states a practical purpose, informative care update or use of her established channel; merely describing a problem or wanting to speak is unresolved. Other contexts: not_applicable. This never exempts restricted conduct.'),
}).strict();
function normalized(raw){const p=factsSchema.safeParse(raw);if(!p.success)return;const {claimAction,...f}=p.data;return {...f,context:f.context==='substantive_claim'&&claimAction==='ordinary'?'ordinary_task':f.context};}
export function interpretFacts(raw,transcript,state,options){return previousInterpret(normalized(raw),transcript,state,options);}
export function observeFacts(raw,transcript){const p=factsSchema.safeParse(raw);if(!p.success)return {invalidFacts:true};const result=previousObserve(normalized(raw),transcript);return {...result,facts:{...result.facts,context:p.data.context,claimAction:p.data.claimAction}};}
export function observedScreeningRequest(base){const request=structuredClone(base);request.instructions=instructions;const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);return request;}
export function selfTest(){previousTest();const evidence='Synthetic continuous evidence.',base={who:true,context:'substantive_claim',claimAction:'ordinary',separateContact:false,prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'other',evidence};let checks=0;
 for(const claimAction of factsSchema.shape.claimAction.options)for(const context of factsSchema.shape.context.options)for(const prohibited of factsSchema.shape.prohibited.options.filter(x=>x!=='none')){assert.equal(interpretFacts({...base,claimAction,context,prohibited},evidence,{questions:1}).action,'block');checks++;}
 for(const questions of [0,1,2]){assert.equal(interpretFacts(base,evidence,{questions}).action,'approve');assert.equal(interpretFacts({...base,refersToCall:true},evidence,{questions},{caution:true}).action,'hold');assert.equal(interpretFacts({...base,recordingMode:'current',recordingCue:evidence},evidence,{questions}).action,'message');checks+=3;}
 assert.equal(interpretFacts({...base,claimAction:'unresolved'},evidence,{questions:0}).action,'continue');
 assert.equal(interpretFacts({...base,claimAction:'unresolved'},evidence,{questions:1}).action,'hold');
 assert.equal(interpretFacts({...base,context:'missing',separateContact:true},evidence,{questions:0}).action,'block');
 assert.equal(interpretFacts({...base,recordingMode:'current',recordingCue:''},evidence,{questions:0}),undefined);
 assert.equal(interpretFacts({...base,claimAction:'inferred'},evidence,{questions:0}),undefined);checks+=5;
 const observed=observeFacts(base,evidence);assert.equal(observed.facts.context,'substantive_claim');assert.equal(observed.facts.claimAction,'ordinary');assert.ok(!JSON.stringify(observed).includes(evidence));checks+=3;
 console.log(JSON.stringify({passed:true,checks,scope:'Resolved-action routing, restrictions and charges dominate, caution, notice grounding, missing-purpose protection and redacted observations; no inference.'}));
}
