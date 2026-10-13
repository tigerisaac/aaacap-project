// Narrow offline revision of v97. Existing-provider development reproduced a
// recorded promotion incorrectly saved as useful information. V100's larger
// rewrite introduced ordinary-call regressions, so retain v97's other rules.
// No public or held-out caller wording is used.
import {distilledScreeningRequest as previous} from './distilled-screening-v97.mjs';
export const SCREENING_POLICY_VERSION = '2026-10-13-distilled-v101-experiment';
export function distilledScreeningRequest(base) {
  const request = previous(base);
  const from = 'BLOCK unsolicited sales, marketing, surveys, political support or fundraising. A claimed customer relationship or vague prior inquiry is insufficient. A concrete existing-service task or response to her concrete request remains ordinary even with an additional offer; it must have a purpose independent of the promotion.';
  const to = 'Judge purpose before live/recorded routing. BLOCK unsolicited promotion, sales, surveys, political support or fundraising. A claimed customer relationship, account update or vague prior inquiry does not exempt an offer. Look for a concrete task independent of the promotion: existing service or a response to her specific request. If present, that service call remains ordinary even with an additional offer. Otherwise block the pitch, whether live or recorded, free or paid. A promotional recording is not a useful notice.';
  if (!request.instructions.includes(from)) throw new Error('v101_source_mismatch');
  request.instructions = request.instructions.replace(from, to);
  return request;
}
