// Clarify sufficiency of ordinary context, including the purpose of a callback.
// Based only on known development facts; public/held-out outcomes are not inputs.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {factsSchema as previousSchema,instructions as previousInstructions} from './observed-screening-v129.mjs';
export {interpretFacts,observeFacts,selfTest,argumentFeedback} from './observed-screening-v129.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v130-experiment';
const from='Concrete existing work, requested results and ordinary practical updates are ordinary even with an added offer.';
assert.ok(previousInstructions.includes(from),'v130_source_mismatch');
export const instructions=previousInstructions.replace(from,'A stated ordinary activity or result supplies the purpose, including what a callback or message will accomplish; its detailed subject need not be disclosed. Existing work remains ordinary with an added offer.');
export const factsSchema=previousSchema.extend({
 context:previousSchema.shape.context.describe('Personal_caller: this caller states a personal relationship with the recipient, supplying social context. Ordinary_task: an ordinary activity or result is stated, including the purpose of separate contact; full details are unnecessary. Substantive_claim: an account-security, official or third-party emergency claim; record its intended action in claimAction. Promotion: a pitch without independent ordinary work. Missing: no such context or purpose is stated; identity, a vague private matter or an unspecified inquiry alone is insufficient.'),
}).strict();
export function observedScreeningRequest(base){const request=structuredClone(base);request.instructions=instructions;const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);return request;}
