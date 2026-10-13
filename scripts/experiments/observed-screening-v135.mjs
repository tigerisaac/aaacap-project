// Development-only clarification of refund topics and contact destinations.
// No public or validation case wording; retain v132's transaction priority.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {factsSchema as previousSchema,instructions as previousInstructions,interpretFacts as previousInterpret,observeFacts as previousObserve,selfTest as previousTest} from './observed-screening-v132.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v135-experiment';
export const argumentFeedback=true;
let text=previousInstructions;
for(const [from,to] of [
 ['unsolicited investment pitches, money-winning/recovery offers without a concrete transaction or her request', 'unsolicited winnings, investment or loss-recovery opportunities'],
 ['Expected receipts, completed refunds, existing-service billing and practical care updates are ordinary. ', 'Practical care updates are ordinary. '],
 ['For other account-security, official or third-party emergency claims,', 'For refund/money-owed, other account-security, official or third-party emergency claims,'],
 ['A problem description, reassurance or wish to speak leaves the action unresolved.', 'A topic alone leaves the action unresolved; mentioning a refund is not itself a winnings or recovery offer.'],
 ['Record separate contact independently: another call/chat, contact addition or site visit differs from speaking on this incoming call. Ordinary callbacks and substantive unresolved claims have context; an empty invitation does not.', 'Record the requested contact destination independently of context. Asking her to establish, join or resume contact beyond this incoming call is elsewhere, regardless of medium. A contextual callback remains ordinary; an invitation with no independent purpose does not gain context from the proposed contact itself.'],
]){assert.ok(text.includes(from),'v135_source_mismatch');text=text.replace(from,to);}
export const instructions=text;
const {separateContact:unused,...shape}=previousSchema.shape;
export const factsSchema=z.object({...shape,
 context:previousSchema.shape.context.describe(previousSchema.shape.context.description.replace('an account-security, official or third-party emergency claim','a refund/money-owed, account-security, official or third-party emergency claim')),
 contact:z.enum(['elsewhere','this_call','none']).describe('Where does this caller ask her to communicate? Elsewhere: take a step to establish, join or resume contact beyond this incoming call, by any medium. This_call: speak to the caller here. None: no request to communicate. Classify the requested contact even if its purpose or identity is missing; ordinary callbacks also use elsewhere.'),
}).strict();
function normalized(raw){const p=factsSchema.safeParse(raw);if(!p.success)return;const {contact,...facts}=p.data;return {...facts,separateContact:contact==='elsewhere'};}
export function interpretFacts(raw,transcript,state,options){return previousInterpret(normalized(raw),transcript,state,options);}
export function observeFacts(raw,transcript){const p=factsSchema.safeParse(raw);if(!p.success)return {invalidFacts:true};const observed=previousObserve(normalized(raw),transcript),{separateContact:unused,...facts}=observed.facts;return {...observed,facts:{...facts,contact:p.data.contact}};}
export function observedScreeningRequest(base){const request=structuredClone(base);request.instructions=instructions;const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);return request;}
export function selfTest(){previousTest();const evidence='Synthetic continuous evidence.',base={who:true,context:'ordinary_task',claimAction:'ordinary',transaction:'none',contact:'none',prohibited:'none',recordingMode:'not_indicated',recordingCue:'',refuses:false,refersToCall:false,purpose:'other',evidence};let checks=0;
 for(const contact of factsSchema.shape.contact.options)for(const context of factsSchema.shape.context.options)for(const prohibited of factsSchema.shape.prohibited.options)for(const questions of [0,2]){const raw={...base,contact,context,prohibited};assert.deepEqual(interpretFacts(raw,evidence,{questions}),previousInterpret(normalized(raw),evidence,{questions}));checks++;}
 assert.equal(interpretFacts({...base,contact:undefined},evidence,{questions:0}),undefined);assert.equal(interpretFacts({...base,separateContact:true},evidence,{questions:0}),undefined);checks+=2;
 const observed=observeFacts({...base,contact:'elsewhere'},evidence);assert.equal(observed.facts.contact,'elsewhere');assert.ok(!('separateContact' in observed.facts));assert.ok(!JSON.stringify(observed).includes(evidence));checks+=3;
 console.log(JSON.stringify({passed:true,checks,scope:'Contact destination maps identically to the existing priority rules; strict inputs and quote redaction; no inference.'}));
}
