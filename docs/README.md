# Shield documentation

Start with [Architecture](ARCHITECTURE.md), then [Status](STATUS.md).

For release work, use the single current [App Store release checklist](APP-STORE-RELEASE.md) · [Guided disconnection and deletion](ACCOUNT-OFFBOARDING.md), including privacy, deletion, public subscriptions and the ten-person, two-month senior pilot.

| Doc | What it covers |
|---|---|
| [Architecture](ARCHITECTURE.md) | Components (Telnyx, GPT Live bridge, Firebase), how a call flows, voice and TTS, data, what was retired |
| [Status](STATUS.md) | What's deployed, what's been verified on real calls, open work in priority order |
| [Screening](SCREENING.md) | How the screener decides, what each outcome does, rules for changing the policy, test suites and commands |
| [Operations](OPERATIONS.md) | Secrets, deploying functions and the bridge, feature switches, test windows, inspection, phone forwarding and restoration |
| [Screening and voice plan](SENIOR-PILOT-SCREENING-AND-VOICE-PLAN.md) | The October plan toward a senior pilot, plus dated checkpoints for every policy version, red-team round and deployment |
| [Protection plan](PROTECTION-PLAN.md) | Not built yet: faster and broader in-call monitoring, blocking repeat scammers, caregiver alerts, setup health checks, voicemail keep-or-destroy, cutting the caller's wait and shorter disclosures |
| [Carriers](CARRIERS.md) | October 12 research: Verizon and T-Mobile setup, brand-specific conditional codes, evidence gaps, restoration, and per-line acceptance tests |
| [Ten-person pilot plan](TEN-PERSON-PILOT-PLAN.md) | Proposed: shared forwarding numbers, carrier-metadata qualification, optional keypad fallback, exception allocation, tenant isolation, capacity controls and rollout to ten seniors |
| [Shared-number test](SHARED-NUMBER-TEST.md) | Runnable isolated Telnyx diagnostic, Verizon/T-Mobile instructions, independent recipient checks and confirmed overlapping-call evidence |
| [iOS app](../ios/README.md) | Building, signing and the app's screens |
| [iOS design for older adults](IOS-SENIOR-DESIGN.md) | Calls and voicemail first, interface references, simulator evidence, and proposed summaries/kept messages |
| [Design system](../DESIGN.md) and [product brief](../PRODUCT.md) | Visual language and product principles for the app |
| [Shield Open Phone shortcut](shortcuts/README.md) | The Apple Shortcut the forwarding setup uses to open the Phone app |

[archive/](archive/README.md) holds the September design and setup records. That covers the Twilio trial, Gemini screening, the PostgreSQL plan, the questioning-loop spec and the first Telnyx and GPT Live demo logs. They're kept as history, so don't follow them as current instructions.
