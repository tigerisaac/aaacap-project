disposition: fix

## persistence

Reviewed the current one-visit setup implementation in the canonical `tigerisaac/aaacap-project` checkout on `main`. Existing work was left untouched. All ten required packet PNGs were opened before implementation review; they show the named setup, return, recovery, floating-card and accessibility-size states without blank or mismatched captures. No recapture is required for this review.

The participant-scoped combined-visit state carries navigation to Live Voicemail confirmation, not a verified setting value. The subsequent tap remains explicit. A standalone or failed first visit does not acquire that combined carry. Carrier return also retains its pending result confirmation. This assessment comes from source and the supplied renders; the supplied UI tests were read, not rerun.

## fidelity

The incumbent navy/neutral palette, serif task headings and native sans controls persist. No approved comp or QUALITY BAR image was supplied or expected for this narrow refinement. No HTML/CSS detector applies to SwiftUI.

The normal-size captures present the two settings, landmark demonstration, written-help disclosure and one primary action. The return help supplies reopening, overshoot recovery and a manual Settings route. The largest-text Dark Mode captures retain wrapping content and a reachable scrolling action; toolbar title truncation does not conceal the full task heading. Source preserves semantic text, heading focus, text alternatives outside the accessibility-hidden artwork, app-owned target minima and a static Reduce Motion result.

The GIF generator depicts the setting labels, switch transition and Silence checkmark. The floating reminder stays on the two requested outcomes instead of advancing on a timer. All 24 declared resources exist; the read-only provenance scan reports six raster posters and zero missing origins. The packet's decoded floating-card image establishes its content, not readability at every system PiP size.

## ceiling

One bounded failure-state correction is owed; a visual rebuild or another polish hunt is not justified by this evidence. Successful handoff and novice comprehension remain distinct. The supplied physical-phone account and 40-second artwork timing sample do not establish older-adult task success, a clean native accessibility audit, universal animation smoothness or an exact-section Settings API.

The research supports keeping help beside the task as a design inference: [Wispr's own instructions](https://docs.wisprflow.ai/articles/1986921789-How-to-Set-Up-Flow-Shortcuts-for-iPhone) document its floating-guide pattern, [NN/G](https://www.nngroup.com/articles/onboarding-tutorials/) recommends contextual help that avoids memorization, and [Synapse](https://arxiv.org/abs/2209.09596) studied older adults using a different interactive guidance system. None tests this implementation. The verdict covers this setup change and the supplied evidence only.

## material_fixes

1. **Expose a usable fallback when the floating reminder cannot start.** [ForwardingSetupModel.swift:218](</Users/isaaczhang/Developer/aaacap project/ios/Shield/Features/Settings/Forwarding/ForwardingSetupModel.swift:218>) discards `startFloating()`'s result and immediately opens Settings. The player explicitly returns false for unsupported, not-ready and failed starts; `floatingUnavailable` is never presented by this setup view. Meanwhile [ForwardingPhoneSettingsView.swift:39](</Users/isaaczhang/Developer/aaacap project/ios/Shield/Features/Settings/Forwarding/ForwardingPhoneSettingsView.swift:39>) unconditionally promises that the reminder accompanies the person. This leaves a novice in the long external Settings page without the central support the flow promised, and without an explanation. Handle the unsuccessful start before the handoff: make the missing reminder and readable manual instructions apparent, preserve a deliberate way to open Settings, and keep both confirmations pending. Keep the successful automatic path and the absence of Play/Float controls. Verify a forced unavailable/not-ready start, successful start, retry and return; the failure must no longer silently send the person away expecting a guide.

## keep

- One Settings visit for the adjacent controls, followed by distinct Silence and Live Voicemail confirmations.
- Steady floating instructions, landmark excerpts and the static target after return.
- Read the steps, reopening, overshoot recovery and manual Settings navigation.
- Native text scaling, scrolling accessibility-size actions, written equivalents and Reduce Motion artwork.
- Explicit carrier confirmation and the separation between UI evidence, physical-device inspection and real-call verification.
