# Firestore transaction retries — October 18, 2026

**Source fix, local packages and independent CI verified; not deployed.** The intermittent admission and history-counter failure is now reproduced without Shield domain code and isolated with a real local gRPC transport. This evidence identifies an SDK retry mechanism; it does not establish which historical production requests encountered it.

## Cause and correction

The legacy server-streaming path retries an initial read error before Firestore's transaction runner receives it. If that error is `ABORTED`, the transaction is already closed. Replaying the read with its old ID can replace the original error with `INVALID_ARGUMENT: Transaction is invalid or closed`. Firestore then stops instead of starting a fresh transaction.

Shield's shared client factory now sets `gaxServerStreamingRetries: true` once, before the first request. This selects GAX's status-aware streaming path and lets Firestore handle `ABORTED` at the whole-transaction level. The existing status-code policy, transaction attempt limit and backoff remain SDK-managed. Permission/invalid-argument errors propagate; temporary `UNAVAILABLE` errors still retry. Warm functions reuse the configured client.

The Functions entry point, voice bridge, service-access operator tool and emulator tests use this factory. The old paid-pilot verifier and frozen call-lab runners retain their original SDK setup because they verify historical packages; they are not the current production entry points. The current release-package verifier resolves Firebase Admin from the package it is testing, avoiding incompatible credential instances from two installations.

The root lock contains Firestore **9.2.0 / GAX 6.4.0**; all fifteen downloaded serving Functions packages contain **9.3.1 / 6.12.1**. Both dependency sets reproduce the mechanism and pass the correction. Runtime dependency versions are unchanged. Two already-used gRPC libraries are added as exact development dependencies for the transport regression. The inherited bridge lock also contains 9.3.1 / 6.12.1.

Relevant upstream definitions: [GAX client option](https://github.com/googleapis/google-cloud-node/blob/main/core/packages/gax/src/clientInterface.ts), [streaming implementations](https://github.com/googleapis/google-cloud-node/blob/main/core/packages/gax/src/streamingCalls/streaming.ts). The pinned installed code and local before/after tests are the evidence for this release; upstream `main` can change.

## Verification and retained failures

[Machine-readable evidence](../.impeccable/review/release-2026-10-18/firestore-retry/verification.json) records exact source/report hashes and individual results.

- A faithful SDK-only stopped-counter example failed on its first round without Shield imports. Adding only the streaming setting passed ten rounds, with actual transaction contention/retries and both totals equal to one.
- The initial five transport regressions failed four cases before the fix and passed all five afterward. Final coverage adds a sixth invalid-argument case. The live dependency set fails five of six before the fix on Node 22; all six pass afterward on Node 22 and 24. The tests cover aborted document/query reads, permanent errors, transient recovery, bounded attempts, one successful commit and warm-client reuse.
- `npm run check`: typecheck/build and **382 unit tests passed**, with the normal 283 emulator-only skips. No test timeout or existing assertion changed.
- The original admission and stopped-history cases passed **ten repetitions each**: two distinct cases, twenty executions. The complete thirteen-file Firestore command then passed **284/284**, using an isolated port/log directory because the default port was occupied. This run used Node 24.3.0; unit and account runs used Node 22.17.1.
- The full Firebase Auth/Firestore account suite passed **8/8** on its required dedicated ports. Its first private setup used different ports and was rejected by the existing safety guard before tests ran; the guard was preserved.
- Frozen candidates passed **85 integration tests**, **six transport regressions**, import/export checks for **all fifteen functions**, and local bridge startup in **both live and hybrid modes**. No handler was invoked against production. The first package run lacked its enrollment fixture and tested a worker-only return value against the API's older helper copy. The final harness copies that fixture and imports the batch processor from the actual deletion-worker candidate; every assertion and release byte is unchanged.
- The first release-package smoke failed because its root Admin credential belonged to a different SDK installation. Package-relative Admin resolution corrected the verifier; packaged public policy/startup/authentication guards now pass with zero database/provider requests.
- Local npm 10.9.2 rejected the repository's existing UUID override during clean installation. The release-packaging npm 11.4.2 installed the exact lock successfully. The lock change only declares the two test libraries; existing runtime entries are preserved.

Independent source [CI on `bbdc93e`](https://github.com/tigerisaac/aaacap-project/actions/runs/39100717454) passed on its first run: **382 unit, 284 Firestore and eight account checks**, including a clean dependency installation.

Earlier CI and diagnostic failures remain recorded in [the original evidence](../.impeccable/review/release-2026-10-17/operations/transaction-diagnostics.json). The later unchanged `d820851` run passed; it is evidence of intermittence, not the fix. No failed result was replaced by an unchanged rerun.

## Exact proposed rollout

The frozen runtime manifest is **`56ec8cc1044c7c10696edcab5b4de2579525cadb9265ddbf54a941ff115b047a`**. [Archive hashes and per-function baselines](../.impeccable/review/release-2026-10-18/firestore-retry/rollout.json) identify the complete set. Original archives, IAM/settings snapshots, candidates, tests and build plan are retained under `artifacts/private/firestore-retry-oct18/`.

Each function package changes exactly two files: add `lib/cloud/firestore.js` and redirect the existing `getFirestore` import in `lib/cloud/index.js` to it. Every other source, dependency-lock and audio byte is preserved. All fifteen functions use that shared database initialization, so the proposal covers the full fleet:

| Function | Serving baseline |
|---|---|
| `checkBackgroundHealth` | `checkbackgroundhealth-00001-not` |
| `checkForwardingVoicemail` | `checkforwardingvoicemail-00003-hod` |
| `cleanupShield` | `cleanupshield-00016-nag` |
| `dailySetupChecks` | `dailysetupchecks-00002-goq` |
| `dispatchSharedCallJob` | `dispatchsharedcalljob-00001-gup` |
| `expireMessageDeliveries` | `expiremessagedeliveries-00003-yab` |
| `expireSharedCalls` | `expiresharedcalls-00005-rug` |
| `finishAccountDeletions` | `finishaccountdeletions-00002-raw` |
| `ingestForwardingVoicemail` | `ingestforwardingvoicemail-00009-goz` |
| `monitorConnectedCall` | `monitorconnectedcall-00008-hem` |
| `monitorScheduledCall` | `monitorscheduledcall-00003-riq` |
| `reviewServiceAccess` | `reviewserviceaccess-00002-jof` |
| `runSharedCallJob` | `runsharedcalljob-00004-red` |
| `sendShieldAlert` | `sendshieldalert-00005-biq` |
| `shieldApi` | `shieldapi-00034-yaw` |

The bridge adds the same factory and redirects its `lib/live/server.js` import. Its Docker base is the exact serving `shield-live-00017-qrw` image, digest `a8ae73408b3334343458bbc68faf140ab4d27c6abb407006574035ccec6b0280`. The prepared build overlays only those two files and performs no dependency installation. Six build steps compare the original/new application and dependency contents, check the inherited lock, and run readiness in both modes. **That new image has not been built or verified yet.** Build failure must stop deployment.

Function configuration, IAM, secrets, traffic policy, queues, schedules, indexes, Hosting, phone routing, feature availability and screening/monitoring policies are preserved. The two health policies were subsequently enabled and their natural-run/activation gates accepted on October 18. Before any approved retry deployment, refresh the configuration preflight to preserve those enabled policies and require fresh natural health receipts after worker replacements; a snapshot expecting disabled policies is obsolete. Candidate source packages remain unchanged. No manual worker, customer data fixture, phone call, message, synthetic email or Apple change is included.

## Approval and deployment safeguards

Owner approval is required by [AGENTS.md](../AGENTS.md): “Ask the owner before running any of them.” The earlier health approval covers different package bytes and does not authorize this new rollout. The proposal includes one verified bridge build, source-only function updates, staged bridge promotion, read-only acceptance, and rollback to these exact baselines if checks fail.

1. Require green independent source CI, unchanged candidate/archive hashes, unchanged serving baselines/settings/IAM, and no active call reservations. Recheck the health rollout's current acceptance state. Stop for baseline drift; never deploy all of current `main`.
2. Build the pinned bridge overlay and require every comparison/readiness step to pass. Record the new immutable digest. Stage it with zero customer traffic and verify its `/ready` response and preserved configuration before promotion.
3. Recheck for no active call reservations before each source update. Apply only each function's `buildConfig.source`. Start with the private observer, require its next natural scheduled read to succeed, then the API and call/monitoring workers, followed by remaining workers. Verify downloaded serving archives, unchanged settings/IAM and full intended traffic individually. Stop on any failure before proceeding.
4. Promote the staged bridge only after its checks and a renewed no-active-call check. Preserve press-1 acceptance, fixed recipients, bounded timers and failure-closed call control. No real phone verification is implied by readiness.
5. Capture natural worker completions and fixed-category error logs from the replacement revisions, retaining the original health-rollout receipts. The health rollout was accepted October 18; preserve its enabled policies throughout this retry deployment. Require fresh worker completions, a subsequent healthy observer and a positive observer counter point from the replacement revision. Record each next scheduled time and use the health rollout's original completion tolerances. Daily cleanup requires its next natural 04:00 Central run and a 20-minute completion deadline; no manual cleanup is authorized.
6. On startup, source, configuration or new unexpected error failures, restore the affected function's saved original archive and/or bridge traffic to `shield-live-00017-qrw`. Verify source/settings/traffic after rollback. Preserve diagnostics and leave acceptance incomplete.

This approval would not create an overnight automation. Scheduling future production actions remains separately pending. Public release, real-call/device acceptance, broader accessibility, Apple configuration, unexplained historical errors and operational gate R5 remain open.
