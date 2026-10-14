# Native boundary reference

`NativeBoundary.swift` is a standalone SwiftUI app for comparing list/footer accessibility diagnostics. It does not import Shield or belong to a shipped target. Its synthetic content and system colors keep the comparison independent of the product's components.

Compile it in a separate iOS simulator app target and install that app. Set `SHIELD_NATIVE_BOUNDARY_BUNDLE` to its bundle identifier in the **test runner environment**, then run `SeniorAccessibilityUITests/testExternalNativeBoundaryClippingReference`. The optional test skips when that environment value is absent. It audits four variants before and after scrolling, retains every clipping report, and verifies each footer's destination.

The October 14 runs used iOS 26.5 on an iPhone SE (third generation) simulator and `org.shield.NativeBoundaryReference`. Both the initial counter and the current scaled-counter source reproduced four named footer reports after scrolling. They did not reproduce Shield's unnamed clipping report. See the [review and evidence ledger](../../docs/IOS-SENIOR-GESTURE-REVIEW.md).
