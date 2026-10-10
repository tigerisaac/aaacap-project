# Shield repository context

Shield is Telnyx call control, GPT Live screening (a Cloud Run WebSocket bridge) and a Firebase backend (Functions, Firestore, Auth, Hosting), plus a SwiftUI iPhone app. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/STATUS.md](docs/STATUS.md) before changing anything. Everything in `docs/archive/` describes earlier designs (Twilio, Gemini, PostgreSQL, the fixed-question "questioning loop"). Don't follow those docs as current instructions or resume their missions.

## Working in this repo

- **Check the repo first:** run `git status --short` and `git fetch`. The upstream is `tigerisaac/aaacap-project`. Commit and push to `main` directly; don't open pull requests unless asked.
- **Run the existing checks:** `npm run check` for the typecheck, unit tests and build, and `npm run test:firebase` for the Firestore emulator. Don't claim tests ran unless they did.
- **Keep three kinds of claim separate:** what the code does, what has been deployed (record evidence with dates), and what has been verified on real phone calls. Synthetic voice and text results aren't real-call evidence.

## Shared live project

`shield-calls-isaac` is the live pilot project, not a sandbox. These all change production:
- `deploy-live-bridge.mjs deploy` and `publish`
- `firebase deploy`
- `enable-live-demo.mjs` and `enable-call-monitoring.mjs`
- `manage-forwarding-test.mjs` `open` and `close`
- `provision-firebase.mjs`, `finalize-firebase.mjs` and `activate-cloud-trial.mjs`

Ask the owner before running any of them. Read-only checks are safe: `check-live-calls.mjs`, `check-monitoring.mjs`, `check-live-access.mjs` and the bridge's `/ready`.

Never place calls to, or message, the owner's phones. Never change carrier forwarding or phone settings without the owner.

## Secrets and privacy

Keys live in Secret Manager (`SHIELD_RUNTIME`, `SHIELD_OPENAI_API_KEY`) or ignored local files (`.env*`, `artifacts/private/`). Never print, commit or paste:
- keys or tokens
- phone numbers other than Shield's public Telnyx number
- transcripts or recordings
- signed webhook URLs

Use synthetic callers for testing, and never feed real call audio or transcripts into evaluation scripts.

## Changing screening

Follow [docs/SCREENING.md](docs/SCREENING.md):
- **Weigh both failures equally.** Letting real callers through matters as much as stopping scams, so report legitimate-offered and harmful-stopped separately.
- **Keep the prompt generalist.** No examples aimed at specific test cases.
- **Keep the main benchmark under 25 cases.**
- **Never tune on the held-out probes.**
- **Bump `SCREENING_POLICY_VERSION` for every prompt change.**
- **Run text and voice checks** before asking to deploy.

Use `--provider go` for free text checks. Preserve the call-control invariants:
- Shield never connects a call without the recipient pressing 1.
- The recipient's number is fixed.
- Screening sessions have bounded timers.
- A failure never connects a call.
