# Complete blocked-number retrieval — October 17, 2026

The repository fixes the server's silent 200-row limit and makes the iPhone wait for a complete list before replacing its screen or Call Directory handoff. The matching API is deployed on **`shieldapi-00032-zun`**, with source identity and public guards verified October 17 at 20:34–20:37 Central. Signed-in production pagination and physical CallKit operation still need acceptance before distributing this client.

## Behavior

Each server request scans at most 201 rows and returns at most 200. Ordering uses creation time and document ID, both descending, so equal timestamps cannot skip records. The cursor carries the selected participant and the last scanned position. It works after that boundary document is deleted. Authorization is checked on every page; malformed and wrong-person cursors are rejected. Helpers with current history sharing can read, but only the owner can unblock.

Expired entries are filtered from the response, while the cursor advances over scanned rows. An empty page therefore does not mean the whole list is empty. The response explicitly identifies pagination version 1 and includes the next cursor or a terminal null. The app rejects the older server contract instead of silently interpreting a truncated response as complete.

The shared Swift loader follows every page, deduplicates overlapping IDs, preserves a newer block and returns the complete ordered array. A later-page failure or cancellation returns no partial result. Session and mutation checks prevent a load from spanning a sign-out or local write. The first page is no longer reused from the navigation cache while later pages are fresh. A cancelled traversal that leaves the screen open now offers retry instead of waiting indefinitely. Unblock updates continue to use the existing account/mutation fencing and latest local snapshot.

Malformed cursors, cycles, oversized pages and traversals exceeding 1,000 requests fail visibly without publishing a partial list. This bounds abnormal server responses; it does not report the first 200,000 scanned rows as complete. The normal list is constrained by the existing 180-day expiry and call-admission limits.

Pagination is a traversal of changing server data, not an immutable database snapshot. Blocks created or renewed during traversal can appear on the next refresh, and another device's changes require a fresh load. A failed refresh retains the previously published phone list, subject to its expiry. iOS-installed blocking and exact expiry while Shield is suspended still require the separate [Call Directory acceptance](IOS-CALL-DIRECTORY.md).

Firebase documents [query cursors](https://firebase.google.com/docs/firestore/query-data/query-cursors) and the automatic [document-ID tie-break direction](https://firebase.google.com/docs/firestore/query-data/index-overview#default_ordering_and_the_name_field). No index change is required by this query shape. At **19:59 Central**, a read-only production query against a nonexistent synthetic participant accepted that ordering and returned zero documents; no customer content was read. This does not verify the new API in production.

## Evidence

- Five new emulator regressions failed before the fix. Afterward, all **57 forwarding tests** passed, including 401 active entries over three pages, an entirely expired first page, deleted boundary records, malformed/wrong-person cursors, helper revocation and unblocking an older entry.
- Required typecheck/build, **344 unit tests** and **262 Firestore emulator tests** passed. The existing Swift storage/cache suite passed with blocked-number pages excluded from navigation reuse.
- **Eight Swift pagination checks** passed, including failure/retry, empty intermediate pages, old/unknown server contracts, cursor cycles, resource bounds, overlapping records and cancellation after the transport returns.
- The actual iPhone screen and API client were exercised with synthetic pages and an isolated local directory. The initial iOS 26.5 run passed seven pagination/history/role/lifecycle journeys; two pagination methods passed after adding cancellation recovery. Eight journeys then passed on iOS 27. Visual inspection found a raw connection-error code, which was replaced with readable recovery text. Both final pagination methods passed again on each runtime, with zero runtime warnings. Four final light/standard and dark/largest-text captures were visually reviewed. The first Swift test compile had an invalid actor access inside a boolean autoclosure; its assertion was corrected before the passing run.
- The exact combined backend package passed **124 integration tests across six suites** and package startup/public-policy/authentication checks. Missing optional source-map messages belong to the copied production baseline; they did not fail the suite.
- The unsigned Release archive built successfully and passed packaging checks: the app and Call Directory extension are arm64, all three expected privacy manifests are present, and test fixtures/development networking exceptions are absent. This does not verify distribution signing.

Final simulator, visual and unsigned archive results are recorded with their exact source overlays in [the verification record](../.impeccable/review/release-2026-10-17/blocked-pagination/verification.json). These checks use synthetic data; they do not establish carrier behavior, real-device clearing, VoiceOver acceptance or a clean broader accessibility audit.

## Deployment boundary

The owner approved the [combined rollout](RETENTION-PAGINATION-ROLLOUT.md), adding exactly one compiled API file to the existing four-file retention proposal. Its original frozen package remains unchanged. The API and cleanup deployment completed after a fresh baseline check; downloaded source hashes, configuration, IAM and 100% traffic match the approved package, and unrelated services remain unchanged. [Deployment evidence](../.impeccable/review/release-2026-10-17/blocked-pagination/deployment/verification.json) is separate from the earlier local checkpoint.

No authorized production test-account session was available to exercise all pages. No production test data, physical installation, phone operation, Apple change or message delivery occurred. Finish authenticated production and physical acceptance before distributing the matching app. If the backend is rolled back to the old pagination contract, withhold or roll back this client too.
