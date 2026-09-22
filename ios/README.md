# Shield for iPhone

Native SwiftUI, iOS 26+, Swift 6. No third-party app frameworks. The project contains the Shield app, a Message Filter extension, and two UI tests.

## Open and run

```sh
npm run demo:setup
npm run ios:generate
open ios/Shield.xcodeproj
```

Select the shared **Shield** scheme and an iPhone simulator, then press **⌘R**. On 2026-09-21 the license blocker was cleared, the simulator build passed with Xcode 27, and Xcode launched Shield on an iPhone 17 running iOS 27. Installation and the running app process were independently verified. The source navigator is grouped by app feature. Automated UI tests and a rendered/accessibility review remain to be run; simulator-window inspection timed out, so no visual approval is claimed.

Use **Explore the demo** for offline synthetic activity. For the connected local demo, run `npm run dev` on the Mac and choose **Local participant** or **Local caregiver** in the debug app. Setup writes a random local bearer token into gitignored `Config/Local.xcconfig`; release configuration clears the token and excludes these buttons. Demo mode never changes phone routing or places calls.

`scripts/generate-xcode-project.mjs` deterministically recreates the project from the Swift/resource directories. Re-run it when adding files. Do not keep manual project-only edits; put build changes in the generator or xcconfig. Regenerate original icon and color assets with `node scripts/generate-ios-assets.mjs`.

## Live configuration

Automatic signing uses **Wheema, Inc.** (`6R6HMW3DWN`) in both Debug and Release. `Config/Base.xcconfig` is the shared source for signing, so regenerating the project preserves this configuration:

- App: `org.isaaczhang.Shield`
- Message extension: `org.isaaczhang.Shield.Messages`
- UI tests: `org.isaaczhang.Shield.UITests`

On 2026-09-21, the Debug build for the connected physical iPhone passed using existing local provisioning profiles. Both the app and embedded extension passed signature verification under Wheema, Inc.; both profiles include the connected phone. Release signing settings resolve to the same team and bundle IDs. This verifies development signing, not App Store distribution or live-service behavior.

Copy `Config/Local.xcconfig.example` to `Config/Local.xcconfig` for debug and `Config/ReleaseLocal.xcconfig` for release, or edit an existing local file to preserve its demo settings. Set the HTTPS host and message-filter host; bundle ID and Apple team ID inherit from `Base.xcconfig`. Never include Twilio, Firebase administrative, OpenRouter, Soniox, OpenAI or APNs private keys in these files or the app.

Register the containing app and `.Messages` extension with matching bundle IDs and signing. Enable Associated Domains for the app/extension and Push Notifications for the app. Set the backend’s `APPLE_TEAM_ID=6R6HMW3DWN` and `IOS_BUNDLE_ID=org.isaaczhang.Shield` to match. The app’s association is `messagefilter:YOUR_HOST`; the extension’s deferral URL is `https://YOUR_HOST/sms/classify`.

The selected sign-in method is a Firebase email link, exchanged through Shield's backend. `SHIELD_AUTH_HOST` identifies the dedicated `shield-calls-isaac.firebaseapp.com` domain for Universal Links; the matching AASA file is in `deploy/firebase/public/.well-known/`. The app validates the host/action/code and asks for the email on a cold launch, without reading it from the URL. No Firebase iOS framework or administrative credential is bundled. A legacy server can still select the existing email-code UI.

Tokens stay in device-only Keychain storage. The app rejects HTTP redirects and uses an ephemeral network session. Release API requests require HTTPS. Loopback transport is allowed for the local simulator; a physical device needs an HTTPS service. Firebase email-link auth and the hosted API are configured. Live synthetic auth/history tests pass. The app now uses `shield-calls-isaac.web.app` and its signed build is installed on the iPhone. On September 21 the owner completed verified-email sign-in and confirmed the real trial call appearing as “Appointment reminder,” with its caller number and “Missed” status because the trial cannot transfer calls. Broader email-provider deliverability and cold-launch link QA remain untested. Message filtering remains disabled on its placeholder host. Backend setup instructions are in [DEPLOYMENT.md](../docs/DEPLOYMENT.md).

## App behavior

- **Today:** weekly counts and recent forwarded-call outcomes. Held, connected, and voicemail use coral, teal, and violet alongside text and symbols.
- **Calls:** filters, history, short explanations, a call timeline, and authorized voicemail playback/deletion. History includes only calls reaching Shield.
- **Check:** pasted text or local OCR of a selected screenshot. The user explicitly agrees before text is sent for analysis; a screenshot image is not uploaded. Checks cannot identify a sender as genuine.
- **People:** participant switching, one-use invitations, optional voicemail sharing and revocation. Family members can inspect shared activity; phone settings and independent contacts remain with the participant.
- **Settings:** assisted setup, saved Shield contact, trusted-number/message-only policy, independent numbers, notifications, message-filter instructions, consent, pause and restoration/deletion requests.

Manual saved-number calls require the user to tap a native call button. No incoming caller-provided number becomes an approved callback destination. Native Contacts access is requested only to save the Shield DID; the existing address book is not uploaded.

APNs alerts contain no caller/message details. Registration is refreshed for authorized people after sign-in/foreground refresh; signing out removes that subject’s server registrations when the logout request succeeds. If the device is offline, provider token cleanup can be delayed; the generic alert does not reveal call content.

## Message extension limits

The extension uses `ILMessageFilterExtension` and `deferQueryRequestToNetwork`. It has no direct network client or shared inbox storage. Network/configuration failure returns `.none`; the backend returns no automatic classification until the explicit SMS switch is enabled. The containing app cannot enumerate the extension’s filtered messages or Apple’s blocked-call list.

Enable through Messages → Filters → Manage Filtering → Text Message Filter on supported configurations. Confirm the exact UI on the deployment OS. Current Apple consumer guidance includes SMS/MMS/RCS, while Shield’s extension coverage still needs physical validation; do not claim all RCS is screened. iMessage is outside this extension. Sources: [Apple extension setup](https://developer.apple.com/documentation/identitylookup/creating-a-message-filter-app-extension), [network deferral](https://developer.apple.com/documentation/identitylookup/ilmessagefilterextensioncontext/deferqueryrequesttonetwork(completion:)), [Messages filtering guide](https://support.apple.com/guide/iphone/iph203ab0be4/ios).

## Required device verification

Run the UI tests and inspect a small supported iPhone and a larger one in light/dark mode, default/largest accessibility text, VoiceOver and Reduce Motion. Check keyboard dismissal, menu/sheet affordances, safe-area layout, contrast, large text and touch targets. Compilation and simulator launch have passed; no rendered or accessibility pass has been completed yet.

Test login refresh, logout during slow requests, switching participants during loads, expired invitations, revoked history/voicemail access, network failures, and stopping audio on navigation/backgrounding. Then test live APNs, contact saving, on-device OCR, message deferral and actual carrier routing. Simulator tests cannot validate forwarding, conditional call delivery, native voicemail or a physical private acceptance step.

Privacy manifests describe this implementation’s intended collection and must be reconciled with the final deployed services and App Store disclosures. They do not replace that review.
