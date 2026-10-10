# Archive

These documents record how Shield got to its current design. They describe earlier architectures and one-off setup sessions, so their instructions, status claims and links may be out of date. For the current system, see [Architecture](../ARCHITECTURE.md) and [Status](../STATUS.md).

| Doc | Era | What it was |
|---|---|---|
| [Shield_Implementation_Plan_v1.md](Shield_Implementation_Plan_v1.md) | Sep 21 | Original plan: Twilio, PostgreSQL, deterministic screening |
| [ARCHITECTURE-VERIFICATION.md](ARCHITECTURE-VERIFICATION.md), [PHONE-VALIDATION.md](PHONE-VALIDATION.md) | Sep 21 | Review of the v1 plan and a phone test protocol (not run) |
| [COLLABORATOR-ORIENTATION.md](COLLABORATOR-ORIENTATION.md), [COLLABORATOR-SETUP.md](COLLABORATOR-SETUP.md) | Sep 21 | Collaborator onboarding for the Twilio + OpenRouter setup |
| [screening-loop.md](screening-loop.md), [caller-evaluation-plan.md](caller-evaluation-plan.md) | Sep 21 | Proposed fixed-question screening spec (v1.1) and FTC benchmark plan |
| [QUESTIONING-LOOP-HANDOFF.md](QUESTIONING-LOOP-HANDOFF.md), [QUESTIONING-LOOP-PROGRESS.md](QUESTIONING-LOOP-PROGRESS.md) | Sep 21 | Agent mission to build that spec. Never started, and replaced by GPT Live screening. |
| [TWILIO-TRIAL.md](TWILIO-TRIAL.md), [CALL-LATENCY.md](CALL-LATENCY.md), [MODEL-SETUP.md](MODEL-SETUP.md) | Sep 21 | Twilio trial, latency tuning and Gemini through OpenRouter |
| [FIREBASE-SERVERLESS-PLAN.md](FIREBASE-SERVERLESS-PLAN.md), [DEPLOYMENT.md](DEPLOYMENT.md), [OPERATIONS.md](OPERATIONS.md), [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md) | Sep 21–24 | Move to Firebase, the legacy operator CLI, and status as of Sep 24 |
| [TELNYX-REALTIME.md](TELNYX-REALTIME.md), [FORWARDING-PILOT.md](FORWARDING-PILOT.md), [LIVE-DEMO.md](LIVE-DEMO.md) | Sep 24 | Switch to Telnyx, the guided forwarding setup, and the first GPT Live demo with its physical-phone log |
| [IOS-DIRECTION.md](IOS-DIRECTION.md) | Sep 21 | Design brief behind the app's look ([DESIGN.md](../../DESIGN.md) is current) |
