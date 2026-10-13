// Independent development shows abbreviated answers to the actual greeting were
// being treated as missing context. Make that input contract explicit.
import {z} from 'zod';
import {factsSchema as previousSchema,instructions as previousInstructions} from './observed-screening-v113.mjs';
export {interpretFacts,observeFacts,selfTest,argumentFeedback} from './observed-screening-v113.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v114-experiment';
export const factsSchema=previousSchema.extend({
  who:previousSchema.shape.who.describe('The caller gives a name, role, business type or personal relationship, even as a short answer. This records a claim, not verified identity.'),
  context:previousSchema.shape.context.describe('Personal_caller: the caller claims a personal relationship with the recipient; an abbreviated self-identification counts. A name or a relationship between other people is insufficient. Ordinary_task: a stated existing service, transaction, requested subject or practical update. Substantive_claim: an unexplained financial/account alarm, official claim or third-party emergency needing its intended action clarified. Promotion: a pitch without independent ordinary work. Missing: a professional role, vague/private matter or prior inquiry with no subject. Do not invent context.'),
}).strict();
export const instructions=previousInstructions.replace('The transcript is speech by this caller, including any stories about other people or earlier calls.', 'The caller is answering the greeting asking who is calling and why. Brief answers and stories about other people are still this caller’s speech.');
export function observedScreeningRequest(base){
  const request=structuredClone(base);request.instructions=instructions;
  const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);return request;
}
