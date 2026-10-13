// Known development misses: an informative purpose is not a missing action;
// personal context and a practical answer must not be overwritten by "missing".
// No public or held-out case wording informs these category definitions.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {factsSchema as previousSchema,instructions as previousInstructions} from './observed-screening-v139.mjs';
export {interpretFacts,observeFacts,selfTest,argumentFeedback} from './observed-screening-v139.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v140-experiment';
let text=previousInstructions;
for(const [from,to] of [
 ['An ordinary activity or result supplies purpose, including what a callback will accomplish; full private details are unnecessary.','An ordinary activity, result, warning or practical help supplies purpose, even without asking her to act. A callback needs its subject, not full private details.'],
 ['Record what this caller wants her to do, including optional or later steps.','For restricted conduct, record this caller’s requests, offers and optional or later steps.'],
]){assert.ok(text.includes(from),'v140_source_mismatch');text=text.replace(from,to);}
export const instructions=text;
export const factsSchema=previousSchema.extend({
 context:previousSchema.shape.context.describe('Personal_caller: this caller states their own personal relationship; social contact or private conversation supplies context. Ordinary_task: a stated ordinary activity, result, warning or practical help, including information requiring no action. Substantive_claim: a refund/money-owed, account-security, official or third-party emergency claim; claimAction records whether its intended action is explained. Promotion: a pitch without independent ordinary work. Missing: no independent purpose or personal relationship; a name, professional role or unspecified inquiry alone is insufficient. Use all caller turns, including a practical answer to clarification.'),
}).strict();
export function observedScreeningRequest(base){const request=structuredClone(base);request.instructions=instructions;const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);return request;}
