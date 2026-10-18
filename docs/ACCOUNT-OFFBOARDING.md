# Guided disconnection and account deletion

October 17, 2026 — guided disconnection and cancellation were deployed with owner approval, followed by the approved durable account-deletion overlay on `shieldapi-00031-cif` and `finishaccountdeletions-00001-kif`. The deletion index, runtime deletion permission and minute schedule were verified; no production account was erased by this audit. Broader privacy/consent changes remain repository work. The iPhone guide and saved carrier instructions are available locally. Explicit progress and final routing changes use the server. [Exact rollout and verification limits](IOS-BACKEND-ROLLOUT.md). No carrier change or real phone call was performed.

## The senior's journey

**Settings → Disconnect Shield** opens the same guided surface used by **Phone setup → Options → Disconnect Shield**. **Delete account** first checks every phone owned by the account and offers this guide for any phone that still needs restoration. Helper and never-enrolled accounts go directly to the deletion explanation and confirmation.

The guide uses onboarding's typography, generous buttons, demonstrations, Phone handoff and Settings instructions. It presents one task at a time, saves explicit confirmations to the server and resumes after closing/reopening. At the largest text sizes, actions scroll with the instructions instead of covering them. A failed save leaves the current task visible with retry/refresh; help can restart the carrier steps without pretending a reset succeeded.

1. Explain the exit and the need for another phone or any trusted caller. A designated Shield helper account is not required.
2. Restore the line's carrier forwarding. Dial codes come only from the operator-approved, line-specific `restorationCodes` field. Existing saved text instructions are shown when structured codes are absent. Never infer a reset from the carrier name or silently replace someone's custom forwarding.
3. Select **Never** for Screen Unknown Callers so ordinary calls can ring.
4. Leave **Live Voicemail off** during the carrier check. Otherwise the iPhone could answer and hide a broken carrier voicemail configuration.
5. Receive and answer an ordinary call, hear each other without Shield's greeting/press-1, and end the call.
6. Leave an unanswered call, hear the normal carrier voicemail greeting and retrieve the resulting message in Phone.
7. Save completion. Offer optional Live Voicemail re-enablement, keep the account, or return to account deletion. Deletion still requires its own clear final confirmation.

The account deletion screen offers to restore phone numbers Shield previously removed from Contacts before deleting this device's saved restoration copies. The person can decline restoration while still deleting those copies. Contacts permission, a failed restore or a damaged backup does not force them to keep their account: they can choose not to restore and discard the saved copy. Existing contact cards and the saved Shield contact are not silently removed.

## Cancelling disconnection

**Close** retains the saved session. **Cancel disconnection** explicitly clears the owner's saved intent through a session-bound server transaction. If no step has been confirmed, the owner may confirm that they changed no phone settings and keep the existing service configuration. Otherwise, or when uncertain, cancellation opens a path back to Phone setup; Home requires fresh ring and forwarding checks before reporting readiness. Restarting the disconnect guide does not erase the fact that phone changes were confirmed.

Cancellation never enables routing, renews consent, changes carrier settings or undoes a completed disconnection. Old probe callbacks are fenced, retries are idempotent, and a stale cancellation cannot clear a newer session. The iPhone applies the acknowledged fields to its saved snapshot without renewing the age of unrelated configuration. Session identifiers from iOS are normalized before comparison for both confirmation and cancellation. Deployment status is recorded in [Status](STATUS.md).

## What completion means

Starting the guide preserves the current service configuration. It does not pause callbacks or claim carrier forwarding stopped. Active calls block starting/restarting restoration. New setup probes and setup mutations are unavailable during restoration, and old probe callbacks cannot qualify the line.

A random server session and exact step ID bind each confirmation. Confirmations must arrive in order; retries of an already-saved step are idempotent, and an old session cannot finish a restarted guide. Each owned phone is checked independently.

Before the last confirmation, the backend rejects active calls and any forwarded call recorded since the ordinary-call checks began. Successful completion atomically clears forwarding consent, disables the line's shared routing and supervised window, turns off connected-call monitoring and records `owner_confirmed` evidence. A later carrier change still needs its own new setup/qualification; stale activation screens cannot reconnect it.

**This is owner-confirmed restoration, corroborated by Shield's inbound records, not automatic carrier verification.** Shield cannot inspect iPhone settings or prove that every busy/unreachable condition is restored from two owner confirmations. Line-specific carrier resets and physical acceptance tests remain essential. The guide never labels returning from Phone/Settings as proof.

## Durable account deletion

The client rechecks all owned phones, cancels stale account loads, erases this iPhone's audio/history and stages an empty Call Directory handoff. The local blocking-list correction retains a pending reload and reports failures rather than treating a file write as proof that iOS cleared its list. Server deletion does not wait indefinitely for CallKit; physical clearing and other-device behavior remain acceptance gates. [Blocking lifecycle and evidence](IOS-CALL-DIRECTORY.md). A status-only receipt and initiating account namespace are saved before submitting the final request, allowing a dropped response to be recovered. The UI distinguishes an unconfirmed request from one accepted by the server; retry cannot submit against a different signed-in account.

The server atomically fences owned participants and saves an encrypted account-deletion job. Other authenticated API operations are rejected for a deleting account. A two-minute settling period lets bounded in-flight requests drain. `finishAccountDeletions` runs every minute, claims due jobs with a lease and retries failures. The matching API/worker/index rollout is deployed; observed scheduled HTTP success is not evidence that a real account completed erasure.

Cleanup retains server-recorded participant IDs across retries, drains paginated records, removes sharing/contact relationships and route references, and deletes the Firebase identity last. A provider failure or lost completion write does not require the app to remain open. The unguessable receipt reveals only pending/complete, works after the login is deleted, and expires seven days after completion. The client can close an unavailable receipt without claiming successful erasure.

Provider recording-erasure jobs remain able to delete Telnyx copies. Pending jobs retain encrypted identifiers until successful cleanup; completed jobs remove those identifiers and retain only the minimal receipt/expiry record. Minimal SMS STOP hashes and existing short-lived abuse records have separate retention. Copies on other offline devices and provider metadata remain in the broader release audit; completion is not a promise that arbitrary offline devices were remotely wiped.

## Rollout and acceptance gates

- The approved receipt/job API, index and worker rollout is complete. The matching distribution client and production erasure/retry acceptance remain release gates; do not infer them from backend readiness.
- Save and review each line's original restoration instructions. `manage-forwarding-test.mjs prepare` accepts optional `codes` in its private restoration file and validates their format; omission means written instructions, not guessed codes. Preparing is still a production action requiring approval.
- Verify pending-job monitoring, retry recovery and the expected few-minute completion on the chosen release before enabling the UI in production.
- Run supervised real carrier restoration for unanswered, busy/declined and unreachable calls, and retrieve actual carrier voicemail. Use approved participants; never infer these results from simulators.
- Rehearse independently with a senior, including no helper present, carrier-code failure, no internet, app restart, cancelled deletion and multiple owned phones. Review an exceptional path for someone without access to their line; do not leave an indefinite deletion/support loop.
- Complete the [App Store release checklist](APP-STORE-RELEASE.md), including subscription-aware deletion when purchases are implemented, other-device erasure, provider retention, legal review and App Review acceptance.

Apple requires accessible in-app initiation, clear completion information and account erasure rather than only disabling an account. It permits asynchronous completion but discourages unnecessary support requirements. [Apple account deletion guidance](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion).

## Local validation

Results are recorded in [Status](STATUS.md). Emulator tests exercise ordered/retried/stale confirmations, active-call and forwarded-call guards, no premature service shutdown, account isolation, write fencing, delayed worker cleanup and completion receipts. Simulator tests exercise the guided carrier/settings/call checks, restart, errors, large text and deletion handoff. They do not establish real-carrier restoration or novice usability.

The separate `npm run test:accounts` suite passed **8/8** checks using Firebase's actual Auth and Firestore emulators in `demo-shield-accounts`. It covers never-enrolled accounts, helpers, alert-only recipients, owners and multiple owned phones; old ID/refresh-token rejection; unrelated-account preservation; a still-forwarding phone; simultaneous deletion workers; a lost response after identity deletion; and recreation of the same verified phone without restored history/access. Phone verification is synthetic and sends no SMS. Only the lost-response case wraps the real identity deletion to inject a failure; the Auth account lookup, creation, custom-token exchange, verification and removal use the emulator.

The suite requires its dedicated loopback emulator hosts and demo project, and is now included in CI after the existing Firestore suite. It does not verify production IAM, signed production tokens, remote device erasure, Telnyx copies or RevenueCat/Apple erasure. Firebase documents the [Auth emulator's differences from production](https://firebase.google.com/docs/emulator-suite/connect_auth); these limits remain in the release checklist.

### Caretaker permissions and erasure — October 18

The expanded account suite passes **12/12** on the dedicated Auth and Firestore emulators. Four new cases use the actual account/session implementation and create/accept caretakers through the app API, with a synthetic SMS sender. The existing eight lifecycle cases remain included.

- An accepted caretaker with no enrolled phone, and one who owns a different phone, each receives **403** for sixteen protected read cases spanning overview, call history/detail, messages/audio, saved/shared numbers, blocked numbers, sharing, setup/restoration and owner caretaker settings. The protected owner first receives **200** for every case; the message's private summary and exact synthetic audio bytes are also verified. This prevents absent data or an invalid route from masquerading as a passing privacy check.
- Six protected mutations per account setup are denied, including message actions, owner caretaker controls and deletion with another person's selected ID. Missing or different selected-person headers do not bypass resource-specific audio checks. Account/deletion listings contain only the caller's own phones, and incoming caretaker responses expose only the six intended relationship fields.
- Separate history-only sharing reveals history without the message summary or audio. Explicit listening permission adds those, while destructive durable audio delivery remains owner-only. Revoking sharing does not revoke accepted caretaker consent; declining caretaker alerts does not revoke an independent listening grant. Revoking the final grant blocks history/audio again.
- Deleting an API-created caretaker removes its relationship and sessions while preserving the protected person's account and saved message. Recreating the same phone produces a new UID, no incoming relationship, no ability to reuse the old acceptance and no audio access.

The first expanded run retained **10 passes / 2 failures**: the owner positive control correctly denied forwarding access because the synthetic participant lacked an enrolled Shield number. Completing that fixture corrected the test without changing a production guard. The final run also retains the SDK's `MetadataLookupWarning` from its metadata-availability probe; it did not fail a check, and no warning was suppressed. [Exact source boundary, outcomes and limitations](../.impeccable/review/release-2026-10-18/caretaker-privacy-boundaries/verification.json). These are local permission/lifecycle results, not production erasure, real SMS delivery or Apple acceptance.

First-attempt [independent CI for `9a0410c`](https://github.com/tigerisaac/aaacap-project/actions/runs/39157798166) also passes typecheck/build, **382 unit + 284 Firestore + 12 account checks**. The [receipt](../.impeccable/review/release-2026-10-18/caretaker-privacy-boundaries/backend-ci-receipt.json) retains metadata-probe, dependency-security, deprecation and install-script warnings; a successful workflow does not clear them. This CI run does not compile Swift or exercise production erasure.
