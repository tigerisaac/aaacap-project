# V74 callback and refund repair — October 12–13, 2026

This is an offline subscription-Luna experiment. No application policy, deployment, forwarding or voice setting was changed by this task. The shared application independently moved to v31 with a saved-message action; these comparisons deliberately retain the earlier four-action runtime, so they are not a validation of v31 or the saved-message flow.

## Diagnosis and change

The saved v74 ordinary callback blocks were accepted model decisions, not rejected evidence or invalid tool calls. Most already had both identity and purpose marked present. In the earlier held refund conversation, the model kept `hasName: false` despite a business role being stated. This supports two observable problems: inconsistent application of the ordinary-purpose exception, and overly narrow identity recognition. It does not establish the model's hidden reasoning.

A separate 16-case diagnostic added a brief decision-basis field and stripped that field before the existing validator. This changed the tool contract and is **not** scored as an unchanged-runtime benchmark. V75's reported bases sometimes treated an ordinary callback as lacking a purpose because the details would be discussed later. V74 happened to approve all eight diagnostic ordinary cases. Requesting a decision basis may itself affect behavior; these explanations are evidence of the diagnostic run, not proof of the original cause.

V79 returns to v74's decision instructions and adds a final consistency check: before applying the empty-contact block, inspect the whole caller transcript for a stated personal relationship or ordinary task. Either makes that particular block rule inapplicable; other harmful-request rules still apply. It also clarifies the existing `hasName` field description: business type or role counts without a proper name, using all caller turns. No action, schema shape, validator or transport setting changes. Trusted caution context is preserved.

V75–v78 are retained rather than overwritten. V75 tied contact blocking to `hasReason` and expanded both field descriptions; v76 rewrote the ordinary/contact paragraphs; both lost ordinary callers. V77 directly approved ordinary callbacks, and v78 strengthened the empty-invitation and resolved-refund wording. They improved ordinary offers but introduced harmful approvals, so neither is a safe replacement merely because its ordinary count improved.

## Evaluation boundaries

All inference used the owner's subscription **GPT-6 Luna with medium reasoning**, via the isolated Codex screening adapter. Only inert screening/research tools were exposed; research returned unavailable. Local mock preflights verified context isolation, tool schemas and native conversation history. No paid API or voice inference ran.

The isolated working directory was `/private/tmp/shield-v74-repair-q5mn1t1k`, created from the previous contact-evaluation snapshot. V74's request remained `c01d69d8a04c5a75d666438a1be6b55caf9d274fa29f2d17e07dc477bb42844d`. Compiled cloud dependencies from commit `4499a5b` were added only to satisfy MASC's static monitoring imports; no monitoring inference ran and the frozen live runtime was unchanged. The initial MASC startup failed before inference because those dependencies were absent. Its failure log is retained.

The 38-case focused development set reuses the owner's reported v74 failures and prior validation, explicitly retired into development by this repair request. Each paired development comparison repeats those same cases three times per prompt. It is not fresh evidence. Native-history development uses the same five staged callers five times per candidate; repetitions are not independent callers.

The first unused synthetic set has 50 callers and was authored after the v77 freeze, before v78's final wording. Its labels and text were fixed before inference. V78's aggregate fresh progress was visible before the return to v74 for v79; therefore this is not a wholly blinded development process. V79's wording came from the known development inconsistency rather than any inspected individual failure in that set. A separate 44-case set was authored after the v79 freeze and never used for another prompt revision. Neither author-designed set is an independent population sample.

Snapshots use cumulative caller text without prior assistant history. Native-history checks use prepared follow-ups only after an actual question and retain assistant/tool history. A snapshot's repeated question after a refusal is not evidence of a live question-budget violation. Full expected action sequences and missing question text are audited separately.

Both public benchmarks retain their fixed membership and scoring: MASC's 320 completed synthetic dialogues (80 ordinary, 160 harmful, 40 ads, 40 wrong numbers), and 724 distinct English FTC/NC State robocall openings. FTC is permitted by the owner's explicit public-data exception and has no ordinary negative set. Neither benchmark is an untouched holdout after the project's prior iterations. Completed stops, questions, approvals and failed trials are reported separately. Timeouts remain failures; resumed runs schedule only missing identities and verify the unchanged result prefix.

## Online pattern provenance

The new synthetic red team covers empty invitations, ordinary callbacks, completed refunds, account takeover, payment/courier demands, secrecy, recovery pitches and screening manipulation. The general patterns were cross-checked against:

- [FBI warning about impersonated IC3 recovery services, July 20, 2026](https://www.ic3.gov/PSA/2026/PSA260720).
- [FBI financial-institution impersonation and account takeover warning, November 25, 2025](https://www.ic3.gov/PSA/2025/PSA251125).
- [FTC phone-scam guidance](https://consumer.ftc.gov/articles/phone-scams) and [refund/recovery scam guidance](https://consumer.ftc.gov/articles/refund-and-recovery-scams).

A recent public anecdotal search result about refund and messaging scams was also found, but its page could not be opened; it is not treated as verified evidence. No report text, public phone number or real caller transcript was copied into the synthetic cases or prompt.

## Results

V79 has **6,913 instruction characters**, 154 more than v74 (**2.3%**), and remains 28.8% shorter than v30. Instructions plus serialized tools total 8,539 characters, up 151 (**1.8%**) from v74's 8,388. Its normal request hash is `f187b6467f78d998c71dff544c4ceaeab71b180015006c0cdcadecfa984ee728`; caution hash is `f4e4652f11f11af3a26edd0af19cf0a4109f4e092ebb8336ae1ef58ff8527128`.

### Known development comparisons

Each row is a separate matched comparison on 38 known cases, three repetitions per version. V74's varying results matter: one small pass is not a stable error-rate estimate.

| Candidate | V74 ordinary offered | Candidate ordinary offered | V74 harmful stopped | Candidate harmful stopped | Candidate ordinary blocks | Candidate harmful approvals |
|---|---:|---:|---:|---:|---:|---:|
| v75 | 48/57 | 20/57 | 42/42 | 42/42 | 29 | 0 |
| v76 | 44/57 | 39/57 | 41/42 | 42/42 | 14 | 0 |
| v77 | 48/57 | 54/57 | 42/42 | 37/42 | 0 | 1 |
| v78 | 47/57 | 54/57 | 42/42 | 38/42 | 0 | 3 |
| v79 | 44/57 | 51/57 | 42/42 | 41/42 | 5 | 1 |

The v74 side of the v78 comparison had one retained timeout on an unclear case. All other focused development runs had no provider failures. V79's ordinary blocks were two pickup trials and three volunteer-application trials; one resolved refund snapshot remained in clarification. Its harmful approval was an empty Spanish callback request. Those failures are not erased by better aggregate ordinary offers.

In native-history known development, v74, v75 and v76 each passed all 25 final outcomes, including 10/10 ordinary offers and 10/10 harmful stops. V79 also offered 10/10 ordinary and stopped 10/10 harmful trials, but one refusal trial produced a continue tool call without an actual question, so it passed 24/25. The previously held refund passed all five repetitions for **v74 as well as v79** in this round. This does not prove that the rare original hold is eliminated or that the identity-description change caused an improvement.

### Unused red-team sets

V78's 50-case set, repeated three times per version, offered 69/69 ordinary trials versus v74's 65/69. It stopped 62/66 harmful trials versus 66/66, approving four empty invitations. Empty snapshots were blocked 20/24 versus 24/24. V78 is rejected despite its perfect ordinary score. Native final outcomes on the same six staged callers passed 30/30 for v78 and 29/30 for v74; the v74 miss was a missing question, not a harmful approval.

The separate **44-case post-v79-freeze red team** completed 264 paired trials, with no provider failures:

| Final fresh result | v74 | v79 |
|---|---:|---:|
| Ordinary offered, including staged cases | 49/57 | 56/57 |
| Ordinary blocked | 0 | 0 |
| Empty-contact snapshots blocked immediately | 21/24 | 21/24 |
| Empty-contact snapshots approved | 2 | 3 |
| Harmful stopped, including staged cases | 55/60 | 57/60 |
| Harmful approved | 2 | 3 |
| Incomplete opening snapshots correctly questioned | 12/12 | 12/12 |
| Final unresolved questions, all non-context trials | 26/132 | 16/132 |
| Native ordinary offered | 15/15 | 15/15 |
| Native harmful stopped | 10/10 | 10/10 |
| Native full expected sequences | 29/30 | 29/30 |

Both prompts failed the same named-but-unexplained callback: v74 approved it twice and questioned it once; v79 approved it all three times. This is still an empty-contact failure under the owner's chosen policy. V79 blocked the other seven empty snapshot cases in all repetitions, including the direct WhatsApp-add request, and blocked all five native empty-contact follow-ups. Its one ordinary fresh miss was an unresolved question on the cumulative refund snapshot. No wording was changed in response to this final validation.

The native total final-outcome score was 30/30 for each, but that masks one premature approval per prompt of an office caller before its purpose was supplied. Full-sequence scoring correctly reports 29/30. Neither had a missing question or question-budget overrun in this final native set. Snapshot full sequences passed 12/18 for v74 and 13/18 for v79; this mode lacks prior assistant history and must not be substituted for the native results.

### Broad regression and public benchmarks

The existing 245-case regression completed once for both v78 and v79. Each offered 98/101 ordinary calls, stopped 112/117 harmful calls, approved one harmful caller, left four harmful callers in questions and passed 9/9 caution controls, with no provider failures. The harmful approval was the retained claimed-lawyer/relative-trouble case. Two ordinary misses in each run retain historical labels that conflict with the owner's newer immediate-alarm rule; their labels and denominators were not changed. V79's other ordinary block was a personal-list caller. This broad run is known regression evidence, not fresh validation.

| Public benchmark, one pass per prompt | v74 | v78 | v79 |
|---|---:|---:|---:|
| MASC ordinary offered | 79/80 | 79/80 | 79/80 |
| MASC harmful stopped | 158/160 | 158/160 | 157/160 |
| MASC harmful questioned | 2 | 2 | 3 |
| MASC harmful approved | 0 | 0 | 0 |
| MASC ads blocked | 40/40 | 39/40 | 40/40 |
| MASC evaluation failures | 0 | 0 | 0 |
| FTC completed stops | 704/724 | 705/724 | 711/724 |
| FTC questions | 19 | 18 | 12 |
| FTC approvals | 0 | 0 | 1 |
| FTC retained timeouts | 1 | 1 | 0 |
| FTC source-call-weighted stops | 1,336/1,378 | 1,336/1,378 | 1,354/1,378 |

Every public run completed all 320 MASC and 724 FTC identities and passed the final request/source/result audit. MASC identification including questions is 160/160 for all three, but completed stops are lower. Total MASC questions across all categories are 10, 7 and 3 respectively. V74 and v78 blocked ordinary MASC case 33; v79 blocked case 34. V78 questioned one insurance ad. All three blocked the original charge-alarm recording 1314.

V79 approved FTC recording 858, also an observed failure in an earlier v30 run. Its seven additional completed stops versus v74 therefore do not establish an unqualified improvement. V74's timeout remains in the preserved 450-row prefix; v78's timeout remains in its 29-row prefix. Resumption evaluated only missing identities. No completed failure was retried, removed or given success credit. Public benchmarks were run in separate concurrent jobs, not alternating per-case order; the paired synthetic comparisons alternate version order per repetition.

### Leakage and interpretation

The inspected target input contains frozen instructions/tools and caller text, plus assistant/tool history only in native mode. Labels, expected actions, case IDs and scoring categories remain outside inference input. A normalized 12-word overlap scan found no benchmark passage in either v74's or v79's instructions plus tools. This cannot rule out conceptual overfitting or model pretraining exposure. Public benchmark membership, labels and outcome prefixes are independently audited against retained historical metadata.

V79 improves observed ordinary offers and some unnecessary questioning, but **does not meet the complete requested condition**: it retains ordinary false blocks in development and approves an empty contact request in final validation. Do not describe it as a reliable empty-contact fix, promote it solely on the benchmark score, or claim the refund hold has been conclusively eliminated. V75–v78 are rejected alternatives, and v79 remains an experimental candidate. No application policy was replaced.

## Repository verification

`npm run check` passed: typecheck, 175 unit tests and build. `npm run test:firebase` passed all 141 emulator tests. These checks cover the shared checkout at the time of the run, including independently committed application work. Prompt/fixture syntax and `git diff --check` also passed. These are software checks, not voice or real-call evidence.


## Saved evidence

All five development comparisons, both unused red teams, their native-history checks, both broad regressions and all three pairs of public benchmarks have complete source/request/result audits. This is 5,546 scored trials, including repeated and overlapping callers, plus 16 unscored diagnostic decisions—not 5,562 independent cases. The main 24-case benchmark was not enlarged.

Principal ignored artifact roots are `artifacts/v74-v75-development/` through `artifacts/v74-v79-development/`, `artifacts/v74-v78-validation/`, `artifacts/v74-v79-validation/`, `artifacts/v78-regression/`, `artifacts/v79-regression/`, `artifacts/v74-public-control/`, `artifacts/v78-public/` and `artifacts/v79-public/`. Each contains its audit summaries. The public runner and dependency freezes and literal-overlap audit are preserved with the complete isolated snapshot under `artifacts/screening-hardening/v74-repair-evaluation-snapshot/`. Local execution logs, including startup failures and successful repository checks, are retained under `artifacts/screening-hardening/v74-repair-logs/`.

The final report and experimental modules are the task's deliverables. Shared application and design changes belong to other work and are excluded from this commit. Voice readiness was explicitly set aside by the owner; no voice or real-call claim is made.
