# API failure diagnostics — scoped rollout review

**Owner approved and deployed October 17, verified at 21:49 Central on `shieldapi-00034-yaw`.** The operations audit found API 503 responses with no recorded cause. This change records a small, fixed diagnostic when API initialization, dispatch or request handling fails. It preserves the existing HTTP response, failure handling and initialization retry.

## Exact scope

Deployed **`shieldApi` only**, starting from verified **`shieldapi-00033-nuk`**. That baseline already includes the approved warning-audio handoff. The frozen package contains 89 files; only these three differ from the prior `shieldapi-00033-nuk` source:

- `lib/cloud/app.js`: report a server failure at the existing request error boundary.
- `lib/cloud/index.js`: distinguish initialization from dispatch failures before the existing 503 response.
- `lib/cloud/diagnostics.js`: emit one JSON record containing severity, a fixed event name, stage, numeric status and a fixed category.

Only HTTP 5xx errors are reported. Ordinary authentication/validation failures are excluded; call-lock contention is recorded as a warning. Unrecognized errors receive a generic category. The reporter never serializes an error object, stack, request URL, authorization header, identity, provider body or transcript. A logging failure cannot change the response. This gives bounded diagnostic coverage; it does not reconstruct historical failures or prove worker recovery.

The package preserves the current privacy response byte for byte, all call-control/warning modules, policies and consent versions. Runtime secrets, scaling, IAM, other functions, schedules, Hosting, the screening bridge, alert settings and the budget are outside this deployment. Purchases and caretaker delivery remain disabled. No phone call or message is part of the rollout.

## Validation and package identity

The source snapshot uses `fe1615a` plus the five diagnostic source/test files. It passed required typechecking, build, **360 unit tests** and **267 Firestore tests**, on dedicated local emulator ports. Ten focused failure-boundary tests verify private-data exclusion, initialization retry, response preservation, logging failure and duplicate suppression. The **exact 89-file compiled package passed all 220 checks**, including the existing warning-handoff and monitoring tests. Its ZIP entries and every file hash match the manifest; there are no duplicate or extra entries.

An earlier snapshot passed 360 unit and 262 Firestore tests. Its 87-file package passed 134 checks, but the read-only deployment guard then detected the separately approved warning rollout. That candidate was superseded before any deployment. Initial shared-directory database runs had one transaction failure and then nine failures while another run and source edits overlapped; the logs are retained. The fixed snapshots on separate ports passed without weakening assertions or extending timeouts.

Independent [CI on the unchanged diagnostic commit `f67813f`](https://github.com/tigerisaac/aaacap-project/actions/runs/39090260090) failed its first attempt in the concurrent stopped-history backfill test with `3 INVALID_ARGUMENT: Transaction is invalid or closed` at `stopped-total.ts:33`. One rerun of the failed job passed all required checks, Firestore and account-lifecycle suites at **21:38 Central**. The original failure and successful rerun are both retained. This is an unresolved intermittent transaction failure in unchanged code, not a diagnosed or fixed defect; passing the rerun does not close it. The diagnostic rollout changes neither that transaction nor its test. A bounded isolated follow-up repeated the existing concurrency case 20 times with unchanged application source and assertions: **20 passed, zero failed**; 17 unrelated cases were excluded. It did not reproduce or resolve the failure. [Probe evidence](../.impeccable/review/release-2026-10-17/operations/transaction-probe.json).

| Frozen artifact | SHA-256 |
|---|---|
| Prior API archive (rollback baseline) | `774c5cdad9db119ed14b10ca017a6a7b8ca0a5bce9a9a7131fc3c0b8d0b33aad` |
| Deployed file manifest | `8efeab82d3bcfe7a812bea8bd7947a91781d5a1bbb67b74690ba5fadc5d903f6` |
| Deployed archive | `dff66bb824d4f4ae5718d1840bf956ff01c24d190950d357191b2c5a94513965` |

Read-only preflight at **21:22 Central, October 17** downloaded the current deployed source and verified its archive hash, unchanged service settings, 100% traffic, healthy readiness and zero active call reservations. The private candidate, tests and preflight records are in `artifacts/private/operations-readiness-oct17/api-diagnostics-current/`. [Sanitized package evidence](../.impeccable/review/release-2026-10-17/operations/api-diagnostics.json).

## Deployment and rollback

After the owner explicitly approved this package, fresh preflight confirmed the exact baseline and zero active reservations. One source-only update was submitted and its saved operation completed successfully. At **21:49 Central**, the downloaded serving archive matched the approved SHA-256, with unchanged settings/IAM and **100% traffic** on `shieldapi-00034-yaw`. Readiness returned 200; all four unauthenticated guards returned 401. Public configuration and privacy text matched the predeployment snapshot. The other 13 functions, bridge, six schedules and Hosting were unchanged. No production failure, phone contact or manual cleanup was forced. [Deployment receipt](../.impeccable/review/release-2026-10-17/operations/api-diagnostics-deployed.json).

This verifies the deployed source and preserved behavior. Actual production emission of a failure diagnostic remains unobserved; the ten local failure-boundary cases verify the reporter without forcing a live error.

The previous source archive/reference is retained for rollback. Any rollback must restore the complete `shieldapi-00033-nuk` warning-handoff baseline, never the superseded pre-handoff package. Do not publish all of main: it contains independent screening and policy work outside this review. [Repository live-deployment requirement](../AGENTS.md).

## Separate alert-delivery acceptance

The owner authorized one synthetic notification test and then one final retry after the first stored event produced no observed alert. The retry was accepted at **21:52:31 Central** and opened a matching alert at **21:52:52**. At **21:54**, the owner confirmed **“Received the test email.”** The temporary policy was removed and the four permanent service policies, email channel, readiness check and USD $50 budget were reverified unchanged.

Both events were content-free and labeled **Shield notification delivery test**, stating that no outage or customer call occurred. Event ingestion, alert creation and owner-confirmed inbox receipt are separately recorded. The first attempt's missing alert remains unexplained. This acceptance does not exercise actual service failures or spending thresholds; no phone or SMS was involved. [Full test evidence and limits](OPERATIONAL-ALERT-SETUP.md#final-delivery-retry--received-and-cleaned-up).
