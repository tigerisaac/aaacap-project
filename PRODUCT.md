# Shield

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Stack

Native SwiftUI companion; TypeScript and PostgreSQL backend; Twilio for telephony. The approved implementation plan establishes this stack. Hosting and live provider accounts are open configuration decisions. The local backend uses embedded PostgreSQL only in demo mode.

## Users

Older adults reviewing their calls, and caregivers with explicit, revocable access. The user requested that both audiences be accommodated, with good features, minimal text, and more color.

## Product Purpose

Screen selected unfamiliar forwarded calls, hold sensitive requests for independent verification, and give participants a clear history and voicemail inbox. The backend and reliable call behavior take priority over the app's polish.

## Operating Context

The participant keeps their mobile number, native Phone app, and Messages. Carrier setup is assisted and tested. Caregivers accept invitations and can switch between people who have shared access. Live voice delivery is independent of the companion app being foregrounded.

## Capabilities and Constraints

Call history, held-call explanations, protected voicemail, manual message checks, independently sourced saved numbers, setup status, pause, recovery, and caregiver sharing. No caller authentication or guarantee that all scams are intercepted. No post-acceptance monitoring. Pausing offers does not restore forwarding. Real device/carrier tests are still required.

## Brand Commitments

Shield is a working name. Minimal text and more color are explicit user preferences. AAACAP sponsorship or branding is not authorized.

## Evidence on Hand

Architecture and verification documents in docs/. No real participant data, measured fraud prevention, or live carrier validation. All demo activity must be clearly identified as sample data.

## Product Principles

- Make the result of each call easy to understand.
- Participants control sharing; caregiver access does not imply ownership.
- Treat uncertain screening as uncertain, never authenticated or safe.
- Keep the route back to ordinary carrier service visible.

## Accessibility & Inclusion

Readable system typography, Dynamic Type, VoiceOver labels, large touch targets, reduced motion, and meaning conveyed with text and symbols as well as color. Both the participant's and caregiver's core tasks must be usable without dense explanatory text.
