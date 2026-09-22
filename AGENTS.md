# Shield repository context

Before editing, run `git rev-parse --show-toplevel`, inspect `git remote -v`, and check `git status --short`. The expected upstream is `tigerisaac/aaacap-project` on GitHub (HTTPS or SSH). If the task starts in a ChatGPT project mirror, locate the actual checkout before creating application files. A matching project title is not evidence of a matching directory. Use the verified working directory explicitly for subsequent commands.

Read `docs/README.md` and `docs/COLLABORATOR-SETUP.md` for orientation. Preserve uncommitted work by other agents; stage only your task's files. An isolated checkout is appropriate when the shared checkout contains ongoing changes. Never imply that local edits or another checkout's commits have reached GitHub without verifying the remote.

Distinguish current code, recorded deployment evidence, and proposed requirements. `docs/screening-loop.md` is proposed v1.1 behavior; `docs/caller-evaluation-plan.md` describes the expanded benchmark to build. Neither establishes that those requirements already pass.

Use the existing package scripts. `npm run check` performs the normal local checks; `npm run test:firebase` uses the Firestore emulator. `npm run eval:model` makes paid provider requests and is currently a small smoke suite, not the FTC benchmark. Do not claim tests ran unless they did.

Firebase project `shield-calls-isaac` is the existing shared hosted trial, not an automatically disposable sandbox. Do not treat `scripts/provision-firebase.mjs`, `scripts/finalize-firebase.mjs`, or `scripts/activate-cloud-trial.mjs` as onboarding checks: they change shared resources. Use the collaborator guide to identify access and environment requirements before live tests or deployment.

Keep secrets in the approved local secret file or secret manager; never print, commit, or paste their values into chat. Use synthetic callers for development. Do not include `.env*` secrets, participant data, private artifacts, signed URLs, or service-account keys in commits. Existing example environment files contain placeholders and may be tracked.

Preserve the architecture's bounded screening, application-owned routing, private acceptance, and deadline invariants. Run relevant regression checks for policy changes and keep production/live-service activation separate from local verification.
