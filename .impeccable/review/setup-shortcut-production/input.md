# Finish review — normal setup integration

Project: `/Users/isaaczhang/Developer/aaacap project`. Review only this iOS setup refinement and write only this packet's `finish-review.md`. No code/doc edits. Use `/Users/isaaczhang/.agents/skills/impeccable/reference/degraded/finish-reviewer.md` because the named specialist role is unavailable; this must be a fresh review with no inherited conversation. Return exactly one disposition and the five contract sections.

## User request and authorized scope

The user wants setup a grandmother unfamiliar with Settings can follow. They rejected screen capture/OCR, the wrong Call Blocking page plus a Back detour, reused Wispr footage, and custom Play/Float controls. They later approved the native shortcut method and explicitly approved publishing its generic public iCloud link.

Latest request: **“live voicemail is on by default for phones post ios 17 so i think let's create it so that we instruct the user to turn it off. Also reduce the text on the guide. I like where this is going, let's put that into the actual setup guide. And you said another shortcut just does the setting automatically?”** This is explicit approval to integrate the method into normal setup. Prior DESIGN.md/packets' Debug-only/no-promotion rules describe the earlier trial and are superseded for this narrow integration. Do not mistake local integration and Release inclusion for App Store distribution or backend deployment.

One existing **Shield Easy Setup** helper both selects Silence On and opens beside Live Voicemail. No second shortcut, hidden setter, screen capture, new publication or guessed App Intent payload is involved. Its four native-authored actions/source/public link are unchanged from the previous reviewed packets. The app does not claim a current setting value or depend on every region/device having the same default.

## Built behavior

- Normal `ForwardingSetupView` now uses direct **Add to iPhone → native Add Shortcut → native Shield return**. No chooser or library search. No Settings demo/PiP competes during import.
- After adding/choosing the existing helper, one **Open Phone settings** action carries the steady guide while Shortcuts selects Silence and opens the caller section. The main instruction is **Turn off Live Voicemail**. The original inline animation shows green becoming gray.
- The floating reminder is now eleven words: **Live Voicemail / Turn it off / Gray = off / Return to Shield**, plus the native restore symbol. It remains a steady 60-second item; no new animation or custom controls.
- Return stops PiP and changes guidance, never verifies settings. Existing explicit **Silence has a checkmark**, then **Live Voicemail is off** confirmations remain before carrier setup. The backend stages and test-window timing are unchanged. Review this retained two-confirmation design against the user's need for simplicity; do not infer actual setting readback.
- Help retains public re-import, signed saved file and **Use the step-by-step guide**, which switches to the previous manual guide inside setup. Help labels now own their full-width 52-point touch frame. At accessibility sizes the primary remains in the scrollable reading order.
- Failed PiP leaves Shield open for deliberate **Open Settings anyway**; missing/native failure preserves retry/manual recovery. Opening or returning from public import does not prove Add acceptance. A device-local ready-to-try choice is remembered only as navigation convenience.
- The shortcut player has automatic import floating disabled and is separate from the existing automatic Phone-banner player. Reopening explicitly prepares `.shortcutVoicemail` before starting PiP, so the Silence confirmation poster cannot float by mistake. Phase changes bring the task heading into view.
- The session/importer and signed file/seventh guide are now present in Release. The standalone Debug trial remains a development entry point. Normal carrier/Phone-banner and restoration guides remain unchanged.

## Artifacts and direction

Read changed source in `ios/Shield/Features/Settings/Forwarding/`: `ForwardingPhoneSettingsView.swift`, `ManualPhoneSettingsGuide.swift`, `ForwardingSetupModel.swift`, `ForwardingSetupView.swift`, `ForwardingActions.swift`, `SetupShortcutSession.swift`, `SetupShortcutImportAnchor.swift`, `SetupGuide.swift`, `SetupShortcutPreview.swift`; `ios/Config/Release.xcconfig`; `scripts/generate-setup-guides.swift`; `ios/ShieldUITests/PhoneSetupShortcutUITests.swift`. Relevant unchanged player: `SetupGuidePlayer.swift`. Technical docs: `docs/IOS-SETUP-GUIDES.md`, `ios/README.md`, `docs/shortcuts/README.md`. Backend changes appearing in the shared working tree belong to another task; do not audit, edit or attribute them to this refinement.

Code-led native refinement, no approved comp or new world. Direction is `.impeccable/surfaces/ios-shield-app-rootview-swift.md`: pinned editorial navy/neutral surfaces, serif purpose headings, familiar sans controls, explicit choices retain state. Product: PRODUCT.md. Incumbent system: DESIGN.md; it will be narrowly reconciled by the documenter after this review. QUALITY BAR: one clear next action, point-of-action instruction, native labels/control order, readable Dynamic Type, 52-point app actions, deliberate failure recovery, no false verification. This is an implementation review, not senior usability validation.

Read craft floor `/Users/isaaczhang/.agents/skills/impeccable/reference/craft-floor.md` and native platform `/Users/isaaczhang/.agents/skills/impeccable/reference/ios.md`. No HTML/CSS detector ran because this is native SwiftUI. Provenance scan: seven raster posters, zero missing. Only two steady MP4s changed; the 1440×960 original GIF/poster artwork and 30fps decoding are unchanged. Prior timing evidence is historical, not remeasured here.

## Required captures

All files were opened after capture and match their names. There are 23 required images: nine per simulator class and five final hardware views. Largest-text images are top/scrolled viewports; natural viewport clipping does not mean unscrollable text. Tests assert actions are fully above the pinned button before tapping and verify the manual target's 52-point height.

In **both** `main/` (iPhone 18 Pro / iOS 27) and `compact/` (iPhone 17e / iOS 26.5):

1. `actual-setup-add-helper.png`
2. `actual-setup-turn-live-voicemail-off.png`
3. `actual-setup-unconfirmed-silence.png`
4. `actual-setup-unconfirmed-voicemail.png`
5. `actual-setup-largest-text-installation-top.png`
6. `actual-setup-largest-text-import-recovery.png`
7. `actual-setup-missing-helper-recovery.png`
8. `actual-setup-guide-failure-before-leaving.png`
9. `actual-setup-native-add-shortcut.png`

`physical/`, actual iPhone 12 Pro Max / iOS 27.2, final build using the real setup views with local progress fixtures (no backend writes): `add-helper.png`, `ready.png`, `settings-with-short-guide.png`, `returned-unconfirmed.png`. The fifth required hardware capture, `reopened-short-guide.png`, shows the corrected repeat visit. The earlier `native-add.png` is a supporting observation before final recovery refinements, not a required final capture: public Add/Replace of our prior helper and native Shield return worked on hardware, and final native Add is rechecked in both simulators without adding/running telephony actions.

## Verification and limits

Exact hashes, capture origins, results and limits are in `evidence.json`. Full six-case normal-setup suites passed on both simulators. A separate full guided workflow passed through carrier confirmations using synthetic fixtures. Compact manual/Phone/restoration checks passed thirteen guide cases plus one fallback case. After correcting repeat-visit guide selection, targeted normal-flow/reopen-failure cases were rerun on both classes and their refreshed captures replace overlapping files. Final Debug and Release builds include one signed helper and four seventh-guide resources, with byte-matching media.

Required typecheck/build and 242 unit tests passed; all 175 Firestore emulator tests passed. These ran before another task's unrelated backend edits appeared, so they establish this iOS-only task against its baseline, not validation of that other work. No backend file/test is being included in this task's commit.

Initial recovery tests on the main simulator failed because the test's hit-test-only scrolling allowed a target behind the fixed primary action; the captured screen/hierarchy demonstrated the mistake. The helper now verifies target bounds above the primary before tapping. The initial failed run stalled while collecting diagnostics and was interrupted after its test cases finished; subsequent runs disabled verbose diagnostics and completed normally. This is retained as failed evidence, not claimed as a pass. The product also gained phase-heading scroll restoration and full-row help touch targets.

Hardware tested direct import/Replace, native return, original first handoff, final short-guide handoff, return without confirmation and corrected repeated handoff. Silence was already On and Live Voicemail already Off, so no switch transition was observed or Live Voicemail touched. The current native PiP restore control was not separately validated; reactivating the running app tests return behavior. No calls, carrier forwarding, backend setup advancement, screen sharing or production service deployment occurred. Mirroring/Device Hub keyboard capture stayed off.

The Settings section URL remains undocumented and physically tested on one phone. Native Add/return friction still exists. Cross-device reliability, App Store acceptance, actual older-adult usability and elimination of the earlier intermittent missing-guide report remain unproven. Do not broaden historical 7m20 player evidence into a new duration or motion measurement.

Return **persistence, fidelity, ceiling, material_fixes, keep**, with one disposition `recapture`, `rebuild`, `fix`, or `ship`. Missing/malformed required evidence requires recapture only. At most eight real material issues in this actual normal setup integration; no speculative architecture or whole-app audit. Ship must state this evidence scope and its limits.
