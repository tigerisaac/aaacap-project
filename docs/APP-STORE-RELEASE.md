# App Store release checklist

Updated October 17, 2026. Apple setup and uploads are deferred at the owner’s request; app/backend verification continues. See [the verification record](IOS-RELEASE-VERIFICATION.md). This is the current release checklist for Shield. Older lists in Status and the protection/pilot plans are historical task records; use their dated evidence, not their unchecked boxes, to determine completion.

**Release status: not ready for public submission.** The approved October 17 backend overlay is deployed, including account-deletion routes/workers, contact/caretaker rules and access support. Other privacy/consent changes remain repository work; [exact scope and evidence](IOS-BACKEND-ROLLOUT.md). Nothing in this checklist authorizes production changes, purchases, messages, calls or carrier changes.

## Public customers and the senior pilot

Owner requirements: public customers can purchase and use Shield; ten seniors receive two months of access, with no monetary language or sales prompts in their pilot experience.

Proposed model: one free-to-download iPhone app, public access through an Apple in-app subscription, and a separately assigned pilot entitlement for the ten verified pilot accounts. The recurring service has ongoing phone, model and hosting costs; a one-time paid download is not the proposed billing model. The owner selected RevenueCat, USD $15 monthly or $120 billed annually ($10/month equivalent), United States and Canada, Wheema Inc., and support at isaac.cw.zhang@gmail.com. Commercial/legal terms and verified carrier coverage remain release gates. See [billing implementation and configuration](REVENUECAT.md).

| Experience | Public customer | Enrolled senior |
|---|---|---|
| Before activation | Check carrier/service availability before purchase; explain required setup | Assisted phone setup; account recognized before any purchase screen |
| Access | Verified Apple subscription | Operator-assigned access for two calendar months from successful server-confirmed setup; no renewal |
| In the app | Price, renewal terms, purchase, restore purchases, manage subscription | Calls, messages, setup and support; no price, paywall, upsell, subscription management or sales countdown |
| End of access | Transparent Apple cancellation/expiry handling and safe carrier restoration | Planned assisted restoration or separately agreed continuation; no automatic charge or conversion |

Pilot access is tied to authenticated accounts, never an age inference, hidden device flag or client-controlled switch. Helpers do not gain paid owner access merely by receiving alerts. Resolving access must finish before presenting a purchase screen; a failed lookup shows retry/help rather than flashing a paywall to a senior. Pilot classification persists through expiry so the app does not suddenly become a sales screen. Any later paid enrollment must be a separate, informed decision.

Disclose the limited complimentary pilot and both experiences to App Review, including reviewer accounts for each. Apple prohibits unapproved unlock mechanisms under 3.1.1; acceptance of an account-assigned complimentary pilot is **not established**. Confirm this design with App Review before relying on it for release. Do not add license keys, QR unlocks or external payment links as a workaround.

Apple's current subscription offer codes also support **free offers with auto-renewal disabled**. They are an alternative if App Review requires Apple-managed entitlement. However, Apple's redemption/offer screens may mention subscriptions and prices, so they do not guarantee the requested absence of monetary wording. Test the exact flow with the owner before choosing it. The public App Store listing can also show “In-App Purchases”; Shield cannot suppress Apple's listing per pilot participant. TestFlight can support a pre-release pilot if necessary, but is not the public commercial distribution plan.

Never silently stop forwarding service at an entitlement deadline. Define the warning, assisted restoration, bounded transition behavior and operator escalation before introducing any expiry gate. Service dates may be explained without sales language. Any actual carrier fees still need truthful disclosure during assisted enrollment; a complimentary Shield pilot does not waive carrier charges.

## Checklist and evidence

Check a release item only after its required evidence exists. “Local” means implemented in the checkout; it does not mean deployed, legally approved, accepted by Apple or tested on a phone. Owners: Engineering implements/tests; Owner supplies commercial/business decisions and authorizes production; Counsel reviews legal applicability; Apple/provider gates depend on external approval.

### Privacy and consent

- [ ] **P1 — Privacy manifests and App Privacy labels (Engineering).** The unsigned Release archive contains three manifests: the app, Call Directory and RevenueCat. The unfinished automatic text-filter extension and its placeholder association are excluded. The audit verified app-only UserDefaults reason `CA92.1`, linked Contacts, linked purchase history/account ID and functionality/analytics purposes. Complete the final data inventory and App Store Connect answers, then validate the distribution archive. Include call metadata, contacts, audio, summaries, user-submitted texts, account IDs and push tokens, with purpose/linkage and actual retention.
- [ ] **P2 — Provider and retention disclosures (Engineering).** Local first pass names Telnyx, Soniox and OpenAI before forwarding consent; distinguishes 24-hour cloud audio delivery, device-saved audio and 30-day cloud history/summaries. Align every onboarding/help/web surface and the final policy with deployed behavior. Local audio lasts until deletion/app removal; vendor security logs have separate policies. Do not promise universal zero retention.
- [ ] **P3 — Explicit consent and renewal (Engineering/Owner).** Local first pass starts optional connected-call monitoring off, shows third-party processing before saving, and bumps general/forwarding and monitoring consent versions. Check refusal/revocation, existing users, stale clients and per-feature consent. Plan coordinated re-consent before deployment: a version bump can make existing forwarding/monitoring consent ineligible. Do not deploy these constants independently.
- [ ] **P4 — Recording and transcription legal review (Counsel/Engineering).** Current shared transport records and processes audio from answer, before the greeting has finished. Resolve notice/consent timing, caller refusal and connected monitoring for the chosen launch jurisdictions; then implement and verify the approved behavior. Copy changes alone do not resolve this. No call-control ordering or announcement audio was changed in this pass.
- [ ] **P5 — Public legal/support documents (Owner/Counsel/Engineering).** Confirm legal operator, contact address, launch jurisdictions, privacy policy, terms, subprocessors/contracts, privacy-request handling and required retention exceptions. Deployed `/privacy` and `/service-info` describe a pilot; the prepared commercial disclosures still need legal review. Publish only after approval.

### Account deletion and offboarding

- [ ] **D1 — Every account type can delete (Engineering).** The app implementation and deployed API add an account-level entry in Settings and the unenrolled-account screen, removes the participant requirement, deletes the Firebase identity after data cleanup and removes the caller's sharing/alert relationships. Verify owners, multiple owned phones, helpers, alert-only recipients and never-enrolled accounts end to end.
- [ ] **D2 — Forwarding-safe deletion (Engineering/Owner).** [Guided restoration](ACCOUNT-OFFBOARDING.md) now saves ordered owner confirmations on the server, keeps current service available during the guide, rejects active/still-forwarded calls at completion, and clears the deletion guard after completion. Deletion checks every owned phone and returns to final confirmation. This is owner-confirmed evidence, not automatic carrier verification. The scoped backend rollout is complete; release still needs real carrier/busy/unreachable/voicemail acceptance, senior rehearsal and an exceptional path for someone without access to their line.
- [ ] **D3 — Complete and retryable erasure (Engineering).** Verify cloud records, all devices, local audio/history, contact restoration backups, cached blocklists, provider copies, worker races and retries after partial failures/lost responses. The local implementation clears this iPhone’s audio/history, handles contact restoration copies, fences API writes and queues durable cleanup with a status receipt, settling period, leases and retries. Provider-erasure jobs remain available. Remaining provider-job metadata, minimal STOP suppression and short-lived abuse records need a documented retention basis. Other-device cleanup, full concurrent-worker coverage and production completion/retry evidence remain release gates.
- [ ] **D4 — Subscription-aware deletion (Engineering).** Implemented in the app and deployed server: public accounts see separate Apple cancellation/management, including when provider access lookup is unavailable; pilot accounts see no monetary UI; RevenueCat customer erasure is retryable before Firebase identity deletion. Deletion does not wait for subscription expiry. Verify the full Apple purchase/deletion/recreation path after store setup.

### Purchases and pilot access

- [ ] **B1 — Confirm commercial choices (Owner).** Price, period, launch countries, operator, support email and RevenueCat were confirmed October 17 (above). The RevenueCat project, app, entitlement and two-package offering exist; Apple products/prices are an unapplied draft. Carrier coverage, limits/refund policy and the assisted end-of-pilot plan remain open. No Canadian carrier is yet verified.
- [ ] **B2 — StoreKit and server entitlement (Engineering/Apple).** RevenueCat SDK and server verification are implemented and locally tested, including pending/cancelled outcomes, restore, account binding, expiry/grace/refunds, authenticated webhooks and recovery checks. Apple products, credentials, transactions, agreements and lifecycle acceptance are deferred. The server grants access only from its own provider lookup. [Exact state and next steps](REVENUECAT.md).
- [ ] **B3 — Ten-person pilot (Engineering/Owner/Apple).** Confirm the distribution/entitlement approach with Apple. Auditable operator-only grants, a transactional ten-account cap, two calendar months, zero automatic billing and persisted pilot presentation are implemented locally. Test sign-in, reinstall, offline/failed lookup, expiry, helper access and account switching for absence of monetary UI. Do not change live enrollment yet.
- [ ] **B4 — Purchase to activation (Engineering).** Carrier eligibility, enrollment, routing isolation, consent, ring/forwarding checks and service activation must work for a new public customer. Signing in currently creates an account only; enrollment is an operator step. Do not sell unattended activation until the supported process exists.

### Reliability and compatibility

- [ ] **R1 — Exact-release phone acceptance (Engineering/Owner).** Approved real calls must cover ordinary callers and harmful callers separately, press-1, decline, silence, one-shot notices, voicemail fallback, recording stop-before-bridge, provider deletion, cold starts, retry/hangup, concurrent calls, both audio directions, monitoring and restoration. Synthetic tests are not real-call evidence.
- [ ] **R2 — Device and accessibility checks (Engineering/Owner).** Small/large supported iPhones, light/dark, largest text, VoiceOver, Reduce Motion and older-adult task rehearsal. Include login refresh, revoked sharing, audio background delivery, offline recovery, deletion, notifications and Call Directory. Automatic message filtering is excluded; do not advertise inbox filtering or RCS/iMessage coverage.
- [ ] **R3 — Supported setup behavior (Engineering/Apple).** Resolve undocumented Settings URLs/Shortcut integration and the Phone-launch banner before submission. Preserve manual instructions. Archive/demo testing cannot establish App Review acceptance.
- [ ] **R4 — Live activation and capacity (Owner/provider/Engineering).** Phone sign-in was configured and verified on the owner’s handset October 17 in a separate scoped release; caretaker SMS and APNs remain unavailable. Verify approved sender/Verify profiles, consent/STOP/START and actual delivery before offering them. The backend permits 25 incoming reservations, while Telnyx outbound capacity remains 10. The October 16 fallback test covers synthetic exhausted-capacity voicemail, not real overlap. Size the public launch accordingly; no assumption of 25 simultaneous connected calls.
- [ ] **R5 — Operational readiness (Engineering/Owner).** Per-user abuse/cost caps, billing alerts, support contacts, incident handling, deletion/expiry monitoring and rollback for the exact release. Production post-call policy is v4 while main contains unreleased policy work; never deploy all of main as a shortcut.

### App Store submission

- [ ] **A1 — Distribution and TestFlight (Engineering/Owner).** App Store signing/profiles for all targets, production APNs/associated domains, final bundle/version/build, archive validation and a TestFlight installation. Development signing and simulator builds do not complete this.
- [ ] **A2 — Store metadata (Owner/Engineering).** Final name/rights, icon/screenshots, accurate feature and blocking-criteria descriptions, supported devices/carriers, age-rating questionnaire, support/privacy URLs, export compliance and storefront legal/trader details where applicable. No unsupported fraud-prevention or identity-verification claims.
- [ ] **A3 — Reviewer access (Engineering/Owner).** Functional reviewer accounts/demo access for public and pilot flows, subscription review information, backend availability and instructions for carrier-dependent features. Explain setup helpers, cloud audio processing, all consent/deletion paths and the complimentary pilot openly.
- [ ] **A4 — Release approval (Owner).** Rerun required checks on the chosen release, close blockers with evidence, approve a scoped backend/client rollout and re-consent plan, then authorize App Store submission. Production changes require explicit owner authorization. See the [scoped backend rollout review](IOS-BACKEND-ROLLOUT.md).

## Local first pass

The October 16 working changes address P1–P3 and part of D1/D3. These completed implementation steps do not close the broader release gates above:

- [x] Name the phone, transcription and AI providers before forwarding consent; distinguish cloud and device retention.
- [x] Start optional connected-call monitoring off and version the revised consent.
- [x] Add the app-only UserDefaults privacy reason and Contacts declaration for the next archive audit.
- [x] Provide account deletion from Settings and before enrollment, with confirmation and a safe forwarding preflight.
- [x] Delete the authenticated Firebase identity after account-wide cleanup, including shared access and paginated records; keep provider-erasure jobs available.
- [x] Clear this iPhone's saved messages/history before removing its login; cancel outstanding account loads.

The October 17 audit adds RevenueCat/pilot access in the repository. The approved scoped production rollout is complete. Apple transaction setup, legal recording changes and physical/end-to-end release acceptance remain open. Validation results are recorded in [Status](STATUS.md); unchecked items above remain release gates.

## Sources and related evidence

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/): public APIs, blocking criteria, purchases, privacy and third-party AI permission.
- [Apple account deletion guidance](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion): accessible initiation, complete account deletion and subscription handling.
- [Apple required-reason API guidance](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api) and [App Privacy details](https://developer.apple.com/app-store/app-privacy-details/).
- [Apple subscription offer codes](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-subscription-offer-codes/): free offers can disable automatic renewal; the redemption flow is Apple-controlled.
- [Apple submission requirements](https://developer.apple.com/news/upcoming-requirements/): recheck at submission; current published minimum is Xcode 26/iOS 26 SDK or later.
- [Live pilot limits](PAID-PILOT-25.md), [audio delivery](AUDIO-DELIVERY.md), [offline storage](IOS-OFFLINE.md), [setup guides](IOS-SETUP-GUIDES.md), [iPhone verification](../ios/README.md#required-device-verification).
