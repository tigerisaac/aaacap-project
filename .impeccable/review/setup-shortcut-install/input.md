# Finish review — direct installation and floating guide follow-up

Review only the October 16 refinement in `/Users/isaaczhang/Developer/aaacap project`. Read the source and required captures, judge material issues, and write only `finish-review.md` in this packet. Do not modify code or design documentation. Use the finish-review contract; the harness does not expose a named specialist role, so use `/Users/isaaczhang/.agents/skills/impeccable/reference/degraded/finish-reviewer.md` as needed. This must be a fresh review, not a continuation of the earlier approval.

## Request and permission

The user wants setup a grandmother unfamiliar with Settings can follow: original clear animation, automatic floating help with no custom Play/Float buttons, and no long hunt through Phone settings. They rejected screen-sharing/OCR and the wrong Call Blocking page plus a Back detour, then asked to revisit native Shortcuts. Their current request: “Can you make adding the shortcut easy enough for a grandma too? I don't want them having to figure out the Shortcuts app.” They like the shortcut method, ask whether Silence is automatic, and report “i don't see the floating guide alongside live voicemail.” They clarified Shield's button did send them through Shortcuts to the correct Settings location. This user evidence supersedes the prior scoped approval; don't dismiss it because subsequent runs succeeded.

Explicit new publication permission: **“Yes, publish the install link.”** Earlier refusal is historical and was superseded by this approval. Only the generic four-action helper was published. No personal data or call action is included.

## Artifact and intended behavior

This remains an isolated **Debug Phone setup trial**; normal setup is unchanged. Release excludes its views/session/importer and shortcut/media. No backend progress, forwarding, call, screen sharing or test window is involved.

**Add to iPhone** opens `https://www.icloud.com/shortcuts/a31253e04fa7440094b98f9fd8903bf2` directly in Apple's native Add Shortcut screen. Shield first explains Add Shortcut then the native Shield return. No chooser or library search is needed. No fake Add button or voicemail demonstration competes during installation. Saved-file import is optional recovery under Need help. Opening/returning does not establish Add acceptance; the ready instructions say “after adding,” with retry/help available.

Next explicit **Open Phone settings** starts steady PiP before running Shield Easy Setup. Native authored actions remain Silence Unknown Callers On → fixed Phone-section URL → Open URLs → Nothing. The URL is undocumented, was rejected directly by Shield, and works via native Shortcuts on the tested phone. Do not propose hidden setters or guessed App Intent serialization. Live Voicemail remains manual; returning never verifies it. Need help and failed-PiP recovery remain deliberate. The source is `docs/shortcuts/Shield Easy Setup.wflow`; no actions changed this turn.

For the missing guide, the shared player arms automatic AVKit background handoff through intermediate Shortcuts as well as explicitly starting PiP, rejects suspended PiP as visible success, and resets on return/import. Trial reminder MP4s use a 60-second steady item instead of two seconds to reduce turnovers. Existing GIF/poster artwork is unchanged. `--setup-guide-trace` is opt-in Debug generic lifecycle events only.

Changed source: `SetupShortcutPreview.swift`, `SetupShortcutSession.swift`, `SetupGuidePlayer.swift`, new `SetupGuideTrace.swift` in `ios/Shield/Features/Settings/Forwarding/`; `ios/ShieldUITests/SetupShortcutPreviewUITests.swift`; `scripts/generate-setup-guides.swift`; two trial MP4s and generated project. Supporting docs: `docs/IOS-SETUP-GUIDES.md`, `docs/STATUS.md`, `docs/shortcuts/README.md`, `ios/README.md`. No broad audit or speculative architecture is requested.

## Direction and quality bar

Native iOS, code-led refinement of the pinned navy/neutral surfaces, serif task heading and familiar sans controls. Read PRODUCT.md, relevant DESIGN.md trial rules, and `.impeccable/surfaces/ios-shield-app-rootview-swift.md`. No new comp/world or web layout is involved. QUALITY BAR: one clear useful primary action, native labels and controls, point-of-action help, readable Dynamic Type, deliberate failure recovery, no false verification. Trial usability and native installation friction must remain candid, not presented as validated for seniors.

Craft floor: `/Users/isaaczhang/.agents/skills/impeccable/reference/craft-floor.md`. Native platform: `/Users/isaaczhang/.agents/skills/impeccable/reference/ios.md`. No HTML/CSS detector ran, because this is native SwiftUI. Provenance scan: seven original raster posters, zero missing; no raster artwork changed this turn. No new timing measurement; existing 30fps GIF remains unchanged.

## Required captures

Every file below was opened after capture and shows its named state. Main iPhone 18 Pro/iOS 27 and compact iPhone 17e/iOS 26.5 use final test runs. Largest text is a viewport at a named scroll position; tests assert the primary and recovery actions remain reachable.

In **each** of `main/` and `compact/`:

- `shortcut-add-helper.png` — simple direct-import instructions, no Settings demo.
- `largest-text-shortcut-installation.png` — largest text/dark installation top.
- `installation-failure-saved-file-recovery.png` — largest text/dark expanded recovery, scrolled to saved file.
- `direct-installation-return.png` — conditional ready after mock return, no setting confirmed.
- `published-native-add-shortcut.png` — actual Apple public Add screen; test stops before adding/running.

Actual **iPhone 12 Pro Max / iOS 27.2**, `physical/`:

- `direct-add-shortcut.png` — actual public Add screen, no PiP.
- `armed-guide-stays-visible.png` — guide in target Settings during instrumented hardening run.
- `armed-return-unconfirmed.png` — intentional Home/Spotlight return after about 7m20 active interval, still unconfirmed.
- `final-ready.png` — final installed build with compressed 60-second media, no tracing.
- `final-settings-with-guide.png` — same final build in correct Settings area, Live Voicemail visible above steady guide.

Other extra exports in this directory are not required and may be historical; judge the fifteen listed captures. Prior packet `.impeccable/review/setup-shortcut-section/` records the original four-action payload and earlier observations; its approval does not override the new user report.

## Evidence and limits

`evidence.json` includes capture/source hashes, exact checks, generic instrumented lifecycle events and limits. Actual public installation and replacing our own prior helper passed on hardware. The guide stayed active through Shortcuts and Settings for **440.8 seconds**, until intentional return; repeat and final-build handoffs also showed it. Return stopped PiP and did not confirm the setting. **The owner's original disappearance did not reproduce.** These are hardening observations, not a proven root cause or universal resolution. Current native restore taps were not reliable through Mirroring; this follow-up used Home/Spotlight to return. Earlier build restore evidence must remain separate. Mirroring keyboard capture stayed off.

Silence was already On and Live Voicemail Off; neither transition was observed. No Live Voicemail touch, call, forwarding, backend changes, screen sharing or production deployment occurred. Simulators reach native public Add but don't add or run a telephony action. Mock run tests establish local UI behavior only. Final main suite7/7; compact10/10 including three normal setup regressions; typecheck/build and242 unit tests; Firestore175/175; final Debug/Release builds and device install passed. Release has zero trial shortcut/media. No novice older-adult or cross-device reliability validation.

Return exactly one disposition (`recapture`, `rebuild`, `fix`, `ship`) and the five contract sections **persistence, fidelity, ceiling, material_fixes, keep**. Invalid/missing captures require recapture only. At most eight concrete material issues in the actual scoped change. A ship applies only to the Debug refinement at this evidence scope; preserve unresolved root-cause/native-control/usability limits.
