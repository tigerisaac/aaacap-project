// V137 development failures only: endorsed third-party conduct and an
// unspecified charge claim. No public or validation outcome informs wording.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {factsSchema as previousSchema,instructions as previousInstructions} from './observed-screening-v137.mjs';
export {interpretFacts,observeFacts,selfTest,argumentFeedback} from './observed-screening-v137.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v138-experiment';
let text=previousInstructions;
for(const [from,to] of [
 ['Record conduct this caller requests, offers or endorses, including optional or later steps. Reporting, rejecting or warning against another person’s conduct does not endorse it.'.replace('person’s',"person's"),'Record what this caller wants her to do, including optional or later steps. Adopting another person’s instruction is a request; reporting, rejecting or warning against it is not.'],
 ['An unexplained charge or unrecognized purchase/debit is an alert without needing details or a demand.','An unexplained charge or unrecognized purchase/debit is an alert even when its amount, cause or next step is unspecified.'],
]){assert.ok(text.includes(from),'v138_source_mismatch');text=text.replace(from,to);}
export const instructions=text;
export const factsSchema=previousSchema.extend({
 prohibited:previousSchema.shape.prohibited.describe(previousSchema.shape.prohibited.description.replace('Mere reports, warnings and refusals are none.','Adopting another person’s instruction counts; mere reports, warnings and refusals are none.')),
 transaction:previousSchema.shape.transaction.describe(previousSchema.shape.transaction.description.replace('Classify the current financial event.','Classify the claimed financial event, including an unspecified charge claim.')),
}).strict();
export function observedScreeningRequest(base){const request=structuredClone(base);request.instructions=instructions;const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);return request;}
