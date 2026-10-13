// Separate transaction context from prohibited requests: a charge alarm does
// not need a demand. Based only on known development, not validation outcomes.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {factsSchema as previousSchema,instructions as previousInstructions,interpretFacts as previousInterpret,observeFacts as previousObserve,selfTest as previousTest} from './observed-screening-v131.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v132-experiment';
export const argumentFeedback=true;
let text=previousInstructions;
for(const [from,to] of [
 ['An unsolicited announcement of an unexpected, unauthorized or unconfirmed purchase/debit on her account is charge_alarm, whether attempted or completed, even without a demand. A bare charge announcement without expected-purchase or agreed-service context counts. Ordinary receipts, completed refunds, warnings about another caller and a personal caller reporting their own trouble do not.', 'Record transaction context independently of requested conduct. An unsolicited purchase/debit alert without expected-transaction context is unexplained_alert, including an authorization check or attempted transaction. It stops even when informative or directing her to her established channel. Expected receipts, completed refunds and agreed-service billing are ordinary_update. A report about another caller or the personal caller’s own money is not an alert about her transaction.'],
 ['Restricted requests and charge alarms still block.', 'Restricted requests and unexplained transaction alerts still block.'],
 ['Charge alarms block before notice saving.', 'Unexplained transaction alerts block before notice saving.'],
]){assert.ok(text.includes(from),'v132_source_mismatch');text=text.replace(from,to);}
export const instructions=text;
const suffix=' Charge_alarm: an unsolicited unexpected, unauthorized or unconfirmed purchase/debit announcement, attempted or completed, without expected-transaction context. No requested action is needed.';
assert.ok(previousSchema.shape.prohibited.description.endsWith(suffix),'v132_schema_source_mismatch');
export const factsSchema=previousSchema.extend({
 prohibited:z.enum(previousSchema.shape.prohibited.options.filter(x=>x!=='charge_alarm')).describe(previousSchema.shape.prohibited.description.slice(0,-suffix.length)),
 transaction:z.enum(['unexplained_alert','ordinary_update','none']).describe('This caller’s current statement about a purchase/debit on her account: unexplained_alert for an unexpected, unauthorized or unconfirmed transaction, including asking if she authorized it; ordinary_update for expected purchases, receipts, completed refunds or agreed-service billing; none otherwise. A personal caller reporting their own trouble or warning about another caller is none. Classify independently of requests, recording mode and supplied or established contact channels.'),
}).strict();
function normalized(raw){const p=factsSchema.safeParse(raw);if(!p.success)return;const {transaction,...facts}=p.data;return {...facts,prohibited:transaction==='unexplained_alert'?'charge_alarm':facts.prohibited};}
export function interpretFacts(raw,transcript,state,options){return previousInterpret(normalized(raw),transcript,state,options);}
export function observeFacts(raw,transcript){const p=factsSchema.safeParse(raw);if(!p.success)return {invalidFacts:true};const observed=previousObserve(normalized(raw),transcript);return {...observed,facts:{...observed.facts,prohibited:p.data.prohibited,transaction:p.data.transaction}};}
export function observedScreeningRequest(base){const request=structuredClone(base);request.instructions=instructions;const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);return request;}
export function selfTest(){previousTest();const evidence='Synthetic continuous evidence.',base={who:true,context:'ordinary_task',claimAction:'ordinary',transaction:'none',separateContact:false,prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'other',evidence};let checks=0;
 for(const context of factsSchema.shape.context.options)for(const claimAction of factsSchema.shape.claimAction.options)for(const recordingMode of factsSchema.shape.recordingMode.options)for(const questions of [0,1,2]){assert.equal(interpretFacts({...base,context,claimAction,transaction:'unexplained_alert',recordingMode,recordingCue:recordingMode==='current'?evidence:'',refersToCall:true},evidence,{questions},{caution:true}).action,'block');checks++;}
 for(const transaction of ['none','ordinary_update'])for(const context of factsSchema.shape.context.options)for(const prohibited of factsSchema.shape.prohibited.options){const raw={...base,transaction,context,prohibited},{transaction:unused,...prior}=raw;assert.deepEqual(interpretFacts(raw,evidence,{questions:1}),previousInterpret(prior,evidence,{questions:1}));checks++;}
 for(const prohibited of factsSchema.shape.prohibited.options.filter(x=>x!=='none'))for(const transaction of factsSchema.shape.transaction.options){assert.equal(interpretFacts({...base,transaction,prohibited},evidence,{questions:0}).action,'block');checks++;}
 assert.equal(interpretFacts({...base,prohibited:'charge_alarm'},evidence,{questions:0}),undefined);assert.equal(interpretFacts({...base,transaction:'inferred'},evidence,{questions:0}),undefined);assert.equal(interpretFacts({...base,transaction:undefined},evidence,{questions:0}),undefined);checks+=3;
 const observed=observeFacts({...base,transaction:'unexplained_alert'},evidence);assert.equal(observed.facts.transaction,'unexplained_alert');assert.equal(observed.facts.prohibited,'none');assert.ok(!JSON.stringify(observed).includes(evidence));checks+=3;
 console.log(JSON.stringify({passed:true,checks,scope:'Independent transaction priority, unchanged ordinary mapping, restricted conduct precedence, strict schema, caution/budgets and redacted facts; no inference.'}));
}
