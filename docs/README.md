# Shield documentation

Start with [Architecture](ARCHITECTURE.md), then [Status](STATUS.md).

For release work, use the single current [App Store release checklist](APP-STORE-RELEASE.md) · [Guided disconnection and deletion](ACCOUNT-OFFBOARDING.md), including privacy, deletion, public subscriptions and the ten-person, two-month senior pilot.

| Doc | What it covers |
|---|---|
| [Architecture](ARCHITECTURE.md) | Components (Telnyx, GPT Live bridge, Firebase), how a call flows, voice and TTS, data, what was retired |
| [Status](STATUS.md) | Dated implementation, deployment and verification checkpoints; follow the release checklist for current acceptance gates |
| [iOS release verification](IOS-RELEASE-VERIFICATION.md) | Source, simulator, archive and CI evidence, retained failures and physical/Apple limits |
| [Contact change recovery](IOS-CONTACT-RECOVERY.md) | Lost-response and relaunch recovery, explicit contact changes, exact API rollout boundary and remaining physical acceptance |
| [Operational readiness](OPERATIONAL-READINESS.md) | Service health, alert delivery, scheduled workers, incident evidence and remaining acceptance |
| [Dependency security](DEPENDENCY-SECURITY.md) | Runtime/tooling audit boundaries, remaining advisories, package-manager requirements and verification evidence |
| [Screening](SCREENING.md) | How the screener decides, what each outcome does, rules for changing the policy, test suites and commands |
| [Operations](OPERATIONS.md) | Secrets, deploying functions and the bridge, feature switches, test windows, inspection, phone forwarding and restoration |
| [Screening and voice plan](SENIOR-PILOT-SCREENING-AND-VOICE-PLAN.md) | The October plan toward a senior pilot, plus dated checkpoints for every policy version, red-team round and deployment |
| [Protection plan](PROTECTION-PLAN.md) | Earlier protection plan and dated checkpoints; use Status and the release checklist for what is now implemented, deployed or verified |
| [Carriers](CARRIERS.md) | October 12 research: Verizon and T-Mobile setup, brand-specific conditional codes, evidence gaps, restoration, and per-line acceptance tests |
| [Ten-person pilot plan](TEN-PERSON-PILOT-PLAN.md) | Earlier shared-number and enrollment plan; current complimentary-pilot requirements and carrier/capacity gates are in the release checklist |
| [Shared-number test](SHARED-NUMBER-TEST.md) | Runnable isolated Telnyx diagnostic, Verizon/T-Mobile instructions, independent recipient checks and confirmed overlapping-call evidence |
| [iOS app](../ios/README.md) | Building, signing and the app's screens |
| [iOS design for older adults](IOS-SENIOR-DESIGN.md) | Calls and voicemail first, interface references, simulator evidence, and proposed summaries/kept messages |
| [Design system](../DESIGN.md) and [product brief](../PRODUCT.md) | Visual language and product principles for the app |
| [Shield Open Phone shortcut](shortcuts/README.md) | The Apple Shortcut the forwarding setup uses to open the Phone app |

[archive/](archive/README.md) holds the September design and setup records. That covers the Twilio trial, Gemini screening, the PostgreSQL plan, the questioning-loop spec and the first Telnyx and GPT Live demo logs. They're kept as history, so don't follow them as current instructions.
