# Shield repository context

Before editing, run `git rev-parse --show-toplevel`, inspect `git remote -v`, and check `git status --short`. The expected upstream is `tigerisaac/aaacap-project` on GitHub (HTTPS or SSH). If the task starts in a ChatGPT project mirror, locate the actual checkout before creating application files. A matching project title is not evidence of a matching directory. Use the verified working directory explicitly for subsequent commands.

Read `docs/README.md` and `docs/COLLABORATOR-SETUP.md` for orientation. Preserve uncommitted work by other agents; stage only your task's files. An isolated checkout is appropriate when the shared checkout contains ongoing changes. Never imply that local edits or another checkout's commits have reached GitHub without verifying the remote.

Distinguish current code, recorded deployment evidence, and proposed requirements. `docs/screening-loop.md` is proposed v1.1 behavior; `docs/caller-evaluation-plan.md` describes the expanded benchmark to build. Neither establishes that those requirements already pass.

Use the existing package scripts. `npm run check` performs the normal local checks; `npm run test:firebase` uses the Firestore emulator. `npm run eval:model` makes paid provider requests and is currently a small smoke suite, not the FTC benchmark. Do not claim tests ran unless they did.

Firebase project `shield-calls-isaac` is the existing shared hosted trial, not an automatically disposable sandbox. Do not treat `scripts/provision-firebase.mjs`, `scripts/finalize-firebase.mjs`, or `scripts/activate-cloud-trial.mjs` as onboarding checks: they change shared resources. Use the collaborator guide to identify access and environment requirements before live tests or deployment.

Keep secrets in the approved local secret file or secret manager; never print, commit, or paste their values into chat. Use synthetic callers for development. Do not include `.env*` secrets, participant data, private artifacts, signed URLs, or service-account keys in commits. Existing example environment files contain placeholders and may be tracked.

Preserve the architecture's bounded screening, application-owned routing, private acceptance, and deadline invariants. Run relevant regression checks for policy changes and keep production/live-service activation separate from local verification.

## Continue the questioning-loop work

When asked to finish, improve, evaluate, or keep working on caller questioning, follow `docs/QUESTIONING-LOOP-HANDOFF.md` and resume from `docs/QUESTIONING-LOOP-PROGRESS.md`. The objective is a working implementation with measured evidence, not another plan or a passing 16-case smoke suite. Implement, test, diagnose, and improve the next unmet milestone; continue through available work without asking the user to choose routine next steps. Keep fixed questions and the single shared clarification/recovery allowance.

Update the progress file after each meaningful iteration and before ending a session, including exact commands, candidate versions, results, remaining failures, and the next concrete action. Separate automated completion, model evaluation, and real-call validation. A skipped test, unavailable credential, trial-account limitation, or unreviewed label is outstanding work, not a pass. If one lane is blocked, continue independent implementation/tests. Stop claiming completion until the handoff's acceptance gates have actual evidence; never weaken tests or routing rules merely to make the report green.
