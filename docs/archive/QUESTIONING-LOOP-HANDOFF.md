# Finish Shield's questioning loop

## Mission

Build and validate the bounded caller-questioning loop in [specification v1.1](screening-loop.md). The agent should keep making concrete implementation and evaluation progress until the completion gates below are satisfied or the remaining work requires an identified external action. Do not finish at an assessment, a new document, or a green smoke test. Do not expand this task into unrelated UI redesign or a new voice-agent architecture.

“Agent” here has two meanings: the Codex agent doing engineering work, and Shield interpreting a caller. Codex may iterate many times. Shield still gets at most two screening input opportunities, and its model extracts observations rather than choosing questions or dialing permissions.

Read this document, [the progress checkpoint](QUESTIONING-LOOP-PROGRESS.md), [collaborator setup](COLLABORATOR-SETUP.md), the full specification, and [the FTC evaluation plan](caller-evaluation-plan.md). Inspect the current source before deciding what is missing. Document conflicts with recorded deployment notes instead of silently treating proposed requirements as current behavior.

## Start and orient

1. Verify repository origin, branch, and working-tree state. Work on a feature branch in the collaborator's checkout; preserve other contributors' changes. The owner's machine-specific path is not a path to create on another machine.
2. Read the progress checkpoint and any linked latest reports. Continue the first unfinished milestone; do not restart completed work without a concrete regression or stale evidence.
3. Run `npm ci`, `npm run collaborator:check`, and the baseline checks below. Use `npx firebase login` and `npm run collaborator:setup` for the approved shared-key setup. Never put secret values into the conversation.
4. Record which code revision is under test and what the running deployment actually contains. The owner's local checkout can have unpublished work; do not overwrite a newer hosted revision merely because a GitHub branch is older.

Existing commands:

```sh
npm run check
npm run test:firebase
npm run collaborator:check -- --online
npm run eval:model
```

The first two are the local code and emulator checks. The online preflight is read-only and may report Twilio missing until the collaborator configures their account. The model evaluation makes paid requests and currently exercises only the small synthetic single-transcript suite. Implement and document the expanded benchmark commands; do not pretend they already exist.

## Source map and scope

| Responsibility | Starting points to inspect |
|---|---|
| Extraction, prompt, model adapters, policy | `backend/src/screening.ts`, `backend/src/model-config.ts` |
| Active Firebase voice runtime and durable state | `backend/src/cloud/voice.ts`, `backend/src/cloud/store.ts`, `backend/src/cloud/config.ts`, `backend/src/cloud/index.ts` |
| Collaborator's local Twilio trial | `backend/src/trial.ts`, `backend/src/trial-main.ts`, `backend/src/speech.ts` |
| Legacy full transfer and voicemail runtime | `backend/src/voice.ts`, `backend/src/twiml.ts`, `backend/src/store.ts`, `backend/src/worker.ts`, `backend/src/telephony.ts` |
| Existing model smoke runner and fixtures | `backend/scripts/evaluate-model.ts`, `backend/evals/synthetic-cases.json` |
| Regression tests | `backend/tests/model.test.ts`, `policy.test.ts`, `voice.test.ts`, `trial.test.ts`, `cloud.test.ts`, `worker.test.ts` |

Start with a gap matrix connecting requirements I01–I14 and scenarios T01–T48 to actual code, tests, and missing evidence. Treat Firebase as the intended hosted screening path. Share controller behavior across applicable adapters where practical; do not implement only the legacy path and claim the hosted trial is fixed. Account restrictions must remain explicit capability differences, not alternative definitions of success.

## Implementation milestones

| ID | Work | Required output |
|---|---|---|
| M1 | Map current behavior and establish baseline | Requirement/scenario matrix, baseline results, confirmed scope of all three voice paths |
| M2 | Implement model-independent call control | Two-slot state machine, approved prompt catalogue, shared recovery allowance, preloaded no-input fall-through, durable deadlines, disconnect/replay protection |
| M3 | Implement contextual extraction and policy | Both captured turns and question context, bounded schema/evidence validation, fixed clarification selection, retained earlier restrictions, deterministic routing |
| M4 | Build the benchmark and evaluation runner | All nine FTC seed families, reviewed labels, legitimate near-matches, ambiguous branches, family-separated development and held-out sets, versioned reports |
| M5 | Tune and verify candidates | Baseline-versus-candidate results, documented prompt changes, held-out validation, meaningful regression coverage |
| M6 | Exercise actual telephone behavior | Recorded scenario evidence from the collaborator's trial; remaining full-account cases clearly identified and later executed |
| M7 | Review and hand off the result | Reviewable implementation, reproducible commands, reconciled deployment notes, final evidence summary and remaining limitations |

Complete M2 with the model unavailable. No-input must never need a model. Test silence, unclear meaningful input, and technical failures as different branches. A retry, missing-field question, or explanation consumes the same recovery slot. Expiration or exhausted attempts never authorize an offer. An old timer must never affect an accepted human conversation.

For M3, evaluate the ordered captured answers together with turn IDs and the fixed question that elicited each answer. Preserve earlier restricted requests and distinguish actual requests from warnings, quotations, and denials. Test identity-only and purpose-only answers, category-level private explanations, contradictory answers, recantation, and prompt injection. A second ambiguous answer gets a bounded fallback, not a third question. Do not add a second turn after a first-turn restriction solely to satisfy a fixture.

For M4, follow the provenance and labeling requirements in the FTC evaluation plan. Start with at least 100 distinct semantic cases, including all nine FTC seeds, at least 20 multi-turn cases, and at least 20 legitimate near-matches. These are engineering coverage floors, not statistical claims; paraphrases of a single source are not independent evidence. Keep original media, exact transcripts, synthetic extensions, and recognition-corrupted input clearly distinguished. Human-review requirements for ambiguous labels still apply. While reviews are pending, build the runner and candidate fixtures, label them unreviewed, and continue controller work.

## Repeat this engineering cycle

1. Select the highest-impact unmet requirement or reproducible failing case from the checkpoint. Prefer connection safety and bounded termination failures before stylistic wording improvements.
2. Reproduce it and classify the cause: controller/state, capture/recognition, extraction, policy, label ambiguity, or provider behavior. Add a regression case with its expected result before fixing it where practical.
3. Make the smallest coherent change. For prompt experiments, hold the dataset and policy constant; version changes to prompt, schema, context assembly, model, provider selection, and policy separately.
4. Run the relevant focused checks, then the normal local checks for a candidate ready to keep. Run emulator checks when persistent state or Firebase behavior changes.
5. Run the development benchmark for model-affecting changes. Record every run, including timeouts and unavailable results. Preserve the deadline and no-permissive-retry rules; reruns cannot erase failures.
6. Compare safety failures, eligible-call usefulness, clarification behavior, latency, and cost with the preceding candidate. Keep justified improvements, and revert only the agent's own unsuccessful experiment. Never remove hard cases, relabel failures, or weaken invariants to improve a score.
7. Update the checkpoint and the requirement matrix with evidence, remaining failures, and the exact next action. Commit coherent changes and use the repository's review workflow. Continue with the next unmet item while useful work remains.

Do not rerun an unchanged suite indefinitely. Repeated identical failures require a changed hypothesis, input, or implementation. After three unsuccessful approaches to the same issue, write the smallest reproducer and explicit question for review, then continue independent work. This is not a reason to abandon the rest of the mission.

## Model evaluation discipline

Keep all variants from a source family in one split. Freeze held-out cases before tuning. For a final candidate, preserve the full evaluation result; if a held-out failure is used to tune, reclassify that case as a regression/development case and replenish the held-out set. Do not advertise repeated prompt tuning on public FTC examples as independent validation.

Before a sustained paid loop, record finite per-run and cumulative request/cost limits in the checkpoint and enforce them in the runner. The existing OpenRouter key shares the owner's balance; no separate collaborator spending cap was provisioned. Start with small diagnostic batches, avoid concurrent uncontrolled jobs, and stop new paid work at the configured limit. Continue offline engineering if the model budget is exhausted. Do not change billing or automatically top up credits.

The runner must produce case counts/denominators, per-family and per-turn results, failures with rule/prompt IDs, model unavailability, and latency distributions. Record the Git revision and whether the worktree was dirty, dataset/split hash, prompt/schema/policy versions, model/provider settings, and request totals. Keep raw caller material and full reports private; publish only sanitized synthetic summaries and reproducible fixture identifiers.

## Completion gates

Use the following statuses independently: `NOT_STARTED`, `IN_PROGRESS`, `PASS`, `FAIL`, `BLOCKED_EXTERNAL`. Every pass needs a command/report reference, date, and candidate revision. Skipped and unavailable cases are never passes.

**Automated controller completion:** All applicable I01–I14 assertions and T01–T48 automated cases pass on the candidate. Include both orderings of timeout/result, disconnect/offer, and acceptance/expiry races, duplicate/out-of-order events, restart recovery, invalid evidence, and provider failure. Zero observed violations of bridge authorization, destination binding, callback count, recursion, terminal-state protection, or question budget.

**Semantic completion:** All required seed families and reviewed multi-turn/near-match coverage exist. Zero inappropriate offers on the reviewed restricted and materially unresolved benchmark cases. No keyword-only warning/request errors in the required paired regressions. As provisional development targets, achieve at least 95% correct eligible-offer outcomes on clear routine cases and 90% on cases that become clearly routine after one clarification; preserve the two-slot and private-acceptance gates. These targets must be recorded before held-out scoring and may not be lowered in response to failures. Report denominators and label disagreements; human review and pilot acceptance targets remain separate gates. High aggregate accuracy cannot compensate for an invariant violation.

**Telephone completion:** Execute the relevant real-audio scenarios and record captured input, actual question sequence, playback-relative waits, remote disconnection, clipping/lost early speech, and outcome through permitted evidence handling. Test the silence path after taking the main backend offline once initial TwiML loads. Set a measured timing-overhead bound before the final run and report worst overruns. Recognition, accessibility, and supported-language gaps must be explicit. Full bridge/acceptance and voicemail claims require full-account telephone evidence.

**Final completion:** The requirement matrix has no unexplained omissions; required human label review and real-call checks are complete; code and reports refer to the same candidate; configuration/deployment differences are reconciled; and the final handoff explains scope, how to reproduce results, and measured limitations. Mark the mission complete only when all required gates pass. If software is ready but telephone or review gates are blocked, say “automated work complete; end-to-end validation pending” and list the specific outstanding actions.

## Account and human dependencies

The collaborator should create and verify their own Twilio trial and use the local test listener. The current trial restrictions prevent `<Dial><Number>` and `<Record>`, so bridge and voicemail evidence requires a suitable account. Do not upgrade an account, purchase numbers, change the owner's forwarding/webhook, or enable the shared live-service switches as a side effect of this loop. Continue with controller, extractor, and trial-supported tests while those dependencies are unresolved.

The approved Firebase roles permit function development and the specified service identities. A first deployment under the collaborator's identity is still unverified, and some shared-state/IAM scripts require additional permissions. Prepare reviewed changes and diagnose specific permission failures; do not silently broaden access or rerun owner provisioning. Actual phone calls need a participating tester. Ask for necessary human input once, keep the dependency visible, and continue independent work.

## Final handoff format

Report implemented behavior, tested candidate, automated and semantic counts, real-call evidence, timing/cost results, outstanding blockers, and the exact next action. Link the implementation and sanitized reports. Do not call the caller authenticated or claim universal scam detection. A bounded loop working well on its reviewed benchmarks is the claim to support.
