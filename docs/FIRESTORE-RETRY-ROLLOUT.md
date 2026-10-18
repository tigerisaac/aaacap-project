# Firestore transaction retries — October 18, 2026

**Owner-approved source/configuration deployment verified at 17:00:10 Central October 18; full natural-worker acceptance remains pending.** The intermittent admission and history-counter failure is now reproduced without Shield domain code and isolated with a real local gRPC transport. This evidence identifies an SDK retry mechanism; it does not establish which historical production requests encountered it.

**API package refreshed and reverified October 18 at 16:06 Central:** the two-file retry overlay now starts from the accepted contact-recovery deployment `shieldapi-00035-qos`. All three contact-recovery files are preserved. The other fourteen function candidates and the bridge build context are byte-identical to the original proposal. The new manifest below supersedes the original API candidate; original packages and failures remain retained. The owner subsequently approved this exact refreshed scope with “Approve the reviewed retry rollout.” This is separate from the earlier [contact-recovery approval](CONTACT-RECOVERY-ROLLOUT.md).

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

## Refreshed package verification — October 18, 16:06 Central

The [new evidence](../.impeccable/review/release-2026-10-18/firestore-retry/rebase/verification.json) records the refreshed package and its retained failures:

- Read-only preflight at **15:57 Central** verified all fifteen serving revisions, source references, settings, IAM and full traffic. The bridge, seven schedules and all six enabled alert policies are preserved; active call reservations were zero at that snapshot. These conditions must be checked again immediately before any deployment.
- The final combined package run passed **94/94 integration checks** on Node 22.23.1: 27 API checks, including versioned contact recovery, and 67 shared-call checks. The actual frozen deletion-worker implementation uses its own database client. All **six transport regressions** also passed against the refreshed API factory and its installed SDK. Assertions and runtime package files were unchanged by the harness correction.
- The first combined run passed **92 and failed two deletion checks**. A direct diagnostic reproduced cross-install SDK object rejection: the harness passed the API's database object to a worker using another SDK installation. The corrected harness constructs the worker store with its own client, matching the deployed process boundary. Both reports, the diagnostic and the original harness are retained. An initial import-comparison newline error and a diagnostic error-wording mismatch are also recorded; neither changed release bytes.
- Packaged startup, public policy and authentication guards passed with zero database/provider requests. Clean production dependency installation passed; its current audit reports **zero known vulnerabilities**. Inherited source-map and dependency-deprecation warnings remain recorded.
- After tests, all **1,221 frozen files**, fifteen candidate ZIPs and fifteen rollback ZIPs passed verification. Each candidate differs from its serving baseline in exactly the two intended runtime files; every dependency lock is preserved. The API contains 91 files. All seven bridge build-context files and its source archive match the original plan; the new build tag identifies the refreshed manifest. **At that preparation checkpoint, the container image had not been built.**
- The backend and dependency locks are unchanged since first-attempt [CI on `df0bf4e`](https://github.com/tigerisaac/aaacap-project/actions/runs/39162762938), which passed typecheck/build, **382 unit + 293 Firestore + 12 account checks** and the production dependency audit. Those source checks were not rerun for this package/documentation-only refresh.

## Exact approved rollout

The current frozen runtime manifest is **`352ba27e0a07e7a113cc8180de0f4fcc156ab7d2a753afc6c3c7d78df46cb73e`**. [Current archive hashes and per-function baselines](../.impeccable/review/release-2026-10-18/firestore-retry/rebase/rollout.json) identify the complete set. The refreshed API archive is **`5d9cc660fbc16709e7eee804d7d19c4a9c9b196cf8f058652ba34562d063b4b1`**; its rollback archive is the accepted contact-recovery ZIP **`3c35398a526ce01e6ba7273f8665b5222b60192725573919fb976498020c5fc7`**. The new API, refreshed full manifest, current snapshots and build plan are retained under `artifacts/private/firestore-retry-rebase-oct18/`. Its artifact-location map points to the unchanged fourteen candidates and bridge under `artifacts/private/firestore-retry-oct18/`. The original manifest `56ec8cc1044c7c10696edcab5b4de2579525cadb9265ddbf54a941ff115b047a` and [historical evidence](../.impeccable/review/release-2026-10-18/firestore-retry/rollout.json) remain retained; its old API ZIP must not be deployed.

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
| `shieldApi` | `shieldapi-00035-qos` |

The bridge adds the same factory and redirects its `lib/live/server.js` import. Its Docker base is the exact serving `shield-live-00017-qrw` image, digest `a8ae73408b3334343458bbc68faf140ab4d27c6abb407006574035ccec6b0280`. The prepared build overlays only those two files and performs no dependency installation. Six build steps compare the original/new application and dependency contents, check the inherited lock, and run readiness in both modes. The approved build passed all six steps; the deployment receipts below record its verified digest and acceptance. Build failure must stop deployment.

Function configuration, IAM, secrets, traffic policy, queues, schedules, indexes, Hosting, phone routing, feature availability and screening/monitoring policies are preserved. The two health policies were enabled and their natural-run/activation gates accepted on October 18. The refreshed preflight now records all six policies enabled; require fresh natural health receipts after worker replacements. A snapshot expecting disabled policies is obsolete. Only the API candidate changed during this refresh, preserving the newly deployed contact correction. No manual worker, customer data fixture, phone call, message, synthetic email or Apple change is included.

## Approval and deployment safeguards

The owner explicitly approved this reviewed scope, as required by [AGENTS.md](../AGENTS.md): “Ask the owner before running any of them.” Approval includes one verified bridge build, source-only function updates, staged bridge promotion, read-only acceptance, and rollback to these exact baselines if checks fail.

1. Require green independent source CI, unchanged candidate/archive hashes, unchanged serving baselines/settings/IAM, and no active call reservations. Recheck the health rollout's current acceptance state. Stop for baseline drift; never deploy all of current `main`.
2. Build the pinned bridge overlay and require every comparison/readiness step to pass. Record the new immutable digest. Stage it with zero customer traffic and verify its `/ready` response and preserved configuration before promotion.
3. Recheck for no active call reservations before each source update. Apply only each function's `buildConfig.source`. Start with the private observer, require its next natural scheduled read to succeed, then the API and call/monitoring workers, followed by remaining workers. Verify downloaded serving archives, unchanged settings/IAM and full intended traffic individually. Stop on any failure before proceeding.
4. Promote the staged bridge only after its checks and a renewed no-active-call check. Preserve press-1 acceptance, fixed recipients, bounded timers and failure-closed call control. No real phone verification is implied by readiness.
5. Capture natural worker completions and fixed-category error logs from the replacement revisions, retaining the original health-rollout receipts. The health rollout was accepted October 18; preserve its enabled policies throughout this retry deployment. Require fresh worker completions, a subsequent healthy observer and a positive observer counter point from the replacement revision. Record each next scheduled time and use the health rollout's original completion tolerances. Daily cleanup requires its next natural 04:00 Central run and a 20-minute completion deadline; no manual cleanup is authorized.
6. On startup, source, configuration or new unexpected error failures, restore the affected function's saved original archive and/or bridge traffic to `shield-live-00017-qrw`. Verify source/settings/traffic after rollback. Preserve diagnostics and leave acceptance incomplete.

No overnight automation has been created. Scheduling future production actions remains separately pending. Public release, real-call/device acceptance, broader accessibility, Apple configuration, unexplained historical errors and operational gate R5 remain open.


## Approved deployment — October 18

The owner-approved retry initialization update is deployed to **all fifteen functions** and bridge **`shield-live-retry-352ba27e0a07`**, with source/configuration acceptance recorded at **17:00:10 Central October 18**. Every downloaded function ZIP matches its frozen candidate; settings/IAM and full traffic pass. The bridge's single pinned build passed all six steps, verifying **13,763 application/dependency files** with exactly two intended changes, then passed zero-traffic readiness before promotion. The API is **`shieldapi-00036-win`**, preserving the accepted contact correction. Seven schedules, six enabled alert policies, queues, Hosting, public configuration and privacy text are preserved. [Deployment receipts and pending natural-run acceptance](FIRESTORE-RETRY-ROLLOUT.md#approved-deployment--october-18).

The immutable new bridge digest is **`aaf7e5f6fe7e7ea3d9675e7697d7a77332c5a4310ed1296692fd571772f21db7`**. Build `6df0011d-d848-4402-b5e9-67203d7c50bf` inherited Node v22.23.3 and the original dependency lock; both live and hybrid startup retained screening policy v158. Only `buildConfig.source` was patched for each function. The private observer went first and passed its natural 16:30 scheduled execution before the API or call workers were updated. No active call reservations were observed before any source/traffic change. No phone call, message, fixture, manual worker, feature activation or Apple operation was performed.

| Function | Verified replacement |
|---|---|
| `dailySetupChecks` | `dailysetupchecks-00003-nuw` |
| `expireMessageDeliveries` | `expiremessagedeliveries-00004-quc` |
| `checkForwardingVoicemail` | `checkforwardingvoicemail-00004-pid` |
| `ingestForwardingVoicemail` | `ingestforwardingvoicemail-00010-zas` |
| `dispatchSharedCallJob` | `dispatchsharedcalljob-00002-ros` |
| `cleanupShield` | `cleanupshield-00017-yey` |
| `monitorConnectedCall` | `monitorconnectedcall-00009-ner` |
| `expireSharedCalls` | `expiresharedcalls-00006-sem` |
| `finishAccountDeletions` | `finishaccountdeletions-00003-yiw` |
| `runSharedCallJob` | `runsharedcalljob-00005-liy` |
| `monitorScheduledCall` | `monitorscheduledcall-00004-gip` |
| `shieldApi` | `shieldapi-00036-win` |
| `reviewServiceAccess` | `reviewserviceaccess-00003-nus` |
| `sendShieldAlert` | `sendshieldalert-00006-yiv` |
| `checkBackgroundHealth` | `checkbackgroundhealth-00002-ziq` |

Natural completion has been accepted for `finishAccountDeletions`, `expireMessageDeliveries`. Post-replacement completion is still pending for `reviewServiceAccess`, `cleanupShield`. Daily cleanup must run naturally at 04:00 Central October 19 and finish by its recorded 20-minute deadline; no worker is invoked manually. The new observer reports healthy results and positive counter data, but prior-version worker results cannot satisfy replacement acceptance. R5 and the broader public/pilot release remain open.

| Maintenance worker | Replacement acceptance |
|---|---|
| `finishAccountDeletions` | Completed naturally October 18, 16:48:08 Central, within its deadline. |
| `expireMessageDeliveries` | Completed naturally October 18, 16:55:13 Central, within its deadline. |
| `reviewServiceAccess` | Pending: next natural run October 18, 17:22:00 Central; completion deadline October 18, 17:52:00 Central. |
| `cleanupShield` | Pending: next natural run October 19, 04:00:02 Central; completion deadline October 19, 04:20:02 Central. |

Bounded checks found zero error-level logs from the replacement revisions. Request metrics retain their exact per-service intervals, one-minute ingestion allowance, status counts and idle cases in the evidence; this does not establish real-call behavior or explain historical 503s. The bridge metric was initially pending ingestion. A separate read at **17:05 Central** resolves that gap: the fully post-promotion **17:00–17:04** window contains one 200 response and no 5xx; the recorded 17:01 readiness probe also returned 200 with unchanged readiness. The original pending result remains retained. The six authentication guards continue returning 401 without customer writes.

Verification interruptions remain recorded: an initial readiness-path typo stopped preflight before deployment; a supplemental build-log read reported an internal client error and recovered on one read-only retry; two observer-log reads later reported the same adapter-level status 500. The latter stopped the rollout after eleven verified functions; a successful later health read allowed work to resume. A further read after the thirteenth verified function captured **HTTP 429, RESOURCE_EXHAUSTED / RATE_LIMIT_EXCEEDED**, for Logging read requests (60 per minute). The Firebase adapter had masked that quota response as 500. Combining the same revision/time/event filters into one log query reduced requests while preserving every acceptance assertion. After backoff, health checks recovered before the remaining updates resumed. Earlier error causes were not captured and are not retroactively established. A local evidence-selection assertion also stopped the first publication attempt; correcting its filename filter selected the successful health report without changing acceptance. No build or function update was repeated.

[Sanitized deployment, metrics, worker deadlines and private-receipt hashes](../.impeccable/review/release-2026-10-18/firestore-retry/deployment/verification.json). Original rollback archives remain available, including the API contact-recovery baseline. No overnight automation was created. API mechanics used for this scoped update: [Cloud Run field-mask updates](https://docs.cloud.google.com/run/docs/reference/rest/v2/projects.locations.services/patch) and [Cloud Build creation](https://docs.cloud.google.com/build/docs/api/reference/rest/v1/projects.locations.builds/create).
