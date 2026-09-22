# Questioning-loop progress checkpoint

Update this file after each meaningful iteration and before handing off a session. Keep secrets, real phone numbers, raw caller transcripts, and signed/private URLs out of it.

## Mission status

- Overall: `NOT_STARTED` — implementation/evaluation mission has been handed off, not completed by the documentation task.
- Automated controller gate: `NOT_STARTED` against v1.1.
- Reviewed semantic benchmark gate: `NOT_STARTED`.
- Real-call gate: `BLOCKED_EXTERNAL` — collaborator's Twilio setup/tester pending; full bridge/voicemail requires capabilities beyond the current trial.
- Final review/deployment reconciliation: `NOT_STARTED`.

## Known baseline

- Repository: `tigerisaac/aaacap-project`.
- Onboarding candidate: `b3f574bbcdca722df9d4a1a5b34f8157c50a91ee`.
- At that revision: 95 backend tests, 10 Firestore emulator tests, and 4 onboarding tests passed; type checking/build passed. These are onboarding regression results, not proof of v1.1 completion.
- `npm run eval:model` runs the existing single-transcript smoke dataset. The expanded FTC and two-turn benchmark runner is not implemented at handoff.
- Approved Firebase access and the OpenRouter configuration secret were provisioned. The owner's credentials verified secret retrieval and read-only provider authentication. The collaborator's own login and first deployment have not been verified.
- GitHub invitation remains pending the collaborator's account; the owner requested leaving it outstanding.
- The owner's application checkout contains unpublished changes. Inspect remote/current deployment differences before deploying a candidate from this repository.

## Milestones

| ID | Status | Evidence / next action |
|---|---|---|
| M1 | NOT_STARTED | Inspect the current source, rerun baseline, and create the I01–I14 / T01–T48 gap matrix. |
| M2 | NOT_STARTED | Map shared recovery state and no-input fall-through across Firebase, local trial, and legacy paths. |
| M3 | NOT_STARTED | Verify extraction context/evidence handling; implement both-turn interpretation and fixed clarification selection. |
| M4 | NOT_STARTED | Implement FTC provenance manifest, reviewed cases, split discipline, and benchmark runner. |
| M5 | NOT_STARTED | Establish a baseline and compare versioned prompt/context candidates. |
| M6 | BLOCKED_EXTERNAL | Set up collaborator's Twilio account; execute supported tests; retain unsupported cases as pending. |
| M7 | NOT_STARTED | Assemble final candidate evidence and review after the earlier milestones. |

## Current iteration

- Working branch / commit / dirty state: to be recorded by the implementing agent.
- Active milestone and failure/hypothesis: begin M1.
- Relevant entry points: see [source map](QUESTIONING-LOOP-HANDOFF.md#source-map-and-scope).
- Exact next action: verify repository and working tree, read the handoff/spec, run `npm run collaborator:check` and `npm run check`, then map each invariant to current code and test coverage.
- Required human action: accept GitHub invitation once an account is identified; sign in to Firebase; create/verify own Twilio trial. Human adjudication of ambiguous benchmark labels will also be required.

## Evaluation configuration

- Dataset revision / split hash: not yet created.
- Prompt / schema / context / policy versions: inspect and record.
- Model and provider configuration: inspect approved non-secret settings; do not silently change provider.
- Provisional usefulness targets: 95% clear routine; 90% routine after clarification, as defined in the handoff. No held-out evaluation has been run against these targets.
- Paid evaluation budget: sustained-loop request/cost limits not yet configured; record and enforce them before repeated paid runs. Access to the shared key is not an unlimited budget.
- Requests / cost consumed in this mission: no paid evaluation executed by this handoff task.

## Iteration log

Append one row per meaningful candidate. Store full reports in private artifacts and use sanitized summaries here.

| Date / candidate | Change and hypothesis | Commands / report IDs | Results and failures | Keep / revise | Next action |
|---|---|---|---|---|---|
| Handoff only | Created continuation instructions and checkpoint | Documentation checks only | Implementation gates remain outstanding | Begin M1 | Inspect source and establish requirement coverage |

## Requirement matrix to create in M1

Track every invariant I01–I14 and scenario T01–T48 with: requirement ID, applicable runtime, code location, automated test/case ID, real-call evidence requirement, current status, evidence revision, and remaining action. Include failures and unsupported trial cases. A scenario can have automated evidence while its real-call requirement remains blocked.
