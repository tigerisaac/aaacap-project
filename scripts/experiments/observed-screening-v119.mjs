// Same decision instructions, schema, mapper and correction as v111. The
// subscription wrapper supplies the application's existing opening context.
// This is an offline transport experiment, not a production policy change.
export {factsSchema,instructions,observedScreeningRequest,interpretFacts,observeFacts,selfTest,argumentFeedback} from './observed-screening-v111.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v119-experiment';
export const callerFraming='greeting';
