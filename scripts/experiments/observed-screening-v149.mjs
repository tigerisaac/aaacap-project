// Known development still loses abbreviated caller identities. Compare the
// application's existing opening context using v147 unchanged, not v148's
// broader descriptions. The v119 framing experiment used the older v111 schema.
export {factsSchema,instructions,observedScreeningRequest,interpretFacts,observeFacts,selfTest,argumentFeedback} from './observed-screening-v147.mjs';
export const SCREENING_POLICY_VERSION='2026-10-13-observed-v149-experiment';
export const callerFraming='greeting';
