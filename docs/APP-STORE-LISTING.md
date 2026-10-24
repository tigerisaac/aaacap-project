# App Store listing and review notes

Prepared October 24, 2026 for Shield 1.0.0 (build 1). **Draft only: nothing here has been entered in App Store Connect.** Every claim below was checked against the current source and [privacy text](../backend/src/cloud/app.ts); keep it that way when editing. The open release gates are in the [release checklist](APP-STORE-RELEASE.md), and the owner-only submission steps are at the end of this page.

## App information

| Field | Value | Notes |
|---|---|---|
| Name (30) | **Shield: Scam Call Screening** | "Shield" alone is almost certainly taken. Alternates: *Shield Call Screener*, *Shield – Screen Unknown Calls*. Name rights are the owner's call. |
| Subtitle (30) | Screens calls from strangers | |
| Bundle ID | `org.isaaczhang.Shield` | Team Wheema, Inc. (`6R6HMW3DWN`) |
| SKU | `shield-ios` | Any unique string |
| Primary language | English (U.S.) | |
| Category | Primary **Utilities**, secondary **Lifestyle** | |
| Content rights | Contains no third-party content | Setup videos and announcements are Shield's own |
| Age rating | **4+** | Answer *None/No* to every content question, *No* to unrestricted web access, user-generated content, messaging/chat, advertising, contests, gambling, medical and wellness topics. Caretaker alerts are one-way service notices, not chat. |
| Price | Free, with in-app subscriptions | |
| Availability | **United States** (recommended at launch) | The owner chose US and Canada, but no Canadian carrier is verified yet, so Canadian buyers couldn't finish setup. Add Canada when a carrier profile is verified. |
| Copyright | 2026 Wheema Inc. | |
| Support URL | `https://shield-calls-isaac.web.app/support` | Page is in `deploy/firebase/public/support/`; **not deployed yet** |
| Privacy Policy URL | `https://shield-calls-isaac.web.app/privacy` | Live. Commercial wording still needs the owner/counsel review in checklist item P5 |
| Marketing URL | none | Optional |

## Version 1.0.0 text

**Promotional text (170)**

> Shield answers calls from numbers you haven't saved, stops callers who ask for codes, payments or remote access, and rings you only for calls worth taking.

**Keywords (100)**

> scam,spam,robocall,call blocker,screen calls,senior,elderly,fraud,voicemail,caregiver,unknown caller

**Description**

> Shield answers calls from numbers you haven't saved, so you don't have to.
>
> When someone you don't know calls, your carrier forwards the call to Shield instead of ringing your iPhone. Shield's AI assistant answers, asks who is calling and why, and then:
>
> • Rings you back from your saved Shield contact when the call sounds legitimate. Press 1 to talk, or hang up to let it go.
> • Ends calls that ask for codes, payments, gift cards, remote access or secrecy, before they reach you.
> • Offers voicemail to anyone else. Shield saves the message with a short summary.
>
> People in your Contacts ring through as usual. You keep your number, your Phone app and Messages.
>
> ALSO IN SHIELD
> • Call history that explains what happened on each call
> • Check: paste a suspicious text or email, or choose a screenshot, for a second opinion
> • Connected-call protection (optional): after you accept a call, Shield can listen for scam requests and end the call with a spoken warning. Callers are told first.
> • Caretaker alerts: someone you choose can see in Shield when a call was ended for a scam request. They never see your calls, messages or recordings.
> • Numbers Shield catches asking for scams are blocked for 180 days. You can unblock them.
>
> BEFORE YOU SUBSCRIBE
> Shield works through carrier call forwarding and currently supports T-Mobile and Tello lines in the United States. Setup turns on call forwarding and changes two iPhone settings (Silence Unknown Callers, and Live Voicemail off). Shield checks that your line is supported before you pay, and Settings → Disconnect Shield walks you back to ordinary calls.
>
> Shield only screens calls your carrier forwards. It doesn't verify who is calling, can miss a scam, and can occasionally stop a caller you wanted to hear from. If you're unsure, hang up and call back on a number you already trust.
>
> Shield uses Telnyx for phone service, Soniox for transcription and OpenAI for screening and summaries.
>
> SUBSCRIPTION
> Shield Monthly ($9.99 a month) or Shield Annual ($99.99 a year, billed in full). Prices are in US dollars and may vary by country. Payment is charged to your Apple Account when you confirm. Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your Apple Account settings. Deleting the app or your Shield account doesn't cancel a subscription.
>
> Terms of Use: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
> Privacy Policy: https://shield-calls-isaac.web.app/privacy

Wording limits: don't advertise text-message or iMessage filtering (the filter extension doesn't ship), push or text notifications (APNs and caretaker SMS aren't configured, checklist R4), carriers beyond T-Mobile and Tello, or any rate of scams stopped.

## Subscriptions

One subscription group, **Shield**, matching the [RevenueCat draft](revenuecat-apple-product-draft.json). Both levels give the same access; no free trial.

| Product ID | Reference name | Duration | US price | Display name (35) | Description (55) |
|---|---|---|---|---|---|
| `shield_monthly` | Shield Monthly | 1 month | $9.99 | Shield Monthly | Screen unfamiliar calls with Shield. |
| `shield_annual` | Shield Annual | 1 year | $99.99 | Shield Annual | Screen unfamiliar calls with Shield, billed yearly. |

Each product needs a review screenshot of the purchase screen (`SubscriptionView`, "Shield access"). Attach both products to RevenueCat entitlement `shield_access` and offering `default` (see [REVENUECAT.md](REVENUECAT.md)).

## App Privacy answers

From the [draft mapping](DATA-INVENTORY.md#draft-app-privacy-mapping) and the app's privacy manifest. Tracking: **No** for every type. Every type is **linked to the user's identity**.

| Category → data type | Purposes |
|---|---|
| Contact Info → Name, Email Address, Phone Number | App Functionality |
| Contacts → Contacts | App Functionality |
| User Content → Audio Data | App Functionality (callers' screening audio and voicemail) |
| User Content → Emails or Text Messages; Other User Content | App Functionality (text submitted to Check; summaries) |
| Identifiers → User ID | App Functionality, Analytics (RevenueCat subscription analytics) |
| Identifiers → Device ID | App Functionality (push token) |
| Purchases → Purchase History | App Functionality, Analytics |
| Usage Data → Other Usage Data | App Functionality |
| Diagnostics → Performance Data, Other Diagnostic Data | App Functionality |

Re-check before submitting: provider retention (Telnyx, Soniox, OpenAI) and whether RevenueCat collects anything beyond its own manifest. The manifest is not a substitute for these answers.

## Export compliance

`ITSAppUsesNonExemptEncryption` is `NO` in the app's Info.plist, so App Store Connect won't ask on each upload. The app only uses Apple's HTTPS, Keychain, file protection and CryptoKit SHA-256 hashing, which are exempt. `npm run ios:verify-archive` asserts the key.

## App Review information

**Sign-in.** Reviewers can't receive texts, so the server accepts one fictional number with a fixed code when `APP_REVIEW_SIGN_IN` is set in `SHIELD_RUNTIME` (`backend/src/cloud/phone-auth.ts`). The schema only accepts a 555-0100 to 555-0199 number, which can't belong to a real subscriber. The code is stored as its SHA-256. Normal limits still apply: a new code request every 60 seconds, 5 per day for that number, 5 tries per code, 5-minute expiry. Use an 8-digit code, enter both values below, and remove the setting after review.

- User name: the chosen 555-01XX number, e.g. `(512) 555-0142`
- Password: the 8-digit code

**Notes (draft)**

> Shield screens calls from unknown numbers for older adults. It depends on carrier call forwarding from the user's own iPhone line to Shield's phone service, so the full call flow can't run on a review device without a supported US carrier line (T-Mobile or Tello).
>
> Sign in: on the Welcome screen, enter the number above and tap Text me a code. No text is sent for this review number; enter the code above. The account is a public customer account with Apple sandbox purchases allowed.
>
> What to try: Home and Calls show the account's call history and saved voicemail. Check (tab bar) analyzes pasted text or a screenshot. Settings shows phone setup, caretaker alerts, blocked numbers, Shield access (subscriptions, restore, manage) and Delete account (Settings → Delete account; it first asks the user to confirm ordinary calls are restored).
>
> Subscriptions: Settings → Shield access lists Shield Monthly and Shield Annual. Purchases unlock call screening for an enrolled line; they don't change carrier settings.
>
> Complimentary pilot: ten older adults in a supervised Texas pilot receive two months of access assigned by the operator to their verified accounts, with no purchase screens. There is no code, link or in-app switch to unlock it, and it can't be bought or transferred. We're happy to adjust if App Review prefers Apple offer codes for this.
>
> Phone settings: setup links open the Shortcuts app and iPhone Settings so users can turn on Silence Unknown Callers and turn off Live Voicemail themselves; every change is explained and confirmed by the user.
>
> AI and recording: before forwarding is enabled, the consent screen names Telnyx (phone service), Soniox (transcription) and OpenAI (screening and summaries). Callers hear that the call is screened by an AI assistant. Connected-call protection is off by default; when on, callers are told before the call connects.
>
> Background modes: audio plays saved voicemail when the screen locks; remote notifications deliver voicemail and setup alerts.

Contact: owner's name, phone and email (not filled in here).

## Screenshots

App Store Connect needs one iPhone set; the 6.9-inch size (1320 × 2868) covers all iPhones. Five are captured in [`.impeccable/review/app-store-2026-10-24/iphone-6.9/`](../.impeccable/review/app-store-2026-10-24/README.md): Home, Calls, Messages, Caretakers and connected-call protection. They come from the Debug build's offline sample mode, show its "Sample app" tag and only fictional 555-01XX numbers. Regenerate with `scripts/capture-app-store-screenshots.sh` on an iPhone 17 Pro Max simulator, especially if Andrew's design branch lands.

## Owner-only steps to submit

These change Apple, provider or production state, so they need the owner (none were done while preparing this page):

1. **Decide** the app name, launch countries, and whether Andrew's design branch (`origin/Andrewwww`) lands before screenshots.
2. **Apple Developer**: accept the Paid Apps agreement, add banking and tax for Wheema Inc., create the App ID `org.isaaczhang.Shield` with App Groups, Push Notifications and Associated Domains, plus `org.isaaczhang.Shield.CallDirectory`.
3. **App Store Connect**: create the app record, the subscription group and both products; fill in this page's fields; upload an APNs key and attach the App Store Connect API and In-App Purchase keys in RevenueCat.
4. **Production** (each a separate approval under AGENTS.md): deploy `/support` (Hosting), the review sign-in code (`shieldApi`), set `APP_REVIEW_SIGN_IN` in `SHIELD_RUNTIME`, then prepare the reviewer account with `scripts/manage-service-access.mjs` (`audience: public`, `allowSandbox: true`) and set `REVENUECAT.purchasesEnabled`.
5. **Build and upload**: in Xcode, Product → Archive with the Shield scheme (automatic signing creates the Apple Distribution certificate and profiles), run `npm run ios:verify-archive -- <archive>`, then Distribute App → App Store Connect. Install from TestFlight on a real phone and run the [device checks](../ios/README.md#required-device-verification).
6. **Submit** with the review notes above, after the remaining release gates in [APP-STORE-RELEASE.md](APP-STORE-RELEASE.md) are closed or knowingly accepted.
