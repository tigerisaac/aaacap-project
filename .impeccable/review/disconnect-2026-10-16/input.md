# Guided exit review packet

User request: "let's tackle the safe forwarding restoration and account deletion flow next. make sure seniors can disconnect and delete their account easily ... really good flow, similar to ... onboarding". Production must remain unchanged. No monetary wording in pilot experience.

Root: /Users/isaaczhang/Developer/aaacap project. Current baseline: 2933563 plus this task's working changes.
Artifact: ios/Shield/Features/Settings/Disconnect/, DeleteAccountView.swift, DeletionProgressView.swift. Contract: .impeccable/surfaces/ios-disconnect.md. Established design: DESIGN.md and PRODUCT.md. Functional contract: docs/ACCOUNT-OFFBOARDING.md.

Code-led native addition inheriting onboarding; no approved comp, no new shipping raster. Quality bar: readable and non-patronizing for seniors; real explicit confirmations; no automatic carrier verification claims; safe retry/resume; obvious cancellation and complete deletion handoff. No detector ran (native SwiftUI).

Required review captures: every filename in round1/manifest.json, at round1/ beneath this packet. iPhone 17e/iOS26.5 and iPhone18Pro/iOS27. Screens with large-dark in their name show the actual largest accessibility text, scrolled positions named action/top. Rest are normal/light. These are synthetic simulator fixtures; carrier/phone settings never changed.

Known functional finding: first run passed 18/20 executions; the deletion handoff's final app-wide refresh switched the synthetic account context out of its navigation stack. Current source now dismisses back to deletion without that unrelated refresh. Final confirmation will rerun that path. Background deletion progress screens were added after the first run and need final capture. No claims of real-carrier proof or full legal compliance.

References: /Users/isaaczhang/.agents/skills/impeccable/reference/craft-floor.md and ios.md; /Users/isaaczhang/.agents/skills/impeccable/reference/degraded/finish-reviewer.md for the review contract. Review the requested scope, not the rest of the app. Return material findings and disposition only after inspecting every required capture. Distinguish bugs from unverified acceptance gates. Do not modify source or production.

## Final evidence

The final 56-capture matrix is `final/manifest.json`. Matching files are local simulator evidence and are intentionally excluded from the source commit, as are the larger result bundles under /tmp. The initial round is superseded by matching final captures. Source-only documentation from another authorized task advanced main to f762278 during implementation; this work preserves it.

Final scoped checks: npm run check (283 unit tests), test:firebase (229 emulator tests), Swift audio/history storage checks, Release simulator build. Twelve distinct UI/storage scenarios passed on each named device across the final scoped runs; the compact receipt test was repeated successfully after clearing a synthetic test permission overlay and settling capture timing. The functional corrections include safe deletion handoff, immediate receipt read, stale-error recovery and damaged contact-backup discard. Captures are synthetic; no production, physical carrier, phone-call or real-contact action occurred.

A frame caught during navigation and an unrelated system permission overlay were rejected and replaced before the verdict. Largest-text call/voicemail top captures were added to expose the full-width instruction fix; lower frames establish reachable actions. The reviewer scores its six named findings only.
