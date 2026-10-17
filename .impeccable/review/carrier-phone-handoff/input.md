# Carrier Phone handoff — finish review

## User request and confirmed scope

The user asked to fix three hardcoded carrier-code screens, investigate one-code T-Mobile setup, make the Phone step understandable to a senior, replace the premature carrier-confirmed primary action with a Phone action until return, make copying explicit through animation or a manual copy tap, and improve the unexplained “When you don’t answer” heading. They allowed retaining a Keypad instruction if a direct target was inconsistent or undocumented. They subsequently confirmed the direct T-Mobile line is on a different phone and said: **“Just ignore that for now i'll get that built on it later, just do the other stuff for now.”** Thus direct-line qualification and that phone's build are explicitly deferred; do not judge a claim that combined T-Mobile forwarding is proven, because none is made.

The supplied before screenshot is a critique reference, not an approved comp: `/var/folders/1q/_zmm0d4x71v5rmzqx63q179c0000gn/T/codex-clipboard-2fd43be2-8e0c-4a72-9e62-8412dca8610c.png`.

## Artifact and direction

Canonical root: `/Users/isaaczhang/Developer/aaacap project`. Existing `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, pinned `.impeccable/surfaces/ios-shield-app-rootview-swift.md`. Native SwiftUI, iOS26+; no web detector ran. This is a narrow code-led refinement preserving the incumbent world, with no approved comp or reproduction/diff state.

THESIS: An editorial phone companion, with the clarity and composure the user likes in America.gov.
OWN-WORLD: Pale neutral ground, white native grouped surfaces, deep navy actions, serif display headings and familiar sans controls. Outcome colors retain their meanings.
STORY: Understand what Shield does, make a clear choice, and review a call or message without decoding visual conventions.
FIRST VIEWPORT: This existing setup task communicates its purpose and next action within the approved native surface.
FORM: User-pinned America.gov-inspired direction overrides cdfd6ff0. Semantic Dynamic Type, native feedback, explicit choices.

## Quality bar

A clear purpose and one next primary action. The user knowingly copies rather than seeing an unexplained pre-copied claim. Carrier confirmation appears only after a requested Phone handoff and return, remains explicit, and is distinct from the real forwarding probe. No blank carrier-code screens for shorter lists; progress and Back follow the same list. Exact native terms and recoverable manual instructions; large tap labels, reachable largest-text content. A compact steady external guide should reduce obstruction without pretending the app controls iOS window placement. No calling URL or automatically executed forwarding code. Keep the working Phone-settings shortcut/manual recovery and carrier consent/window/probe boundaries.

## Implementation to inspect

The 17 exact source/media paths and hashes are in `evidence.json`. Primary source is `ForwardingSetupModel.swift`, `ForwardingCodeView.swift`, `ForwardingActions.swift`, `ForwardingSetupView.swift`, `PhoneCodeGuide.swift`, existing `PhoneLauncherBanner.swift` and unchanged copy-only `PhoneAppLink.swift`, under `ios/Shield/Features/Settings/Forwarding/`. New meaningful UI tests: `ios/ShieldUITests/CarrierSetupUITests.swift`; retained journey/guide tests updated. The generator changes only keypad MP4s through `keypad --video-only`; inline GIF/poster and other guide media are unchanged.

- Copy setup code → Ready to paste in Phone / Open Phone → Apple's native banner Open → Phone → unconfirmed result → explicit carrier confirmation.
- Copying and an unrelated background/return cannot unlock confirmation. Reopen/copy reset the visit gate. Next code starts uncopied.
- Open Phone presents an Apple system launcher, not a one-tap app-owned deep link. The extra system Open tap is disclosed. Native manual launch/Keypad recovery remains. The tested undocumented routes were removed after rejection or a canceled empty calling prompt.
- One/two/three returned activation codes determine route, count and Back. Empty list stays recoverable; stale extra-code resume reaches an unpassed forwarding probe. No backend carrier verification flag is changed.
- Keypad reminder 960×400, 30fps/60 static frames, silent AAC, four short rows. iOS owns its size/position. Physical screenshots show retained top placement after an earlier manual drag; do not infer app-controlled positioning or an actual Paste action.

## Required captures

**All 27 paths in `evidence.json.captures` are required.** Ten main iPhone18Pro/iOS27 views, eleven compact iPhone17e/iOS26.5 views (extra largest-text recovery), six actual iPhone12ProMax/iOS27.2 views. Each was opened individually by the builder after capture. Simulator source test/attachment provenance is in `capture-origins.json`. Largest-text top and scrolled action views are intentional reading viewports, not full-page screenshots. Native banner pixels appear in the physical capture; simulator navigation is intentionally mocked. All source/capture bytes were hashed after final builds.

## Verification and limits

Final main carrier suite6/6; compact7/7 including largest-text carrier recovery. Earlier10/10 main plus7/7 with full synthetic setup journey before the final media/Back-ID correction; compact24/26 with two assertion problems corrected and the final carrier suite passing. Required npm check passed typecheck/build and264 tests. Three required full emulator runs each passed197/198 and failed existing transaction/timing cases (historical-total transaction twice, ten-admissions timeout once). The unchanged historical-total file subsequently passed10/10 in isolation. No clean full-emulator pass is claimed; this is outside the changed native flow. Final signed Debug device and unsigned Release builds passed. Seven shipping rasters have origins; MP4 dimensions/cadence/AAC inspected.

Actual phone: explicit copy/ready, native Apple Open, Keypad visible with compact PiP on first/repeat visits, native Shield return stops help and leaves confirmation pending. Synthetic UI fixture only: no real carrier code pasted/dialed, call, phone setting, forwarding operation or backend progress write. No current native PiP restore-control, novice/senior usability, cross-device landing or new hitch/scanout claim. No service or App Store deployment. T-Mobile candidate is documented for later line qualification, not shipped as an enabled profile. Backend work committed concurrently in ddb8602 is outside this artifact; do not edit it.

## Review delivery

Fresh generalist fallback for unavailable named specialist; use `/Users/isaaczhang/.agents/skills/impeccable/reference/degraded/finish-reviewer.md`, craft-floor.md and ios.md in the same reference directory. Do not run UI, tests, fetch, builds, or mutate product/source. Read supplied captures/source. Own only `finish-review.md` in this directory. Return exact disposition ship/fix/recapture/rebuild and the five contract sections persistence, fidelity, ceiling, material_fixes, keep (recapture may return its recapture list). Existing DESIGN will be narrowly reconciled after a ship verdict, preserving tokens and unrelated decisions.
