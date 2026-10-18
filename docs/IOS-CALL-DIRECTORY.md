# iPhone blocking-list lifecycle — October 17, 2026

The repository now scopes the Call Directory file to its signed-in account and protected person, retains each server expiry, excludes the file from backups, and persists a pending update until iOS acknowledges the reload. Sign-out, account change and confirmed loss of ownership clear the local handoff. This is source and simulator evidence; it is not physical-phone acceptance or a deployment.

## Corrections

The earlier file contained only numbers, without ownership or expiry. Signing out did not clear it. Reload errors were discarded, and an unchanged file prevented another attempt. An older list response could also restore a number just unblocked by the person.

The versioned replacement normalizes, deduplicates and sorts valid numbers, filters expired entries, and stores a hash of the account namespace plus the participant ID. Legacy or corrupt files cannot establish current authorization and are replaced with an empty list until an authorized response arrives. Atomic writes use protection until first unlock and reapply the backup-exclusion attribute, including when data is unchanged. The extension also filters expired entries when it is asked to load the file.

One coordinator serializes reloads. The pending bit is written before requesting a reload, survives app termination and clears only after a successful callback for the same revision. A failed disk write retains the desired update in memory, reports the error and does not request a reload of stale data. Account/session, ownership and mutation checks reject stale responses. Unblocking removes that number from the latest local snapshot, preserving unrelated blocks received while the request was running.

Authentication, navigation and server deletion proceed after staging the local update; they do not wait indefinitely for CallKit. Failed updates remain visible in Blocked numbers with a retry action and Phone settings guidance. A failed clear after sign-out also reaches the app's existing error alert. Foreground refresh retries pending updates and removes expired entries even before networking. Disabled extensions keep the update pending until they can load it.

Apple documents [reload completion and errors](https://developer.apple.com/documentation/callkit/cxcalldirectorymanager/reloadextension(withidentifier:completionhandler:)), the extension's [request-driven loading](https://developer.apple.com/documentation/callkit/cxcalldirectoryprovider), and the need to reapply [backup exclusion after file operations](https://developer.apple.com/documentation/foundation/urlresourcevalues/isexcludedfrombackup). A saved file is not proof that iOS has installed its contents.

## Verification

| Check | Result and boundary |
|---|---|
| Required backend checks | Typecheck/build, 344 unit tests and 257 Firestore emulator tests passed. No backend source changed in this checkpoint. |
| Actual Swift storage/coordinator harness | 12 checks passed: expiry/version bounds, metadata repair, offline expiry, failed reload/relaunch, account switch, stale reload completion, ownership loss, stale fetch/unblock, disabled extension, legacy file, disk failure and nonblocking authentication. |
| iOS 27 focused run | 7/7 passed, zero runtime warnings: actual AppState sign-out with an injected delayed/failing reloader, retry/relaunch, three offline-history journeys, block/unblock, helper restrictions and sample-account sign-out. |
| iOS 26.5 compatibility run | The same seven checks passed, zero runtime warnings. This run additionally includes the final screen-local load revision guard; the earlier iOS 27 source manifest is retained separately. |
| Largest-text visual review | Failure guidance and the complete retry control were inspected after scrolling; recovery removes the error and persists across relaunch. These use synthetic data and an injected reloader, not the system's real blocking service. |
| Unsigned Release archive | Built successfully; both arm64 bundles, all three privacy manifests, production network settings and simulator-fixture exclusions passed the actual archive checks. Distribution signing and physical installation are not verified. |

The first local Swift compile was blocked from the compiler cache by the sandbox; the permitted run passed. An initial iOS fixture emitted a Swift concurrency warning from a mutable captured variable. Its reloader is now isolated on the main actor; the final runs contain no Swift compile warnings or recorded runtime warnings. Original logs are retained. See [verification, source hashes and archive result](../.impeccable/review/release-2026-10-17/call-directory/verification.json).

## Remaining acceptance

- A real distribution-signed phone must prove enable/disable, block and unblock, delayed/failed reload recovery, sign-out/account switch, ownership removal, deletion, restart and expiry. Include saved/recently dialed numbers and interactions with forwarding and carrier voicemail.
- iOS can retain its installed list while Shield is suspended or absent. Per-entry dates do not schedule an automatic operating-system reload. Opening Shield and a successful reload are required for this implementation's refresh guarantee. No claim is made that expired bytes or iOS-managed copies disappear exactly at expiry.
- Backup exclusion is verified on the new local file. Existing device/iCloud backups, other devices, uninstall/reinstall and operating-system-managed copies remain unverified.
- This checkpoint found that the server list endpoint stopped at 200 rows. The subsequent [pagination correction](IOS-BLOCKED-NUMBERS.md) fixes complete retrieval in repository code, including expired pages and older-entry unblocking. Its matching backend must be deployed before distributing the client; the old live contract remains a release gate. The server's per-number call-control check is independent.
- The wider unfiltered accessibility findings, physical VoiceOver and senior task rehearsal remain open in the [release checklist](APP-STORE-RELEASE.md).

No live backend, phone settings, calls, messages, Apple configuration or physical installation changed in this checkpoint. The separately frozen [retention rollout](RETENTION-ROLLOUT.md) is unchanged and still awaits its existing approval request.
