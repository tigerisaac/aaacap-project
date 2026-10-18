# Caretaker failure recovery — October 17, 2026

**The reproduced app defect is corrected in source. Physical acceptance and the wider accessibility audit remain open.** This focused pass covers Your contacts, Caretakers, incoming protection-alert requests and Call sharing, while preserving the owner-selected Apple-style theme. [Evidence, captures and source hashes](../.impeccable/review/release-2026-10-17/contact-accessibility/verification.json).

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

Both broad methods retain all diagnostics for contrast, clipping, touch area and element descriptions. The 16 captures cover the four screens at their initial and scrolled positions in standard Light Mode and largest-text Dark Mode. Each run reported **13 contrast diagnostics**, with no suppressions or passing-audit claim:

- Five reports on disabled **Remove from iPhone** labels and two on disabled **Share contacts once** labels.
- Four on text at native scrolling edges: **Contacts settings**, incoming-request **Text messages**, **Waiting for them to join**, and either the saved contact name in the first run or the contact-sharing disclosure in the second. The changed scroll-edge association is retained in both raw reports.
- Two reports on **Decline request**, including its repeated unchanged scrolled capture.

The raw evidence is authoritative; these groupings describe the observed locations, not waivers or proof that native rendering caused every diagnostic. The overall count includes repeat observations. The exact count breakdown is recorded in the evidence file. Full accessibility acceptance remains a release gate alongside the previously documented findings.

This app patch was not installed on the owner's phone. It provides no production caretaker delivery, Contacts/iCloud, real-call, Apple or App Store evidence. The separately owner-approved [background-health rollout](BACKGROUND-JOB-HEALTH-ROLLOUT.md) is tracked independently.
