# Backend rollout review for the iOS release

Updated October 17, 2026. **Owner-approved scoped rollout deployed and verified at 15:19–15:23 Central.** The owner approved “this scoped backend update.” Apple setup is deferred; purchases and caretaker delivery remain disabled. This record distinguishes deployed source/configuration checks from unperformed real-phone and account-erasure acceptance.

## Baseline and candidate

The read-only production observation is `shieldapi-00030-haq`, with the live bridge at `shield-live-00017-qrw`. The retained API package is `artifacts/private/phone-sign-in/api-guid`; all **81 files** matched the recorded `guid-manifest.json` hashes during this audit. Recheck live traffic and runtime versions immediately before any approved rollout; these observations are not a permanent deployment lock.

`npm run firebase:package` builds the current repository, copies both policy JSON files and runs `check-ios-release-package.mjs`. The checker imports the assembled application/workers, checks public copy and unauthenticated route guards using synthetic configuration, and makes no provider/database requests. The package is at `artifacts/firebase-functions`. It is a verified engineering candidate, **not a scoped production package**.

The private `artifacts/private/ios-release-review/package-comparison.json` records file hashes and differences against the retained baseline. The candidate includes changes to account deletion, alerts, access/billing, contact routes, carrier country eligibility, configuration and public copy. It also contains previously unreleased screening/message policies and consent versions. Selecting only an HTTP function for deployment would still carry those transitive changes; a function-name filter alone does not isolate them.

The separately prepared **`artifacts/private/ios-release-review/scoped-functions`** changes exactly **15 files** against that verified baseline. Its [complete source manifest and proposed deployment actions](../.impeccable/review/release-2026-10-17/backend-scoped-manifest.json) have digest **`6a93ba761913824a494e27a3de39e6acfc4b39a15afa55c1d24b5788d4e342c3`**. The deployed screening, monitoring and voicemail policy modules remain byte-for-byte unchanged. The existing `shield-pilot-2026-09-v1` consent version and call/audio/message-processing privacy descriptions are preserved; app-account, explicit contact-sharing, intervention-only alert, billing and deletion descriptions are updated.

The exact compiled overlay passed packaged startup/export/authentication checks and **58/58 integration tests across four unchanged test files**, using an isolated demo Firestore emulator. Those tests import the staged JavaScript package, rather than the current TypeScript source. Vite reported absent optional source maps in the production package; all tests completed successfully. This is local synthetic verification; deployed evidence is recorded below. No real-call acceptance is implied.

Read-only checks at **14:58–15:00 Central** reconfirmed API `shieldapi-00030-haq`, runtime version `8`, and the absence of both new workers. The runtime's assigned project roles grant Firebase user lookup, update and creation, but do **not** grant `firebaseauth.users.delete`. The proposed `shieldAccountDeletion` custom role contains only that permission and is bound only to the existing runtime identity. The approved role is now bound to the runtime identity, and all other project bindings are unchanged. The required `accountDeletions(state, dueAt)` index is READY; all three pre-existing indexes remain READY.

## Approved deployment scope

| Surface | Prepared behavior | Acceptance before traffic |
|---|---|---|
| `shieldApi` | Account-wide deletion/status receipts; explicit contact sharing; caretaker scope; access/refresh and authenticated RevenueCat webhook; support/privacy copy | Packaged integration checks; unauthenticated routes reject; existing assisted owners retain access; consent/policy compatibility reviewed |
| `finishAccountDeletions` | Durable retries after the app closes; RevenueCat cleanup before Firebase identity deletion | `accountDeletions` state/dueAt composite index READY; scheduler/runtime IAM checked; synthetic deletion and failed-provider recovery verified |
| `sendShieldAlert` | Intervention-only helper/caretaker alerts and event/account push deduplication | Optional-channel config remains off until provider setup; consent, opt-out and duplicate-delivery checks |
| `cleanupShield` | Expired deletion receipts and content-free billing webhook receipts | Deletion jobs awaiting cleanup are retained; existing call/audio retention preserved |
| `reviewServiceAccess` | Hourly bounded subscription/pilot review, with expiry flagged for assisted restoration | Correct schedule/IAM; failed-review and pending-restoration monitoring; no routing changes on expiry |
| Hosting | Updated generic caretaker request/consent wording | Links and phone verification work with the deployed API; existing static assets/AASA preserved |

No bridge, model prompt, announcements, carrier forwarding, phone settings, existing enrollment or runtime secret change is implicit in this scope. Preserve the deployed screening/message policies and consent versions unless an independently reviewed migration explicitly includes them. Public purchases stay disabled and no existing account is automatically assigned public or pilot billing access.

## Release order and rollback

1. Reconfirm that live API/source/runtime versions still match the reviewed baseline and that the staged file hashes match the manifest. Review the account/privacy copy. The separate consent/recording and commercial gates in [the release checklist](APP-STORE-RELEASE.md) still block public release; this overlay preserves deployed call processing and does not resolve them.
2. Owner authorization was received for the exact five-function, one-index, three-hosting-file and single-permission IAM scope. Repository [AGENTS.md](../AGENTS.md) requires this authorization. No runtime-secret or feature-enable change was made.
3. After authorization, create the deletion index and wait for READY, establish the narrowly scoped account-deletion permission, and deploy the scoped workers/API and approved hosting copy. Preserve other IAM bindings, existing indexes, runtime identity, traffic limits and secrets. Keep billing and caretaker delivery disabled until their separate acceptance is complete.
4. Verify revision/source hashes, route authentication, readiness, scheduler/worker presence and logs. Use only approved synthetic identities for durable-job checks. Actual calls, SMS, APNs and carrier changes need their own authorized acceptance; a successful health response is insufficient.
5. On regression, restore the recorded API/alert/cleanup revisions and hosting release as applicable. Do not delete access records, pending deletion jobs, receipts or customer bindings to imitate rollback. Retain or deliberately pause new schedules based on the failure, with outstanding deletions and forwarding restoration tracked. A rollback cannot undo an already completed account deletion.

## Verified deployment

| Surface | Deployed revision / evidence |
|---|---|
| API | `shieldapi-00031-cif`, replacing `shieldapi-00030-haq` |
| Alert worker | `sendshieldalert-00005-biq`, replacing `sendshieldalert-00004-vef` |
| Cleanup | `cleanupshield-00014-ruf`, replacing `cleanupshield-00013-guj` |
| Durable account deletion | `finishaccountdeletions-00001-kif`; every minute; retry count 3 |
| Access review | `reviewserviceaccess-00001-xey`; every hour; retry count 0 |
| Hosting | `d62ef31f0f12c172`, replacing `b1ed614a2305e3ca`; three new caretaker files |

All five deployed source packages match the tested manifest. Existing function service settings, secret bindings, invocation policies and unrelated function revisions were preserved. Event filters changed order in Google's response but retain exactly the same values. New workers use the existing runtime identity, runtime secret version 8, zero minimum instances and a maximum of one. Their private Cloud Run invocation permission, schedule target and matching OIDC audience are verified; the existing cleanup schedule is unchanged. The new deletion role grants only `firebaseauth.users.delete`.

Public readiness returns 200; the new access, refresh and account-deletion routes and RevenueCat webhook return 401 without authentication. Phone sign-in remains available. The support address and reviewed contact/account policy wording are published. The API preserves deployed screening, monitoring, voicemail and consent versions. Purchases and caretaker delivery remain unavailable.

The caretaker HTML requires its JavaScript and CSS. The publication cloned the live version, added all three, and verified every existing file hash and the full Hosting configuration before release. Public downloads match the three raw content hashes. No SMS request was sent. [Firebase's clone API](https://firebase.google.com/docs/reference/hosting/rest/v1beta1/sites.versions/clone) supports preparing this unpublished copy.

Initial automatic deletion-schedule attempts returned 403 before the scoped target/invoker correction; later normal executions returned 200. Manual invocation of the production deletion worker was rejected by automatic approval review because live account deletion is irreversible. It was not retried indirectly. Normal execution was verified through read-only logs. The separate access-review check first established an empty `serviceAccess` collection and returned 200 at 15:23 Central; no customer entitlement was changed. [Status-only execution evidence](../.impeccable/review/release-2026-10-17/worker-execution-verified.json) retains the initial 403s and subsequent successful runs. Neither check proves end-to-end erasure of a real account or successful RevenueCat/Apple transactions.

Evidence: [existing functions and route guards](../.impeccable/review/release-2026-10-17/backend-deployment-verified.json), [new workers](../.impeccable/review/release-2026-10-17/worker-deployment-verified.json), [IAM/index checks](../.impeccable/review/release-2026-10-17/backend-prerequisites-verified.json), and [Hosting preservation/content checks](../.impeccable/review/release-2026-10-17/hosting-deployment-verified.json). Private rollback packages, original metadata and operation receipts remain under `artifacts/private/ios-release-review/`.

## Still outside a verified release

- Apple/RevenueCat products, credentials, restore behavior, webhook setup and actual purchase lifecycle: [exact deferred state](REVENUECAT.md).
- APNs and caretaker text delivery are not enabled in the observed production configuration.
- Automatic text filtering is unavailable. The unfinished extension and placeholder associated domain are excluded from the app package, and no `/sms/classify` backend route exists. Re-embedding requires its own backend/domain/privacy implementation and physical verification. Manual text checking remains available.
- Canadian carrier qualification, exact-release real calls, senior usability and physical Contacts/Call Directory/background-delivery checks remain open.

The current code, production observations and acceptance limits are consolidated in [iOS release verification](IOS-RELEASE-VERIFICATION.md).
