# Retention and commercial configuration rollout review

Prepared October 17, 2026. **Awaiting owner approval; not deployed.** This is a two-function update on the verified live package, separate from the earlier approved iOS backend rollout. It does not constitute public-release sign-off.

## Proposed change

| Target | Change |
|---|---|
| `shieldApi` | Erase the encrypted phone/provider reference when a sign-in challenge is consumed or a completed failed check exhausts its attempts. Retain the replay/cooldown protections. Correct public privacy wording about transcript expiry, sign-in challenges and provider-erasure job retention. |
| `cleanupShield` | Remove expired **completed** provider-recording jobs. Preserve pending, stored and unknown jobs so provider deletion can retry. Existing pagination, concurrent-update guards and accepted-caretaker preservation remain. |
| Shared package configuration | Align `commercial-policy.json` to the owner's **USD $9.99/month and $99.99/year** decision; version `2026-10-17-v2`. This metadata had retained $15/$120 even after the preview/Test Store correction. Actual purchase prices come from the store. |

The frozen package changes exactly four of 86 files: `lib/cloud/phone-auth.js`, `lib/cloud/store.js`, three precise sentence replacements in `lib/cloud/app.js`, and `lib/cloud/commercial-policy.json`. All other files match the downloaded production source. Package: `artifacts/private/retention-rollout-oct17/candidate`. Source-manifest digest: **`5cd5d71609a1191faf0e4030d9fd306b20f2599889b6e6e1861b1f9080867577`**.

The deployed screening, monitoring, voicemail and call-control modules and consent versions remain byte-for-byte intact. Preserve runtime secret bindings, service accounts, traffic limits, IAM, schedules, indexes, provider settings, existing accounts and carrier routes. Public purchases, caretaker SMS and APNs remain disabled. There is no Apple, RevenueCat, bridge or Hosting-file change in this scope. Do not deploy the whole repository package: main contains separate unreleased policy and call-audio work.

## Verified baseline and local acceptance

At **18:54 Central**, both deployed source archives matched the earlier approved archive SHA-256 `96e541858b6d6ddf9ff0606e6905f9b87731aa2660f79248f35c0398c4a20aa2`; all 86 extracted file hashes matched its manifest. At **18:59 Central**, the read-only preflight reconfirmed both source references, service settings and 100% traffic, an enabled unchanged cleanup schedule, zero active call reservations, and API readiness 200.

| Target | Current revision | Secret versions to preserve |
|---|---|---|
| API | `shieldapi-00031-cif` | Runtime 8; OpenAI 2 |
| Cleanup | `cleanupshield-00014-ruf` | Runtime 6 |

The live expiry query needed by the new cleanup passed; no index change is required. There were six completed recording jobs, none expired, and zero pending/stored jobs or cloud audio manifests/chunks in that snapshot. This does not prove provider erasure or cleanup retry behavior on a real call. The next scheduled daily cleanup remains 04:00 America/Chicago; this proposal does not manually invoke a production deletion worker.

The corrected source passed typecheck/build, **344 unit tests and 257 Firestore integration tests**. The exact compiled package passed **119/119 tests across six unchanged integration suites**, using the Firestore emulator and synthetic data. Package startup/export/public-policy/authentication checks passed without provider or database requests. Production dependency versions match the local installed versions used for verification. Vite reported missing optional source maps from the downloaded production baseline; the tests completed successfully. All 86 candidate hashes and the unmodified test copies were rechecked after the run.

[Verification record](../.impeccable/review/release-2026-10-17/retention-rollout/verification.json) · [frozen source manifest](../.impeccable/review/release-2026-10-17/retention-rollout/manifest.json) · [read-only production inventory](../.impeccable/review/release-2026-10-17/retention-rollout/live-inventory.json) · [preflight snapshot](../.impeccable/review/release-2026-10-17/retention-rollout/preflight.json). These records contain hashes and configuration/count summaries; credentials, customer content and full function/IAM responses remain outside the committed evidence.

The preceding retention commit `33d8f85` independently passed [CI](https://github.com/tigerisaac/aaacap-project/actions/runs/39080541791), including the account-lifecycle job. This proposal's price configuration is a subsequent correction; it is not claimed covered by that earlier commit's CI.

## Deployment and rollback procedure

1. Obtain approval of this exact four-file/two-function scope. [AGENTS.md](../AGENTS.md) says: “Ask the owner before running any of them,” referring to changes to the live project. The previous approval applied to the earlier five-function rollout, not this new update.
2. Recheck the frozen file hashes, live source/settings/traffic, API readiness and absence of active call reservations immediately before submission. Stop if the baseline changed. Save the existing function metadata, invocation policies and source archives for rollback.
3. Deploy `cleanupShield` first using only the frozen source package and preserving all service settings. Follow its returned operation to completion; verify the source/settings before updating `shieldApi` from the same package. Record each operation/revision; an observation timeout is not grounds to submit another deployment.
4. Verify new source hashes, traffic and preserved settings/IAM; recheck readiness, unauthenticated route guards, public privacy copy and disabled optional features. Observe normal scheduled execution through read-only status/log checks. Do not send a sign-in code, place a call, send an alert or manually run a deletion worker as part of this rollout.
5. On regression, restore the saved source for the affected function and verify the resulting revision/settings. Keep pending erasure jobs and account data intact. Already completed expiry deletion cannot be undone by a code rollback.

The package's local tests do not close recording consent, legal/vendor retention, Apple purchases, physical Contacts/Call Directory/notifications, monitoring audibility, accessibility findings or other-device erasure gates. [Current release checklist](APP-STORE-RELEASE.md), [inventory](DATA-INVENTORY.md), [earlier deployed scope](IOS-BACKEND-ROLLOUT.md).
