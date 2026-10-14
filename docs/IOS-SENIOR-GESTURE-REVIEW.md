# Shield: final gesture and recovery review

October 14, 2026. Follow-up to [the senior finish report](IOS-SENIOR-FINISH.md), based on `3370ec1` plus the changes recorded in the [new evidence ledger](../.impeccable/review/gesture-continuation/test-evidence.json). All users, messages and results in this review are synthetic local simulator fixtures. Production deployment and real-call evidence belong in [Status](STATUS.md).

## Barriers found and corrected

| What a senior could experience | Correction |
| --- | --- |
| “I pressed Send on the keyboard, but nothing happened.” | The email field is a native single-line field. Send submits rather than adding a newline. The purpose heading is a VoiceOver heading. |
| “The keyboard is still here. Where did the error go?” | Sending dismisses the keyboard. Error recovery waits for keyboard dismissal when necessary, brings the complete notice into view, and retains the address. Editing clears stale feedback. At accessibility text sizes, an unfocused address also has a wrapping visual review below the field; VoiceOver reads the native field's full value once. |
| “These tiny All/Kept words don't grow with everything else.” | From `.xxxLarge`, the sample Messages filter becomes a full-width native menu, with wrapping text and a 52-point minimum target. Selected state, the empty-state explanation and keeping a sample message remain available. |
| “The invitation field cuts off its prompt.” | The placeholder is shortened to Code. The visible Invitation code label, paste instructions and native spoken label retain the full context. |
| “Continue is still being read. What changed on this page?” | The two onboarding questions and phone setup request focus from the rendered new heading. Completion controls have a new identity for each step, avoiding reuse of the previous action's focused representation. |
| “Did I just confirm the same reset twice?” | Disconnection focuses the current numbered progress target, creates a fresh stage and confirmation action, and focuses the completion heading. The copied-code disclosure retains its expanded preference across reset codes. Each new Phone settings stage starts with its own unconfirmed guidance. |

The established visual style remains: quiet neutral surfaces, navy actions, serif purpose headings, familiar symbols and clear native groups. The follow-up reviewed the daily/setup compositions again, then inspected the changed screens running at ordinary and maximum text sizes. The maximum-text Messages menu and empty-state guidance were exercised in Dark Mode. Text remains scrollable and is never shrunk to fit a capture.

The email gesture issue is captured [before](../.impeccable/review/gesture-continuation/email-send-newline-before.png) and [after](../.impeccable/review/gesture-continuation/email-send-recovery-after.png). Other selected checkpoints and their provenance are in the [capture manifest](../.impeccable/review/gesture-continuation/capture-evidence.json).

## Continuous VoiceOver walkthrough

Device Hub pointer taps, double taps at the focused control, and one-finger reading swipes operated the iOS 27 simulator with **VoiceOver continuously enabled** during the actions below. This supersedes the earlier blanket statement that simulator gesture activation could not be made to work. The separate XCTest speech helper still logs its temporary VoiceOver interruptions for direct actions; those test results must not be described as uninterrupted gestures.

| Journey | Observed result |
| --- | --- |
| Native control reference | A native switch changed off/on through pointer gestures, and a reading swipe reached the next target. |
| Sign-in, maximum text | Reading swipes brought the email field into view. Synthetic entry and the native Send key submitted, dismissed the keyboard and exposed the complete error. The exact email value remained. |
| Email return | The sent address, Junk/Spam guidance, Resend link and Change email were reachable. Change email returned to the focused native field with the original address and keyboard. |
| Home, calls and messages, maximum text | A message row opened its detail; Keep changed the saved state. Calls filtering, call-detail disclosure, the Messages tab, More and Get help were reachable. The corrected Messages menu selected Kept and reading swipes scrolled its empty-state guidance into view. |
| Onboarding | Switches, disclosure, Back and the next question were reachable. Unsaved selections survived Back; a failed save exposed the alert and safe cancellation retained the choice. The corrected transition's next reading swipe reached the new question's explanation. |
| Family and friends | Finishing name entry dismissed the keyboard and focused Include messages. Invitation confirmation named the helper and access scope. Not now and Keep sharing preserved the entered name and existing grant. No real invitation was sent. |
| Contacts | The removal warning named the contact and explained the iCloud consequence. Keep contact retained the entry. |
| Invitation, Dark Mode | Finishing entry focused acceptance. Failure focused the notice; Edit code returned to the retained native field. Editing cleared stale feedback. |
| Quiet hours | The switch, times and time-zone explanation were reachable. Failed save exposed and focused Hours not confirmed while retaining the chosen schedule. |
| Playback | Synthetic playback, Pause, Resume, the listened-state failure notice, Mark as listened and volume help remained reachable. |
| Guided setup | All ten app-owned steps reached completion with simulated sound/forwarding results and settings returns. The corrected code-to-check transition started the reading flow at the new heading. No real Phone setting or carrier result was verified. |
| Disconnection | All seven app-owned steps and completion were reached through synthetic confirmations. Copied codes, simulated settings return, failure guidance and the final qualification were readable. A new step's next reading swipe reached its introductory guidance rather than skipping its instructions. |

This is a bounded simulator walkthrough. It does not certify a physical iPhone, three-finger scrolling, hardware-keyboard VoiceOver commands, complete speech delivery, actual carrier handoffs, or older-participant comprehension. Rapid pointer sequences sometimes needed a fresh focus and another double tap; Device Hub input behavior is not physical-device evidence. Simulator VoiceOver and keyboard capture were restored to off before automated tests.

## The clipping investigation

The standalone [native boundary fixture](../ios/Diagnostics/NativeBoundary.swift) contains only SwiftUI primitives, system colors and synthetic text. It is outside the shipped app target. Its optional XCTest method runs only when an installed fixture bundle is explicitly supplied in the test runner environment.

On the iOS 26.5 small-phone simulator, each of four footer variants passed the initial clipping audit, then reported **All calls** after scrolling: a plain native Button, a custom native label stack, that stack without `fixedSize`, and combined accessibility children. Each footer still activated and opened the expected destination. A second build using a larger native serif counter produced the same four named reports. A reviewed failing capture showed the complete footer text and target inside the viewport.

This establishes a native-only reproduction of a named clipping report. It does **not** establish the cause of Shield's report, clear its raw audit, or explain the separate report with no associated element. Neither reference build reproduced that unnamed report. All audit handlers retain every finding; no diagnostic is waived or filtered.

## Verification

Individual final results, failed attempts, source hashes and capture provenance are in the [evidence ledger](../.impeccable/review/gesture-continuation/test-evidence.json). The prior comprehensive surface matrix and twelve corrected XCTest spoken-focus methods remain separately recorded in the [earlier ledger](../.impeccable/review/voiceover-continuation/test-evidence.json).

- Repository typecheck, unit tests and build passed: **232 tests**. The required Firestore-emulator run passed **159 tests** on a sequential retry after one invalid/closed-transaction failure. Sandbox port failures and the first authorized failure remain in the ledger.
- The final iOS 27 sequence recorded **eight passing functional/spoken-focus methods**, covering the guided setup, reset codes and saved progress, largest-text disconnection, email keyboard recovery, message keeping/filtering, onboarding save recovery and setup/disconnection reading. All methods finished, but Xcode then stalled saving its extra diagnostics. Its process was terminated; that result bundle is incomplete. The individual pass/fail results remain in the log and are not a clean command completion.
- Before the invitation prompt correction, the broad iOS 27 raw audit retained **ten contrast and two clipping reports** across three failed methods out of six. One clipping report identified the invitation placeholder and was corrected. The focused invitation clipping audit then passed all four light/dark and ordinary/maximum-text captures on both the iOS 27 Pro and iOS 26.5 SE simulators. This does not turn the earlier broad audit into a passing run.
- On the iOS 26.5 small phone, the message-keeping/filtering and largest-text Dark Mode disconnection checks passed. The first email test tapped the main action while its center was covered by the keyboard and failed. After correcting the test to use the visible native Send key, ordinary and maximum-text recovery passed: no keyboard, complete feedback inside the viewport, and the exact retained email.
- The same native Send recovery passed on the iOS 27 Pro in the final focused run. An intermediate native-key visibility assertion failed despite both completed recovery paths; the final driver waits for key existence and retains all submission outcome assertions. That failed attempt remains in the ledger.
- The current small-phone everyday raw audit still retains **five contrast and two clipping reports**, including the named All calls target and one with no associated element. Zero hit-region or missing-description reports were returned in that scope. The unnamed clipping report remains unresolved. No raw audit is waived or described as clean.
- The final app source built successfully in Release configuration. No production deployment was performed.

No owner phone, real recording, carrier configuration or production service was changed. Pushing source to main is not a production deployment.
