disposition: fix

## Verdict and scope

The bounded reviewer demo needs one native-container correction and fresh visual evidence before it can ship. This review covers the public demo entry, persistent sample identity, Home, caretaker alert, guide/source, and largest-text paused playback. It does not approve App Store submission, purchases, live screening, or the full application.

This is a code-led extension of Shield's established editorial native identity. No replacement identity or comp is required. PRODUCT.md, DESIGN.md, the RootView surface brief, APP-REVIEW-DEMO.md, craft-floor.md and ios.md were consulted. No HTML/CSS detector ran. No app source was modified by this reviewer.

## Evidence

I personally opened these exact files in `release-light/`: `demo-welcome.png`, `demo-home.png`, `demo-caretaker-alert.png`, and `demo-message-largest-paused.png`. Despite the directory name, all four are **Dark Mode iPhone Duo / iOS 27.1** captures, 1398 × 2034 pixels. The last image is a scrolled paused-message state, not the message's initial viewport.

I also personally opened the older `final-light/demo-home.png`. It visibly contains the native side tab rail; the latest Home image replaces that region with black. The latest caretaker alert has neither a visible back affordance nor visible tabs. The welcome image, outside the tab shell, does not have the same rectangular black rail. The largest-text image visibly retains the demo marker and wrapping Resume message action, but its navigation cannot be visually accepted.

Source inspected includes RootView, DemoBanner, NavigationShell, the Demo feature files, ContactAlertsView, relevant AppState entry/reset code, and ReviewDemoUITests. The parent reports all five focused Release UI methods passing, covering reset, local caretaker choices, guide-to-alert, largest text, and audio pause/resume/replay. I did not rerun these tests or inspect their result bundle.

The parent confirmed that both old and latest image sets used the same `app.screenshot()` capture helper. The old set preceded the `.clipped()` reserved-banner wrapper; the latest set includes it. This makes an application container/render regression materially more plausible than a generic broken capture. A whole-screen capture comparison has not yet been produced, so the precise rendering mechanism is still a hypothesis.

## Material findings and precise changes

1. **High: restore visible native navigation.** `ios/Shield/Design/DemoBanner.swift:33` clips the entire TabView supplied by RootView. The latest captures lose native chrome outside the content column. Remove `.clipped()` from that child; retain the reserved banner, vertical sizing and layout priority. If the outer wrapper exposes unpainted space, give that wrapper the existing Shield surface background. Do not add custom tab/back controls or redesign the shell. Before: `self.frame(maxWidth: .infinity, minHeight: 0, maxHeight: .infinity).clipped()`. First correction: the same frame without `.clipped()`.
2. **Required confirmation: recapture the same states from the corrected Release build.** Use a full-screen capture on the active Duo display to distinguish app capture composition from actual screen rendering. Home must show all four native destinations; the pushed caretaker alert must visibly preserve native return navigation and the demo marker; the largest paused-message state must retain readable, unobscured playback and demo identity. Check both appearances if feasible. Preserve the old images as pre-fix evidence or explicitly supersede them in a manifest. Record actual appearance, simulator/runtime and source/build identity; `release-light` currently misidentifies appearance.

This is one correction batch, followed by a bounded verdict pass. If the black rail remains in a full-screen capture after clipping is removed, the issue is unresolved: investigate the reserved-container/native chrome relationship rather than accepting successful accessibility taps as pixel proof. If full-screen capture contains normal chrome while application capture remains black, classify the latter as invalid capture evidence and use the verified full-screen capture.

## Craft and platform assessment

The visible demo content preserves the serif headings, sans controls, navy surfaces, restrained outcome colors and familiar grouped content. The welcome action is findable beneath sign-in; its fictional-call and no-purchase explanation is explicit. Home's sample disclosure and About link establish context before its stopped-call total. The guide explicitly separates sample activity from real calls, alerts, forwarding and Apple purchases. The caretaker event names itself a sample; it conveys the issue and next step without exposing history or recordings.

The largest-text Resume message action wraps instead of truncating, and the demo marker remains visually separate from scrolling content. Its Dynamic Type cap is a deliberate persistent-status treatment; these captures do not establish full VoiceOver or maximum-size accessibility compliance. No additional ornamental layer, new raster asset or custom motion is needed. The missing native chrome is the material platform failure; the existing identity should remain intact while it is corrected.

## Verification limits

The current black-rail captures cannot certify complete navigation appearance. The older Light image is comparison evidence only, not proof of the latest build. No latest standard iOS 27.0 simulator appearance is certified: its launch/capture was reported stalled. No physical iPhone, minimum supported OS, gestures, VoiceOver, actual audible output, real call, transaction, or external notification was verified by this reviewer. Synthetic playback-state tests are separate from listening evidence and real-call evidence.

Repository origin is `tigerisaac/aaacap-project`, branch `main`, with extensive pre-existing uncommitted work preserved. `git fetch` in this reviewer process could not write `.git/FETCH_HEAD` under its filesystem permissions; no checkout or application files were changed. The only reviewer write is this report.
