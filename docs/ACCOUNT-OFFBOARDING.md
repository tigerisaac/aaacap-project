# Guided disconnection and account deletion

October 17, 2026 — the guided disconnection subset, including explicit cancellation, is deployed as `shieldapi-00027-xaw` with owner approval; the durable account-deletion and privacy rollout remains repository implementation only. The iPhone guide and saved carrier instructions are available locally. Explicit progress and final routing changes use the server. [Deployment evidence](STATUS.md#october-17--local-phone-setup-and-disconnection-guide-installed-guided-backend-deployed). No carrier change or real phone call was performed.

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

The client rechecks all owned phones, cancels stale account loads, erases this iPhone's audio/history and clears its Call Directory list. A status-only receipt and initiating account namespace are saved before submitting the final request, allowing a dropped response to be recovered. The UI distinguishes an unconfirmed request from one accepted by the server; retry cannot submit against a different signed-in account.

The server atomically fences owned participants and saves an encrypted account-deletion job. Other authenticated API operations are rejected for a deleting account. A two-minute settling period lets bounded in-flight requests drain. `finishAccountDeletions` runs every minute, claims due jobs with a lease and retries failures. It needs to be deployed with the API before the UI can promise background completion.

Cleanup retains server-recorded participant IDs across retries, drains paginated records, removes sharing/contact relationships and route references, and deletes the Firebase identity last. A provider failure or lost completion write does not require the app to remain open. The unguessable receipt reveals only pending/complete, works after the login is deleted, and expires seven days after completion. The client can close an unavailable receipt without claiming successful erasure.

Provider recording-erasure jobs remain able to delete Telnyx copies. Pending jobs retain encrypted identifiers until successful cleanup; completed jobs remove those identifiers and retain only the minimal receipt/expiry record. Minimal SMS STOP hashes and existing short-lived abuse records have separate retention. Copies on other offline devices and provider metadata remain in the broader release audit; completion is not a promise that arbitrary offline devices were remotely wiped.

## Rollout and acceptance gates

- Deploy the receipt/job API, indexes, worker and client together after owner approval; no deployment was performed here.
- Save and review each line's original restoration instructions. `manage-forwarding-test.mjs prepare` accepts optional `codes` in its private restoration file and validates their format; omission means written instructions, not guessed codes. Preparing is still a production action requiring approval.
- Verify pending-job monitoring, retry recovery and the expected few-minute completion on the chosen release before enabling the UI in production.
- Run supervised real carrier restoration for unanswered, busy/declined and unreachable calls, and retrieve actual carrier voicemail. Use approved participants; never infer these results from simulators.
- Rehearse independently with a senior, including no helper present, carrier-code failure, no internet, app restart, cancelled deletion and multiple owned phones. Review an exceptional path for someone without access to their line; do not leave an indefinite deletion/support loop.
- Complete the [App Store release checklist](APP-STORE-RELEASE.md), including subscription-aware deletion when purchases are implemented, other-device erasure, provider retention, legal review and App Review acceptance.

Apple requires accessible in-app initiation, clear completion information and account erasure rather than only disabling an account. It permits asynchronous completion but discourages unnecessary support requirements. [Apple account deletion guidance](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion).

## Local validation

Results are recorded in [Status](STATUS.md). Emulator tests exercise ordered/retried/stale confirmations, active-call and forwarded-call guards, no premature service shutdown, account isolation, write fencing, delayed worker cleanup and completion receipts. Simulator tests exercise the guided carrier/settings/call checks, restart, errors, large text and deletion handoff. They do not establish real-carrier restoration or novice usability.
