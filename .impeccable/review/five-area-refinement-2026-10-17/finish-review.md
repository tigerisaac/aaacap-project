# Five-area refinement — October 17, 2026

The independent review covers Settings, number/caretaker forms, message detail, sharing states and setup returns, preserving the owner's chosen Home/login direction. This is native SwiftUI work; no web detector or raster comp applies.

## Initial independent review

Disposition: **fix**.

- **Persistence:** PRODUCT.md, DESIGN.md and the surface contract agree. All 42 compact iPhone capture hashes and dimensions matched; the reviewer inspected all seven contact sheets.
- **Fidelity:** Native serif headings, grouped surfaces, navigation, navy/neutral colors, shared fields, Settings organization, separate alert/call-access scopes, and explicit setup confirmations matched the direction. Playback after the summary at accessibility sizes is a supported adaptation.
- **Ceiling:** Reached for the requested native refinement. More ornament or custom navigation would not improve this brief.
- **Material fix:** A ready recording without a summary could promise “You can still listen” even when the new availability logic correctly hid playback. The fallback sentence must depend on audio availability, with captures for the unavailable/no-summary combination.
- **Keep:** Shared login-style fields, native type scaling and controls, separate caretaker consent and call access, and explicit setup confirmations.

The correction makes the listening sentence conditional and adds synthetic expired/delivered fixtures both with and without summaries. The native audio fixture uses the real availability fields and the same recording-state branch as the app.

## Scoped final independent review

Disposition: **ship**.

The reviewer inspected both new unavailable/no-summary captures and verified the revised source against its recorded hashes. Both states explain why playback is unavailable and retain call details without promising a recording. The sole material finding is resolved, with no visible regression from the fix. This verdict resolves that scored finding and preserves the preceding passed design review; it does not certify newer-runtime tests, physical installation or physical VoiceOver gestures.

The final focused iOS 26.5 run passed **2/2**, covering expired and delivered audio with and without summaries, plus normal playback, pause, resume, restart and background interruption.

## Additional runtime finding

The main agent inspected all 39 iOS 27 confirmation captures. That runtime truncated the longer unavailable-caretaker heading even at standard text size. The three native empty-state labels and descriptions now explicitly grow vertically. The expanded recovery check covers standard/light and maximum/dark layouts, retry, Done, and returning from Caretaker alerts to Call sharing. It passed **1/1** on iOS 26.5 and **2/2** on iOS 27, including the actual simulator VoiceOver spoken-heading check.

The independent reviewer inspected all 25 final captures and verified their hashes and the three changed sources. The full heading appears on both runtimes at normal and maximum text sizes; descriptions wrap, recovery actions remain reachable and the native layout shows no regression. Remaining: clear. Disposition: **ship**, scoped to the clipping fix and associated empty-state layouts. The preceding design and audio verdicts remain intact.

## Validation

`npm run check` passed typecheck, build and 335 unit tests; `npm run test:firebase` passed 250/250. The [audit](../../../docs/IOS-MOTION-AUDIT.md) records the initial UI failures, fixes, follow-up passes and exact source boundaries. Its run ledger has no unresolved failed identifier. The final phone package is frozen with source/package hashes and a successful signature check.

## Delivery

Installed on the owner's iPhone 12 Pro Max at 16:43 Central, October 17. Normal opening was denied because the phone was locked. No test arguments were used. This confirms installation, not physical visual or VoiceOver verification. The package contains the tested refinement; later concurrent contact-storage edits are excluded.

## Evidence boundaries

The [six-screen preview](preview.jpg) contains actual simulator captures with synthetic data. [Provenance](provenance.json) records their hashes and source snapshot. Full captures, result bundles and installation receipts remain locally under ignored `artifacts/private/five-area-refinement-2026-10-17/`. Simulator screenshots and VoiceOver tests do not certify real SMS, calls, carrier behavior or physical VoiceOver gestures.
