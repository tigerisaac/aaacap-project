# App Store release checklist

Updated October 16, 2026. This is the current release checklist for Shield. Older lists in Status and the protection/pilot plans are historical task records; use their dated evidence, not their unchecked boxes, to determine completion.

**Release status: not ready for public submission.** The live pilot remains on its recorded October 16 releases. The privacy, consent and account-deletion changes below are repository work only. Nothing in this checklist authorizes production changes, purchases, messages, calls or carrier changes.

## Public customers and the senior pilot

Owner requirements: public customers can purchase and use Shield; ten seniors receive two months of access, with no monetary language or sales prompts in their pilot experience.

Proposed model: one free-to-download iPhone app, public access through an Apple in-app subscription, and a separately assigned pilot entitlement for the ten verified pilot accounts. The recurring service has ongoing phone, model and hosting costs; a one-time paid download is not the proposed billing model. Pricing and the commercial terms remain undecided.

| Experience | Public customer | Enrolled senior |
|---|---|---|
| Before activation | Check carrier/service availability before purchase; explain required setup | Assisted phone setup; account recognized before any purchase screen |
| Access | Verified Apple subscription | Operator-assigned access for two calendar months from successful activation; confirm this start rule before enrollment |
| In the app | Price, renewal terms, purchase, restore purchases, manage subscription | Calls, messages, setup and support; no price, paywall, upsell, subscription management or sales countdown |
| End of access | Transparent Apple cancellation/expiry handling and safe carrier restoration | Planned assisted restoration or separately agreed continuation; no automatic charge or conversion |

Pilot access is tied to authenticated accounts, never an age inference, hidden device flag or client-controlled switch. Helpers do not gain paid owner access merely by receiving alerts. Resolving access must finish before presenting a purchase screen; a failed lookup shows retry/help rather than flashing a paywall to a senior. Pilot classification persists through expiry so the app does not suddenly become a sales screen. Any later paid enrollment must be a separate, informed decision.

Disclose the limited complimentary pilot and both experiences to App Review, including reviewer accounts for each. Apple prohibits unapproved unlock mechanisms under 3.1.1; acceptance of an account-assigned complimentary pilot is **not established**. Confirm this design with App Review before relying on it for release. Do not add license keys, QR unlocks or external payment links as a workaround.

Apple's current subscription offer codes also support **free offers with auto-renewal disabled**. They are an alternative if App Review requires Apple-managed entitlement. However, Apple's redemption/offer screens may mention subscriptions and prices, so they do not guarantee the requested absence of monetary wording. Test the exact flow with the owner before choosing it. The public App Store listing can also show “In-App Purchases”; Shield cannot suppress Apple's listing per pilot participant. TestFlight can support a pre-release pilot if necessary, but is not the public commercial distribution plan.

Never silently stop forwarding service at an entitlement deadline. Define the warning, assisted restoration, bounded transition behavior and operator escalation before introducing any expiry gate. Service dates may be explained without sales language. Any actual carrier fees still need truthful disclosure during assisted enrollment; a complimentary Shield pilot does not waive carrier charges.

## Checklist and evidence

Check a release item only after its required evidence exists. “Local” means implemented in the checkout; it does not mean deployed, legally approved, accepted by Apple or tested on a phone. Owners: Engineering implements/tests; Owner supplies commercial/business decisions and authorizes production; Counsel reviews legal applicability; Apple/provider gates depend on external approval.

### Privacy and consent

- [ ] **P1 — Privacy manifests and App Privacy labels (Engineering).** Local first pass adds the app-only UserDefaults reason `CA92.1` and linked Contacts collection. Finish the archive-wide required-reason/SDK audit, extension manifests, data inventory and App Store Connect answers. Include call metadata, contacts, audio, summaries, pasted/filtered texts, account IDs and push tokens, with purpose/linkage and actual retention. Validate the distribution archive.
- [ ] **P2 — Provider and retention disclosures (Engineering).** Local first pass names Telnyx, Soniox and OpenAI before forwarding consent; distinguishes 24-hour cloud audio delivery, device-saved audio and 30-day cloud history/summaries. Align every onboarding/help/web surface and the final policy with deployed behavior. Local audio lasts until deletion/app removal; vendor security logs have separate policies. Do not promise universal zero retention.
- [ ] **P3 — Explicit consent and renewal (Engineering/Owner).** Local first pass starts optional connected-call monitoring off, shows third-party processing before saving, and bumps general/forwarding and monitoring consent versions. Check refusal/revocation, existing users, stale clients and per-feature consent. Plan coordinated re-consent before deployment: a version bump can make existing forwarding/monitoring consent ineligible. Do not deploy these constants independently.
- [ ] **P4 — Recording and transcription legal review (Counsel/Engineering).** Current shared transport records and processes audio from answer, before the greeting has finished. Resolve notice/consent timing, caller refusal and connected monitoring for the chosen launch jurisdictions; then implement and verify the approved behavior. Copy changes alone do not resolve this. No call-control ordering or announcement audio was changed in this pass.
- [ ] **P5 — Public legal/support documents (Owner/Counsel/Engineering).** Confirm legal operator, contact address, launch jurisdictions, privacy policy, terms, subprocessors/contracts, privacy-request handling and required retention exceptions. Existing `/privacy` and `/service-info` describe a pilot, not a completed commercial legal package. Publish only after approval.

### Account deletion and offboarding

- [ ] **D1 — Every account type can delete (Engineering).** Local first pass adds an account-level entry in Settings and the unenrolled-account screen, removes the participant requirement, deletes the Firebase identity after data cleanup and removes the caller's sharing/alert relationships. Verify owners, multiple owned phones, helpers, alert-only recipients and never-enrolled accounts end to end.
- [ ] **D2 — Forwarding-safe deletion (Engineering/Owner).** [Guided restoration](ACCOUNT-OFFBOARDING.md) now saves ordered owner confirmations on the server, keeps current service available during the guide, rejects active/still-forwarded calls at completion, and clears the deletion guard after completion. Deletion checks every owned phone and returns to final confirmation. This is owner-confirmed evidence, not automatic carrier verification. Release still needs the approved scoped rollout, real carrier/busy/unreachable/voicemail acceptance, senior rehearsal and an exceptional path for someone without access to their line.
- [ ] **D3 — Complete and retryable erasure (Engineering).** Verify cloud records, all devices, local audio/history, contact restoration backups, cached blocklists, provider copies, worker races and retries after partial failures/lost responses. The local implementation clears this iPhone’s audio/history, handles contact restoration copies, fences API writes and queues durable cleanup with a status receipt, settling period, leases and retries. Provider-erasure jobs remain available. Remaining provider-job metadata, minimal STOP suppression and short-lived abuse records need a documented retention basis. Other-device cleanup, full concurrent-worker coverage and production completion/retry evidence remain release gates.
- [ ] **D4 — Subscription-aware deletion (Engineering).** When billing is built, explain that Apple cancellation is separate, link to management for actual subscribers, revoke access correctly and handle refunds/revocations. Keep monetary UI absent for pilot accounts that never subscribed. Deletion must not depend on waiting for a subscription to expire.

### Purchases and pilot access

- [ ] **B1 — Confirm commercial choices (Owner).** Free download plus subscription is proposed; choose price, period, storefronts, supported carriers, service limits and refund/support policy. Confirm the pilot activation/start rule and end-of-pilot plan. No prices or subscriptions have been created.
- [ ] **B2 — StoreKit and server entitlement (Engineering/Apple).** Configure subscription products and agreements; implement purchase, pending/cancelled outcomes, restore, transaction verification, account binding, renewals, refunds, revoked transactions and server notifications. The server must authorize service from verified entitlement, never a client flag.
- [ ] **B3 — Ten-person pilot (Engineering/Owner/Apple).** Confirm the distribution/entitlement approach with Apple. Implement auditable, operator-only grants for at most ten selected accounts, two-month duration, zero automatic billing, and persisted pilot presentation. Test sign-in, reinstall, offline/failed lookup, expiry, helper access and account switching for absence of monetary UI. Do not change live enrollment yet.
- [ ] **B4 — Purchase to activation (Engineering).** Carrier eligibility, enrollment, routing isolation, consent, ring/forwarding checks and service activation must work for a new public customer. Signing in currently creates an account only; enrollment is an operator step. Do not sell unattended activation until the supported process exists.

### Reliability and compatibility

- [ ] **R1 — Exact-release phone acceptance (Engineering/Owner).** Approved real calls must cover ordinary callers and harmful callers separately, press-1, decline, silence, one-shot notices, voicemail fallback, recording stop-before-bridge, provider deletion, cold starts, retry/hangup, concurrent calls, both audio directions, monitoring and restoration. Synthetic tests are not real-call evidence.
- [ ] **R2 — Device and accessibility checks (Engineering/Owner).** Small/large supported iPhones, light/dark, largest text, VoiceOver, Reduce Motion and older-adult task rehearsal. Include login refresh, revoked sharing, audio background delivery, offline recovery, deletion, notifications, Call Directory and Message Filter. Do not advertise unverified RCS/iMessage coverage.
- [ ] **R3 — Supported setup behavior (Engineering/Apple).** Resolve undocumented Settings URLs/Shortcut integration and the Phone-launch banner before submission. Preserve manual instructions. Archive/demo testing cannot establish App Review acceptance.
- [ ] **R4 — Live activation and capacity (Owner/provider/Engineering).** Phone sign-in/contact SMS are unconfigured. Verify approved sender/Verify profiles, consent/STOP/START and actual delivery before offering them. The backend permits 25 incoming reservations, while Telnyx outbound capacity remains 10. The October 16 fallback test covers synthetic exhausted-capacity voicemail, not real overlap. Size the public launch accordingly; no assumption of 25 simultaneous connected calls.
- [ ] **R5 — Operational readiness (Engineering/Owner).** Per-user abuse/cost caps, billing alerts, support contacts, incident handling, deletion/expiry monitoring and rollback for the exact release. Production post-call policy is v4 while main contains unreleased policy work; never deploy all of main as a shortcut.

### App Store submission

- [ ] **A1 — Distribution and TestFlight (Engineering/Owner).** App Store signing/profiles for all targets, production APNs/associated domains, final bundle/version/build, archive validation and a TestFlight installation. Development signing and simulator builds do not complete this.
- [ ] **A2 — Store metadata (Owner/Engineering).** Final name/rights, icon/screenshots, accurate feature and blocking-criteria descriptions, supported devices/carriers, age-rating questionnaire, support/privacy URLs, export compliance and storefront legal/trader details where applicable. No unsupported fraud-prevention or identity-verification claims.
- [ ] **A3 — Reviewer access (Engineering/Owner).** Functional reviewer accounts/demo access for public and pilot flows, subscription review information, backend availability and instructions for carrier-dependent features. Explain setup helpers, cloud audio processing, all consent/deletion paths and the complimentary pilot openly.
- [ ] **A4 — Release approval (Owner).** Rerun required checks on the chosen release, close blockers with evidence, approve a scoped backend/client rollout and re-consent plan, then authorize App Store submission. Production changes remain prohibited for the current task.

## Local first pass

The October 16 working changes address P1–P3 and part of D1/D3. These completed implementation steps do not close the broader release gates above:

- [x] Name the phone, transcription and AI providers before forwarding consent; distinguish cloud and device retention.
- [x] Start optional connected-call monitoring off and version the revised consent.
- [x] Add the app-only UserDefaults privacy reason and Contacts declaration for the next archive audit.
- [x] Provide account deletion from Settings and before enrollment, with confirmation and a safe forwarding preflight.
- [x] Delete the authenticated Firebase identity after account-wide cleanup, including shared access and paginated records; keep provider-erasure jobs available.
- [x] Clear this iPhone's saved messages/history before removing its login; cancel outstanding account loads.

Purchase entitlements, legal recording changes and production configuration are not implemented by this pass. Validation results are recorded in [Status](STATUS.md); unchecked items above remain release gates.

## Sources and related evidence

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/): public APIs, blocking criteria, purchases, privacy and third-party AI permission.
- [Apple account deletion guidance](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion): accessible initiation, complete account deletion and subscription handling.
- [Apple required-reason API guidance](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api) and [App Privacy details](https://developer.apple.com/app-store/app-privacy-details/).
- [Apple subscription offer codes](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-subscription-offer-codes/): free offers can disable automatic renewal; the redemption flow is Apple-controlled.
- [Apple submission requirements](https://developer.apple.com/news/upcoming-requirements/): recheck at submission; current published minimum is Xcode 26/iOS 26 SDK or later.
- [Live pilot limits](PAID-PILOT-25.md), [audio delivery](AUDIO-DELIVERY.md), [offline storage](IOS-OFFLINE.md), [setup guides](IOS-SETUP-GUIDES.md), [iPhone verification](../ios/README.md#required-device-verification).
