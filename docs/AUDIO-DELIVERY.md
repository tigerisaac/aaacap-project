# Phone audio with temporary delivery

Repository implementation, October 16, 2026. **Not deployed or installed on the owner's phone.** The owner chose a temporary delivery copy followed by deletion. Production still runs the previous storage behavior.

## Storage contract

- Telnyx captures the unconnected inbound call. Ingestion deletes the provider copy after securely copying it, or directly when the call should be discarded. An independent five-minute expiry sweep retries overdue provider jobs, including jobs whose original event retries ended. Recording deletion does not run in call admission or call recovery.
- New Firebase manifests and all chunks have a maximum 24-hour delivery lifetime, anchored to the recording job's creation. Reads reject expired audio immediately. A five-minute scheduled sweep removes expired manifests/chunks; outages and bounded backlogs can delay physical deletion. No warm instance is added.
- The owner's app atomically saves ready audio in Application Support, excludes the folder and file from backups, applies iOS Data Protection, flushes the file, reads it back, and verifies SHA-256 before acknowledging delivery. Missing, corrupt, mismatched, cancelled or failed saves send no acknowledgement.
- The authenticated receipt binds the owner, message, digest and exact manifest revision. Confirmation transactionally deletes the manifest and every possible chunk. Repeated confirmation after a lost response succeeds. Another account or an obsolete revision cannot delete the copy. Provider callbacks cannot recreate delivered or expired content.
- Local files and their message list survive app restart and work offline. App state holds library metadata; file validation and playback load one recording at a time. Sign-out hides the library; the same account can reopen it. Account deletion removes that account’s local library. Another account cannot access it. Deleting the app or losing the phone loses the recordings.
- Downloads run after app refresh, from Messages, and opportunistically on notifications. Background delivery is not guaranteed. Open Shield within 24 hours of the call; a phone offline past expiry can lose audio. Local playback does not wait for the network. Failed acknowledgements retry on synchronization.
- Only the owner acknowledges delivery. A helper with listening permission can stream the temporary copy while it exists, but cannot consume the owner's delivery. After delivery or expiry, helper audio is unavailable. Summaries retain existing permissions and 30-day server retention.

The server verifies the receipt and digest but relies on the official app to enforce durable-save-before-confirmation; it cannot remotely prove physical phone storage. No prompt or screening policy changed.

## Production inventory

Read-only metadata audit at **2026-10-17 01:09:25 UTC / October 16 20:09:25 Central**:

| Location | Observation |
| --- | --- |
| Firebase audio manifests / chunks | 0 / 0 |
| Firestore point-in-time recovery | Disabled |
| Firestore backup schedules / database backups | 0 / 0 |
| Telnyx recordings | 2 |

Both provider recordings have pending ingestion jobs and no recorded deletion. One is a 28-second shared-path capture approximately five hours old, with an ended call marked screening unavailable. The other is a 3-second older TeXML capture approximately 427 hours old. Neither was downloaded, listened to, evaluated or deleted. Their job state establishes unfinished processing, not its exact cause. The log lookup was unavailable; an empty diagnostic list does not establish absence of errors. Content-free evidence: `artifacts/private/audio-delivery/inventory.json`.

## Coordinated rollout

1. Obtain owner approval for this audio-storage release, provider cleanup and updated phone app. Earlier approval covered startup recovery. Preserve deployed screening/message policies and unrelated functions; do not deploy all repository candidates.
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
- No production deployment, real calls, provider deletions or audio migration performed.

Apple references: [backup exclusion](https://developer.apple.com/documentation/foundation/optimizing-your-app-s-data-for-icloud-backup) and [background updates](https://developer.apple.com/documentation/usernotifications/pushing-background-updates-to-your-app).
