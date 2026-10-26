# App Store release checklist

Updated October 25, 2026. **Shield is being prepared for public App Store distribution, but is not ready to submit or release.** This page supersedes the October 19/24 preparation status previously here. Historical test/deployment records remain in [STATUS.md](STATUS.md) and the linked evidence documents. Do not treat an unchecked item as completed by this rewrite.

## October 25 paywall revision after upload

The owner requested a redesigned paywall and a monthly-only free week. Source now prepares **1.0.0 build 3**; the previously uploaded and selected **build 2 remains unchanged in App Store Connect**. Build 3 must receive its own archive/package verification and upload before submission. The RevenueCat monthly-trial offering now uses the regular annual product; the annual-trial product should not be included in the intended launch offering. A RevenueCat dashboard paywall is an unpublished draft; the app currently uses the redesigned native paywall. See [current billing decision](REVENUECAT.md#october-25--monthly-only-trial-and-redesigned-paywall-latest-decision).

## October 25 — local marketing screenshot candidate (not uploaded)

The newest **five-image set per size** is v2 in `artifacts/app-store-artwork-v2-2026-10-25/`: `large/` contains opaque 1320 × 2868 PNGs and `medium/` contains opaque 1206 × 2622 PNGs. Order: Home → Calls → Call explanation → Messages → Caretakers. The numbered PNGs are upload candidates; each `overview.png` is a review sheet only. `raw-large/` and `raw-medium/` retain native captures. The delivery archive is `Shield-App-Store-Screenshots-v2.zip` in that root, alongside `README.txt`, `verification.txt`, `finish-review.md` and `verdict.md`. The prior `artifacts/app-store-artwork-2026-10-25/` candidate is retained.

The revised layouts keep Shield's navy/serif headlines and existing claims, adding original lifestyle photographs on Home and Caretakers, restrained phone angles and deliberate bottom-edge crops. The photos use fictional AI models generated with built-in image generation, not customer endorsements or testimonials. Reusable sources and exact prompts are in `presentation/app-store/assets/`, copied into the delivery folder's `assets/`. All app activity is fictional; example numbers use the reserved 555-01xx range. Capture mode hides Sample app only in Debug simulator builds, fixes 9:41 and fictional call times, expands the call explanation and shows accepted fictional caretakers Jamie and Morgan. Caretaker copy promises alerts **when they open Shield**, matching inbox-only delivery. Home discloses subscription and compatible-carrier setup requirements. The prior candidate's separate `reference/paywall.png` remains an offline trial preview outside the marketing set, not live-offer validation.

Independent finish review inspected all ten v2 PNGs and both overview sheets, finding one medium Calls title/timestamp collision. The capture-only fixture now says “Refill reminder”; both Calls screens were recaptured from the new Debug build and rerendered. `verdict.md` confirms the sole P2 is resolved and gives **ship within the original review scope**. Other native inputs come from the preceding verified captures. Provenance inspection covered 26 rasters (24 delivery images and two repository photo assets), with zero missing records. Recorded checks passed: iOS Debug simulator build, `npm run check` (401 tests, typecheck and build; permitted rerun after the restricted attempt could not bind localhost), and `npm run test:firebase` (326 tests). This establishes simulator, automated-test and static-artwork evidence only. No upload, production deployment, real-call test, actual Apple transaction or App Review approval is established. **App Store Connect still has build 2 and the earlier four screenshots per size described below.**

Reproduce from an up-to-date Debug simulator `Shield.app`, replacing the app path and simulator identifiers with matching devices. The capture script installs that Debug app and captures offline fixtures; the renderer requires native inputs matching each output size. Its optional final argument selects the lifestyle asset directory; it defaults to `presentation/app-store/assets`.

```sh
scripts/capture-app-store-screenshots.sh '<large-simulator-UDID>' '<path-to-Debug-iphonesimulator/Shield.app>' artifacts/app-store-artwork-v2-2026-10-25/raw-large
scripts/capture-app-store-screenshots.sh '<medium-simulator-UDID>' '<path-to-Debug-iphonesimulator/Shield.app>' artifacts/app-store-artwork-v2-2026-10-25/raw-medium
swift scripts/render-app-store-artwork.swift artifacts/app-store-artwork-v2-2026-10-25/raw-large artifacts/app-store-artwork-v2-2026-10-25/large 1320 2868
swift scripts/render-app-store-artwork.swift artifacts/app-store-artwork-v2-2026-10-25/raw-medium artifacts/app-store-artwork-v2-2026-10-25/medium 1206 2622
```

Inspect every regenerated export before uploading; a previous review does not certify newly captured files. See [design guidance](../DESIGN.md#app-store-marketing-screenshots) for the visual and evidence boundaries.

## Release identity and prepared material

| Item | Current evidence |
|---|---|
| App | **Shield: Call Protection**, Apple ID `6826930320`, SKU `shield-ios-001` |
| Signing identity | Wheema Inc., team `6R6HMW3DWN`; bundle `org.isaaczhang.Shield` |
| Candidate | Version **1.0.0**, build **2**, iPhone/iOS 26.0+ |
| Distribution | Public App Store, free download with subscriptions; **United States only**; Mac and Vision Pro availability disabled; **manual release** |
| Uploaded build | Build 2 uploaded October 25 at **21:01:49 Central**, processed, and attached to the public App Store version 1.0.0. No App Review submission. |
| Listing | Description, promotional text, subtitle, categories, content rights and age questionnaire saved; calculated **4+**. See [exact listing](APP-STORE-LISTING.md). |
| Privacy | Policy URL and all 13 data types saved; linked, no tracking; functionality for all, analytics for User ID/Purchase History. **Unpublished draft** pending final verification. |
| Subscriptions | Four products, all **Prepare for Submission**, equal service **level 1**; English (U.S.) group display name **Shield Call Protection**. Trial experiment stays off. |
| Public pages | `/support/`, `/privacy`, `/service-info`, `/public/config` and `/public/ready` returned HTTP 200 October 25. |
| Local artifacts | `artifacts/app-store-2026-10-25/`: signed IPA, four inspected screenshots at each of 1320 × 2868 and 1206 × 2622, browser receipts, hashes and verification logs. This directory is ignored by Git. |

The final archive is `/private/tmp/Shield-1.0.0-2-release-candidate.xcarchive`; the durable local export is `artifacts/app-store-2026-10-25/distribution/Shield.ipa`. Its SHA-256 is `93881ae9ec6abfe41a70c7bf333b06e25bb5bae9313733d71fbc56f65fc7ec40`. The archive inspection verifies version/build, arm64 app and Call Directory, three privacy manifests, production networking/APNs configuration, exempt encryption and absence of test fixtures. Xcode App Store export succeeded with the existing cloud-managed distribution signing identity. Archive inspection alone is not signing or Apple acceptance evidence.

The candidate includes pre-existing, uncommitted trial/purchase changes from the earlier release chat. They were preserved and tested, not reverted or folded into this preparation's commit. All **298 recorded iOS/generator input hashes** match after the final archive. Before a later rebuild, reconcile those changes into the intended source checkpoint and recheck the artifact manifest; a clean checkout of this preparation commit alone does not recreate build 2.

## Checks performed for this preparation

- [x] `npm run check`: typecheck/build and **401 unit tests** passed.
- [x] `npm run test:firebase`: **326/326** passed.
- [x] `npm run test:subscriptions`: native Swift subscription/state/isolation harness passed.
- [x] Debug simulator build and final Release archive/export succeeded.
- [x] `npm run ios:verify-archive` passed on the final archive; input hashes remained unchanged.
- [x] Four fictional-data screenshots inspected and uploaded at both large- and medium-iPhone sizes. Messages uses the production message-type filters. Prototype and sample-only purchase/audio controls are excluded from the upload set.
- [x] Screenshot script passes shell syntax validation.

The initial restricted test runs failed because local sockets/emulator resources were unavailable; the authorized full runs above passed. Original failures and final logs are retained. The earlier chat's five subscription UI tests passed; they were inspected, **not rerun in this preparation**. The owner's earlier iPhone Duo acceptance report remains owner-reported evidence. No new physical-phone, real-call or actual Apple transaction verification occurred here.

## Required before App Review submission

**Subscription-only model (Apple guidance checked October 25).** Apple's [3.1.2 guidelines](https://developer.apple.com/app-store/review/guidelines/#subscriptions) permit subscriptions for ongoing services; they do not generally require a free tier. Shield's ongoing call-screening service is consistent with that permitted model, but this is not an approval or a finding that the current release is submission-ready. The [subscription presentation guidance](https://developer.apple.com/app-store/subscriptions/#clearly-describing-subscriptions) requires clear duration, full renewal price, purchase restoration, and Terms/Privacy links. Full billed prices must be more prominent than savings and annual monthly equivalents. A free trial must disclose duration and the price afterward. Current USD prices save about 16.6% annually versus twelve regular monthly payments; the app conservatively shows 16%, not 19%. Reviewers need full functional access and live backend services under the general review requirements. Existing purchase, agreement, reviewer access and carrier-setup gates below still apply.

| Gate | Remaining action | Owner |
|---|---|---|
| Apple business agreement | Accept the outstanding Paid Applications agreement and complete any required banking/tax information. Do not accept legal terms on the owner's behalf. | Account Holder |
| Purchase verification | **Completed October 25:** owner approved the existing key transfer; RevenueCat saved it and independently validated key format and Apple permissions. Real transaction acceptance remains below. | Owner authorization + Engineering |
| App Store Connect API | Apple currently restricts requesting API access to the Account Holder. This is required for planned store-management automation, separately from uploading the app through Xcode. | Account Holder |
| Real Apple purchase path | Test actual Apple sandbox purchase/restore, cancel/pending, trial eligibility, renewal/expiry/refund/grace, account switching and server entitlement verification for the exact candidate. Prior RevenueCat Test Store checks do not close this. | Engineering + Apple |
| Reviewer access | Configure the deployed review-sign-in capability; provision a functional public review account and safe purchase access. Keep credentials private. Verify sign-in, usable review flows and deletion; do not submit placeholder credentials. | Owner production authorization + Engineering |
| Carrier-dependent review | Supply precise instructions and approved evidence for features requiring a supported US line. Reviewers must be able to evaluate the app without changing an owner's phone or forwarding. | Owner + Engineering |
| Privacy publication | Verify providers/SDK collection and retention against [DATA-INVENTORY.md](DATA-INVENTORY.md), confirm policy/legal disclosures and publish the saved 13-type declaration. | Owner + Engineering |
| Upload/attach | **Build/screenshots completed:** build 2 is attached; four screenshots are saved at both iPhone sizes. Still add product-specific purchase review images/notes and selected subscriptions to version 1.0.0. First subscriptions go with the app version. | Engineering |
| Final review details | Complete actual review contact, functional credentials, pilot explanation, supported-carrier limits and purchase/consent/deletion instructions; then run Apple's submission validation. | Owner + Engineering |
| Submission | Explicitly authorize submission after the gates above are closed. Leave manual release selected. | Owner |

**Approved uploads completed October 25.** The owner authorized the existing Apple purchase key transfer and build/screenshots upload. RevenueCat app `app8cae3b0fbc` now reports `subscription_key_configured: true`; both format and Apple permission checks return valid. App Store Connect API credentials remain unconfigured. The private key backup is permission-restricted in ignored `artifacts/private/apple/`, never in Git. The unrelated app's key was not changed.

Apple accepted build 2 at **21:01:49 Central**; build ID `a9d8e56a-716b-45a6-a46d-1d6ccf6c26e9` finished processing and is saved on the public version. Media Manager has **4/10 screenshots at each of the large and medium Dynamic Island iPhone sizes**, in Home → Calls → Messages → Caretakers order. The medium set was captured from the same Debug build because the current form designates that size as required. No pixels were rescaled. The version remains Prepare for Submission with manual release selected. These are upload/configuration results, not Apple review or purchase acceptance.

## Required before public launch

Public enrollment and purchases remain disabled according to the latest recorded production configuration. The current working tree is not deployed by this preparation. Do not turn on paid acquisition while activation is unavailable.

- [ ] **P1–P3/P5 — Privacy, provider terms and consent.** Final provider/SDK audit and App Privacy publication; confirm operator, contact, jurisdictions, service limits, privacy requests and commercial terms. The October 24 backend rollout deployed the revised consent and privacy code. Existing accounts require matching re-consent; verify actual app/server behavior and revocation. Provider security retention, logs, backups and offline-device erasure are not proven by app deletion. [Inventory](DATA-INVENTORY.md).
- [x] **P4 — Recording timing decision.** The owner accepted processing/recording from answer on October 19. This is a product decision, not legal clearance or Apple approval. The listing and review explanation must describe it accurately.
- [ ] **D1–D4 — Deletion and restoration acceptance.** Existing emulator/native evidence covers account types, revoked access, retries, local state and subscription separation. Complete the exact Apple purchase → safe carrier restoration → deletion → recreation path, including unavailable-provider and lost-response behavior. Do not imply deleting the app/account cancels Apple billing or automatically restores forwarding. [Account offboarding](ACCOUNT-OFFBOARDING.md), [contact recovery](IOS-CONTACT-RECOVERY.md), [blocking lifecycle](IOS-CALL-DIRECTORY.md).
- [ ] **B1–B4 — Commercial/public activation.** Keep the chosen $9.99/month and $99.99/year pricing, with trial eligibility disclosed only when offered. Validate real purchases and server-owned activation, supported T-Mobile/Tello US lines, capacity reservations, original restoration settings, cancellation/expiry/refund and failure behavior. Prepare and authorize the exact production configuration/deployment needed for this candidate. [RevenueCat](REVENUECAT.md).
- [ ] **Pilot treatment.** Ten verified seniors receive operator-assigned access for two calendar months, no automatic charge/conversion and no monetary prompts. Disclose this to Apple; acceptance is not established. Agree an assisted offboarding/continuation plan that never silently strands a forwarded line. Helpers do not gain paid owner access. Apple offer codes are an alternative only after the owner reviews their purchase-language tradeoffs.
- [ ] **R1 — Exact-build real-call acceptance.** With owner authorization, record legitimate-offered and harmful-stopped separately, press-1 acceptance, decline/silence, fallback voicemail, stop-recording-before-bridge, both audio directions, timing, concurrent calls, monitoring and carrier restoration. Synthetic tests cannot establish this. Preserve fixed recipients, bounded sessions and fail-closed behavior.
- [ ] **R1b/R2 — Device, accessibility and data lifecycle.** Verify exact-build TestFlight installation, Contacts/iCloud and restoration, blocked-list pagination/CallKit, account changes, offline/relaunch, saved audio, deletion, smallest/largest supported layouts, largest text, VoiceOver and Reduce Motion. Earlier unresolved accessibility/physical acceptance findings are not waived. [iOS verification](IOS-RELEASE-VERIFICATION.md).
- [ ] **Nationwide quiet hours.** The backend still evaluates every account in `America/Chicago`; Settings explicitly says “Times are Central time.” Before national rollout, implement account time zones or have the owner explicitly accept and disclose the Central-time limitation. A backend fix affects the bridge as well as Functions; do not silently reinterpret existing schedules.
- [ ] **R4 — Capacity and optional delivery.** Confirm shared admission/outbound limits and supported lines before opening enrollment; 25 incoming reservations do not establish 25 simultaneous connections. APNs and caretaker SMS require separate configuration/delivery acceptance. Saved caretaker inbox support is distinct from SMS availability. Do not advertise automatic Messages/iMessage filtering; that extension is excluded.
- [ ] **R5 — Operations.** Recheck live health, worker completion, cost/rate limits, support, incident escalation, alerts and exact rollout/rollback evidence. Previously configured policies/budget and bounded healthy reads do not prove every failure path. [Operational readiness](OPERATIONAL-READINESS.md), [alert setup](OPERATIONAL-ALERT-SETUP.md).
- [ ] **A4 — Launch approval.** After Apple approval and acceptance above, obtain owner authorization for production enrollment/purchases and manual App Store release. Monitor the approved launch within the existing capacity/cost limits.

## Deployment boundary

The latest recorded deployment is `shieldApi` **`shieldapi-00038-qay`** on October 25, after all fifteen Functions and Hosting were deployed October 24. `/support/` and review-sign-in code are already live; older instructions saying to create the app record, obtain the first signing certificate or deploy the support page are obsolete. The review runtime configuration and public purchase/enrollment launch are still outstanding. See dated receipts in [STATUS.md](STATUS.md).

`shield-calls-isaac` is the live pilot. AGENTS.md requires owner approval before production deployment/configuration. The owner-approved key transfer and build/screenshot uploads are complete. No production deployment, real call/message, carrier setting change, actual Apple purchase, App Review submission or public release occurred in this preparation.

## Official references

- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Submit in-app purchases with an app version](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase)
- [Subscription levels and changes](https://developer.apple.com/app-store/subscriptions/)
- [App Privacy](https://developer.apple.com/app-store/app-privacy-details/)
- [Streamlined purchasing](https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-streamlined-purchasing/) — shown enabled by Apple; no promoted/win-back purchase flow was configured here. Review PurchaseIntent handling before enabling those additional entry points.
