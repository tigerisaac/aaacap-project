# Warning-audio handoff rollout — October 17, 2026

The owner approved deployment after the corrected isolated browser test delivered the prerecorded warning. This release changes warning transport only. Screening/monitoring prompts, warning wording and recordings remain unchanged; it does not release the unqualified screening-latency experiments.

## Behavior and verification

A new intervention marks the call with warning version 2 and transactionally queues warning work plus its independent 30-second cleanup. The existing recipient leg moves into a private conference before caller teardown. The room is limited to one minute and two participants; playback requires an isolated, unheld, unmuted recipient plus a signed hangup receipt for the immutable caller. A rejected hangup is accepted only after explicit inactive provider readback. The warning uses the existing Soniox recording, without Polly. Failed or uncertain creation/playback is never replayed; both legs are ended. No new call leg is dialed.

Recipient binding is saved before room submission so signed conference callbacks do not depend on inherited client state. Matching connection, recipient and conference identities gate playback receipts; caller/recipient endings survive executor contention. The call slot remains reserved until recipient cleanup. Old interventions retain their versioned compatibility path during rollout.

The approved browser test lasted 45.454 seconds and captured all six sampled sections of the source recording in order. This is synthetic recipient evidence, not a physical-phone test. [Audio measurements and cost accounting](INCIDENT-2026-10-17-CALL-AUDIO.md). No additional paid test is part of this deployment; investigation estimate remains 14.301¢ including the conference allowance, not a final invoice or cloud deployment-cost reconciliation.

The final focused shared-call suite passed **67/67**, including new handoff, inactive-caller readback, callback binding, isolated participants, uncertain submission, duplicate suppression, deadline and ended-recipient checks. All four exact frozen function packages passed their emulator integration checks, including signed HTTP conference callbacks without client state for the API/call worker. Their target exports load. Final `npm run check` passed typecheck, **360 unit tests** and build. The full Firestore suite on an isolated emulator passed **266/267**; its only failure was the previously recorded stopped-history `INVALID_ARGUMENT: Transaction is invalid or closed`. All warning, monitoring and shared-call tests passed. The initial default-port run conflicted with another local emulator; the isolated run above is the completed full run. The first unit run lacked local socket permission; the final run passed with that permission. No unrelated history or operational code is part of the deployment. [Frozen package file hashes](evidence/warning-handoff-2026-10-17.json).

## Exact packages and order

Each package starts with that function’s downloaded live source, preserving unrelated code, dependencies, consent constants, settings, secrets, IAM, schedules and optional-feature flags. Unrelated working-tree edits in `app.ts` and `index.ts` are excluded.

1. `runSharedCallJob`: update warning consumer before any producer.
2. `shieldApi`: accept bound conference receipts before enabling new monitor producers.
3. `monitorConnectedCall`, then `monitorScheduledCall`: produce version-2 interventions.

API and call worker change only `call-control.js`, `monitoring.js`, `warning-handoff.js` and `warning-copy.js`. The two older monitor-worker packages change only their intervention method/imports in `monitoring.js` and add `warning-handoff.js`, `warning-copy.js` and the required `call-jobs.js`. Their existing call-control modules and other files stay unchanged. No bridge, Hosting, number assignment or carrier forwarding change is included.

Private frozen packages, original archives, operation handles and detailed source manifests live in `artifacts/private/warning-handoff-release/`. Before every source-only patch, check zero active reservations and the exact baseline source/configuration. Submit each operation once, follow its saved handle, and verify the downloaded deployed archive, unchanged configuration/IAM and 100% revision traffic. Stop on a changed baseline. After all four, compare other functions, bridge, schedules, Hosting and public flags, and check readiness/authentication guards without calling a phone.

Rollback starts with the two monitor producers, waits until active warning/call reservations are clear, then restores the API and call worker from their original archives using source-only patches. Never roll the consumer back while version-2 warnings remain active. Rollback cannot undo already ended calls or scam-block history.

## Release evidence

Deployment is not yet recorded in this document. See the subsequent dated receipt before assuming this release is live.
