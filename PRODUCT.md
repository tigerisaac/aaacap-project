# Shield

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Stack

Native SwiftUI companion; TypeScript backend on Firebase (Functions, Firestore, Auth, Hosting); Telnyx for telephony; OpenAI GPT Live for voice screening through a Cloud Run bridge. See docs/ARCHITECTURE.md.

## Users

Older adults reviewing their calls, independent users who do not want outside help, and optional trusted contacts. Shared call access remains explicit and revocable. The owner’s October 12 brief makes an 80-year-old’s understanding the design bar: less text, everyday language, fewer visible choices, and calls and voicemail first. Preserve the native app’s familiar appearance while simplifying every interaction.

## Product Purpose

Screen selected unfamiliar forwarded calls, hold sensitive requests for independent verification, and give participants a clear history and voicemail inbox. The backend and reliable call behavior take priority over the app's polish.

## Operating Context

The participant keeps their mobile number, native Phone app, and Messages. Carrier setup is assisted and tested. Caregivers who already have shared access can switch between the people who share with them; the app does not create or accept call-history sharing invitations. Optional trusted-contact requests are separate: recipients consent to texts/app alerts and gain no access to call history or recordings. Live voice delivery is independent of the companion app being foregrounded.

## Capabilities and Constraints

Call history, held-call explanations, protected voicemail, manual message checks, independently sourced saved numbers, setup status, pause, recovery, and caregiver sharing. No caller authentication or guarantee that all scams are intercepted. Monitoring after a call connects is opt-in only (connected-call protection) and is disclosed to the caller. Pausing offers does not restore forwarding. Real device/carrier tests are still required.

## Brand Commitments

Use concise, compact screens with one clear purpose. Avoid eyebrow headings, repeated explanations and oversized spacing. Ordinary one-contact web states should fit without scrolling at default text size; preserve scrolling for accessibility sizes and expanded details. Shield is a working name. Minimal text and more color are explicit user preferences. AAACAP sponsorship or branding is not authorized.

## Evidence on Hand

Current architecture, status and screening results in docs/. Synthetic screening benchmarks and a few supervised real calls by the owner; no real participant data or measured fraud prevention. All demo activity must be clearly identified as sample data.

## Product Principles

- Make the result of each call easy to understand.
- Put calls and voicemail in everyday reach; keep setup, sharing, and explanations out of the daily path.
- Give each screen one clear next action. Reveal uncommon details on request.
- Mark new-feature mockups as sample-only. A preview never changes real messages or live phone service.
- Participants control sharing; caregiver access does not imply ownership.
- Treat uncertain screening as uncertain, never authenticated or safe.
- Keep the route back to ordinary carrier service visible.

## Accessibility & Inclusion

Readable system typography, Dynamic Type, VoiceOver labels, large touch targets, reduced motion, and meaning conveyed with text and symbols as well as color. Both the participant's and caregiver's core tasks must be usable without dense explanatory text.
