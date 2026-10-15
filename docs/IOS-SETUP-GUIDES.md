# Floating setup guides

Implementation revised October 15, 2026 after the owner's physical screenshots showed conflicting timed instructions and a long, unexplained Settings route. Those screenshots supersede the earlier visual approval below.

Shield now uses **five original GIFs in the app**, independently of its floating guide. The Settings GIF demonstrates a downward finger slide from Call Filtering, reveals the named section, then shows the exact choice/checkmark or switch movement. The Phone GIF demonstrates Keypad, the blank paste target, Paste and the green Call button. There are no in-app play or float controls. One existing action opens Settings; Phone retains its native Open banner. The small reminder follows automatically.

The floating guide is a **steady reminder**, like the Wispr reference, rather than a timed replay of the inline GIF. All instructions remain visible; “when finished” returning is conditional, never a timer advancing ahead of the person. Guide art is generic and contains no personal number, actual code, or fabricated carrier result. No reference-video pixels are shipped.

Settings uses public `CXCallDirectoryManager.openSettings()`. On the tested iPhone 12 Pro Max / iOS 27.2, repeated handoffs from the top of Phone settings jump to Call Filtering, immediately below the required controls. The GIF and written text teach sliding the finger **down** to reveal Screen Unknown Callers; Live Voicemail is just above it. This replaces the private development-only URL which opened the top of the long page. On earlier iOS, the instructions account for a Call Blocking & Identification detail page and a back tap to Phone. Older-system physical landing behavior remains unverified. If the public shortcut fails, the own-app/manual route says to slide **up** from the top, shows a static target image and stops the floating card so directions cannot conflict. Written help also covers an unexpectedly top-of-page landing.

Returning, opening Settings/Phone, copying or watching never confirms a setting or carrier change. Explicit confirmations remain separate for each setting and each carrier code. No phone setting, carrier routing, consent or backend verification flag is changed by this UI.

## Assets and playback

Source: `scripts/generate-setup-guides.swift` (original AppKit/Core Graphics artwork; ImageIO GIF export; AVFoundation/ffmpeg silent AAC for PiP). Rebuild with `swift scripts/generate-setup-guides.swift`, then `npm run ios:generate`.

Five 600×400 GIFs use an authored 24-frame/second timeline (192 frames for settings, 432 for keypad). The native image view decodes one current frame rather than retaining all frames, pauses outside the active scene, and invalidates its display clock on dismantling. Reduce Motion displays the final target PNG instead. Written instructions carry all actions for VoiceOver and large text. The separate reminder movies include a clear-corner drag hint and are static two-second, 60-frame loops with silent audio; `-still` compatibility resources contain the same steady card. AVKit has a real mounted source layer behind the GIF, bounded startup/cancellation, and the existing serialized mixing audio session. System skip controls remain disabled. PiP stops on return/navigation/dismissal.

## October 15 validation — original GIFs and shorter route

- Required checks passed: `npm run check` (242 unit tests, typecheck/build) and `npm run test:firebase` (175 emulator tests).
- iPhone 18 Pro / iOS 27: all 21 setup/guide cases passed in one run. The three final copy/fallback/largest-text confirmations also passed, including the new largest-text Settings case. Across these runs all 22 distinct current setup/guide cases passed.
- Small iPhone 17e / iOS 26.5: all seven guide cases passed; both final normal/largest-text Settings confirmations passed. Captures include the largest-text top and scrolled action rather than pretending the entire page fits at once.
- Signed iPhone build/install succeeded. Actual iPhone 12 Pro Max / iOS 27.2 showed the GIF without extra controls, automatic steady PiP above Settings, repeated public-shortcut landings near Call Filtering from the top of Phone, automatic PiP from the Phone Open banner, and return to the same unconfirmed step. The final five-line card was inspected on hardware. No switch was changed, and no code was pasted or dialed. Physical copy/no-call safety passed; two native-Settings accessibility tests skipped because Mirroring exposed no system Settings tree.
- All bundled GIF/MP4 bytes match the signed app; optimized PNG poster pixels match after normalization. The longest GIF's complete frame-decode benchmark on the Mac averaged 0.53 ms, maximum 3.59 ms. This is decoding evidence, not a measured iPhone frame-time guarantee. See [media validation](../.impeccable/review/setup-route-guidance/media-validation.json).
- The fresh independent review considered the owner's contradictory screenshots first and returned **disposition: ship**, no material fixes. See [review](../.impeccable/review/setup-route-guidance/finish-review.md).

These checks establish the inspected devices, assets and routes. Physical older-iOS navigation, continuous iPhone hitch instrumentation, physical VoiceOver and novice-senior usability remain unverified. No production deployment or real-call validation occurred. The updated Settings preview is open on the installed phone. Earlier dated results below describe superseded implementations.

## October 15 validation — simplified demonstrations

- `npm run check`: 242 unit tests, typecheck and build passed. `npm run test:firebase`: 175 local emulator tests passed.
- iPhone 18 Pro / iOS 27: the initial 22-case run had 20 passes, one hardware-only skip, and one retry failure. The result page kept the video above the carrier prompt and recovery controls. Collapsing that video after return makes the result and retry primary. All four final confirmation tests passed, including return/retry, pause/replay and closing during floating startup. Across these runs all 21 distinct simulator setup/guide/safety cases passed; this is not a clean single full-suite run.
- Small iPhone 17e / iOS 26.5: all eight final tests passed, covering the complete setup flow, carrier return/retry and all six guide cases, including largest text in Dark Mode. Normal-size Settings and keypad captures were inspected. Expanded written help remains scrollable.
- All ten final clips have verified uniformly spaced 30 fps timestamps, expected 660/720/900 frame counts and audio tracks. Their SHA-256 hashes match the signed iPhone app bundle. See the [asset ledger](../.impeccable/review/setup-guide-refinement/media-validation.json).
- A real-phone comparison corrected an inaccurate Live Voicemail detail-page illustration: the current guide shows the inline switch on the Phone settings page, and says to leave an already-correct switch alone. Native Phone navigation was also inspected and the keypad clip now starts with the actual Keypad tab. No setting was changed, and no code was pasted or dialed.
- The independent Impeccable finish reviewer returned **disposition: ship** for the supplied source, storyboards and simulator captures, including the small phone. No material fixes were found. The [scoped record](../.impeccable/review/setup-guide-refinement/finish-review.md) excludes continuous playback, physical label accuracy and actual older-adult usability.

Final physical verification (iPhone 12 Pro Max / iOS 27.2): the signed app build and two physical checks passed (copy does not dial; actual floating guide). The Settings accessibility check skipped while Mirroring supplied no system Settings tree; an earlier unmirrored native-choice check passed. The mirrored Phone page and its inline voicemail switch/caller options were visually inspected without changes. The Phone banner automatically carried the final keypad video above Phone; its native tab scene appeared, skipping controls were absent, the window moved clear of the keypad, and returning stopped PiP and displayed the same unconfirmed carrier-result step. No code was pasted or dialed. Manual-plus-navigation test attempts initially hit the floating window over the next button; the movement reminder was added and the two paths now have separate test cases. Earlier exact-heading and mirrored-system-tree test failures are retained in local test logs, not counted as passing runs.

The corrected voicemail assets also passed all six guide UI tests on iPhone 18 Pro / iOS 27. These checks establish rendered content, native handoffs and retained confirmations. There is no instrumented zero-hitch or older-adult usability claim. The updated Settings preview was reopened on the installed phone.

Synthetic layout captures (the keypad capture precedes the final native-tab artwork correction):

![Simplified Settings step](images/setup-guides/refined-small-settings-light.png)

![Small-phone keypad layout](images/setup-guides/refined-small-keypad-light.png)

![Final keypad demonstration stages](../.impeccable/review/setup-guide-refinement/keypad-story.png)

## October 14 validation (original checklist artwork)

- `npm run check`: 242 unit tests, typecheck and build passed. The first sandboxed run failed on the local APNs test socket; the permitted rerun passed.
- `npm run test:firebase`: all 175 emulator tests passed.
- iPhone 18 Pro / iOS 27 simulator: 21 distinct tests passed across the final forwarding, guide, safety and accessibility runs; one physical-device-only Settings test was skipped. Final runs comprise all 14 forwarding cases, the copy-does-not-dial safety case, six guide cases, and the three repeated accessibility regressions. The last regression run passed 16 tests plus one skip; the accessibility confirmation passed all eight tests. Earlier large-text/visibility failures led to the scrolling-action correction and were rerun successfully.
- Small iPhone 17e / iOS 26.5 simulator: Settings and keypad guides rendered correctly in Light Mode. Reduce Motion was switched on in the simulator and the guide stopped moving its tap highlights; written steps exposed full combined labels in the accessibility tree. The setting was restored and the extra simulator shut down. Lossy video decoding causes slight pixel differences between static frames; exact pixel equality is not claimed.
- Physical iPhone 12 Pro Max / iOS 27.2, synthetic fixtures: PiP started before the existing Settings launcher, stayed above Phone settings, looped, and stopped on return to the same unconfirmed step. One tap on the existing Phone banner automatically carried the keypad guide above Phone. Moving the floating window exposed the keypad; the demonstrated tap above the numbers displayed Paste. No code was pasted or dialed. The final floating-state placeholder was inspected on hardware. The signed normal app was installed and returned to a launch without test arguments; a transient process-ID lookup failure immediately after ending PiP was followed by a successful launch and running-process readback.
- All ten MP4 resources have 360 uniformly spaced frames at 30 fps, 12-second duration, and the expected audio track. `AVPlayerLooper` handles repetition. Source-level startup, cancellation, return and cleanup were reviewed; the final signed device build passed.

The hardware handoffs were visually inspected, but Instruments could not resolve the running phone process by name or verified PID. There is no instrumented zero-hitch result and no claim of universal stutter-free playback. Physical VoiceOver navigation, an older adult usability session, and actual carrier changes/calls were not performed. This change was not deployed to Firebase or Cloud Run. No owner phone setting, carrier routing, consent, or backend verification flag was changed.

Screenshots below are synthetic simulator data, never the owner's Phone settings:

![Small iPhone Settings guide](images/setup-guides/small-settings-light.png)

![Small iPhone keypad guide with Reduce Motion](images/setup-guides/small-keypad-reduced.png)

Implementation follows [Apple’s custom-player PiP guidance](https://developer.apple.com/documentation/avkit/adopting-picture-in-picture-in-a-custom-player).
