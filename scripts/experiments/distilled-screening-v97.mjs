// Offline development revision of v96. Keep ordinary healthcare identity checks
// distinct from secrets, private discussion from isolation, and information from
// an inferred recording. No public or held-out caller wording is used.
import {distilledScreeningRequest as previous} from './distilled-screening-v96.mjs';
export const SCREENING_POLICY_VERSION = '2026-10-13-distilled-v97-experiment';
export function distilledScreeningRequest(base) {
  const request = previous(base);
  for (const [from, to] of [
    ['or hiding the interaction from trusted help.', 'or instructing her to conceal the interaction from family, advisers or authorities.'],
    ['Ordinary private conversation is not isolation.', 'Confidential discussion with her is ordinary privacy; it does not ask her to conceal the call.'],
    ['Basic healthcare demographics, routine contact/delivery details and bringing documents to a visit are ordinary; secrets and full financial/identity numbers remain prohibited.', ''],
    ['BLOCK harmful conduct regardless of context:', 'Basic demographics for existing healthcare, routine contact/delivery details and bringing documents to a visit are ordinary identity checks, not secrets or financial/government identity numbers.\n\nBLOCK harmful conduct regardless of context:'],
    ['After these checks, MESSAGE saves', 'Information alone does not establish a recording; default to live screening unless automation is stated or apparent. After the block checks, MESSAGE saves'],
  ]) {
    if (!request.instructions.includes(from)) throw new Error('v97_source_mismatch');
    request.instructions = request.instructions.replace(from, to);
  }
  return request;
}
