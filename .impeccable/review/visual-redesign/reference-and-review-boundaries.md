# Final review context

User request: Make every iPhone screen look good and polished, especially onboarding, for an 80-year-old. The prior usability pass was explicitly rejected as insufficient visual design; its previous ship verdict is not approval for this work.

User visual guidance: “I like the look of America.gov, it's super simple and polished. It's not exactly a mobile app. Maybe also ‘design twitter’. The thing is, things can look good, but sometimes they get in the way of seniors being able to understand them. So find the right balance.”

Primary reference: https://america.gov/ inspected in the browser on October 13, 2026. The h1 computed font is Rhymes Text with serif fallbacks, 96px, weight 400, RGB 0/12/31. Body uses Helvetica Now Text with Arial/sans fallbacks. The navy action is RGB 0/38/100 (#002664), with a pale neutral ground and restrained composition. A browser screenshot was inspected inline. The browser tool rejected saving it under this checkout and /tmp, so no local reference raster is supplied. Its licensed fonts and photography were not copied. This is a code-led native translation, with no approved screen comp.

Native constraints: iPhone SwiftUI, familiar native navigation/tabs/forms/switches/sheets/menus, semantic font scaling, no custom navigation gesture, ordinary controls and instructions in system sans-serif, serif page-content display headings. The written direction contract is in .impeccable/surfaces/ios-shield-app-rootview-swift.md. Native automatic navigation visibility is deliberate: a forced appearance/visibility setting hid large titles in an intermediate render and was removed.

Review only the final captures provided in the final packet. round-one and confirmation folders are intermediate history. The current source is the canonical checkout. No HTML/CSS detector ran because this is native SwiftUI; apply the native craft floor.

Retain evidence limits: synthetic iOS 27 simulators, not physical VoiceOver, iOS 26 hardware, older-participant or real-call verification. App-owned actions generally retain 52-point minimum labels; native bars/paste/permission controls keep platform behavior. Do not manufacture a clean native audit by hiding excerpts, suppressing diagnostics or exempting everything. Assess reported targets against pixels and source and identify any material remaining correction.

Repository checks: typecheck, 191 unit tests and build passed. The complete first simulator regression passed 59. Two emulator runs retained one ten-simultaneous-participant transaction failure and passed 153/154. Final screen/regression and release results will accompany the packet. No backend screening, deployment, carrier setting or owner-phone change is in scope.
