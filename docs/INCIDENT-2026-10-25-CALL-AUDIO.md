# October 25 — early voicemail fallback after the greeting

## Approved deployment — October 25, 18:29 Central

The owner explicitly approved deploying the fixes. At **18:29:32 Central**, bridge **`shield-live-greeting-f753bf8`** was verified ready at **100% traffic**, reporting hybrid orchestration **v3**, unchanged screening policy **v158**, the existing startup protocol, acknowledgement, 10 sessions per instance and pilot limits. Its pinned image is `ad026eed55f67ea1a76bdd75e6c178b2a75dc8046a8ae89692c235bf04bb0b59`.

The release changes exactly `lib/live/hybrid.js` and `lib/live/hybrid-gate.js` on the prior production image. It includes the greeting response-window correction below and the previously source-only v2 fixes for short settled utterances and buffered silence incorrectly invalidating a decision. Cloud Build `d222d2da-1bfb-43f8-876b-6e3f7a89bee6` passed all seven steps: base/candidate snapshots, image build, an exhaustive file/dependency comparison, startup in both modes, and the timer regression against the actual image. All other application/dependency files and the lockfile were preserved.

The new revision first passed readiness at zero customer traffic. Promotion rechecked readiness and zero active-call reservations. Service settings, runtime secret references and IAM bindings remain unchanged. Recording ingestion remains on `ingestforwardingvoicemail-00012-cab`, preserving the earlier runtime-version-10 storage repair. No Functions, Hosting, carrier settings, phone calls, manual workers or paid model tests were changed or invoked by this release.

At 18:29:54, the complete new-revision log query since staging returned zero ERROR entries or acknowledgement/refusal/hangup failure events. An initial read-only log request returned a transient API 500; the retry succeeded. This bounded startup observation does not establish successful screening of a subsequent call.

This verifies deployment and infrastructure readiness, **not the caller's real-phone audio experience or the separate Live clarification failure**. No synthetic paid-provider approval was inferred from deployment approval. The prior revision remains available for rollback by routing traffic back to `shield-live-retry-352ba27e0a07`. Deployment/build receipts are in `artifacts/private/call-audio-oct25/`.

## Observations

The owner reported that the caller heard multiple lines, then separately reported silence followed by voicemail. Inspection used content-free call state, command receipts and timing logs only. No real audio, transcript, private phone number or signed URL was printed or used in evaluation.

- **18:14–18:15 Central:** two calls ended as `screening_unavailable`. The later call completed its greeting, played the single wait acknowledgement, started a Live clarification session, and failed about 640 ms after model readiness. No audible assistant-output timing event preceded that failure. Durable commands contained one greeting and one voicemail command, with no backup or duplicate phase commands. The available logs do not identify the underlying Live failure or prove what was heard on the handset.
- **18:20 Central:** recognition became ready at 18:20:15.292; the greeting-completion receipt was recorded at 18:20:24.394. Screening terminated at 18:20:25.544, about **1.15 seconds after greeting completion**, and saved `screening_unavailable` before the voicemail fallback. There were no transcript or assessment events. This was a technical fallback, not a scam verdict or successful screening. The logs cannot determine whether pre-greeting noise, a recognition failure or another transport failure caused this individual termination.
- Public greeting and voicemail WAV files match the approved manifest hashes. The bridge remains `shield-live-retry-352ba27e0a07`, with 100% traffic and image digest `aaf7e5f6fe7e7ea3d9675e7697d7a77332c5a4310ed1296692fd571772f21db7`. It reports hybrid orchestration v1. The earlier recording-origin repair is separate and did not change this bridge.

## Reproduced defect and source correction

A brief audible noise during the greeting sets `callerLastAt`, even if no words are recognized. The no-transcript timeout previously measured eight seconds from that noise. Greeting completion enabled the check without resetting its earliest allowed timeout, so an ordinary-length greeting could consume the entire response window. A healthy recognizer and a caller just beginning to answer could therefore receive `screening_unavailable` immediately after the greeting.

The no-transcript timeout now measures from the later of last audible caller input and the time listening begins. Recognition-health checks, the eight-second wait, overall 75-second limit, finalized-evidence checks and recipient press-1 acceptance remain. Screening prompt v158 is unchanged; the orchestration identifier becomes `soniox-luna-live-v3`.

Two new deterministic tests failed before the change and pass afterward: pre-greeting noise cannot consume the full response window, and an ordinary caller answering within that window is assessed normally. A separate offline replay against the frozen serving-baseline `hybrid.js` (SHA-256 `5bae27ce1732764a38bc064fde8ca5829037e5e2a8d9e01654e1588295eac500`) reproduces the immediate failure; the candidate remains listening one second after greeting completion. These are synthetic regression results, not proof of the cause of the owner's specific call.

## Preparation boundary, superseded by the deployment above

At preparation, the correction was source only. The owner subsequently approved deployment as recorded above, but has not answered the request for up to two synthetic provider checks with a total $0.25 ceiling. The unexecuted probe uses made-up text and codec silence, with no phone call, Telnyx operation, Firestore write or real recording.

The offline two-file bridge overlay was prepared on the exact serving image, with all other files, policies, dependencies and runtime configuration inherited unchanged. Its subsequent build verification, approval and deployment are recorded above. The separate Live clarification failure remains unresolved and must not be described as fixed by the greeting timer change.

`npm run check` passes typechecking, 401 unit tests and build; the focused hybrid suite passes 25 tests. The required Firestore suite passes all 326 tests on isolated ports. Test totals include concurrent subscription changes, which are excluded from the bridge overlay. Private, content-free evidence and the unexecuted provider probe are in `artifacts/private/call-audio-oct25/`.
