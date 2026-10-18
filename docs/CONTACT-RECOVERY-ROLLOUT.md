# Contact recovery API rollout — October 18, 2026

**Owner-approved, deployed and accepted within this scope October 18, 2026, at 15:52 Central.** This rollout covers only `shieldApi`. It supports the [contact recovery correction](IOS-CONTACT-RECOVERY.md) and does not publish the app or close signed-in/physical release acceptance.

## Deployment receipt — October 18

The owner approved the exact reviewed package. The fresh **15:43 Central** preflight found the original `shieldapi-00034-yaw` source/settings/IAM unchanged, complete traffic and zero active call reservations. Only `buildConfig.source` was updated. At **15:46–15:47**, replacement **`shieldapi-00035-qos`** was active with **100% traffic**; its downloaded ZIP and all **90 file hashes** matched the approved package. Settings and IAM are preserved. No rollback was needed.

The other **14 functions and their traffic**, bridge, **seven schedules**, **six alert policies**, Hosting release, public configuration and exact privacy text are unchanged. Readiness returns 200. Six unauthenticated checks return 401, including contact reads, versioned changes and full sharing; no authenticated contact mutation, customer fixture, call, message or manual worker was used. Purchases and caretaker delivery remain disabled. Signed-in contact recovery and physical iPhone/iCloud acceptance remain open.

The **15:46:57–15:52:16 Central** observation spans 319 seconds. Available new-revision request metrics show **four 200 responses, six 401 responses and zero 5xx**; fixed error diagnostics are empty. The six observed denials are consistent with the six explicit guard probes, without individual-request attribution. Metrics lagged by about one minute; their latest returned bucket ended at 15:51:16. The earlier 112-second snapshot is retained separately. This bounded result does not establish actual signed-in contact behavior or longer-term reliability. [Approval, source verification, configuration preservation and health receipts](../.impeccable/review/release-2026-10-18/contact-recovery/deployment/verification.json).

The original Firestore retry API candidate became stale after this deployment. Its [refreshed proposal](FIRESTORE-RETRY-ROLLOUT.md) now preserves this serving source and passes 94 integration plus six transport checks; its separate approval remains pending. Original frozen evidence is retained; deploying the old retry API ZIP would remove this correction.

## Exact scope

The candidate starts from the downloaded serving **`shieldapi-00034-yaw`** archive. It changes exactly three files:

| Runtime file | Change |
|---|---|
| `lib/cloud/api.js` | Consistent contact-list revision snapshots; owner-checked, revision-conditional changes with replay receipts; revision advancement for legacy contact mutations. |
| `lib/cloud/shared-contacts.js` | Full shares advance the revision and optionally check the requested starting revision, including shares requiring no contact-row writes. |
| `lib/cloud/contact-revision.js` | New bounded revision reader/advancer and advertised client contract. |

All other **87 package files** are unchanged. The package retains its existing dependency lock, Firestore client initialization, consent/policy versions and call-control code. No migration, index, new worker, schedule, IAM, secret, Hosting, service flag or provider configuration change is needed. Existing missing revisions begin at zero; receipt metadata contains IDs, a revision and a boolean, without names/numbers. Disabled contact rows retain their existing lifecycle.

| Frozen artifact | SHA-256 |
|---|---|
| Candidate source ZIP | `3c35398a526ce01e6ba7273f8665b5222b60192725573919fb976498020c5fc7` |
| Sorted runtime-file manifest | `ca234ec7bca04689c911e3495491dbd79a631ee5e85e9b8bb4658828d993598d` |
| Original serving ZIP / rollback | `dff66bb824d4f4ae5718d1840bf956ff01c24d190950d357191b2c5a94513965` |
| Unchanged dependency lock | `b81c40f62e59e41c8ec03a9b4484bca239c382779e5220810e1b44b7292fdb5c` |

Private archives, source hashes, settings/IAM snapshots, exact-package tests and candidate installation output are retained under `artifacts/private/contact-recovery-oct18/`. At **15:14 Central**, a read-only check confirmed the API active on the same revision with **100% traffic**, unchanged source reference, service settings and IAM compared with its saved baseline.

## Checks and sequencing

The source passes required typecheck/build, **382 unit**, **293 Firestore** and **12 account** checks locally and in first-attempt [independent CI on `df0bf4e`](https://github.com/tigerisaac/aaacap-project/actions/runs/39162762938). The frozen candidate passes all **13 selected contact integration checks** against its unchanged serving dependencies and original database initialization; production dependency audit findings are zero. All 90 candidate directory/ZIP hashes and the original rollback ZIP have been reverified. The app passes **23 Swift checks**, **7 native checks on iOS 27**, **6 on iOS 26.5** and unsigned Release archive inspection. [Exact evidence, retained failed attempts and physical/VoiceOver limits](IOS-CONTACT-RECOVERY.md).

The [Firestore retry proposal](FIRESTORE-RETRY-ROLLOUT.md) is separately pending. This contact package went first and does not include that correction. The retry proposal's refreshed API candidate now preserves these contact changes and has been reverified. Never deploy its old frozen API package, and never deploy all of `main`.

The new app checks the contract before editing native Contacts. Older clients can still use the legacy request shape, but do not gain durable recovery or versioned request ordering merely from this API deployment. Complete backend acceptance before distributing the updated client.

## Approval, rollout and rollback

[AGENTS.md](../AGENTS.md) requires owner approval for live deployments: “Ask the owner before running any of them.” The owner explicitly approved this exact API source update, read-only acceptance and restoration of its original source if acceptance failed. The procedure below records the approved safeguards; no rollback was needed.

1. Require successful independent CI for the source, unchanged archive/file hashes, the same API revision/source/settings/IAM and no active shared-call reservations. Record all surrounding service revisions and traffic for comparison. Stop for drift or active calls.
2. Upload only the frozen candidate and update only the API's `buildConfig.source`. No manual worker, production customer/contact fixture, call, message, Apple change or feature activation is included.
3. Require the replacement API to become active and serve all intended traffic. Download and compare its serving archive against all 90 frozen file hashes. Verify preserved settings/IAM, unchanged surrounding services, public readiness/disclosures and unauthenticated contact-route denial. Check fixed-category diagnostics and HTTP error counts over a bounded post-start window. Source verification and emulator identities do not establish a real signed-in contact edit.
4. On deployment/startup failure, source/configuration mismatch or a new attributable regression, restore only the saved original API source archive. Verify original file hashes, settings/IAM and traffic, retain diagnostics and leave acceptance incomplete. A rollback removes the new advertised contract; the updated app must then retain recovery and prevent contact edits until a verified contract returns.

No monitoring, billing, caretaker or purchase switches are enabled by this proposal. Public/pilot release, real devices/calls, independent operational-failure acceptance and deferred Apple setup remain required.
