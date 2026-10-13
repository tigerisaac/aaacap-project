// Single-pass charge-only experiment. Retain v111 contact handling and grounded
// recording cues. The owner requires charge alarms to stop before notice saving.
// Developed from existing development controls; no public/held-out examples.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {factsSchema as baseSchema,instructions as previousInstructions,interpretFacts as baseInterpret,observeFacts as baseObserve,selfTest as baseTest} from './observed-screening-v111.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v126-experiment';
export const argumentFeedback=true;
export const instructions=previousInstructions
 .replace('An unexplained live financial/account alarm, official claim or third-party emergency needs its intended action clarified;', 'An unsolicited unexpected-charge or unauthorized-purchase announcement about her account is charge_alarm, even without a demand. A bare charge announcement without expected-purchase or agreed-service context counts. Ordinary receipts, completed refunds, warnings about another caller and a personal caller reporting their own trouble do not. Other live account-security, official or third-party emergency claims need their intended action clarified;')
 .replace('A keypress, supplied callback, urgency or account alarm alone is not restricted conduct.', 'A keypress, supplied callback or urgency alone is not restricted conduct. Charge alarms block before notice saving.');
export const factsSchema=baseSchema.extend({
 context:baseSchema.shape.context.describe(baseSchema.shape.context.description.replace('an unexplained financial/account alarm','another account-security alarm')),
 prohibited:z.enum([...baseSchema.shape.prohibited.options.filter(x=>x!=='none'),'charge_alarm','none']).describe(`${baseSchema.shape.prohibited.description} Charge_alarm: this caller announces an unexpected charge or purchase on her account, as defined above.`),
}).strict();
function normalized(raw){const parsed=factsSchema.safeParse(raw);if(!parsed.success)return;return {...parsed.data,prohibited:parsed.data.prohibited==='charge_alarm'?'financial_bait':parsed.data.prohibited};}
export function interpretFacts(raw,transcript,state,options){return baseInterpret(normalized(raw),transcript,state,options);}
export function observeFacts(raw,transcript){const parsed=factsSchema.safeParse(raw);if(!parsed.success)return {invalidFacts:true};const observed=baseObserve(normalized(raw),transcript);return {...observed,facts:{...observed.facts,prohibited:parsed.data.prohibited}};}
export function observedScreeningRequest(base){const request=structuredClone(base);request.instructions=instructions;const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);return request;}
export function selfTest(){baseTest();const text='Synthetic continuous evidence.',base={who:true,context:'ordinary_task',separateContact:false,prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'other',evidence:text};let checks=0;
 for(const context of factsSchema.shape.context.options)for(const recordingMode of factsSchema.shape.recordingMode.options){const raw={...base,prohibited:'charge_alarm',context,recordingMode,recordingCue:recordingMode==='current'?text:''};assert.equal(interpretFacts(raw,text,{questions:0}).action,'block');assert.equal(observeFacts(raw,text).facts.prohibited,'charge_alarm');checks++;}
 for(const context of baseSchema.shape.context.options)for(const recordingMode of baseSchema.shape.recordingMode.options)for(const separateContact of [false,true]){const raw={...base,context,recordingMode,separateContact,recordingCue:recordingMode==='current'?text:''};assert.deepEqual(interpretFacts(raw,text,{questions:0}),baseInterpret(raw,text,{questions:0}));checks++;}
 assert.equal(interpretFacts({...base,prohibited:'empty_contact'},text,{questions:0}),undefined);assert.equal(interpretFacts({...base,recordingMode:'current',recordingCue:''},text,{questions:0}),undefined);checks+=2;
 console.log(JSON.stringify({passed:true,checks,scope:'Charge priority, exact unchanged non-charge mapping, invalid categories, recording evidence and content-free observations; no inference.'}));}
