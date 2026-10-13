// Same initial request and mapper as v110. Only schema-aware corrective tool
// feedback changes; its version is recorded separately in transport metadata.
export {factsSchema,instructions,observedScreeningRequest,interpretFacts,observeFacts,selfTest} from './observed-screening-v110.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v111-experiment';
export const argumentFeedback=true;
