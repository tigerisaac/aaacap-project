# Shield documentation

Start with [Architecture](ARCHITECTURE.md), then [Status](STATUS.md).

| Doc | What it covers |
|---|---|
| [Architecture](ARCHITECTURE.md) | Components (Telnyx, GPT Live bridge, Firebase), how a call flows, voice and TTS, data, what was retired |
| [Status](STATUS.md) | What's deployed, what's been verified on real calls, open work in priority order |
| [Screening](SCREENING.md) | How the screener decides, what each outcome does, rules for changing the policy, test suites and commands |
| [Operations](OPERATIONS.md) | Secrets, deploying functions and the bridge, feature switches, test windows, inspection, phone forwarding and restoration |
| [Screening and voice plan](SENIOR-PILOT-SCREENING-AND-VOICE-PLAN.md) | The October plan toward a senior pilot, plus dated checkpoints for every policy version, red-team round and deployment |
| [Carriers](CARRIERS.md) | Researched, not yet tested: which carriers' conditional forwarding Shield can use, codes and restoration by network family, and what to fix before real users |
| [Ten-person pilot plan](TEN-PERSON-PILOT-PLAN.md) | Not built yet: one Shield number per person, what assumes one person today, concurrency, carriers, costs and rollout phases |
| [iOS app](../ios/README.md) | Building, signing and the app's screens |
| [Design system](../DESIGN.md) and [product brief](../PRODUCT.md) | Visual language and product principles for the app |
| [Shield Open Phone shortcut](shortcuts/README.md) | The Apple Shortcut the forwarding setup uses to open the Phone app |

[archive/](archive/README.md) holds the September design and setup records. That covers the Twilio trial, Gemini screening, the PostgreSQL plan, the questioning-loop spec and the first Telnyx and GPT Live demo logs. They're kept as history, so don't follow them as current instructions.
