# Shield for iPhone

Native SwiftUI, iOS 26+, Swift 6. No third-party app frameworks. The project contains the Shield app, a Message Filter extension, and two UI tests.

## Open and run

```sh
npm run ios:generate
open ios/Shield.xcodeproj
```

Select the shared **Shield** scheme and an iPhone simulator, then press **⌘R**. On 2026-09-21 the license blocker was cleared, the simulator build passed with Xcode 27, and Xcode launched Shield on an iPhone 17 running iOS 27. Installation and the running app process were independently verified. The source navigator is grouped by app feature. Automated UI tests and a rendered/accessibility review remain to be run; simulator-window inspection timed out, so no visual approval is claimed.

Use **Explore the demo** for offline synthetic activity. Demo mode never changes phone routing or places calls. To use real data, point `Config/Local.xcconfig` at `shield-calls-isaac.web.app` and sign in with the email link.

`scripts/generate-xcode-project.mjs` deterministically recreates the project from the Swift/resource directories. Re-run it when adding files. Do not keep manual project-only edits; put build changes in the generator or xcconfig. Regenerate original icon and color assets with `node scripts/generate-ios-assets.mjs`.

## Live configuration

Automatic signing uses **Wheema, Inc.** (`6R6HMW3DWN`) in both Debug and Release. `Config/Base.xcconfig` is the shared source for signing, so regenerating the project preserves this configuration:

- App: `org.isaaczhang.Shield`
- Message extension: `org.isaaczhang.Shield.Messages`
- UI tests: `org.isaaczhang.Shield.UITests`

On 2026-09-21, the Debug build for the connected physical iPhone passed using existing local provisioning profiles. Both the app and embedded extension passed signature verification under Wheema, Inc.; both profiles include the connected phone. Release signing settings resolve to the same team and bundle IDs. This verifies development signing, not App Store distribution or live-service behavior.

Copy `Config/Local.xcconfig.example` to `Config/Local.xcconfig` for debug and `Config/ReleaseLocal.xcconfig` for release, or edit an existing local file. Set the HTTPS host and message-filter host; bundle ID and Apple team ID inherit from `Base.xcconfig`. Never include Telnyx, Twilio, Firebase administrative, OpenRouter, Soniox, OpenAI or APNs private keys in these files or the app.

Register the containing app and `.Messages` extension with matching bundle IDs and signing. Enable Associated Domains for the app/extension and Push Notifications for the app. Set the backend’s `APPLE_TEAM_ID=6R6HMW3DWN` and `IOS_BUNDLE_ID=org.isaaczhang.Shield` to match. The app’s association is `messagefilter:YOUR_HOST`; the extension’s deferral URL is `https://YOUR_HOST/sms/classify`.

The selected sign-in method is a Firebase email link, exchanged through Shield's backend. `SHIELD_AUTH_HOST` identifies the dedicated `shield-calls-isaac.firebaseapp.com` domain for Universal Links; the matching AASA file is in `deploy/firebase/public/.well-known/`. The app validates the host/action/code and asks for the email on a cold launch, without reading it from the URL. No Firebase iOS framework or administrative credential is bundled. A legacy server can still select the existing email-code UI.

Tokens stay in device-only Keychain storage. The app rejects HTTP redirects and uses an ephemeral network session. Release API requests require HTTPS. Loopback transport is allowed for the local simulator; a physical device needs an HTTPS service. Firebase email-link auth and the hosted API are configured. Live synthetic auth/history tests pass. The app now uses `shield-calls-isaac.web.app` and its signed build is installed on the iPhone. On September 21 the owner completed verified-email sign-in and confirmed the real trial call appearing as “Appointment reminder,” with its caller number and “Missed” status because the trial cannot transfer calls. Broader email-provider deliverability and cold-launch link QA remain untested. Message filtering remains disabled on its placeholder host. Backend deployment is in [Operations](../docs/OPERATIONS.md).

## App behavior

- **Today:** weekly counts and recent forwarded-call outcomes. Held, connected, and voicemail use coral, teal, and violet alongside text and symbols.
- **Calls:** filters, history, short explanations, a call timeline, and authorized voicemail playback/deletion. History includes only calls reaching Shield.
- **Check:** pasted text or local OCR of a selected screenshot. The user explicitly agrees before text is sent for analysis; a screenshot image is not uploaded. Checks cannot identify a sender as genuine.
- **People:** participant switching, one-use invitations, optional voicemail sharing and revocation. Family members can inspect shared activity; phone settings and independent contacts remain with the participant.
- **Settings:** guided phone forwarding setup and call tests, saved Shield contact, contact sync (synced contacts get voicemail only), connected-call protection opt-in, independent numbers, notifications, message-filter instructions, consent, pause and restoration/deletion requests.

Each forwarding and restoration step automatically copies its current Tello code and presents Apple’s native Phone banner. Tap Open once, choose Keypad, tap above the numbers, choose Paste, and tap Call. Touch and hold is a fallback if Paste does not appear. The window-scene presentation stays independent of scrolling. Three short instructions cover Open, Paste, and Call. Returning dismisses the banner and replaces them with a reminder to check Tello’s result. Show Phone again restores the instructions and recopies the same code; Copy again preserves the result reminder. If the banner cannot load, the screen directs the person to the green Phone app on the Home Screen. The complete code stays on the device-local pasteboard for 30 minutes. Copying, switching apps, and returning never confirm a carrier change. Each connection needs the person’s explicit carrier confirmation, and a separate successful call probe is required for verification. No installed Shortcut is used.

The two Phone-setting instructions share one visit: the first tells the person to select Silence and turn Live Voicemail off. Returning never verifies either switch; each still has a separate confirmation. Setup preserves progress by participant. Restoration also stores progress per participant.

On October 10, with explicit owner permission, the native `CNContactViewController` phone action was tested using the real Tello forwarding code on the enrolled iPhone (iOS 27.2). iOS displayed **Call Forwarding Link Blocked**; no carrier change resulted from that action. The failed card path and temporary test harness were removed. Manually copying and pasting all three real codes into Phone succeeded: Tello reported **Setting Registration Succeeded / Voice Call Forwarding** for When Unanswered, When Busy and When Unreachable. Those conditions remain enabled to Shield. This is carrier-registration evidence, not incoming-call or screening verification. The live test window remains closed and backend onboarding remains at restore; neither was changed during this test.

The normal signed Debug build was reinstalled and launched on the enrolled iPhone after removing the carrier-test harness. The Copy Tello code screen and its three manual instructions were visually inspected there. `npm run check` passed (94 unit tests, typecheck and build), and `npm run test:firebase` passed all 47 tests. The final simulator run passed all eight selected UI tests (seven guided-flow tests plus the no-call/no-carrier-confirmation copy test).

Physical link experiments on October 10 rejected `mobilephone://`, `mobilephone-keypad://`, and `vmshow://`; empty `tel://` showed an empty Call confirmation and was canceled. Further empty-link tests rejected `phone:`, `dialer:`, `x-apple-phone:` and `callto:`; `telephony:`, `telprompt:` and `tel:` displayed empty Call confirmations and were canceled. A window-scene StoreKit overlay for Apple’s Phone app (1146562108) subsequently opened Phone successfully from the integrated onboarding screen. The full synthetic forwarding code pasted intact, and returning retained the unconfirmed step. Dismissal and repeated opening were physically verified. The signed build was installed on the enrolled iPhone. Two targeted simulator tests passed after the launcher integration, covering copy/next-code reset and no automatic dialing or carrier confirmation. That initial version needed Copy → Open → Paste; the later automatic preparation below removes the Copy tap. Automatic prefill remains unresolved. Apple’s documented `tel:` scheme initiates a call confirmation and restricts carrier-code characters ([Phone Links](https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/PhoneLinks/PhoneLinks.html)); Apple DTS is investigating the iOS 27 forwarding-link restriction ([Developer Forums](https://developer.apple.com/forums/thread/847164)).

Manual saved-number calls require the user to tap a native call button. No incoming caller-provided number becomes an approved callback destination. Native Contacts access is requested only to save the Shield DID; the existing address book is not uploaded.

APNs alerts contain no caller/message details. Registration is refreshed for authorized people after sign-in/foreground refresh; signing out removes that subject’s server registrations when the logout request succeeds. If the device is offline, provider token cleanup can be delayed; the generic alert does not reveal call content.

## Message extension limits

The extension uses `ILMessageFilterExtension` and `deferQueryRequestToNetwork`. It has no direct network client or shared inbox storage. Network/configuration failure returns `.none`; the backend returns no automatic classification until the explicit SMS switch is enabled. The containing app cannot enumerate the extension’s filtered messages or Apple’s blocked-call list.

Enable through Messages → Filters → Manage Filtering → Text Message Filter on supported configurations. Confirm the exact UI on the deployment OS. Current Apple consumer guidance includes SMS/MMS/RCS, while Shield’s extension coverage still needs physical validation; do not claim all RCS is screened. iMessage is outside this extension. Sources: [Apple extension setup](https://developer.apple.com/documentation/identitylookup/creating-a-message-filter-app-extension), [network deferral](https://developer.apple.com/documentation/identitylookup/ilmessagefilterextensioncontext/deferqueryrequesttonetwork(completion:)), [Messages filtering guide](https://support.apple.com/guide/iphone/iph203ab0be4/ios).

## Required device verification

Run the UI tests and inspect a small supported iPhone and a larger one in light/dark mode, default/largest accessibility text, VoiceOver and Reduce Motion. Check keyboard dismissal, menu/sheet affordances, safe-area layout, contrast, large text and touch targets. Compilation and simulator launch have passed; no rendered or accessibility pass has been completed yet.

Test login refresh, logout during slow requests, switching participants during loads, expired invitations, revoked history/voicemail access, network failures, and stopping audio on navigation/backgrounding. Then test live APNs, contact saving, on-device OCR, message deferral and actual carrier routing. Simulator tests cannot validate forwarding, conditional call delivery, native voicemail or a physical private acceptance step.

Privacy manifests describe this implementation’s intended collection and must be reconciled with the final deployed services and App Store disclosures. They do not replace that review.

On October 10, the enrolled iPhone verified automatic preparation on entering the first and second synthetic forwarding steps: no Copy tap was needed before Open launched Phone. A normal tap (zero-duration press) above the keypad displayed Paste. Pasting the second code replaced the first intact, without clearing it manually. No code was dialed. The restoration fixture also displayed its automatically prepared reset and Phone banner. Eight guided/safety UI tests passed for automatic setup preparation; three targeted tests then passed for restoration’s three separate confirmations, per-code setup preparation and no automatic calling. The normal signed app was reinstalled and launched after removing the temporary launch experiment. The repository checks were rerun: typecheck/build and 94 unit tests passed, followed by all 47 Firebase emulator tests.

Additional no-number launch experiments rejected `mobilephone:`, `mobilephone://keypad`, `com.apple.mobilephone:` and `x-apple-phone://keypad`. Automatic keypad prefill remains unresolved. Tello’s [official instructions](https://tello.com/help_center/service-issues-troubleshooting/how-can-i-set-up-call-forwarding) document separate 61/62/67 conditions, so the app retains those three documented codes rather than assuming a combined 004 activation is supported.

On October 10, the shorter forwarding and restoration guides were inspected on the enrolled iPhone using synthetic fixtures. Phone opened, returning showed “Check Tello’s result” at the same unconfirmed connection, and retry restored the guide/banner. No setup or reset code was dialed. Ten of eleven initial simulator tests passed; the largest-text test stopped scrolling before reaching the retry control. Scrolling the actual instructions fixed that test, and all four final targeted tests passed (largest text/dark mode, return/retry, three separate reset confirmations, and no automatic dialing/carrier confirmation). The signed normal build was reinstalled and launched. Typecheck/build, 94 unit tests, and 47 Firebase emulator tests passed. Automatic keypad prefill remains unavailable in the tested paths.

Restoration now continues past the three reset codes with two guided Phone-settings confirmations (Screen Unknown Callers = Never; Live Voicemail = On), then separate ordinary-call and normal-voicemail checks. Each setting can be confirmed immediately if already done, or opened using the same Phone-settings launcher as setup. Opening/returning never confirms a setting. The participant-specific saved step now covers the whole checklist, including relaunches and completion. Existing users at the old final instructions resume at the first settings confirmation; their reset progress is retained. Each new step scrolls to the heading. Completion reflects the person’s confirmations and does not update backend carrier verification.

October 10 validation: three targeted restoration tests passed before and after the final layout adjustment, covering separate reset confirmations, already-done Settings, return without advancement, persistence through relaunch, required ordinary-call/voicemail confirmations, and largest accessibility text in dark mode. The Settings and call-check screens were inspected on the enrolled iPhone using synthetic fixtures; no carrier code was dialed and no phone setting was changed. Typecheck/build, 94 unit tests and 47 Firebase emulator tests passed. The signed normal app was installed and launched, with the owner’s saved restoration progress retained.

The existing end-to-end guided setup regression also passed after adding the shared scroll-to-heading container (October 10).

Setup completion now uses Done to dismiss onboarding without requesting restoration, closing the screening session, or changing forwarding. The final step is “Setup complete,” keeps the two call-check results visible, and shows the current screening-session state. Additional call checks are optional guidance. Restoration is available separately from Setup options → Restore my phone, with an explicit confirmation before callbacks are stopped. The consent screen no longer tells people to restore when setup finishes. This UI change does not remove the backend’s timed screening-session limits or add always-on/multi-user service.

October 10 completion validation: the end-to-end guided setup and Done/later-restoration UI tests both passed. The synthetic completion screenshot was inspected in simulator. Typecheck/build, 94 unit tests and 47 Firebase emulator tests passed. The signed normal build was installed and launched on the enrolled iPhone without changing its saved progress or session. No carrier setting or live backend deployment changed in this pass.
