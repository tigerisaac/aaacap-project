// The recording contract accepts actual playback/menu operation without needing
// a literal self-label, while preserving current-call attribution and grounding.
import {z} from 'zod';
import {factsSchema as previousSchema,instructions as previousInstructions} from './observed-screening-v106.mjs';
export {interpretFacts,observeFacts,selfTest} from './observed-screening-v106.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v107-experiment';
export const factsSchema=previousSchema.extend({
  recordingCue:z.string().max(160).describe('Copy a short exact quote identifying current automation or operating a playback/keypad menu, including options to replay information. No literal recording label is needed. Otherwise empty: informative style and references to other or earlier recordings are not cues.'),
}).strict();
export const instructions=previousInstructions.replace('Mark recording only from evidence about this call, not a complete informative statement or a story about another recording.','Self-identified automation or operating a playback/keypad menu establishes recording. Judge this call, not an informative style or a story about another recording.');
export function observedScreeningRequest(base){
  const request=structuredClone(base);request.instructions=instructions;
  const tool=request.tools.find(t=>t.name==='screen_call');tool.description='Record caller context and requested conduct. The application returns whether to ask a missing detail or finish screening.';tool.parameters=z.toJSONSchema(factsSchema);return request;
}
