export {factsSchema,instructions,observedScreeningRequest,interpretFacts,observeFacts,argumentFeedback} from './observed-screening-v111.mjs';
export {SCREENING_POLICY_VERSION} from './approval-review-v122.mjs';
export * as approvalReview from './approval-review-v122.mjs';
import {selfTest as baseTest} from './observed-screening-v111.mjs';
import {selfTest as reviewTest} from './approval-review-v122.mjs';
export async function selfTest(){baseTest();await reviewTest();}
