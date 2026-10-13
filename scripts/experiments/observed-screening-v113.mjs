// Same initial request and mapper as v112; rejected arguments now receive their
// declared constraints, including bounds omitted by the subscription transport.
export {factsSchema,instructions,observedScreeningRequest,interpretFacts,observeFacts,selfTest} from './observed-screening-v112.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v113-experiment';
export const argumentFeedback=2;
