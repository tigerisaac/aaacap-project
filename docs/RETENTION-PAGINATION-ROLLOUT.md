# Retention and blocked-number rollout review — October 17, 2026

**Approved and deployed October 17, 2026.** The owner explicitly approved the combined update. At **20:34–20:37 Central**, the exact package was verified on API **`shieldapi-00032-zun`** and cleanup **`cleanupshield-00015-nek`**, both ACTIVE at 100% traffic. This combines the [retention rollout](RETENTION-ROLLOUT.md) with blocked-number pagination. The earlier four-file package and manifest remain frozen. Authenticated production pagination and physical iPhone acceptance remain open; this is not public-release sign-off.

## Exact scope

Deploy only **`cleanupShield`** and **`shieldApi`** from the frozen combined package. Five of its 86 files differ from the recorded live baseline; the other 81 are identical.

| Changed file | Result |
|---|---|
| `lib/cloud/phone-auth.js` | Erase phone/provider fields after completed successful or exhausted sign-in checks; preserve replay and quota controls. |
| `lib/cloud/store.js` | Expire completed recording-erasure jobs without deleting unfinished provider cleanup. |
| `lib/cloud/app.js` | Correct three privacy sentences about sign-in payloads, transcript expiry and completed recording jobs. |
| `lib/cloud/commercial-policy.json` | Record the approved intended prices, $9.99/month and $99.99/year. Actual purchase screens use store prices. |
| `lib/cloud/forwarding-api.js` | Add bounded, authorized pagination to blocked-number retrieval; preserve the rest of this file byte for byte. |

The last row is the only addition to the earlier proposal. It lets the matching iPhone app retrieve older active blocks, continue after expired pages and unblock entries beyond the old first-page limit. [Behavior and test evidence](IOS-BLOCKED-NUMBERS.md).

The source manifest SHA-256 is **`bfcea911c64aed1109491bf892d03a3422ca4e7aeeef75da9382af66cef5b798`**. Its parent retention manifest remains **`5cd5d71609a1191faf0e4030d9fd306b20f2599889b6e6e1861b1f9080867577`**. The private package is `artifacts/private/blocked-pagination-oct17/candidate`; committed hashes and sanitized checks are in [the evidence folder](../.impeccable/review/release-2026-10-17/blocked-pagination/).

## Verification and preserved settings

Required source checks passed **344 unit + 262 Firestore tests**. The exact compiled package passed **124 integration tests across six suites**, plus startup, worker exports, privacy/public configuration and authentication guards. All package hashes and copied test sources are checked again before use. The extra route needs no new dependency, secret, index or schedule.

At **20:02 Central**, read-only preflight confirmed the original live sources and service settings: API **`shieldapi-00031-cif`** and cleanup **`cleanupshield-00014-ruf`**, both ACTIVE at 100% traffic. The cleanup schedule is unchanged and enabled; readiness returned 200 and there were zero active call reservations. The query's index shape also passed a separate content-free production read. These are observations at that time, not permission or a future-state guarantee.

Preserve runtime secret versions (API 8, cleanup 6), API's OpenAI secret version 2, IAM, schedules, region, instance limits, service accounts and all traffic settings. Screening, monitoring, voicemail and call-control logic, consent versions, the bridge, Hosting and other functions are outside this scope. Purchases, caretaker SMS and APNs remain disabled. Do not invoke cleanup manually or send a call, notification or text as part of deployment verification.

## Approved execution procedure

The source-only deployment below completed after the owner's “Approve the combined backend update” response. Fresh preflight at **20:24 Central** reconfirmed the baseline. Each operation was submitted once, saved and followed to completion; cleanup was verified before the API submission.

1. Re-run `artifacts/private/blocked-pagination-oct17/preflight.mjs`. It verifies both frozen manifests, exact live source references/service settings, traffic, schedule, readiness and zero active reservations. Stop and review any changed baseline; never overwrite another release.
2. Deploy only cleanup from the exact combined package, preserving all recorded settings, then wait on the returned operation handle and verify its active source/settings/traffic before proceeding.
3. Deploy only the API from the same package. Preserve its recorded settings and IAM; wait on the original operation handle through timeouts rather than resubmitting.
4. Verify both final source hashes/revisions, traffic, readiness and unchanged optional-feature flags/schedules. Do not claim completed erasure or real-call behavior from a healthy endpoint.
5. Record deployment receipts and verify authenticated pagination using an existing authorized test account before installing/distributing the matching client. Creating or seeding production test data is outside this deployment scope. Old clients continue receiving their first page. The new client intentionally refuses to publish a partial list from an old server, so a backend rollback also requires withholding or rolling back that client.

Rollback uses the original recorded source archive and service settings. Withhold or roll back the matching client if restoring the old first-page-only API. A source rollback cannot restore already erased data. Physical iPhone acceptance and the broader [release gates](APP-STORE-RELEASE.md) remain open.

## Deployment verification — October 17, 20:34–20:37 Central

| Target | Previous revision | Verified revision | Result |
|---|---|---|---|
| `cleanupShield` | `cleanupshield-00014-ruf` | `cleanupshield-00015-nek` | Source, configuration, IAM and 100% traffic verified |
| `shieldApi` | `shieldapi-00031-cif` | `shieldapi-00032-zun` | Source, configuration, IAM and 100% traffic verified |

The downloaded deployed archives match the uploaded ZIP SHA-256 **`bff350542275f1193faae7ff83e871deae80213da26d993c8b27f8256f8341b4`** and the approved 86-file manifest above. All other **12 functions**, the bridge, **six schedules** and the Hosting release are preserved. Runtime/secret versions and optional-feature settings are unchanged. Purchases, caretaker SMS and APNs remain disabled.

Readiness returned 200. Four unauthenticated reads—blocked numbers, blocked numbers with an invalid cursor, access and account deletion—returned 401. Live `/privacy` returned the exact frozen handler's 8,895-byte response, SHA-256 **`39381a0cd4f598ca21e5f61aa59f52ab4c0798f565cdb7894e427b078a638df9`**. The handler comparison prohibited database access. Commercial metadata version `2026-10-17-v2` is in the verified deployed package; this does not create Apple products or enable purchases. Source commit `bf60a60` independently passed [CI](https://github.com/tigerisaac/aaacap-project/actions/runs/39085753282).

Two verification-tool corrections are retained in the evidence. The first final comparison flagged Google's reordered event-filter arrays on two untouched functions; field comparison established identical contents and unchanged sources/revisions, and sorting those arrays made the final check pass. No service repair or deployment resubmission was needed. The first local privacy helper used an unavailable compiler API and failed before making a live request; the successful replacement compared the actual frozen handler response.

There was no authorized production test-account session available for signed-in pagination. No owner impersonation, production test-data creation, manual cleanup invocation, physical installation, call, text or notification occurred. The emulator's multi-page tests and deployed-source identity do not replace that acceptance check or prove provider erasure.

[Sanitized deployment verification](../.impeccable/review/release-2026-10-17/blocked-pagination/deployment/verification.json) · [revision/source/configuration receipt](../.impeccable/review/release-2026-10-17/blocked-pagination/deployment/verified.json) · [public-policy acceptance](../.impeccable/review/release-2026-10-17/blocked-pagination/deployment/public-acceptance.json). Private operation handles, baselines and rollback archives remain under ignored `artifacts/private/blocked-pagination-oct17/deployment/`. The separate [operations audit](OPERATIONAL-READINESS.md) found release gaps; this deployment does not close them.
