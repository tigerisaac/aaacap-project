// Development follow-up to v97's informational-live and unresolved-claim misses.
// Align action/metadata semantics with the policy rather than add caller examples.
import {distilledScreeningRequest as previous} from './distilled-screening-v97.mjs';
export const SCREENING_POLICY_VERSION = '2026-10-13-distilled-v98-experiment';
export function distilledScreeningRequest(base) {
  const request = previous(base);
  const from = 'Information alone does not establish a recording; default to live screening unless automation is stated or apparent.';
  if (!request.instructions.includes(from)) throw new Error('v98_source_mismatch');
  request.instructions = request.instructions.replace(from, 'Use live screening unless the caller identifies a recording or presents a playback/keypad menu. Informative wording, lack of a question or nothing further to do does not establish automation.');
  const fields = request.tools.find(t => t.name === 'screen_call').parameters.properties;
  fields.action.description = 'Block an evidenced policy match; message only an identified recording/menu; approve a live ordinary purpose; continue to clarify missing context or an unresolved sensitive claim; hold after unsuccessful clarification.';
  fields.hasReason.description = 'Sufficient stated purpose under the policy: an ordinary task/service or personal relationship. An unresolved sensitive claim, vague topic, title or contact alone is insufficient.';
  return request;
}
