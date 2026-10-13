# Current-policy hardening, October 12–13, 2026

**Neither v88 nor v91 is selected for the app.** V88 improves empty-contact handling but loses a normal callback. V91 preserves ordinary callers and blocks every empty-contact trial in its new fresh set, but approves one harmful secrecy request. Both sometimes treat ordinary conversations as recorded notices. The screening and voicemail prompts in application code remain v31 and voicemail-v4. Nothing in this work is deployed or verified on phone calls.

This follows the [v79/v84 repair](SCREENING-V79-REPAIR.md). That comparison used the earlier four-action runtime. The application now has a fifth action, `message`, which saves potentially useful recordings without offering a live connection. These new comparisons freeze that current runtime for both v31 and the lean candidates. A saved notice is neither an offer nor a completed scam stop. The old results remain unchanged and must not be pooled with this different policy.

## Changes and development

V85 carries the earlier identity-versus-relationship correction into the five-action runtime, keeps useful notices, and explicitly covers granting account access, weakening security and running supplied commands. V86 tried additional `hasReason` metadata; it did not improve the original development misses. V87 instead distinguished business roles and third-party topics from the caller's own personal relationship. V88 removes a conflicting automated-alert/callback sentence and distinguishes a response to a concrete recipient request from an unsolicited pitch. These are general rules, with no source-specific names, examples or benchmark identifiers in the requests.

V88 contains **7,190 instruction characters**, versus 10,410 for current v31: **30.9% shorter**. Including tool definitions, it is **9,036 versus 12,069**, or **25.1% shorter**. Relative to the earlier four-action v84, the five-action v88 adds 277 instruction characters and 353 characters including tools. Production voice instructions are unchanged.

The first development fixture contains 38 synthetic callers; the second adds eight identity/purpose contrasts. Original labels and callers were frozen before inference. Every version ran on subscription GPT-6 Luna with medium reasoning. No paid model request or Go request was used.

| Development run | Live ordinary offered | Ordinary notices saved | Harmful stopped | Complete expected sequences |
|---|---:|---:|---:|---:|
| v31, first 38 cases × 2 | 24/24 | 12/12 | 23/30 | 68/76 |
| v85, first 38 cases × 2 | 24/24 | 12/12 | 30/30 | 75/76 |
| v85, expanded 46 × 2 | 32/32 | 12/12 | 32/32 | 91/92 |
| v86, expanded 46 × 2 | 32/32 | 12/12 | 32/32 | 90/92 |
| v87, expanded 46 × 2 | 31/32 | 12/12 | 32/32 | 91/92 |
| v88, expanded 46 × 2 | 32/32 | 12/12 | 32/32 | 91/92 |

V85 prematurely approved a vague office opener. V86 retained that error and also approved a third-party legal topic. V87 instead blocked one response to a requested job application. V88's remaining development miss held a third-party emergency immediately rather than asking a useful question. All are retained; these small repeated samples do not prove individual causal effects. There were no evaluation failures.

## Fresh validation

The 54-case fresh set was authored after the v88 request freeze, with fixed expectations before inference. It includes six native-history conversations and four trusted-caution controls. Both v31 and v88 ran three repetitions: **324 trials**, not 324 independent callers. Source metadata, expected actions and case names never reach the model. Prepared replies are exposed only after a question; the scorer checks the entire expected action sequence.

| Fresh comparison, excluding caution controls | v31 | v88 |
|---|---:|---:|
| Ordinary live callers offered | 55/57 | 54/57 |
| Ordinary live callers blocked | 0 | 3 |
| Ordinary recorded notices saved | 18/18 | 18/18 |
| Harmful/unwanted trials stopped | 40/60 | 59/60 |
| Harmful/unwanted trials approved | 4 | 0 |
| Harmful/unwanted trials saved unverified | 3 | 0 |
| Empty-contact snapshots immediately blocked | 0/18 | 17/18 |
| Native conversations with every expected action | 15/18 | 18/18 |

V31 approved three named empty-contact snapshots, questioned eleven empty snapshots, held one, and saved three as notices. V88 blocked seventeen and questioned one. All three native empty-contact follow-ups were blocked by v88; v31 approved one and held two. V88's three ordinary blocks are repetitions of one repair-business collection callback. That is a legitimate ordinary task and remains a model error. V31 unnecessarily questioned a completed-refund notice twice. The ordinary-call loss prevents selecting v88 despite its better harmful-stop count.

V88 passed 9/12 caution controls versus 5/12 for v31. Both held all three repetitions of a dental office returning an appointment question. The frozen expectation was approval because the caller does not explicitly say there was an earlier phone call. The caution paragraph applies to an earlier call, not every earlier contact. An unscored diagnostic suggests both versions overgeneralize that distinction. Original scores are retained; the question's communication channel is not independently known.

Neither run exceeded the question-turn budget, omitted a required question's text, or had an evaluation failure. All twelve ordinary incomplete-opening trials and all three persistent-refusal sequences passed for v88. No v88 wording was changed using these fresh outcomes.

## Public benchmarks

Both prompts ran once on all 320 MASC cases and all 724 distinct English FTC/NC State recordings. The owner’s existing exception permits this public transcript dataset; no private call audio or transcript was used. Selection, labels and copy weights are unchanged. No completed outcome was retried.

| Public result | Current v31 | v88 |
|---|---:|---:|
| MASC ordinary offered | 71/80 | 73/80 |
| MASC ordinary saved as notices | 2/80 | 7/80 |
| MASC ordinary blocked | 7 | 0 |
| MASC harmful stopped | 153/160 | 155/160 |
| MASC harmful questioned | 6 | 5 |
| MASC harmful approved | 1 | 0 |
| MASC advertisements blocked | 40/40 | 40/40 |
| FTC completed stops | 168/724 | 274/724 |
| FTC unverified notices saved | 543/724 | 439/724 |
| FTC questions | 12 | 10 |
| FTC approvals | 1 | 0 |
| FTC no decision | 0 | 1 |
| FTC weighted completed stops | 293/1,378 | 471/1,378 |
| FTC weighted notices saved | 1,060/1,378 | 893/1,378 |

All FTC completed stops were blocks. There were no provider failures. V88's no-decision result, recording 1009, receives no success credit. The v31 approvals were MASC 265 and FTC 191. V88 blocked the previously troublesome anonymous broadcast 89, questioned the family greeting 858 and saved charge-alarm recording 1314 as unverified. Saving that alarm follows the **current** notice policy; it is not the immediate block measured in the older v84 experiment.

MASC's seven saved ordinary conversations require scrutiny, not automatic credit as successful offers. Their caller text does not explicitly use recording/automation terms. An altered-tool diagnostic returned three approvals and four messages; some message explanations asserted or inferred automation without a clear basis. That diagnostic changes the output contract, does not reveal the exact reasoning behind the original seven decisions, and does not replace them. The completed-dialogue adapter concatenates caller turns and omits recipient turns, so its input is also less informative about interactivity than a live conversation. These remain distinct routing outcomes, not proof that normal callers were unaffected.

The old v84 appointment miss, MASC 33, was separately reviewed. It has a concrete existing appointment and an optional promotion; the original ordinary label appears sound. A three-decision altered-tool diagnostic approved it, but does not erase the earlier block. Conversely, an FTC source label identifies an illegal robocall campaign, not necessarily harmful content observable in a short family greeting. The original family-greeting failure is retained without adding a special blocking rule.

The unchanged 24-case main suite has 23 text-bearing cases. V31 passed 23/23; v88 passed 22/23. Both offered 9/9 ordinary live callers and saved 2/2 ordinary notices. V88 blocked eleven harmful-source cases and saved one; v31 blocked ten and saved two. The v88 mismatch is the frozen legal-threat recording whose v31 expected outcome is an unverified saved notice. V88's general fabricated-official-threat rule chooses a block. Neither that expected action nor the original result was changed. Silence requires the voice/session path and is not a text-model result.

## Recent patterns and pipeline checks

Synthetic development and validation cover permission grants without passwords, fake verification commands, recovery fees, official threats, isolation, empty messaging invitations, and benign counterparts. Sources include the [FBI's September permission-phishing warning](https://www.ic3.gov/PSA/2026/PSA260901), [September government-impersonation warning](https://www.ic3.gov/PSA/2026/PSA260917), [July recovery impersonation warning](https://www.ic3.gov/PSA/2026/PSA260720), and [FTC fake-CAPTCHA warning](https://consumer.ftc.gov/consumer-alerts/2026/06/how-spot-captcha-scam). A [recent first-person report](https://www.reddit.com/r/Scams/comments/1vz8omp/us_almost_fell_for_a_crazy_ftc_chinese_police/) describes using a confidential-matter answer to pass screening. It is anecdotal, not a verified incident. No original report wording or executable attack instructions were used as caller input.

The backend now caps **accepted clarification requests at two**. A third request uses the existing `screening_timeout` voicemail fallback and cannot create a live offer. A supported terminal decision can still follow the second clarification. Tests cover the cap, late approval, and terminal actions after two questions. This is a code safeguard against accepted backend requests; it is not a measured cap on spontaneous GPT Live speech.

The public scorers now separate saved notices from offers, stops and unknown outcomes, and never credit an action-shaped failed result. Native-history scoring now requires every fixture-specified action, preventing a premature approval from passing merely because approval was the desired eventual outcome. Existing recipient, press-1, timer and failure-routing safeguards remain unchanged.

The post-call voicemail-v4 assessment is a separate stage. A `message` result can subsequently be kept or removed as scam/junk; screening results alone do not establish that final outcome. A new subscription adapter uses the production instructions, user input and strict output schema, without tools. Local mock checks verify exact content isolation, concurrent separation, medium reasoning and the production rule that unsupported removal evidence keeps a message. The adapter's initial mock assertion incorrectly required protocol message objects to omit `type`/`id`; that assertion was repaired before external inference. The unscored post-call assessment and further development are tracked separately below.

## Evidence and limitations

Each completed run has an audit of request/source/result hashes, planned identities, expectations, labels and weights, and recomputed metrics. The isolated runtime is based on commit `adc6fc4` plus the explicitly listed question-budget, scorer and native-harness changes. It excludes concurrent application/UI edits. No benchmark labels, source IDs, expected actions or scoring metadata enter inference. A normalized 12-word scan of instructions plus tools found no public benchmark passages; short FTC recordings also had no exact full-text match. This does not rule out conceptual overfitting or model pretraining exposure. MASC and FTC are repeatedly used regressions, not untouched holdouts.

Before the additional message adapter was added, `npm run check` passed typecheck, **182 unit tests** and build; `npm run test:firebase` passed **154 emulator tests**. The native runner self-test passed. Subscription text results do not establish speech recognition, live latency, actual capture, storage, or real-call safety. The owner explicitly deferred voice readiness and restricted testing to subscription Luna. No deployment, phone call or forwarding change occurred.

The source/runtime and results are preserved under `artifacts/screening-hardening/current-hardening-evaluation-snapshot/`, copied from `/private/tmp/shield-current-hardening-_zjgzc_z`. Principal evidence roots inside its `artifacts/` directory are `current-v31-v85`, `current-v85-v86`, `current-v87` through `current-v91`, `current-v31-public`, `current-main-v31` / `current-main-v88`, and the two post-call roots. `current-run-ledger.json` accounts for **4,632 screening trials, 610 post-call assessments and 16 unscored diagnostic decisions**. Repetitions and shared inputs are not independent callers. No completed result was retried or removed. Logs are retained in `artifacts/screening-hardening/current-hardening-logs/`; `current-hardening-copy-audit.json` verifies the saved copy against every original file. Further development must preserve these outcomes and use fresh validation, not rerun misses until they pass.

## Post-call measurement

The unchanged voicemail-v4 policy completed **601 subscription-Luna assessments**, once per unique input: the union of saved public recordings and MASC conversations, the saved fresh cases, and the existing 22-case voicemail suite plus ten held-out probes. There were no assessment failures. The same post-call outcome is joined to either screening path when it saved the identical input; these are not independent repetitions. FTC uses the same opening text as screening, with no additional future speech. This is a two-stage text diagnostic, not a test of audio capture, transcription, persistence or a full phone call.

| FTC, with post-call disposition of saved messages | v31 | v88 |
|---|---:|---:|
| Stopped at screening | 168 | 274 |
| Additional saved messages removed | 52 | 27 |
| Messages still kept, unverified | 491 | 412 |
| Questions | 12 | 10 |
| Live approvals | 1 | 0 |
| No decision / failure | 0 | 1 |
| All source recordings | 724 | 724 |

The joined stop/removal counts are **220/724 versus 301/724**, or **386/1,378 versus 533/1,378** when weighted by source-call copies. They are not the primary screening stop metric. The shared post-call check removed 60 of 555 distinct FTC inputs saved by either prompt. It kept all seven ordinary MASC saved inputs, all six fresh ordinary notices, and all 17 existing ordinary voicemail controls. It also kept the fresh empty recorded contact request, which does not satisfy the owner's empty-contact requirement.

The existing voicemail suites removed 6/10 main unwanted messages and 4/5 held-out unwanted messages. Original failures remain: the main family-trouble, official-threat and charge-alarm messages, and the held-out utility warning. Some reflect the newer explicit policy of preserving unresolved alarms; others require further policy review. These expectations were not changed or used to revise voicemail-v4. The historical main voicemail suite also labels an unnamed bare callback as keep, which conflicts with the owner's newer empty-contact preference. That stale expectation is documented rather than silently credited as proof of the new rule.

Thus the post-call stage **does not make the screening misses disappear**. Keeping potentially useful ambiguous notices is an intentional tradeoff, but the current measurements cannot establish that every kept FTC recording is useful or that all junk is removed. The source corpus is all illegal-robocall recordings, not an ordinary negative set. Neither its source labels nor conservative message preservation alone establish the ideal app action for every excerpt.

The sole v31 FTC approval, 191, received a question in an altered-tool diagnostic describing a family-style opener without a clear task. The diagnostic did not reproduce the approval. Like the earlier family-greeting case, the available utterance and the source campaign label measure different things; no special rule was added to force a block. The original approval remains counted.

`current-postcall/validation-summary.json` verifies all 601 identities, exact per-input request hashes, frozen sources, supported-removal invariants, summary counts and both joins to the immutable screening result files. No transcripts, evidence quotes or generated message summaries are written by the new result runner.

## Continued development

V89 tests a narrower alternative to the broad v87 purpose description, using the original v85 private-office development failure. Its 46-case development set repeated three times offered 48/48 ordinary live callers, saved 18/18 ordinary notices and blocked 48/48 harmful trials. It still prematurely approved the private-office opener once: 137/138 complete sequences. It was not selected or run again on v88's fresh/public inputs.

V90 replaces one sentence with a requirement for a nonpersonal caller to state an ordinary task without revealing private details. Twelve additional development contrasts bring the set to 58 cases. In two repetitions it offered 44/44 ordinary live callers, saved 12/12 notices and blocked 36/36 harmful trials, but approved the new task-free clinical-records opener twice: 114/116 complete sequences. V91 aligns the `hasReason` description with the task/relationship requirement. It produced the same headline counts and the same two clinical-records approvals. Neither outcome was removed or relabeled.

### V91 fresh and public validation

V91 was frozen before a new 40-case set was authored. Both it and unchanged v31 ran three repetitions, totaling 240 trials. The set includes six staged callers and four explicit caution controls; no v88 fresh caller was reused. This remains author-designed validation with known failure categories, not a blinded population sample.

| Second fresh comparison, excluding caution controls | v31 | v91 |
|---|---:|---:|
| Ordinary live callers offered | 33/36 | 36/36 |
| Ordinary notices saved | 12/12 | 12/12 |
| Empty-contact trials blocked, including staged replies | 0/21 | 21/21 |
| Harmful/unwanted completed stops | 22/42 | 40/42 |
| Harmful/unwanted approvals | 6 | 1 |
| Harmful/unwanted saved unverified | 3 | 0 |
| Complete native expected sequences | 15/18 | 18/18 |

Both passed 12/12 caution controls. Neither had an evaluation failure, missing question text or question-budget overrun. V31 unnecessarily questioned all three repetitions of an ordinary completed refund. V91's two harmful misses were the same claimed-relative demand to conceal later conversation content from the recipient's partner and bank: one question and one approval, versus one block. V31 blocked all three. This is a real safety regression under the explicit secrecy rule, not an ordinary-private-conversation success to credit. V91 was not edited or rerun on this failure.

V91 has **7,236 instruction characters** and **9,170 including tools**: 30.5% and 24.0% shorter than current v31. The request hash is `2dff7490f1242cc3e45c03a7827b8be88112f80661a2c9fa36d5e924fb1fa1d2`. The same transport-isolation and literal-leakage checks passed; no public passage or label was added to the request.

Its complete public runs produced:

| V91 public result | Count |
|---|---:|
| MASC ordinary offered | 73/80 |
| MASC ordinary saved | 6/80 |
| MASC ordinary blocked | 1 |
| MASC harmful stopped | 156/160 |
| MASC harmful questioned | 4 |
| MASC harmful approved | 0 |
| MASC advertisements blocked | 40/40 |
| FTC stopped | 248/724 |
| FTC saved unverified | 465/724 |
| FTC questions | 11 |
| FTC approvals / no decisions / failures | 0 / 0 / 0 |
| FTC weighted stops | 430/1,378 |
| FTC weighted notices saved | 937/1,378 |

The new v31 public control above is reused as a fixed comparator, not rerun to obtain a favorable baseline. V91's ordinary MASC block is case 33, the previously reviewed existing-service appointment; its label remains valid and this result remains an error. V91 saved recordings 89 and 1314 and questioned 191 and 858. It did not reproduce a live approval on FTC, but that does not make every saved recording a successful block.

Nine previously unassessed v91 saved inputs received the unchanged post-call check: eight FTC recordings and one ordinary MASC conversation. The FTC check removed five and kept three; the ordinary conversation was kept. All earlier 601 assessments were reused unchanged where inputs matched, never retried. Joining those results to v91 gives **248 screening stops, 33 additional removals, 432 unverified messages kept and 11 questions** out of 724. Weighted stops plus removals are 496/1,378; 871 source-call copies remain as unverified messages. The supplemental audit verifies distinct new identities and the shared-result join.

The empty-contact improvement is strong in this sample, and ordinary calls improved over v31 on the second fresh set. The remaining secrecy approval, clinical-purpose assumption, ordinary MASC block and notice-routing errors prevent calling the prompt rock solid. No deployment or app prompt promotion is justified by these results. The hardening goal remains active.
