# Shield for iPhone

Native SwiftUI, iOS 26+, Swift 6. No third-party app frameworks. The project contains the Shield app, a Message Filter extension, a Call Directory extension, and UI tests.

## Open and run

```sh
npm run ios:generate
open ios/Shield.xcodeproj
```

Select the shared **Shield** scheme and an iPhone simulator, then press **⌘R**. The source navigator is grouped by app feature. The current source and simulator review, including unresolved native accessibility diagnostics, is recorded in [the senior-polish audit](../docs/IOS-POLISH-AUDIT.md). Deployment and physical-phone evidence are recorded separately in [Status](../docs/STATUS.md).

For offline synthetic activity during development, launch the Debug simulator with `--uitesting-preview`. Sample mode never changes phone routing or places calls and has no entry on the iOS sign-in screen. The iPhone sign-in screen uses phone verification only; email sign-in is no longer offered. Point `Config/Local.xcconfig` at `shield-calls-isaac.web.app`. Existing email accounts must have their verified phone linked to the same Firebase UID before using phone login, so history and ownership are preserved. Production activation and handset verification are recorded separately in Status.

`scripts/generate-xcode-project.mjs` deterministically recreates the project from the Swift/resource directories. Re-run it when adding files. Do not keep manual project-only edits; put build changes in the generator or xcconfig. On macOS, regenerate the app icon, sign-in mark and rounded launch mark with `node scripts/generate-ios-assets.mjs`. It uses the owner-selected rounded S-shield in [`artwork/identity`](../artwork/identity/manifest.json), verifies the source hash and leaves the adaptive color assets unchanged. The full-square icon is masked by iOS; the launch mark has continuous corners baked in. Sign-in keeps native, accessible “Shield” text beside the decorative image.

## Run focused UI audits

Keep Device Hub's **Capture Keyboard** off while collaborating with the owner. It redirects the Mac's typing into the simulator; leaving it enabled interrupted the owner's keyboard on October 15. Use the existing UI-test tooling without enabling keyboard capture.

Use one existing simulator and the normal Xcode build cache. For the accessibility suite:

```sh
xcodebuild test -project ios/Shield.xcodeproj -scheme Shield \
  -destination 'platform=iOS Simulator,name=iPhone 18 Pro' \
  -parallel-testing-enabled NO -collect-test-diagnostics never \
  -only-testing:ShieldUITests/SeniorAccessibilityUITests
```

Replace the test selector with a specific class or method when checking a correction. The `never` diagnostic policy avoids the large system diagnostic collection that stalled the October 14 run; test failures, screenshots and accessibility issue attachments remain in the result bundle. Omit that policy when investigating a simulator crash that needs system diagnostics. Reuse the same simulator, and do not create parallel clones or extra DerivedData folders. The visual matrix and functional journeys are separate suites and need not run for every audit iteration.

The shared `appears(timeout:)` helper checks immediately before waiting, while keyboard interactions explicitly wait for the keyboard and return key to be hittable. Captures reuse one screenshot for the attachment and PNG export; accessibility failures attach the full tree once per screen and the associated element for each issue. The audit's 0.8-second settle remains because removing it lost element attribution. No accessibility issue is waived by these optimizations.

## Live configuration

Automatic signing uses **Wheema, Inc.** (`6R6HMW3DWN`) in both Debug and Release. `Config/Base.xcconfig` is the shared source for signing, so regenerating the project preserves this configuration:

- App: `org.isaaczhang.Shield`
- Message extension: `org.isaaczhang.Shield.Messages`
- UI tests: `org.isaaczhang.Shield.UITests`

On 2026-09-21, the Debug build for the connected physical iPhone passed using existing local provisioning profiles. Both the app and embedded extension passed signature verification under Wheema, Inc.; both profiles include the connected phone. Release signing settings resolve to the same team and bundle IDs. This verifies development signing, not App Store distribution or live-service behavior.

Copy `Config/Local.xcconfig.example` to `Config/Local.xcconfig` for debug and `Config/ReleaseLocal.xcconfig` for release, or edit an existing local file. Set the HTTPS host and message-filter host; bundle ID and Apple team ID inherit from `Base.xcconfig`. Never include Telnyx, Twilio, Firebase administrative, OpenRouter, Soniox, OpenAI or APNs private keys in these files or the app.

Register the containing app and `.Messages` extension with matching bundle IDs and signing. Enable Associated Domains for the app/extension and Push Notifications for the app. Set the backend’s `APPLE_TEAM_ID=6R6HMW3DWN` and `IOS_BUNDLE_ID=org.isaaczhang.Shield` to match. The app’s association is `messagefilter:YOUR_HOST`; the extension’s deferral URL is `https://YOUR_HOST/sms/classify`.

The main sign-in screen uses a Telnyx Verify phone code followed by Firebase custom authentication through Shield’s backend. This path is implemented but not deployed as of October 14; see Operations for activation prerequisites. Existing Firebase email links remain supported as a secondary option. `SHIELD_AUTH_HOST` identifies the dedicated `shield-calls-isaac.firebaseapp.com` domain for Universal Links; the matching AASA file is in `deploy/firebase/public/.well-known/`. The app validates the host/action/code and asks for the email on a cold launch, without reading it from the URL. No Firebase iOS framework or administrative credential is bundled. A legacy server can still select the existing email-code UI.

Tokens stay in device-only Keychain storage. The app rejects HTTP redirects and uses an ephemeral network session. Release API requests require HTTPS. Loopback transport is allowed for the local simulator; a physical device needs an HTTPS service. Firebase email-link auth and the hosted API are configured. Live synthetic auth/history tests pass. The app now uses `shield-calls-isaac.web.app` and its signed build is installed on the iPhone. On September 21 the owner completed verified-email sign-in and confirmed the real trial call appearing as “Appointment reminder,” with its caller number and “Missed” status because the trial cannot transfer calls. Broader email-provider deliverability and cold-launch link QA remain untested. Message filtering remains disabled on its placeholder host. Backend deployment is in [Operations](../docs/OPERATIONS.md).

## App behavior

On October 12, the app was simplified for older adults, with calls and voicemail first. The iPhone 18 Pro / iOS 27 simulator passed the four new screen journeys (including sample audio, Keep/Kept, and largest-text Dark Mode), three final setup-warning checks, and the earlier 13 forwarding tests. Typecheck/build and 157 unit tests passed; the Firestore emulator passed 86 tests on isolated local ports. The independent visual reviewer scored its five requested corrections resolved. Automated accessibility audits still report Calls contrast/clipping diagnostics without associated elements and Privacy partly beneath the native bottom bar; they are not reported as passed. Details and future-feature work are in [the design record](../docs/IOS-SENIOR-DESIGN.md). This is simulator evidence, with no deployment, physical-phone changes, or new real-call evidence.

- **Home:** a short phone status, recent voicemail, and recent calls. Missing or stale status is never described as on. Setup problems can be opened when needed; a healthy setup check adds no extra block.
- **Calls:** filters, history, short outcomes, and details on request. History includes only calls reaching Shield. Outcomes use everyday words such as Answered and Stopped.
- **Messages:** voicemail and saved notices, readable summaries, authorized playback/deletion, and eligible legacy removed messages. Audio offers pause/resume, progress and Start over. Sample data also previews Keep this message; it does not change real-message storage or expiry.
- **More → Check a text:** pasted text or local OCR of a picture. The person agrees before sending text for a scam check; the picture itself is not uploaded. Checks cannot prove who sent a message.
- **More → Family & friends:** person switching, and for the owner a Your helpers list with each helper’s access and Stop sharing. The app does not create or accept invitations; helpers who are already linked keep working. Helpers can see shared calls; phone settings stay with the person using the phone.
- **More → Settings:** guided phone setup and call checks, saved Shield contact, contact updates, checks while talking, trusted numbers, alerts, automatic text-check instructions, and disconnection/deletion requests. The setup menu now calls restoration **Disconnect Shield**.

The [senior design notes](../docs/IOS-SENIOR-DESIGN.md) preserve the earlier design history. The [current polish audit](../docs/IOS-POLISH-AUDIT.md) records onboarding, text scaling, controls and recovery corrections. Real summaries follow the service implementation below; permanent keeping remains a sample-only feature.

Carrier setup explains **Connect calls to Shield**, then offers **Copy setup code** → **Open Phone**. Copying produces **Ready to paste in Phone** feedback; Open Phone presents Apple’s native Phone banner. Its additional Open tap remains, followed by Keypad if needed, Paste above the numbers, Call, and a check of the carrier’s result. A compact floating reminder follows the Phone visit. Return offers explicit carrier confirmation only after a requested handoff; copying or an unrelated app visit cannot advance setup. Reopening or recopying requires a fresh Phone visit, and each new code starts uncopied. One-, two- and three-code profiles use only their actual code steps and progress totals. Empty code lists retain refresh recovery. T-Mobile retains its existing three-code profile pending the deferred direct-line test. Restoration retains its separate automatic-copy/native-banner flow. Codes remain on the device-local pasteboard for 30 minutes. No navigation event confirms a carrier change; the forwarding call probe is a separate requirement. The carrier handoff uses no installed Shortcut. [Current implementation and limits](../docs/IOS-SETUP-GUIDES.md#carrier-code-handoff--october-16-2026).

The normal Phone-settings setup offers the published **Shield Easy Setup** helper through Apple’s native Add Shortcut screen. Opening Phone settings runs that helper to select Silence and open beside Live Voicemail; the person turns Live Voicemail off with a short floating reminder. The step-by-step manual route remains under Need help. Returning never verifies either switch; each still has a separate confirmation. Setup and restoration preserve progress by participant.

On October 10, with explicit owner permission, the native `CNContactViewController` phone action was tested using the real Tello forwarding code on the enrolled iPhone (iOS 27.2). iOS displayed **Call Forwarding Link Blocked**; no carrier change resulted from that action. The failed card path and temporary test harness were removed. Manually copying and pasting all three real codes into Phone succeeded: Tello reported **Setting Registration Succeeded / Voice Call Forwarding** for When Unanswered, When Busy and When Unreachable. Those conditions remain enabled to Shield. This is carrier-registration evidence, not incoming-call or screening verification. The live test window remains closed and backend onboarding remains at restore; neither was changed during this test.

The normal signed Debug build was reinstalled and launched on the enrolled iPhone after removing the carrier-test harness. The Copy Tello code screen and its three manual instructions were visually inspected there. `npm run check` passed (94 unit tests, typecheck and build), and `npm run test:firebase` passed all 47 tests. The final simulator run passed all eight selected UI tests (seven guided-flow tests plus the no-call/no-carrier-confirmation copy test).

Physical link experiments on October 10 rejected `mobilephone://`, `mobilephone-keypad://`, and `vmshow://`; empty `tel://` showed an empty Call confirmation and was canceled. Further empty-link tests rejected `phone:`, `dialer:`, `x-apple-phone:` and `callto:`; `telephony:`, `telprompt:` and `tel:` displayed empty Call confirmations and were canceled. A window-scene StoreKit overlay for Apple’s Phone app (1146562108) subsequently opened Phone successfully from the integrated onboarding screen. The full synthetic forwarding code pasted intact, and returning retained the unconfirmed step. Dismissal and repeated opening were physically verified. The signed build was installed on the enrolled iPhone. Two targeted simulator tests passed after the launcher integration, covering copy/next-code reset and no automatic dialing or carrier confirmation. That initial version needed Copy → Open → Paste; the later automatic preparation below removes the Copy tap. Automatic prefill remains unresolved. Apple’s documented `tel:` scheme initiates a call confirmation and restricts carrier-code characters ([Phone Links](https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/PhoneLinks/PhoneLinks.html)); Apple DTS is investigating the iOS 27 forwarding-link restriction ([Developer Forums](https://developer.apple.com/forums/thread/847164)).

Manual saved-number calls require the user to tap a native call button. No incoming caller-provided number becomes an approved callback destination. Saving Shield and sharing the iPhone calling list require Contacts permission. The calling-list update sends contact names and phone numbers; local backups preserve removed phone fields for restoration. Other contact fields are not uploaded by that path.

APNs alerts contain no caller/message details. Registration is refreshed for authorized people after sign-in/foreground refresh; signing out removes that subject’s server registrations when the logout request succeeds. If the device is offline, provider token cleanup can be delayed; the generic alert does not reveal call content.

October 12 simulator validation: Andrew's native iOS redesign was integrated with account-loading recovery and call-refresh recovery fixes. A failed initial account load shows an error and Try Again instead of invitation onboarding; a successful activity refresh clears the previous Calls error. The screenshot-picker label's Swift concurrency warning was also fixed. Both new recovery UI tests passed, as did the three selected redesign tests for call navigation/filtering, message-check consent, and screening-status states. `npm run check` passed (143 unit tests, typecheck and build), and `npm run test:firebase` passed all 86 emulator tests. The updated Debug app was built and launched with sample data in the iPhone 18 Pro simulator. No physical-phone installation, backend deployment, carrier change, or real call was performed.

## Saved messages (October 12 repository implementation)

The Messages tab combines voicemail and saved notices. Authorized users see a short summary with the usual bottom audio action; there is no transcript section. Saved notices carry independent-contact guidance rather than an actionable caller-provided callback. Helpers without message-sharing permission see no summary/playback. Text-generation failures keep audio playable. Clear scam/junk content is discarded; legacy restoration is available only when older retained audio remains. Keep this message is still a sample-only feature. Backend capture from answer uses the shared Call Control transport; see Architecture for retention and provider deletion. The signed Debug app from source commit `895456c` was installed and launched on the paired physical iPhone October 12 at approximately 19:54 Central with owner authorization. The audio-and-summary revision was built, installed and launched on the same iPhone October 12 at approximately 20:19 Central. The new backend processing is not deployed, and no real-call or physical visual verification is claimed.

## Call Directory extension

`CallDirectory/` blocks every number on the person's Shield blocklist at the phone level. That includes numbers she has since saved or called back, which would otherwise ring her directly and never reach Shield.
- **How it works:** the app writes the list (`Shared/CallDirectoryList.swift`) to the App Group container `group.$(SHIELD_APP_BUNDLE_ID)` and asks iOS to reload the extension. It does this on refresh, and when Blocked numbers opens or a number is unblocked. Only the protected person's own phone does this, never a helper's.
- **Turning it on:** the person enables Shield under Settings → Apps → Phone → Call Blocking & Identification. The Blocked numbers screen shows whether it's on and links there.

**Signing (added October 11, not yet installed on the phone):**
- **App ID:** the extension needs `org.isaaczhang.Shield.CallDirectory`.
- **App Groups:** the app and the extension both need the App Groups capability with `group.org.isaaczhang.Shield`.
- **Simulator:** builds sign without changes.
- **Phone:** before the next install, build once in Xcode with the team account signed in so automatic signing can register the App ID, the group and the updated profiles.

**Still needs a device check (protection plan section 3):**
- Does a block still apply to a number in Contacts or recently called?
- Is a blocked call rejected so the carrier forwards it to Shield?

## Message extension limits

The extension uses `ILMessageFilterExtension` and `deferQueryRequestToNetwork`. It has no direct network client or shared inbox storage. Network/configuration failure returns `.none`; the backend returns no automatic classification until the explicit SMS switch is enabled. The containing app cannot enumerate the extension’s filtered messages or Apple’s blocked-call list.

Enable through Messages → Filters → Manage Filtering → Text Message Filter on supported configurations. Confirm the exact UI on the deployment OS. Current Apple consumer guidance includes SMS/MMS/RCS, while Shield’s extension coverage still needs physical validation; do not claim all RCS is screened. iMessage is outside this extension. Sources: [Apple extension setup](https://developer.apple.com/documentation/identitylookup/creating-a-message-filter-app-extension), [network deferral](https://developer.apple.com/documentation/identitylookup/ilmessagefilterextensioncontext/deferqueryrequesttonetwork(completion:)), [Messages filtering guide](https://support.apple.com/guide/iphone/iph203ab0be4/ios).

## Required device verification

Before claiming device accessibility, inspect a small supported iPhone and a larger one in light/dark mode, default/largest accessibility text, VoiceOver and Reduce Motion. Check keyboard dismissal, menu/sheet affordances, safe-area layout, contrast, large text and touch targets. Automated synthetic journeys and rendered simulator review have passed as recorded in [the audit](../docs/IOS-POLISH-AUDIT.md); the overall native diagnostic suite is not clean, and physical VoiceOver and older-participant usability have not been established.

Test login refresh, logout during slow requests, switching participants during loads, revoked history/voicemail access, network failures, and stopping audio on navigation/backgrounding. Then test live APNs, contact saving, on-device OCR, message deferral and actual carrier routing. Simulator tests cannot validate forwarding, conditional call delivery, native voicemail or a physical private acceptance step.

Privacy manifests describe this implementation’s intended collection and must be reconciled with the final deployed services and App Store disclosures. They do not replace that review.

On October 10, the enrolled iPhone verified automatic preparation on entering the first and second synthetic forwarding steps: no Copy tap was needed before Open launched Phone. A normal tap (zero-duration press) above the keypad displayed Paste. Pasting the second code replaced the first intact, without clearing it manually. No code was dialed. The restoration fixture also displayed its automatically prepared reset and Phone banner. Eight guided/safety UI tests passed for automatic setup preparation; three targeted tests then passed for restoration’s three separate confirmations, per-code setup preparation and no automatic calling. The normal signed app was reinstalled and launched after removing the temporary launch experiment. The repository checks were rerun: typecheck/build and 94 unit tests passed, followed by all 47 Firebase emulator tests.

Additional no-number launch experiments rejected `mobilephone:`, `mobilephone://keypad`, `com.apple.mobilephone:` and `x-apple-phone://keypad`. Automatic keypad prefill remains unresolved. Tello’s [official instructions](https://tello.com/help_center/service-issues-troubleshooting/how-can-i-set-up-call-forwarding) document separate 61/62/67 conditions, so the app retains those three documented codes rather than assuming a combined 004 activation is supported.

On October 10, the shorter forwarding and restoration guides were inspected on the enrolled iPhone using synthetic fixtures. Phone opened, returning showed “Check Tello’s result” at the same unconfirmed connection, and retry restored the guide/banner. No setup or reset code was dialed. Ten of eleven initial simulator tests passed; the largest-text test stopped scrolling before reaching the retry control. Scrolling the actual instructions fixed that test, and all four final targeted tests passed (largest text/dark mode, return/retry, three separate reset confirmations, and no automatic dialing/carrier confirmation). The signed normal build was reinstalled and launched. Typecheck/build, 94 unit tests, and 47 Firebase emulator tests passed. Automatic keypad prefill remains unavailable in the tested paths.

Restoration now continues past the three reset codes with two guided Phone-settings confirmations (Screen Unknown Callers = Never; Live Voicemail = On), then separate ordinary-call and normal-voicemail checks. Each setting can be confirmed immediately if already done, or opened using the same Phone-settings launcher as setup. Opening/returning never confirms a setting. The participant-specific saved step now covers the whole checklist, including relaunches and completion. Existing users at the old final instructions resume at the first settings confirmation; their reset progress is retained. Each new step scrolls to the heading. Completion reflects the person’s confirmations and does not update backend carrier verification.

October 10 validation: three targeted restoration tests passed before and after the final layout adjustment, covering separate reset confirmations, already-done Settings, return without advancement, persistence through relaunch, required ordinary-call/voicemail confirmations, and largest accessibility text in dark mode. The Settings and call-check screens were inspected on the enrolled iPhone using synthetic fixtures; no carrier code was dialed and no phone setting was changed. Typecheck/build, 94 unit tests and 47 Firebase emulator tests passed. The signed normal app was installed and launched, with the owner’s saved restoration progress retained.

The existing end-to-end guided setup regression also passed after adding the shared scroll-to-heading container (October 10).

Setup completion now uses Done to dismiss onboarding without requesting restoration, closing the screening session, or changing forwarding. The final step is “Setup complete,” keeps the two call-check results visible, and shows the current screening-session state. Additional call checks are optional guidance. Restoration is available separately from Setup options → Restore my phone, with an explicit confirmation before callbacks are stopped. The consent screen no longer tells people to restore when setup finishes. This UI change does not remove the backend’s timed screening-session limits or add always-on/multi-user service.

October 10 completion validation: the end-to-end guided setup and Done/later-restoration UI tests both passed. The synthetic completion screenshot was inspected in simulator. Typecheck/build, 94 unit tests and 47 Firebase emulator tests passed. The signed normal build was installed and launched on the enrolled iPhone without changing its saved progress or session. No carrier setting or live backend deployment changed in this pass.


Connected-call protection now appears in main onboarding after email sign-in, selected by default. The owner can turn it off before tapping Continue, which saves the choice through the existing monitoring endpoint. The screen explains transcription, scam checks, possible warning/disconnection, and retention. Existing explicit opt-outs skip the screen; enabled choices with outdated consent require renewed consent. Helpers and unavailable monitoring skip it. Failed saves retain the screen and selected choice. Older APIs without `choiceRecorded` skip this screen until the API rollout. Settings still allows changing the saved choice.

October 10 protection-onboarding validation: typecheck/build and 94 unit tests passed, along with 48 Firebase emulator tests. All five final targeted simulator UI tests passed, covering selected-by-default protection, turning it off, failed-save recovery, largest accessibility text in dark mode, and email sign-in. Normal and largest-text screens were inspected in simulator. The signed normal build was installed and launched on the enrolled iPhone. No call was placed, forwarding changed, or owner monitoring choice saved by this work. Real connected-call monitoring remains unverified.

With owner approval, only `shieldApi` was deployed October 10: revision `shieldapi-00013-seb`, ACTIVE at 22:11:03 UTC; public health returned HTTP 200/ready. The onboarding choice metadata is live.


### October 14 — compact phone-setup flow

The setup gallery now matches the always-on direction: no Demo banner, 30-minute offer, expiry label, or temporary-service copy. The overview has four bullets; consent keeps its two main headlines with provider/privacy details expandable; the saved contact has one branded preview; ring-check instructions are larger; and the final forwarding check emphasizes Don’t answer. Screen Unknown Callers and Live Voicemail each have a separate opening/confirmation step. Carrier recovery actions are inside Need help? so the default Open / Paste / Call list fits together. Call-result and carrier-confirmation gates remain intact.

`ForwardingProbes.openWindow` still creates an internal 30-minute setup authorization, and each probe expires after 90 seconds. `screeningOpen` separately accepts `alwaysOn`; expiration of a setup window does not disable that service. These backend controls were inspected, not removed or deployed. The fixture now sets `alwaysOn: true`; the gallery identifies synthetic simulator data outside the product screens. No phone calls or device settings were changed.

## Floating setup guides

Phone setup now includes the published **Shield Easy Setup** helper: Add to iPhone opens native Add Shortcut directly, then the native Shield return leads to Open Phone settings. The helper selects Silence and opens beside Live Voicemail. The person turns Live Voicemail off; a short steady floating guide says “Turn it off / Gray = off / Return to Shield.” There are no custom playback/float controls. Separate explicit confirmations still precede carrier setup. Opening/returning never proves installation or a setting change. Need help retains the signed saved file and the existing manual route. Manual setup and disconnection retain their original guides; carrier-code steps still use Apple's Phone banner. At accessibility sizes actions scroll with instructions.

The helper session, saved-file importer, signed file and seventh original guide now ship in Release as well as Debug. The earlier standalone trial remains a development entry point. The native four-action source, undocumented section URL, physical-device evidence and remaining compatibility limits are in the [current setup-guide record](../docs/IOS-SETUP-GUIDES.md#integrated-shortcut-setup--october-16-2026). This local build does not establish App Store acceptance, novice usability or backend deployment. Artwork source is `scripts/generate-setup-guides.swift`; rerun `npm run ios:generate` when adding resources.

To sample the bundled GIF's frame delivery in a Debug build, add `--setup-guide-frame-metrics` alongside a synthetic setup launch fixture and leave the guide active for 40 seconds. It writes only counts/timings to `Library/Caches/shield-setup-guide-frame-metrics-<guide>.json`, not screen pixels, settings text or owner data. The code is absent from Release. Do not enable Device Hub Capture Keyboard for this check.
