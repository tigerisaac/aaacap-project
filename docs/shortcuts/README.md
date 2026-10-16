# Shield Open Phone

This is the historical Phone-opening helper. Current normal setup uses Apple's Phone banner, not an installed shortcut. The separate Debug **Shield Easy Setup** trial is described below.

This Apple-validated Shortcut contains exactly one action: **Open App → Phone** (`com.apple.mobilephone`). It has no call, messaging, network, clipboard or carrier-code action. It was created in Apple Shortcuts and exported for Anyone on 2026-09-24. Keep its name **Shield Open Phone** because the native pilot launches it by name.

The owner's copy is installed through their existing Shortcuts iCloud sync and the complete Shield → Shortcuts → Phone handoff, including reopening, passed on the connected iPhone. A new phone/account must add this shortcut before using the automatic Phone handoff. The exported `.shortcut` file is an installation artifact; the app does not silently install it. Deleting or renaming the shortcut breaks the automatic handoff; manual code copying and pasting remain available.

The native app copies the code locally with a 30-minute expiry, then opens `shortcuts://run-shortcut?name=Shield%20Open%20Phone`. No input or clipboard parameter is sent. The user chooses Keypad, pastes and confirms the carrier code in Phone. Opening Phone never verifies forwarding.

Reference: [Apple Shortcuts URL support](https://support.apple.com/guide/shortcuts/apda283236d7/ios).

## Shield Easy Setup — Debug trial

With the owner's approval, the generic four-action helper was published on October 16, 2026: [Add Shield Easy Setup](https://www.icloud.com/shortcuts/a31253e04fa7440094b98f9fd8903bf2). It contains no personal data. The readable native-authored source is `Shield Easy Setup.wflow`; the generator validates and signs the bundled recovery file but does not publish it.

Shield opens this link directly at Apple's Add Shortcut screen, explains Add then the native Shield return, and runs the helper only from the next explicit action. Its native Silence On action precedes a fixed, undocumented Phone-section URL opened by Apple's Open URLs, then Nothing. The destination was verified beside Live Voicemail on one actual phone; it is not an Apple-supported cross-version link. Live Voicemail still needs the person's manual check. See [implementation, verification and limits](../IOS-SETUP-GUIDES.md#shortcut-section-jump-trial--october-16-2026). Release excludes this trial and its file/media.
