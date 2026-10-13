// Development-only repair: recognize contact migration by its function, rather
// than an enumeration of communication channels. Ordinary context stays separate.
import {z} from 'zod';
import {factsSchema as previousSchema,instructions as previousInstructions} from './observed-screening-v116.mjs';
export {interpretFacts,observeFacts,selfTest,argumentFeedback} from './observed-screening-v116.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v117-experiment';
export const factsSchema=previousSchema.extend({
  separateContact:previousSchema.shape.separateContact.describe('Invites her to start or continue contact outside this incoming call. Asking to speak on this call alone is false. Record this independently of its purpose.'),
}).strict();
export const instructions=previousInstructions.replace('Record separate contact independently: another call/chat, contact addition or site visit differs from speaking on this incoming call.', 'Record invitations to start or move contact outside this call independently of context.');
export function observedScreeningRequest(base){
  const request=structuredClone(base);request.instructions=instructions;
  const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);return request;
}
