# App Store listing and review notes

Updated October 25, 2026 for Shield 1.0.0 (build 2). **The listing, app information and availability below are saved in App Store Connect; the app has not been submitted for review or released.** Privacy answers are saved as an unpublished draft. The signed build and screenshots are prepared locally, pending upload approval. See the current [release checklist](APP-STORE-RELEASE.md) for the remaining gates.

## App information

| Field | Value | Notes |
|---|---|---|
| Name (30) | **Shield: Call Protection** | Owner-selected name; Apple app ID `6826930320`. |
| Subtitle (30) | Screen calls. Stay in control. | |
| Bundle ID | `org.isaaczhang.Shield` | Team Wheema, Inc. (`6R6HMW3DWN`) |
| SKU | `shield-ios-001` | Existing record |
| Primary language | English (U.S.) | |
| Category | Primary **Utilities**, secondary **Lifestyle** | |
| Content rights | Contains no third-party content | Setup videos and announcements are Shield's own |
| Age rating | **4+** | Answer *None/No* to every content question, *No* to unrestricted web access, user-generated content, messaging/chat, advertising, contests, gambling, medical and wellness topics. Caretaker alerts are one-way service notices, not chat. |
| Price | Free, with in-app subscriptions | |
| Availability | **United States** (saved) | The owner chose US and Canada, but no Canadian carrier is verified yet, so Canadian buyers couldn't finish setup. Add Canada when a carrier profile is verified. |
| Copyright | 2026 Wheema Inc. | |
| Support URL | `https://shield-calls-isaac.web.app/support` | Live; HTTP 200 verified October 25 |
| Privacy Policy URL | `https://shield-calls-isaac.web.app/privacy` | Live. Commercial wording still needs the owner/counsel review in checklist item P5 |
| Marketing URL | none | Optional |

## Version 1.0.0 text

**Promotional text (170)**

> Let Shield screen unfamiliar calls, save useful voicemail, and help you check suspicious messages. You choose whether to accept each call it offers.

**Keywords (100)**

> scam,spam,robocall,call blocker,screen calls,senior,elderly,fraud,voicemail,caregiver,unknown caller

**Description — saved in App Store Connect**

> Shield answers calls from numbers you haven't saved, so you don't have to.
>
> When your carrier forwards an unfamiliar call to Shield, its AI assistant answers and asks who is calling and why. Shield can ring you back for a call worth taking, save a useful voicemail with a short summary, or stop a suspected scam. Press 1 to accept a call. Shield never connects a caller without your acceptance.
>
> People in your Contacts ring through as usual when your phone and carrier are set up as instructed. You keep your number, your Phone app and Messages.
>
> ALSO IN SHIELD
> • Call history with an explanation of each outcome
> • Check: paste a suspicious text or email, or choose a screenshot, for a second opinion
> • Optional connected-call protection that listens for scam requests and can end a call with a spoken warning
> • An optional caretaker inbox for notices when connected-call protection intervenes, without sharing your call history or recordings
> • Saved voicemail and summaries
> • A blocked-number list you can review and change
>
> BEFORE YOU SUBSCRIBE
> Shield uses carrier call forwarding and supports eligible T-Mobile and Tello lines in the United States. Your line must have the required forwarding features and an active data plan. Shield checks service availability before offering a plan. Setup requires changes to carrier forwarding and iPhone settings, including unknown-caller handling and Live Voicemail. Your carrier may charge for calls or forwarding. Settings → Disconnect Shield guides you back to ordinary calls.
>
> Shield only screens calls your carrier forwards. It does not verify a caller's identity, cannot stop every scam, and may stop a caller you wanted to hear from. If you are unsure, hang up and call back using a number you already trust. Manual text checks do not automatically filter your Messages inbox.
>
> PRIVACY
> Shield uses Telnyx for phone service, Soniox for transcription, and OpenAI for screening and summaries. Setup explains processing and recording before you enable forwarding. Optional connected-call protection is off by default. Review the privacy policy for cloud, device and provider retention details.
>
> SUBSCRIPTIONS
> Shield Monthly is $9.99 per month. Shield Annual is $99.99 per year, billed in full. These are US prices; the purchase screen shows your actual price and any introductory offer for which you are eligible. An eligible free trial renews at the displayed recurring price unless cancelled before it ends.
>
> Payment is charged to your Apple Account when you confirm a purchase or when an eligible free trial ends. Subscriptions renew automatically unless cancelled at least 24 hours before the current period ends. Manage or cancel in your Apple Account settings. Deleting the app or your Shield account does not cancel your subscription.
>
> Terms of Use: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
> Privacy Policy: https://shield-calls-isaac.web.app/privacy

Wording limits: don't advertise text-message or iMessage filtering (the filter extension doesn't ship), push or text notifications (APNs and caretaker SMS aren't configured, checklist R4), carriers beyond T-Mobile and Tello, or any rate of scams stopped.

## Subscriptions

The Apple group **Shield** (`22513571`) has English (U.S.) display name **Shield Call Protection**, with app name **Shield: Call Protection**. All four products are saved at **level 1**, because all grant the same access. All remain **Prepare for Submission**.

| Product ID | Duration | US recurring price | Introductory offer | RevenueCat offering |
|---|---|---|---|---|
| `shield_monthly` | 1 month | $9.99 | None | `default` |
| `shield_annual` | 1 year | $99.99 | None | `default` |
| `shield_monthly_trial` | 1 month | $9.99 | 1 week free, eligible customers | `shield_week_trial` |
| `shield_annual_trial` | 1 year | $99.99 | 1 week free, eligible customers | `shield_week_trial` |

The existing `default` offering remains current; the trial experiment remains off. All products map to `shield_access`. Do not describe a guaranteed free trial: StoreKit eligibility and the actual offered product govern its terms. Build 2 contains the previously prepared trial eligibility and renewal disclosures. This preparation did not start an experiment or enable purchases.

Each subscription needs a review screenshot of its real purchase presentation, review notes and attachment to the first app version. Do not submit the first subscriptions separately from the app. Apple purchase and App Store Connect credentials are not yet configured in RevenueCat. See [REVENUECAT.md](REVENUECAT.md).

## App Privacy answers

All 13 types below are saved in App Store Connect, **not published**. From the [draft mapping](DATA-INVENTORY.md#draft-app-privacy-mapping) and the app's privacy manifest. Tracking: **No** for every type. Every type is **linked to the user's identity**.

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

**Not ready to paste as completed review access.** The review sign-in code is deployed, but its `APP_REVIEW_SIGN_IN` runtime setting is not configured. No working reviewer credentials or provisioned review account have been established. Do not submit invented credentials or claim a working sandbox account.

The configuration accepts one fictional 555-0100–0199 number and a hashed fixed code under the normal limits. Keep the code out of Git. Configure it through the existing private setup script only after production authorization, then verify sign-in and account deletion using the intended review environment. The ordinary flow limits requests to five per day; plan a reviewer access path that will not become unusable during review.

The final reviewer notes must explain:

- Where to sign in and the privately supplied, verified credentials; how the reviewer reaches a functional public purchase/restore flow without forwarding a personal line.
- The T-Mobile/Tello US carrier requirement; which features can be evaluated without real carrier setup; provide approved demonstration evidence for the carrier-dependent flow.
- Home, Calls, saved voicemail, Check, Settings, subscriptions, restore, consent and in-app Delete account. Deleting an account does not cancel the Apple subscription.
- The ten-person, two-month complimentary pilot, its operator-assigned access and absence of a customer-entered unlock code. Apple acceptance remains unestablished; do not hide it from review.
- Phone-settings helpers and the fact that users approve carrier/iPhone changes themselves.
- Telnyx, Soniox and OpenAI processing; recording from answer during screening, ending before connection; optional connected-call transcription/analysis and its consent.
- Background audio for saved voicemail and the actual enabled notification behavior. Do not promise unconfigured APNs or caretaker SMS delivery.

Supply the owner's current review contact directly in App Store Connect; private contact details are intentionally absent from this repository.

## Screenshots and signed build

Four 6.9-inch captures (1320 × 2868) are prepared locally at `artifacts/app-store-2026-10-25/store-screenshots/`: Home, Calls, Messages and Caretakers. They contain fictional sample activity, not customer data. The capture-only flag suppresses the development banner exclusively in Debug simulator builds, while retaining all sample safety gates. Messages uses the shipping message-type filters, not the sample-only Keep feature. A prototype call-protection screen and sample audio detail were rejected and are not in the upload directory.

Regenerate using `scripts/capture-app-store-screenshots.sh`. Inspect every image before uploading. These images and build 2 have not been uploaded by this preparation; upload approval is pending. The final signed IPA is `artifacts/app-store-2026-10-25/distribution/Shield.ipa`. Build 1 was previously processed in TestFlight.

## Remaining submission sequence

1. Account Holder accepts the outstanding Paid Applications agreement and completes any required business, banking and tax information.
2. Connect the existing Apple purchase key to RevenueCat with owner approval. The Account Holder must request App Store Connect API access if product-management automation is wanted. Verify credentials and actual Apple sandbox purchase/restore, eligibility and lifecycle behavior.
3. Complete provider/privacy verification and publish the saved App Privacy declarations. Confirm public policy and legal operator disclosures.
4. Authorize the scoped production setup for reviewer access and review purchases, with public enrollment still controlled; verify the reviewer path. Resolve or explicitly accept and disclose the Central-time quiet-hours limitation before national rollout.
5. Upload build 2 and the four screenshots; attach build 2, subscription review screenshots and the selected subscriptions to version 1.0.0. Keep manual release selected.
6. Complete exact-build device/carrier and production acceptance, then authorize submission to App Review. After approval, separately authorize the public service launch and manual App Store release.

The [release checklist](APP-STORE-RELEASE.md) records what is verified versus still outstanding. No backend deployment, forwarding change, real call, message, purchase or release is authorized by this document.
