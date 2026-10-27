## Verdict

1. **Resolved — visible native navigation.** The corrected `DemoBanner.swift` removes clipping from the TabView and gives the wrapper the existing adaptive surface. In both Light and Dark Home captures all four native tab destinations are visible. Both largest-text paused-message captures show the native Back control, all four tabs, the complete wrapping Resume message action, and the separate `Demo · No live calls` marker. The black navigation region reported in `finish-review.md` is absent.
2. **Resolved — capture confirmation.** I personally opened all eight required current captures: `verdict-light/demo-welcome.png`, `verdict-light/demo-home.png`, `verdict-light/demo-message-largest-paused.png`, `verdict-light/demo-caretaker-alert-direct.png`, `verdict-dark/demo-welcome.png`, `verdict-dark/demo-home.png`, `verdict-dark/demo-message-largest-paused.png`, and `verdict-dark/demo-caretaker-alert-settled.png`. Both settled caretaker-alert images visibly contain the sample event, complete demo marker, native Back control and four tabs. These are 1398 × 2034 iPhone Duo / iOS 27.1 Release captures in the named appearances. The Light alert is a direct active-display capture; the settled Dark alert uses whole-screen capture after test-only settling. Earlier immediate alert frames that omit the marker are superseded and were not used to accept the settled state.

No regression introduced by this correction was found in the bounded comparison. The public welcome entry and its fictional-data explanation remain intact. The parent reports three final Light methods, two Dark methods, and the final settled Dark guide method passing; I did not rerun those tests. Archive/export/signature and source-hash acceptance are the parent's separate verification, not findings of this visual review.

## Remaining

Clear for the two scored findings. This ship verdict covers the original native-navigation correction and its required visual confirmation only; it does not certify the whole app, all transitions, physical-device gestures, VoiceOver, minimum-OS behavior, iOS 27.0 appearance, audible playback, App Store submission, Apple purchases, live screening or external alert delivery. The earlier finish report remains the record of the pre-correction defect and broader limits. No application source was edited by this reviewer.

disposition: ship
