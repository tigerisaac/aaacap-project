# API failure diagnostics — scoped rollout review

**Prepared; not approved or deployed.** The operations audit found API 503 responses with no recorded cause. This change records a small, fixed diagnostic when API initialization, dispatch or request handling fails. It preserves the existing HTTP response, failure handling and initialization retry.

## Exact scope

Deploy **`shieldApi` only**, starting from verified **`shieldapi-00033-nuk`**. That baseline already includes the approved warning-audio handoff. The frozen package contains 89 files; only these three differ from the current deployed source:

- `lib/cloud/app.js`: report a server failure at the existing request error boundary.
- `lib/cloud/index.js`: distinguish initialization from dispatch failures before the existing 503 response.
- `lib/cloud/diagnostics.js`: emit one JSON record containing severity, a fixed event name, stage, numeric status and a fixed category.

Only HTTP 5xx errors are reported. Ordinary authentication/validation failures are excluded; call-lock contention is recorded as a warning. Unrecognized errors receive a generic category. The reporter never serializes an error object, stack, request URL, authorization header, identity, provider body or transcript. A logging failure cannot change the response. This gives bounded diagnostic coverage; it does not reconstruct historical failures or prove worker recovery.

The package preserves the current privacy response byte for byte, all call-control/warning modules, policies and consent versions. Runtime secrets, scaling, IAM, other functions, schedules, Hosting, the screening bridge, alert settings and the budget are outside this deployment. Purchases and caretaker delivery remain disabled. No phone call or message is part of the rollout.

## Validation and package identity

The source snapshot uses `fe1615a` plus the five diagnostic source/test files. It passed required typechecking, build, **360 unit tests** and **267 Firestore tests**, on dedicated local emulator ports. Ten focused failure-boundary tests verify private-data exclusion, initialization retry, response preservation, logging failure and duplicate suppression. The **exact 89-file compiled package passed all 220 checks**, including the existing warning-handoff and monitoring tests. Its ZIP entries and every file hash match the manifest; there are no duplicate or extra entries.

An earlier snapshot passed 360 unit and 262 Firestore tests. Its 87-file package passed 134 checks, but the read-only deployment guard then detected the separately approved warning rollout. That candidate was superseded before any deployment. Initial shared-directory database runs had one transaction failure and then nine failures while another run and source edits overlapped; the logs are retained. The fixed snapshots on separate ports passed without weakening assertions or extending timeouts.

| Frozen artifact | SHA-256 |
|---|---|
| Current deployed API archive | `774c5cdad9db119ed14b10ca017a6a7b8ca0a5bce9a9a7131fc3c0b8d0b33aad` |
| Proposed file manifest | `8efeab82d3bcfe7a812bea8bd7947a91781d5a1bbb67b74690ba5fadc5d903f6` |
| Proposed archive | `dff66bb824d4f4ae5718d1840bf956ff01c24d190950d357191b2c5a94513965` |

Read-only preflight at **21:22 Central, October 17** downloaded the current deployed source and verified its archive hash, unchanged service settings, 100% traffic, healthy readiness and zero active call reservations. The private candidate, tests and preflight records are in `artifacts/private/operations-readiness-oct17/api-diagnostics-current/`. [Sanitized package evidence](../.impeccable/review/release-2026-10-17/operations/api-diagnostics.json).

## Deployment and rollback

After owner approval, recheck the exact baseline and zero active reservations. Submit one source-only update, save its operation handle and follow that operation to completion. Download and verify the serving source, configuration, IAM and 100% traffic. Check readiness, authentication guards and unchanged public configuration/privacy text; do not force a production failure or contact a phone. Compare unrelated functions, bridge, schedules and Hosting to the fresh predeployment snapshot. Stop if any baseline has changed.

Keep the previous source archive/reference for rollback. Any rollback must restore the complete current warning-handoff baseline, never the superseded pre-handoff package. Do not publish all of main: it contains independent screening and policy work outside this review. [Repository live-deployment requirement](../AGENTS.md).

## Optional alert-delivery acceptance

Actual email delivery remains unverified after the [service-alert setup](OPERATIONAL-ALERT-SETUP.md). With separate explicit authorization, send one clearly labeled **Shield notification delivery test** to `isaac.cw.zhang@gmail.com` through Cloud Monitoring. Use a temporary, uniquely matched test policy and one content-free synthetic log event; remove the temporary policy afterward and preserve the four service policies. The test documentation must state that no service outage or customer call occurred. Record the event, incident/notification evidence, inbox receipt and operator acknowledgement separately. Do not simulate an outage, alter phone routing or send SMS.
