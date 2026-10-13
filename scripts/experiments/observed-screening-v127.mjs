// Isolate functional contact recognition from charge priority. No case examples.
import {z} from 'zod';
import {factsSchema as previousSchema,instructions} from './observed-screening-v126.mjs';
export {instructions,interpretFacts,observeFacts,selfTest,argumentFeedback} from './observed-screening-v126.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v127-experiment';
export const factsSchema=previousSchema.extend({
 separateContact:previousSchema.shape.separateContact.describe('Asks her to initiate or continue communication outside this incoming call, by any medium, including joining or accepting contact. Record independently of purpose: ordinary callbacks also count. Merely asking to speak on this call is false.'),
}).strict();
export function observedScreeningRequest(base){const request=structuredClone(base);request.instructions=instructions;const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);return request;}
