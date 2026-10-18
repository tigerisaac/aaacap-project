# Apple-style iPhone theme port — October 17, 2026

The owner subsequently requested restoration of the earlier visual design. See the [October 18 restoration and verification record](IOS-THEME-RESTORATION.md). The results below describe the historical Apple-style port.

The visual work from `origin/Andrewwww` at `c9818b6` is ported onto the current Shield app. This is a selective source port, not a merge of the older application state. The shared ancestor is `c9412ca9dcbf585965a24d6a0d026a6cb6d36b09`. The original branch changed about 80 paths; 33 source files needed reconciliation with newer main work.

## Result and preserved behavior

Root pages use native bold system titles, inset groups, system backgrounds and native bar materials. Calls and messages use circular symbols; Settings uses colored symbol tiles. The stopped-call total follows the branch's Health-style summary. Welcome and setup pages adopt the shared fields, margins and bottom actions, with inline sign-in and protection-onboarding actions at accessibility text sizes.

Current main remains authoritative for:

- Phone-only sign-in, verification-code recovery, formatting and the native keypad without an added Done toolbar.
- Explicit **Share contacts once / Update shared contacts**, manual contact-name limits and failure recovery.
- Optional Settings caretakers receiving only monitoring-intervention alerts, with call-history access kept separate.
- Subscription and pilot eligibility, the **$9.99 monthly / $99.99 yearly** display, account deletion and guided disconnection.
- Native switch accessibility, wrapping/full-row targets, navigation return behavior, retained loading state and unavailable-audio handling.

The older setup/restoration screens and audio/compiler workarounds from the branch were not restored. Sign-in requests, number saving, caretaker requests and protection-consent saving retain their pre-port method bodies; hashes are recorded in the evidence. The only test expectation repaired during the interaction run was an outdated caretaker empty-state sentence. Its replacement also requires that the accept button and switches disappear after stopping alerts, and that Done remains reachable.

## Verification

| Check | Result |
| --- | --- |
| Backend typecheck, unit suite and build | Passed; 344 unit tests |
| Firestore emulator suite | Passed; 254 tests on dedicated local ports |
| First iOS 27 interaction run | 45/46 passed; one stale empty-state expectation, retained in evidence |
| Corrected caretaker regression | Passed on iOS 27 and 26.5; all 46 distinct interaction methods have passing evidence across runs |
| iOS 26.5 compatibility run | 5/5 passed: native code keyboard, repeated navigation return, quiet-hours stability/reversal, optional caretaker route and annual pricing |
| iOS 26.5 accessibility/large-text run | 4/7 methods passed; three unfiltered audits failed with 19 contrast diagnostics |
| iOS 27 diagnostic follow-up | Caretaker and navigation passed; three product audits and two reference audits failed, with findings separated below |
| Final focused setup/toolbar audits | iOS 26.5: 2/2 passed. iOS 27: both methods still fail on four native Cancel/Close control reports; setup-number reports cleared |
| Final simulator build | Passed |
| Final unsigned Release archive | Passed packaging checks; two arm64 bundles and three privacy manifests |

The initial Firestore run passed 253/254 and timed out in the existing 25-admission concurrency test. A retry could not start because the usual emulator port was occupied. The final complete run used isolated Firestore/hub/logging ports and disabled cloud metadata discovery; all 254 passed. Neither the implementation nor the timeout was changed. The original failures are retained rather than replaced by the successful run.

The first simulator build exposed an old branch fixture's reference to an unavailable contrast variable. The port now uses the existing environment-aware field modifier. The later cleanup removes an empty initializer and an identity-only view modifier, and clarifies comments. The broad run's source manifest and the final build's source manifest are kept separately.

The final archive is `/tmp/shield-apple-theme-complete-oct17.xcarchive`. Its application binary SHA-256 is `135b0edb94562b6ea2303d5fbc7aad12b9963cb9f96b6c215d6e40a4ac19f7b9`. It contains the call-directory extension, excludes the unfinished message-filter extension and simulator fixtures, and has no development networking exception. Distribution signing is not verified by this unsigned archive.

## Accessibility and visual review

The iOS 26.5 unfiltered runs reported 15 “Contrast failed” and four “Contrast nearly passed” diagnostics, all without an associated element. They reported no clipped-text, touch-target or missing-description failures. Switch-label checks covered eight light/dark, standard/largest-text combinations. The largest-text secondary-screen matrix passed for 21 fixtures, each captured before and after scrolling. All recorded completed runs have zero runtime warnings.

The iOS 27 follow-up associated its product reports with actual elements: 16 contrast failures and five near passes. These include text at native scroll edges, disabled actions, Cancel/Close toolbar labels and three numbered setup steps. The two native reference methods separately produced 11 contrast reports and three clipped-text reports; their edge-row findings do not prove that every product report is harmless. No audit handler filters or waives these issues.

The three setup numerals now use system primary text on their existing tinted circles. Both iOS versions cleared those three reports; the complete focused light/dark run passed 2/2 on iOS 26.5. Its iOS 27 counterpart still flagged only native Cancel/Close labels. Those labels now also use system primary text, retaining their native glass controls, labels, actions and disabled state.

The final focused rerun remains **2/2 passing on iOS 26.5 and 0/2 on iOS 27**, with four iOS 27 reports on the native Cancel/Close controls and no numeral reports. Captures confirm black/white primary text. One sampled dark Cancel glyph/background pair measures 16.293:1; that limited pixel observation does not establish compliance of the complete glass control or resolve its automated report. These reports and the remaining broader scroll-edge/disabled-control findings are open release-review items. Further color changes are not justified by the current evidence.

Visual review includes Home, Calls, More, Contacts, protection onboarding, Settings, subscription pricing, both sign-in appearances, caretaker acceptance, and all 21 largest-dark scrolled secondary fixtures. Focused largest-text fields and quiet-hours states were also inspected. Native input placeholders can truncate at the largest size while their persistent field labels remain readable; keyboard AutoFill menus and scroll-edge fades are system overlays. These observations do not waive the contrast reports or establish full physical-device accessibility acceptance.

## Release boundary

This port does not establish App Store or real-call readiness. The broader [release verification](IOS-RELEASE-VERIFICATION.md), deferred Apple configuration, physical-device acceptance and [monitoring-audio incident](INCIDENT-2026-10-17-CALL-AUDIO.md) remain open. Backend deployment, phone installation, calls, messages, carrier changes and Apple/RevenueCat changes were not performed for this theme port.

Evidence is kept in [the theme review folder](../.impeccable/review/theme-port-2026-10-17/), including source hashes, preserved-method hashes, test summaries, archive checks, selected screenshots and the unresolved audit diagnostics. Full local test bundles and temporary export files are named in its verification record.
