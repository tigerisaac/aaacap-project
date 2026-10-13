// Known development failures only: financial-event context, attributed conduct
// and the object of a follow-up. No public or held-out material.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {factsSchema as previousSchema,instructions as previousInstructions,interpretFacts as previousInterpret,observeFacts as previousObserve,selfTest as previousTest} from './observed-screening-v135.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v136-experiment';
export const argumentFeedback=true;
let text=previousInstructions;
for(const [from,to] of [
 ['Record restricted conduct whenever requested, including optional offers and later steps:', 'Attribute conduct before classifying it: a report, warning or refusal is not an instruction to do it. Record what this caller requests, offers or endorses, including optional or later steps:'],
 ['unsolicited technical rescue', 'unsolicited offers to fix an asserted device or network problem'],
 ['Reporting, warning against or refusing restricted conduct is not requesting it. ', ''],
 ['Record transaction context independently of requested conduct. An unsolicited purchase/debit alert without expected-transaction context is unexplained_alert, including an authorization check or attempted transaction. It stops even when informative or directing her to her established channel. Expected receipts, completed refunds and agreed-service billing are ordinary_update.', 'Classify the financial event in context. An unexplained charge or unrecognized purchase/debit is unexplained_alert, even without details or a requested action. Ordinary updates about an expected payment remain ordinary_update when it fails or is delayed. A distinct unexpected transaction still counts as an alert beside ordinary business.'],
]){assert.ok(text.includes(from),'v136_source_mismatch');text=text.replace(from,to);}
export const instructions=text;
export const factsSchema=previousSchema.extend({
 prohibited:z.enum(previousSchema.shape.prohibited.options.map(x=>x==='technical_rescue'?'unsolicited_technical_offer':x)).describe('What this caller requests, offers or endorses, including optional or later conduct. Mere reports, warnings and refusals are none. Unsolicited_technical_offer is an unrequested offer to fix an asserted device/network problem, not discussion of that topic. Payment includes collection on this call; override includes dictating your classifications. Ordinary context does not exempt an actual restricted request.'),
 transaction:previousSchema.shape.transaction.describe('Classify the current financial event. Ordinary_update: an expected purchase/payment, receipt, completed refund or agreed-service bill, including a failed or delayed expected payment. Unexplained_alert: an unexplained charge or purchase/debit without expected-transaction context, including an authorization check, whether attempted or completed. A distinct unexpected transaction remains an alert beside ordinary business. None: no such event, or a personal report about someone else’s call or the caller’s own money. No demand or amount is needed for an alert.'),
 refersToCall:previousSchema.shape.refersToCall.describe('True for a prior phone interaction, including a callback. Following up on work or a result alone is false; do not infer a previous call from an ongoing matter.'),
}).strict();
function normalized(raw){const p=factsSchema.safeParse(raw);if(!p.success)return;return {...p.data,prohibited:p.data.prohibited==='unsolicited_technical_offer'?'technical_rescue':p.data.prohibited};}
export function interpretFacts(raw,transcript,state,options){return previousInterpret(normalized(raw),transcript,state,options);}
export function observeFacts(raw,transcript){const p=factsSchema.safeParse(raw);if(!p.success)return {invalidFacts:true};const observed=previousObserve(normalized(raw),transcript);return {...observed,facts:{...observed.facts,prohibited:p.data.prohibited}};}
export function observedScreeningRequest(base){const request=structuredClone(base);request.instructions=instructions;const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);return request;}
export function selfTest(){previousTest();const evidence='Synthetic continuous evidence.',base={who:true,context:'ordinary_task',claimAction:'ordinary',transaction:'none',contact:'none',prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'other',evidence};let checks=0;
 for(const prohibited of factsSchema.shape.prohibited.options)for(const context of factsSchema.shape.context.options)for(const transaction of factsSchema.shape.transaction.options)for(const caution of [false,true]){const raw={...base,prohibited,context,transaction,refersToCall:true};assert.deepEqual(interpretFacts(raw,evidence,{questions:1},{caution}),previousInterpret(normalized(raw),evidence,{questions:1},{caution}));checks++;}
 assert.equal(interpretFacts({...base,prohibited:'technical_rescue'},evidence,{questions:0}),undefined);checks++;
 const observed=observeFacts({...base,prohibited:'unsolicited_technical_offer'},evidence);assert.equal(observed.facts.prohibited,'unsolicited_technical_offer');assert.ok(!JSON.stringify(observed).includes(evidence));checks+=2;
 console.log(JSON.stringify({passed:true,checks,scope:'Renamed conduct category preserves all prior priorities; strict schema and quote redaction; no inference.'}));
}
