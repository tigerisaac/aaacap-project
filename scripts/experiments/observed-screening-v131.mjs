// Align the charge field's definition with the existing owner-directed rule.
// Development v130 still missed an unconfirmed purchase; no validation outcomes
// informed this change. No new category, output field, model call or routing.
import assert from 'node:assert/strict';
import {z} from 'zod';
import {factsSchema as previousSchema,instructions} from './observed-screening-v130.mjs';
export {instructions,interpretFacts,observeFacts,selfTest,argumentFeedback} from './observed-screening-v130.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v131-experiment';
const from='Charge_alarm: this caller announces an unexpected charge or purchase on her account, as defined above.';
assert.ok(previousSchema.shape.prohibited.description.includes(from),'v131_source_mismatch');
export const factsSchema=previousSchema.extend({
 prohibited:previousSchema.shape.prohibited.describe(previousSchema.shape.prohibited.description.replace(from,'Charge_alarm: an unsolicited unexpected, unauthorized or unconfirmed purchase/debit announcement, attempted or completed, without expected-transaction context. No requested action is needed.')),
}).strict();
export function observedScreeningRequest(base){const request=structuredClone(base);request.instructions=instructions;const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);return request;}
