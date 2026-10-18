# Caretaker failure recovery — October 17, 2026

**The reproduced recovery and decline-button contrast defects are corrected in source. Physical acceptance and the wider accessibility audit remain open.** This focused pass covers Your contacts, Caretakers, incoming protection-alert requests and Call sharing, while preserving the owner-selected Apple-style theme. [Recovery evidence](../.impeccable/review/release-2026-10-17/contact-accessibility/verification.json) and [subsequent contrast evidence](../.impeccable/review/release-2026-10-17/contact-accessibility/decline-contrast/verification.json) retain their separate source hashes and results.

## Reproduction and correction

With three accepted synthetic caretakers and the largest accessibility text size, a failed pause or removal appended its error below all contacts and disclosures. Both regression tests failed because the message was outside the viewport. The last confirmed switch/contact state was retained, but the person could not see why their action had not completed.

The page now scrolls to **Change not confirmed** and requests accessibility focus on the notice. **Check current status** performs the existing fresh read; it does not retry a write or claim that a lost response proves the server made no change. A successful read clears the notice. A deliberate subsequent pause/removal still requires its normal action and, for removal, confirmation. Initial-load failures retain **Try again**. Connection errors use a plain-language instruction instead of an error-domain code.

No request route/body, contact-upload policy, permission, notification scope or sharing grant changed. Caretakers remain optional, require recipient acceptance and receive only connected-call monitoring intervention alerts. Call history, messages and recordings remain separate permissions. The one-failure fixture and its three contacts compile only into Debug simulator builds and never use a real account or send a message.

## Verification

| Run | Result | Scope and limitation |
|---|---|---|
| Baseline, compact iOS 27 | 5 passed / 4 failed | Five existing journeys passed; both new failure-visibility tests reproduced the defect; two unfiltered accessibility methods failed. |
| First correction, compact iOS 27 | 6 passed / 4 failed | Error visibility and VoiceOver passed. Recovery assertions could not find controls above the new scroll position; the test helper was corrected to navigate upward. The two raw audits still failed. |
| Corrected test navigation | 2/2 passed | Both mutations retain their last confirmed state after the injected failure and succeed on deliberate retry. |
| Final source, compact iOS 27 | **8/8 passed**, zero runtime warnings | Seven contact/caretaker journeys, including both recovery tests, plus the new VoiceOver walkthrough. |
| Final source, compact iOS 26.5 | **7/7 passed**, zero runtime warnings | The same seven journeys. The iOS 27-only VoiceOver service was not run on 26.5. |
| Final unsigned Release archive | **Passed** | Two arm64 bundles, three privacy manifests, no development networking exception, no UI-test markers. Distribution signing and App Store acceptance are unverified. |

The first test build failed because an XCTest key-path assertion did not accept the switch's `Any` value. Replacing that harness assertion with a value predicate compiled successfully. No product change was made to overcome that compiler error. Original failed results and corrected runs are retained.

Screenshots were inspected before and after the correction, including failed actions, retained state and successful retry on both simulator OS versions. At maximum text, the complete notice is revealed; lower actions remain scrollable. The actual Simulator VoiceOver service reached and spoke the notice, the status-check action and the retained **on** switch. The walkthrough uses direct UI actions with VoiceOver temporarily disabled; this does **not** certify native VoiceOver gestures, immediate announcement timing, physical-device behavior or older-adult usability.

Required typecheck/build and **376 unit tests** passed again. The unchanged backend at `a0619b2` had passed **284 Firestore emulator tests** in the second review and [independent CI](https://github.com/tigerisaac/aaacap-project/actions/runs/39094590443), including Firebase Auth/account-lifecycle checks. Those backend results are separate from the iOS UI evidence.

## Unfiltered accessibility findings

Both broad methods retain all diagnostics for contrast, clipping, touch area and element descriptions. The 16 captures cover the four screens at their initial and scrolled positions in standard Light Mode and largest-text Dark Mode. Both recovery checkpoint runs, before the color correction below, reported **13 contrast diagnostics**, with no suppressions or passing-audit claim:

- Five reports on disabled **Remove from iPhone** labels and two on disabled **Share contacts once** labels.
- Four on text at native scrolling edges: **Contacts settings**, incoming-request **Text messages**, **Waiting for them to join**, and either the saved contact name in the first run or the contact-sharing disclosure in the second. The changed scroll-edge association is retained in both raw reports.
- Two reports on **Decline request**, including its repeated unchanged scrolled capture.

The raw evidence is authoritative; these groupings describe the observed locations, not waivers or proof that native rendering caused every diagnostic. The overall count includes repeat observations. The exact count breakdown is recorded in the evidence file. Full accessibility acceptance remains a release gate alongside the previously documented findings.

## Decline-button contrast follow-up

The initial Light Mode capture showed the enabled **Decline request** label at **3.20:1** against its grouped background. One line now applies the theme's existing adaptive `Held` color to that label, including its accepted-state **Stop these alerts** wording. The destructive role, action, disabling and permission behavior are unchanged. The new unmodified capture measures **4.83:1** in standard Light Mode and **6.16:1** at largest text in Dark Mode. Sampling uses opaque text/background pixels in the native sRGB PNGs; it is supporting evidence, not a full accessibility certification.

The existing iOS 27 VoiceOver decline walkthrough passed, including the privacy explanation and return to **No requests**. The two unchanged, unfiltered audit methods still failed: **11 contrast reports** across the 16 captures, with zero runtime warnings. Neither standard-light incoming-alert capture reported an issue. Nine reports belong to Your contacts, one to the scrolled largest-dark incoming-alert screen and one to scrolled largest-dark Call sharing. All 11 lacked an associated element in this run, so earlier per-label classifications are not assigned to them. No audit threshold, issue handler, assertion or fixture changed.

The final unsigned Release archive passed again: two arm64 bundles, three privacy manifests, no development networking exception and no UI-test markers. All 273 tracked iOS file hashes match the tested manifest. This focused color follow-up ran on iOS 27; the earlier iOS 26.5 recovery checks precede it. [Captures, raw diagnostics, sampling and archive receipt](../.impeccable/review/release-2026-10-17/contact-accessibility/decline-contrast/verification.json).

## Overlapping-refresh follow-up — October 18

Source review found two additional ordering defects. In Caretakers, a successful pause or removal calls `load()`, but its `loading` guard can skip that confirmation while a pull-to-refresh is already pending. That older response can then show the previous setting or contact. In Alerts for others, overlapping reads have no ordering check: an older list can restore a request after the newer post-decline list removed it, and an older failure can display an obsolete error.

A local draft gives each read a revision, publishes results only for the current revision, invalidates owner reads when a mutation begins and checks the owner/session before applying mutation results. The intended confirmation read is no longer silently skipped. Five simulator regressions hold the older response behind an explicit release control and cover pause, removal, decline, an older failed read and failed confirmation followed by deliberate recovery. Both outer and inner fixture models use a nil backend; the synthetic transport exists only in Debug simulator builds.

**Validation is blocked before compilation, not passed.** Xcode changed to **27.1 (27A9275)** during this audit; the running CoreSimulator is **1171.7** while Xcode requires **1174.9.2**. The initial test command exited 70 without running any tests. Reading the simulator inventory triggered Apple's first-launch component setup, which is waiting for macOS authorization. The computer-control tool cannot access the protected SecurityAgent prompt; the owner was asked to complete it locally. No simulator was erased, reset or replaced.

The correction remains an **uncommitted local draft**. Once setup finishes, run the controlled tests against both original and corrected source, the existing recovery journeys on both supported runtimes, and a new unsigned Release archive inspection before committing it. Existing visual/accessibility findings above remain open. Typecheck/build and **382 unit + 284 Firestore tests** passed on the unchanged backend; these do not compile or verify Swift. [Source hashes, test boundary and tooling evidence](../.impeccable/review/release-2026-10-18/caretaker-refresh/verification.json). Independent [CI on the preceding `56424e6` checkpoint](https://github.com/tigerisaac/aaacap-project/actions/runs/39101053129) passed; that run does not contain this draft.

## Independent backend CI failure retained

**October 18 follow-up:** the investigation below is a historical checkpoint. A later SDK-only reproduction isolated the retry mechanism, and a deterministic regression verifies the source correction on both root and deployed dependency versions. Required checks and independent CI passed. The [retry-only rollout](FIRESTORE-RETRY-ROLLOUT.md) still requires separate owner approval; production incident attribution remains unproved. The original failed CI runs and diagnostic limits below are retained.

The pushed recovery/deployment-evidence commit `80a0e8d` passed the required typecheck/unit/build step, but [its independent CI](https://github.com/tigerisaac/aaacap-project/actions/runs/39097303655) failed **1 of 284 Firestore tests**: admission of 25 simultaneous users across two independent clients returned `3 INVALID_ARGUMENT: Transaction is invalid or closed.` The other 283 passed; account-lifecycle tests were skipped after that failure. Backend source, dependencies and workflow were unchanged from the passing `a0619b2` baseline.

This is a different test from the earlier stopped-history failure, despite the matching error text. The installed Firestore SDK 9.2.0 retries code 3 only for the message `transaction has expired`; that explains propagation of this error, not its origin. Firebase documents [emulator transaction limitations](https://firebase.google.com/docs/emulator-suite/connect_firestore#how_the_cloud_firestore_emulator_differs_from_production) and [bounded contention retries](https://firebase.google.com/docs/firestore/transaction-data-contention), but neither establishes this failure's cause or proves production is unaffected. No retry, timeout, assertion or backend behavior was changed, and no unchanged rerun was requested. The original failure remains open. [Sanitized evidence](../.impeccable/review/release-2026-10-17/operations/backend-ci-80a0e8d.json).

The app correction commit `7e8cec2` then passed typecheck/unit/build but [failed independent CI](https://github.com/tigerisaac/aaacap-project/actions/runs/39098163221) on the earlier **stopped-history backfill** test: again 283/284 Firestore passes, the same code 3 error and skipped account tests. The two original CI runs are retained, without rerunning or replacing them.

A bounded local diagnostic run of the unchanged **two-client admission** test reproduced the error on repetition four after three passes and stopped immediately. SDK logging and the emulator stack are retained privately. A different transaction encountered a retryable lock timeout; the failing transaction later returned an invalid/closed error that the SDK did not retry. The relationship between those transactions and the reason for invalidation remain unproved. Two SDK-only reductions—two transactions, then 25 transactions across two queues—each passed ten bounded rounds, so neither isolates the failure. No production retry, test timeout, assertion or call behavior changed. [Reproduction, setup corrections, runtime versions and evidence hashes](../.impeccable/review/release-2026-10-17/operations/transaction-diagnostics.json). This is unresolved reliability work, not a passing backend release gate.

This app patch was not installed on the owner's phone. It provides no production caretaker delivery, Contacts/iCloud, real-call, Apple or App Store evidence. The separately owner-approved [background-health rollout](BACKGROUND-JOB-HEALTH-ROLLOUT.md) is tracked independently.
