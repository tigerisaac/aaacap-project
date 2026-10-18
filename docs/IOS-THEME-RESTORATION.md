# Restore Shield's pre-Andrew design — October 18, 2026

The owner requested a full return to the appearance before the October 17 Apple-style theme port (`98dbc2b`). This restoration reverses that port's application changes, using its parent `b9ac3f4` as the visual reference. It does not revert the older October 12 branch merge or later functional work.

Restored throughout the app: serif display/section headings, the navy and pale-blue palette, neutral light surfaces, quiet symbol tiles, the larger Home stopped-call card, the compact Shield wordmark, inline phone sign-in action, previous field shapes, spacing, navigation/tab backgrounds, and setup actions. The launch screen and color assets match the earlier theme as well.

Of the 64 application paths touched by the port, 59 return exactly to their pre-port contents or absence. The other five retain subsequent changes: preview routes in RootView, call-directory lifecycle handling in ShieldApp, corrected privacy-retention wording, complete blocked-number loading/synchronization, and the caretaker decline color. The corrected caretaker empty-state test remains; the restored sign-in button again requires a 52-point target.

The shared checkout contains a separate caretaker-refresh draft. It is excluded from this restoration's staged change and frozen phone candidate. Existing theme-port evidence remains historical evidence, not verification of the restored build.

## Verification and installation

Application commit `b17a6a2` is the frozen, signed phone candidate. Every tracked file in its initial build input was checked against the commit. Simulator and signed-device builds passed, as did code-signature verification. The app was installed and launched successfully on the owner's connected iPhone on October 18. The installed binary SHA-256 is `3f9ea70bc5c62919f203b96b19dffa0ebec1c8066e767655a41460c1b48cf180`.

- `npm run check`: passed, including 382 unit tests and the backend build.
- `npm run test:firebase`: 284/284 passed on isolated local ports. The first attempt could not start because another emulator occupied the usual port.
- Compact iOS 26.5 shared-checkout run: 36/38 passed. All 31 restoration methods passed; five of seven additional methods for the separate uncommitted caretaker draft passed. Its two failed viewport checks remain recorded and that draft is excluded from the installed build.
- Exact candidate on iOS 27: initially 19/20 passed. The remaining maximum-text caretaker-removal assertion also failed on iOS 26.5. The recording shows the caretaker's details remained; its section heading had scrolled out of List's accessibility tree. The test now checks the retained name before scrolling to Remove, then verifies the next caretaker after retry. The corrected method passes on both iOS versions, giving all 20 candidate methods passing evidence across the runs. No application code changed for this test correction.

Inspected captures cover Home, both sign-in appearances, Settings, the large-text number/caretaker forms, message detail, sharing, setup return, and caretaker recovery. The earlier theme's native placeholder truncation at maximum text remains; persistent field labels stay visible. This scoped restoration does not resolve the separately recorded broader accessibility or App Store gates. No backend deployment or real-call verification occurred.

[Visual preview](../.impeccable/review/theme-restoration-2026-10-18/preview.jpg), [source comparison](../.impeccable/review/theme-restoration-2026-10-18/restored-source.json), and [verification record](../.impeccable/review/theme-restoration-2026-10-18/verification.json) retain the original failures alongside the corrected results. Full local evidence is under `artifacts/private/theme-restore-2026-10-18/`.
