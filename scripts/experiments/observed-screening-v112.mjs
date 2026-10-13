// General caller-versus-reported-conduct distinction, developed on independent
// argument-contract controls. Initial request changes; mapper priority does not.
import {z} from 'zod';
import {factsSchema as previousSchema,instructions as previousInstructions} from './observed-screening-v111.mjs';
export {interpretFacts,observeFacts,selfTest,argumentFeedback} from './observed-screening-v111.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v112-experiment';
export const factsSchema=previousSchema.extend({
  prohibited:previousSchema.shape.prohibited.describe('Classify what THIS caller asks the recipient to do, now or later. Use none for another person’s reported request, a warning, refusal or discussion. Endorsing an instruction for her to follow counts as requesting it. Optionality and claimed legitimacy do not exempt an actual request.'),
}).strict();
export const instructions=previousInstructions
  .replace('Use all caller turns without inventing hidden requests.', 'The transcript is speech by this caller, including any stories about other people or earlier calls. Use all turns without inventing hidden requests.')
  .replace('Record restricted conduct whenever requested, including optional offers and later steps:', 'Distinguish the caller’s requested action from events they describe. A report, warning or refusal is not a request; endorsing an instruction for her to follow is. Classify actual requests, including optional offers and later steps:')
  .replace('Reporting, warning against or refusing restricted conduct is not requesting it. ', '');
export function observedScreeningRequest(base){
  const request=structuredClone(base);request.instructions=instructions;
  const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);return request;
}
