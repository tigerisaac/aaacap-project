# Shield for older adults

Design work started October 12, 2026. The owner asked for an app an 80-year-old can understand, with less text, everyday language, and calls and voicemail first.

## Everyday use

- **Home:** a short, truthful phone status, recent voicemail, and recent calls. A healthy setup check adds no extra block. Problems can be opened when needed.
  In the sample app, the persistent Sample app marker is enough; Home starts with voicemail rather than another sample introduction.
- **Calls:** familiar outcomes: Answered, Stopped, Check first, Voicemail, and Missed. Names or call purposes lead; technical details stay inside “More about this call.”
- **Voicemail:** a dedicated inbox. Listening is the main action. Removed messages remain accessible, with an explicit choice to bring one back when allowed.
- **More:** Check a text, Family & friends, Get help, and Settings. These remain easy to find without crowding daily use.

## Across the screens

Use system text styles and Dynamic Type, 52-point primary touch targets, grouped rows, and one clear next action. Actions use verbs and familiar nouns. No technical word is needed to understand a result. Exact names from iPhone settings remain where the person must find them.

Sign-in asks for an email, then directs the person to their email. Text checks require explicit agreement before sending anything; pictures are still read on the phone. Protection choices describe reading words and possibly ending a call, with provider and deletion details available in context. Sharing states who can see calls and who can hear voicemail. Helpers do not gain owner controls.

Phone setup and disconnection retain every confirmation and call check. Copied carrier codes are hidden behind “See copied code.” Opening Phone, copying, or returning never confirms a change. Only the person’s confirmation advances a carrier/settings step. Short instructions preserve the path back to ordinary calls; deleting the app does not undo phone forwarding.

## Inspiration reviewed October 12, 2026

These are interface references, not evidence that Shield has their services or accuracy. Gini's App Store screenshots and YouMail's voicemail illustrations were inspected visually; the remaining sources informed interaction and accessibility choices.

| Reference | Useful idea | Applied in Shield |
| --- | --- | --- |
| [Gini Help](https://ginihelp.com/) and [iPhone screenshots](https://apps.apple.com/us/app/gini-help-ai-scam-protection/id6749169860) | Explain who called and why; patient guidance with everyday words. | Call purpose leads each row. Setup presents one task at a time. Results retain uncertainty instead of promising that a caller is safe. |
| [YouMail visual voicemail](https://www.youmail.com/features/safe-voicemail/) | Read a message before listening; keep important messages easy to find. | Dedicated Voicemail tab, sample summaries, a prominent listening action, and a working sample All/Kept choice. Real summaries and persistent keeping remain future work. |
| [Jitterbug Smart4](https://shop.lively.com/products/jitterbug-smart4-smart-phone) | A familiar list of large, clearly named choices. | More uses generous native rows: Check a text, Family & friends, Get help, Settings. Short labels replace specialist vocabulary. |
| [GrandPad calling](https://www.grandpad.net/tablet-features/call) | Large controls and family assistance that make staying connected easier. | Visible Call buttons on trusted saved numbers; optional helpers have an explicit sharing scope and no owner controls. |
| [Apple Assistive Access](https://developer.apple.com/documentation/accessibility/assistive-access/) and [Calls guidance](https://support.apple.com/en-ae/guide/assistive-access-iphone/devcd5016d312/ios) | Large text labels, clear buttons, and access to familiar people. | Semantic text sizes, 52-point app action targets, readable section headings, stacked layouts at large text sizes, and simple destinations. This work does not enable or claim a custom Assistive Access mode. |

Shield keeps its native iPhone appearance. Everyday use has fewer choices and words; setup and privacy information remain available where a person needs them. The sample-data marker has its own opaque area, and native list scroll edges use a stronger boundary so controls remain distinct from content.

## Ideas mocked up in sample data

### Voicemail summaries

The sample inbox and message detail show a short, practical summary, such as an appointment reminder. “Sample summary” identifies the message detail. “Hear sample message” uses an authored synthetic message read on the device; it is not a caller recording.

**Still to build:** an authorized service that produces summaries from real voicemail, a summary field and API contract, controls for consent and deletion, processing/error states, and evaluation for accuracy. A summary must distinguish a caller’s claim from a fact and must never certify a sender or endorse a caller-provided callback number. The real inbox currently has no generated summaries.

### Keep this message

The sample message can be kept and found through “Kept.” This only changes sample state during the app session. It does not contact the backend or change real-message expiry.

**Still to build:** a persistent owner choice, a kept-message flag in the API, storage and deletion rules, cleanup changes, and tests proving a kept message survives ordinary expiry. Before release, choose a clear retention period and explain it at the moment the person keeps a real message. Helpers’ existing listening permissions must continue to apply. Keeping a message must not implicitly let a helper hear it.

### Existing message removal

Removed-message display and restore use the existing backend capability; this is separate from the proposed Keep feature. Production availability and deployment remain governed by the current status/operations records. This design pass does not deploy that capability.

## Evidence

October 12, 2026:

- Repository typecheck, build, and 157 unit tests passed. The Firestore emulator suite passed 86 tests on isolated local ports because another task occupied the default port; no repository emulator configuration was changed.
- The 13 forwarding UI tests passed, preserving return/retry behavior, individual carrier confirmations, restoration, and no automatic dialing.
- Four new UI journeys passed on iPhone 18 Pro / iOS 27: everyday calls/voicemail and sample audio/Keep/Kept; secondary screens and text-check consent; welcome/choice screens; and reachable actions in Dark Mode at the largest accessibility text size.
- Three final setup-warning checks passed, including the sample-account entry, visible repair actions, and no extra status block when a setup check is healthy. The warning load now runs from a stable Home task instead of an initially empty conditional view.
- An independent visual review requested four interface corrections: scaled icon slots, less sample introduction on Home, removal of More’s redundant subtitle, and stronger explanatory footnotes. Its final verdict scored all four corrections and the design-document update **resolved**, with disposition **ship** for that fix list. It did not certify the unresolved automated diagnostics.
- Explanatory footnotes now explicitly use opaque supporting text. Its measured source contrast is 6.48:1 on the Light grouped background, 7.23:1 on a white card, and at least 9.55:1 on the sampled Dark system surfaces. The corrected message/contact/settings captures contain that opaque foreground color.
- Automated accessibility audits remain **not clean**. Calls reports four contrast and three clipping diagnostics without an associated element; Settings reports Privacy while its row is partly beneath the native bottom bar. The former Home section-heading/status issues were corrected. Keep these diagnostics visible rather than reporting the audit as passed.

Review captures are saved locally under `.impeccable/review/senior-final/`. Simulator and source evidence do not establish physical-device, VoiceOver-session, or older-participant usability. No live-service or physical-phone changes are part of this work.

## Home count and message readability — October 12 follow-up

The owner’s screenshot showed a removed-message screen repeating its outcome, explanation, date and callback advice in several separate rows. The revised default screen has one panel: Message removed, a short tentative explanation, and the restore deadline. Bring back message is the main action in the bottom safe area. The timestamp and trusted-number guidance remain available under More about this call; confirmation, listening permissions, expiry and service behavior are preserved.

The initial follow-up added one prominent Calls stopped panel, linking to the matching Stopped calls filter, using the existing seven-day `overview.counts.held` aggregate. The owner's subsequent request for a total supersedes that period; the persistent counter below supplies the current Home value. Zero is shown quietly and explicitly; unavailable data does not become zero. Existing phone-status warnings remain above the historical count.

Validation: typecheck/build and 162 unit tests passed; 86 Firestore emulator tests passed on isolated ports. Three dedicated UI journeys passed on iPhone 18 Pro / iOS 27: the count opens the matching calls, removed-message details preserve recovery guidance, zero/unavailable data stay distinct, and large-text Dark Mode keeps actions reachable. The largest-text check also verifies that the complete explanation and deadline can each be scrolled fully between the navigation bar and persistent restore action. The existing removed-message playback/restore test also passed. Independent visual review scored the wrapping correction and synchronized design record resolved, with disposition ship for those two findings. Final simulator captures are saved locally under `.impeccable/review/readability/`. These are simulator checks; the earlier broader automated accessibility-audit limitations remain open.

## Total count — October 12 follow-up

The owner requested Total instead of Last 7 days. Home now reads the optional `counts.stoppedTotal` API field and labels the positive number Total; zero reads None so far. An older service response without that field reads Total unavailable, rather than relabeling its weekly count or claiming zero. See calls still opens retained recent stopped/review history, which can contain fewer entries than the persistent total.

The backend stores the aggregate at `participants/{id}/statistics/stoppedCalls`. Screening stops, held/review outcomes, blocked-number attempts (including those beyond the daily history cap), and removed messages count once per call. The count and per-call `stoppedCounted` marker commit together; provider-key admission also prevents duplicate counts for blocked attempts without history records. Recovery seeds the counter transactionally from available call records in resumable 200-record pages. Cleanup seeds before deleting legacy records. Expiry and restoring messages do not reduce the historical total; account deletion removes it. Calls already deleted before this feature cannot be recovered, so this is a recorded total, not a guaranteed complete lifetime tally or a count of confirmed scams.

Validation: repository typecheck/build and 164 unit tests passed; all 88 Firestore emulator tests passed on isolated local ports. Coverage includes concurrent backfills, participant isolation, multi-page recovery, retention cleanup, account deletion, blocked-attempt history caps, duplicate callbacks and repeated message removal/restoration. All three Home readability UI journeys passed with Total, quiet zero, missing-field compatibility and maximum-text Dark Mode on iPhone 18 Pro / iOS 27. Scoped independent visual review returned ship with no material blocker for the count-label update. Captures are saved locally under `.impeccable/review/total/`; the earlier broader accessibility-audit limitations remain open. The updated sample Home is open in the simulator. At this verification point the backend changes awaited owner approval; the subsequent approved deployment is recorded below. No real-call verification is claimed.


## Deployment and matching Home header — October 12

The owner approved deployment and clarified that the white header band should match the page background. Home now hides the top scroll-edge backdrop and navigation-bar background; NavigationShell supplies the shared grouped surface behind the stack. The native large Home title and person control remain. Final Light header and page samples both measure RGB 242, 242, 247; the maximum-text Dark capture preserves readable labels. All three Home UI journeys passed, and scoped independent visual review returned ship for background match and header legibility. Captures are saved locally under `.impeccable/review/header/`. Broader accessibility-audit limitations remain open.

The counter API and cleanup were deployed at 22:51 UTC as `shieldapi-00016-tuv` and `cleanupshield-00008-nuc`, both ACTIVE with 100% traffic. The release patched only four counter-related modules in the prior production source package, preserving its dependencies, runtime configuration and other function revisions. It did not release pending blocked-number or voicemail-removal features. Repository checks passed 164 unit tests and 88 Firestore tests; an additional emulator check verified the actual release package. An isolated synthetic live account verified the older-than-seven-days total and its persistence after its test history was removed. Test fixtures were deleted. See OPERATIONS.md for deployment evidence and limits. No real call or physical-phone change occurred.
