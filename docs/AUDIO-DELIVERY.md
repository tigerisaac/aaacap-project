# Phone audio with temporary delivery

**Deployed with owner approval on October 16, 2026.** The matching signed iPhone app is installed and launched. Audio uses temporary delivery followed by deletion; cloud screening remains on demand. See also [offline call history](IOS-OFFLINE.md).

## October 25 — recording-origin configuration restored

The background-worker error email was actionable: `ingestforwardingvoicemail-00011-kuq` repeatedly rejected authenticated Telnyx recording metadata with `unapproved_recording_origin`. Two jobs remained pending. Their metadata matched the expected recording, call and application, and named the already-approved `https://s3.amazonaws.com/telephony-recorder-prod/` storage location. No audio, transcript, signed URL or private phone number was exposed to development tools.

The October 24 deployment had bound the ingester to `SHIELD_RUNTIME` version 8, which omitted `TELNYX_RECORDING_HOSTS`; version 7 contained the approved host. Latest version 9 also omitted it. The empty default correctly refused the download, but repeated delivery failures triggered the 20-errors-in-15-minutes alert.

With explicit owner approval, runtime version **10** was created from the complete current version 9 with only `TELNYX_RECORDING_HOSTS: ["s3.amazonaws.com"]` added. Only the ingester was updated. At **18:11:52 Central October 25**, revision **`ingestforwardingvoicemail-00012-cab`** was ACTIVE at 100% traffic; source archive checksum/size, all other service settings and IAM bindings matched the baseline. Google Cloud recopied the source archive under a new storage generation without changing its bytes. The latest runtime retains the host for future deployments; preserve this field when preparing subsequent versions. The version-9 App Review configuration was preserved, not rolled back to the older runtime.

The strict bucket/path, HTTPS, ownership, completion, duration and no-redirect checks remain unchanged. Alerts remain enabled. No manual worker replay, phone call, carrier change, screening change or local audio download was performed. Private content-free rollout receipts are in `artifacts/private/recording-origin-oct25/`.

The 18 focused origin/provider tests, `npm run check` (399 unit tests, typecheck and build), and the complete Firestore suite (326 tests) pass. The first restricted check could not open local test ports; the unrestricted rerun passed. The default Firestore emulator port was occupied by other work; the unchanged suite passed on isolated ports. Test counts include the concurrent subscription work; none of that source was deployed by this repair. At **18:15:26 Central**, both originally stuck jobs had completed naturally and recorded provider deletion (18:11:51 and 18:15:08); all seven recording jobs returned by the bounded since-17:30 inventory were done, including three newer jobs completed by the replacement worker. No `unapproved_recording_origin` appeared in the complete log query since 18:10. Seven `capture_outcome_pending` retries belonged to the newer captures, which subsequently completed; these are retained rather than claiming zero errors. The delayed metrics showed nine 5xx responses in the rolling 15-minute worker window, below the threshold of 20. Metric delay and incident notification delivery remain distinct from job completion; no claim of inbox closure or phone playback acceptance is made.

## Storage contract

- Telnyx captures the unconnected inbound call. Ingestion deletes the provider copy after securely copying it, or directly when the call should be discarded. An independent five-minute expiry sweep retries overdue provider jobs, including jobs whose original event retries ended. Recording deletion does not run in call admission or call recovery.
- New Firebase manifests and all chunks have a maximum 24-hour delivery lifetime, anchored to the recording job's creation. Reads reject expired audio immediately. A five-minute scheduled sweep removes expired manifests/chunks; outages and bounded backlogs can delay physical deletion. No warm instance is added.
- The owner's app atomically saves ready audio in Application Support, excludes the folder and file from backups, applies iOS Data Protection, flushes the file, reads it back, and verifies SHA-256 before acknowledging delivery. Missing, corrupt, mismatched, cancelled or failed saves send no acknowledgement.
- The authenticated receipt binds the owner, message, digest and exact manifest revision. Confirmation transactionally deletes the manifest and every possible chunk. Repeated confirmation after a lost response succeeds. Another account or an obsolete revision cannot delete the copy. Provider callbacks cannot recreate delivered or expired content.
- Local files and their message list survive app restart and work offline. App state holds library metadata; file validation and playback load one recording at a time. Sign-out hides the library; the same account can reopen it. Account deletion removes that account’s local library. Another account cannot access it. Deleting the app or losing the phone loses the recordings.
- Downloads run after app refresh, from Messages, and opportunistically on notifications. Background delivery is not guaranteed. Open Shield within 24 hours of the call; a phone offline past expiry can lose audio. Local playback does not wait for the network. Failed acknowledgements retry on synchronization.
- Only the owner acknowledges delivery. A helper with listening permission can stream the temporary copy while it exists, but cannot consume the owner's delivery. After delivery or expiry, helper audio is unavailable. Summaries retain existing permissions and 30-day server retention.

The server verifies the receipt and digest but relies on the official app to enforce durable-save-before-confirmation; it cannot remotely prove physical phone storage. No prompt or screening policy changed.

## Approved deployment and final inventory

Verification at **2026-10-17 01:42:33 UTC / October 16 20:42:33 Central**:

| Service | Serving revision |
| --- | --- |
| Delivery API | `shieldapi-00023-neb` |
| Recording ingestion | `ingestforwardingvoicemail-00009-goz` |
| Message checking | `checkforwardingvoicemail-00003-hod` |
| Notifications | `sendshieldalert-00003-ves` |
| Audio expiry | `expiremessagedeliveries-00002-nos` |

All functions remain ACTIVE, minimum instances zero, request-based CPU; changed services serve 100% traffic. The unchanged bridge is `shield-live-00015-qdd`, screening v158. Deployed post-call policy v4 was preserved; repository policy v10 and unrelated authentication/contact features were not released. Source packages were overlaid on each actual live package and verified after deployment. The five-minute cleanup job uses the private function and runtime identity. The recording index is installed. Call task queue is running with no pending tasks or active reservations at verification. A complete error-log query at 20:45 Central found zero new service errors since the final corrections at 20:42:30.

Production inspection found `TELNYX_RECORDING_HOSTS` absent, so its empty default prevented ingestion. Only the ingester now references runtime secret version 7, which adds `s3.amazonaws.com`; the source also restricts that shared hostname to `/telephony-recorder-prod/`. Recording ID, call ID, application, completion and duration checks remain required before downloads, with HTTPS and redirects disabled. The origin matches authenticated provider metadata and [Telnyx’s documented storage](https://developers.telnyx.com/docs/voice/programmable-voice/storing-call-recordings). No real audio or summary was exposed to development tools.

Both previously pending provider jobs completed and recorded deletion. The overdue recording was expired. The recent recording went through the existing production message assessment and was removed; it was not acknowledged as saved on the phone. **The 01:43:07 UTC / 20:43:07 Central inventory found zero Telnyx recordings, zero Firebase manifests and zero chunks**, with PITR disabled and no database backups. Read-only migration found nothing requiring a shorter expiry. Both temporary recovery schedules were deleted.

The release exposed and corrected two verification issues: the new scheduled function initially inherited the call-expiry runtime target, and manually replayed Firestore events needed explicit routing/content-type fields. The final cleanup target is `expireMessageDeliveries`; a live expired synthetic manifest/chunk was deleted and its call marked expired. Replayed provider events then completed. These initial failed attempts are retained in the private release evidence, not described as successful runs.

Live synthetic-account checks passed download without deletion, exact digest, no-store response, malformed receipt rejection, wrong digest rejection, confirmation deletion of manifest/all chunks, and repeat confirmation after a lost response. All synthetic identities/documents were removed. A regression also exposed permissive base64 suffix decoding; the API now requires canonical receipt encoding before authenticated decryption.

Evidence directory: `artifacts/private/audio-delivery-release/` (`manifest.json`, per-service verified reports, `postflight.json`, `smoke-result.json`, `expiry-smoke-result.json`, `recovery-result.json`). Final inventory: `artifacts/private/audio-delivery/inventory.json`. No owner phone calls or carrier-setting changes were made. Physical-device audio save/background delivery and hardware Data Protection were not verified; simulator durable playback and production API deletion were verified separately.

## Before-release inventory

Read-only metadata audit at **2026-10-17 01:09:25 UTC / October 16 20:09:25 Central**:

| Location | Observation |
| --- | --- |
| Firebase audio manifests / chunks | 0 / 0 |
| Firestore point-in-time recovery | Disabled |
| Firestore backup schedules / database backups | 0 / 0 |
| Telnyx recordings | 2 |

Both provider recordings have pending ingestion jobs and no recorded deletion. One is a 28-second shared-path capture approximately five hours old, with an ended call marked screening unavailable. The other is a 3-second older TeXML capture approximately 427 hours old. Neither was downloaded, listened to, evaluated or deleted. Their job state establishes unfinished processing, not its exact cause. The log lookup was unavailable; an empty diagnostic list does not establish absence of errors. Content-free evidence: `artifacts/private/audio-delivery/inventory.json`.

## Coordinated rollout

1. Owner approval for this audio release, provider cleanup and matching phone app was received October 16. Preserve deployed screening/message policies and unrelated functions in future releases; do not deploy all repository candidates.
2. Deploy only the delivery API/DTO, ingestion changes, deletion schedule, supporting index, notification payload and privacy copy. Verify event invocation identities and scheduler, with minimum instances zero. Install the compatible app in the same rollout: the old app cannot acknowledge a durable local save.
3. Recheck inventory. Recover the recent provider recording through the bounded delivery flow if still eligible, without exposing its content to development tools. The overdue job must be deleted under the expiry policy. Do not discard the recent recording just to make the count zero.
4. Existing Firebase recordings can use the new endpoint immediately. `node scripts/migrate-audio-delivery.mjs` is read-only by default. After the app is ready, `--apply` caps remaining legacy copies at 24 hours from migration. Manifest, chunks and call expiry metadata update atomically with revision preconditions; concurrent changes are skipped rather than recreated. No audio is read. Applying changes requires owner approval.
5. Verify synthetic download/confirmation, chunk removal, restart playback, expiry and duplicate-callback handling; provider inventory and job completion; scheduler, authorization rejection and service health. Remove synthetic fixtures. Never call the owner's phone.

Physical-device background delivery and hardware Data Protection remain unverified. Simulator tests establish backup exclusion, persistence and playback, not physical-device encryption or real-call behavior.

## Validation

- `npm run check`: typecheck, **264 unit tests** and build passed after the notification/privacy changes.
- `npm run test:firebase`: **210 tests passed**, including owner-only delivery, receipt/digest/revision rejection, lost-response retry, chunk deletion, expiry, restoration bounds, late callbacks and an unfinished call's overdue provider deletion and fair retries past failing jobs. One full rerun hit an existing stopped-call-history test’s “Transaction is invalid or closed” emulator error; the subsequent full 210-test rerun passed.
- `node scripts/test-message-audio.mjs`: passed durable save, restart, backup exclusion, acknowledgement retry, account isolation, corruption, wrong digest, disk failure, account deletion, sign-out/sign-in race and delete race.
- iPhone 18 Pro simulator: **one test passed** covering file persistence, backup exclusion and audio playback before/after app relaunch with no service dependency. The simulator omits hardware Data Protection metadata. Initial test attempts exposed that test assumption; the production file-protection setting remains required.
- Final October 16 checks after origin hardening: typecheck/build and **273 unit tests** passed; **210 Firestore tests** passed. Swift audio/history storage tests passed. The real AppState offline simulator cold launch/relaunch/filter/detail test passed. Signed device build, installation and launch passed. Live synthetic delivery/deletion/expiry passed. No new real phone call was placed.

Apple references: [backup exclusion](https://developer.apple.com/documentation/foundation/optimizing-your-app-s-data-for-icloud-backup) and [background updates](https://developer.apple.com/documentation/usernotifications/pushing-background-updates-to-your-app).
