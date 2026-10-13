# Ordered screening and empty-contact message audit

October 12, 2026. **V94 is rejected as a replacement for the current screening prompt.** It improves empty-contact stopping but loses ordinary offers. The separate post-call v6 experiment passes its fresh text validation and remains an offline candidate. Application screening remains v31, message assessment remains voicemail-v4, and the deployed screening policy remains v30. Nothing was deployed or tested on real calls.

## Scope and policy distinction

This continuation starts from commit `144c5dc`, following the [current-policy hardening report](SCREENING-CURRENT-HARDENING.md). It tests the current five-action runtime, including `message`, through **subscription GPT-6 Luna, medium reasoning**. The main 24-case benchmark was not enlarged. Public FTC/NC State transcripts use the owner's existing explicit exception; other new callers are synthetic. No private recording, paid model request, voice test, forwarding change or phone call occurred.

The repository's v31 saves potentially useful automated financial/security alerts as unverified messages without ringing. The earlier owner requirement stopped unexpected-charge alarms immediately. Those are materially different policies: a saved alarm is neither an offer nor a completed scam stop. Clarification was requested before choosing a final policy; this round preserves both the original results and the current notice-policy scoring. It does not silently count saved alerts as successful blocks.

## Source audit and development

V92 reorganized the general rules into explicit precedence: manipulation/harm, identity and purpose, separate-contact context, solicitation, notices, sensitive live claims and useful clarification. It retains the source policy's payment safeguards and separates an ordinary private conversation from concealment that isolates the recipient. The rule sources are the existing policy, the owner's empty-contact requirement and official guidance, not a new benchmark-specific example list.

The [FBI's September 17 warning](https://www.ic3.gov/PSA/2026/PSA260917) describes official impersonation, isolation and unusual payment demands; the [September 1 permission-phishing warning](https://www.ic3.gov/PSA/2026/PSA260901) covers account permissions without a password. A fresh check of the FBI and FTC announcement indexes found the same recent warnings already represented in the development coverage. No verbatim report was used as a synthetic caller. This is coverage of observed categories, not proof against all recent scams.

The unchanged 58-case development set ran twice per candidate. It includes 22 ordinary live callers, six ordinary notices, 18 harmful/unwanted callers and 12 incomplete or staged clarification cases per repetition.

| Development result | v92 | v93 | v94 |
|---|---:|---:|---:|
| Ordinary live offered | 36/44 | 41/44 | 43/44 |
| Ordinary notices saved | 12/12 | 12/12 | 12/12 |
| Harmful/unwanted stopped | 36/36 | 36/36 | 35/36 |
| Required action sequences passed | 108/116 | 112/116 | 114/116 |
| Provider failures | 0 | 0 | 0 |

Five unscored, altered-tool v92 diagnostics suggested that the model treated an ordinary care date of birth as a prohibited identifier and demanded another action from professionals answering concrete service questions. Those diagnostics changed the output contract and cannot reproduce the exact reasoning behind the original failures. The original failures were retained. V93 makes the demographic exception explicit and accepts a supplied service context without demanding private details or an additional action. V94 checks the relationship/service context before classifying separate contact and warns against inventing hidden demands.

V94 still blocked one ordinary repair callback and questioned one empty invitation in development. No label was changed to excuse either result. Its instructions contain **6,765 characters**, versus v31's 10,410 (**35.0% shorter**); instructions plus tools are 8,810 versus 12,069 (**27.0% shorter**). Smaller size did not establish equivalent performance.

## Fresh screening and question quality

The 44-case `ordered-policy-validation.mjs` was authored after the initial v92 freeze and was not evaluated during development. V94 was frozen before its inference. Each version ran three repetitions: 120 normal-context trials and 12 caution-context controls. No v94 revision followed these outcomes.

| Fresh normal-context result | v31 | v94 |
|---|---:|---:|
| Ordinary live offered | 48/51 | 47/51 |
| Ordinary notices saved | 12/12 | 12/12 |
| Empty-contact trials blocked, including staged callers | 0/27 | 23/27 |
| Harmful/unwanted completed stops | 25/54 | 50/54 |
| Harmful/unwanted approvals | 7 | 0 |
| Harmful/unwanted saved notices | 6 | 0 |
| Harmful/unwanted questions | 16 | 4 |
| Required sequences passed | 87/120 | 112/120 |
| Caution controls passed, separate | 9/12 | 12/12 |

Both prompts unnecessarily questioned the same ordinary service/promotion caller three times. V31 asked for identity despite a supplied business role; v94 asked for scheduling details. V94 additionally held a third-party family situation before useful clarification once. Four v94 empty-contact trials remained in questions. Those are failures against the frozen expectations, not useful completed stops. Neither version exceeded the question-turn budget or had a provider failure.

The new synthetic-only question observer retains actual returned questions without sending case labels or rubrics to the target. Manual review found relevant missing-purpose/action questions, but also unnecessary details, third-person references to the caller, and repeated text. V31 returned a question in 24/24 staged trials; v94 did so in 23/24. One v94 output included an unexpected language fragment followed by an English restatement. The subscription adapter joins native assistant messages and did not retain phase/item boundaries, so these strings cannot establish how many questions GPT Live would speak. Prepared replies can also volunteer information the question did not specifically request. No observed question requested a secret or promised a connection. The manual review is author-reviewed, not independently blinded; action-sequence passes are not a conversational-quality guarantee.

## Public benchmark regression

The frozen v94 runs use the same pinned datasets and scorer as the prior v31 control. The control is reused rather than rerun for a more favorable result. Subscription context preflights passed. The current shell uses Node 24.3.0; the prior public control recorded Node 22.17.1. Codex remains `0.162.0-alpha.17.2`, with identical model, effort and request boundaries.

| MASC result | v31 fixed control | v94 |
|---|---:|---:|
| Ordinary offered | 71/80 | 59/80 |
| Ordinary saved | 2 | 17 |
| Ordinary blocked | 7 | 4 |
| Harmful stopped | 153/160 | 155/160 |
| Harmful questioned | 6 | 5 |
| Harmful approved | 1 | 0 |
| Advertisements blocked | 40/40 | 40/40 |

There were no MASC provider failures. The 17 saved ordinary conversations cannot be credited as offers. MASC's completed-dialogue adapter concatenates caller turns and loses interactivity context; the earlier report documents this limitation. It does not justify replacing the original scores or claiming that ordinary callers were preserved. The public corpora are repeatedly used regression data, not unseen validation.

| FTC result | v31 fixed control | v94 |
|---|---:|---:|
| Completed stops | 168/724 | 238/724 |
| Unverified notices saved | 543 | 477 |
| Questions | 12 | 8 |
| Approvals | 1 | 1 |
| Source-call-weighted stops | 293/1,378 | 406/1,378 |
| Source-call-weighted saved notices | 1,060 | 960 |

Both FTC passes have no provider failures. V94 again approved recording 191, a family-style opener previously retained as a v31 failure; it is not a new success. It saved recordings 89 and 1314 and questioned 858. Recording 1314 is the original charge alarm: saving it follows v31's current notice policy and does **not** satisfy the earlier immediate-block requirement. V94's eight questions and 477 saved messages receive no completed-stop credit. No prompt edit followed either public run.

## Separate post-call empty-contact policy

An early hangup can reach post-call assessment without a screening terminal decision. Voicemail-v4 has no explicit empty-contact rule, so screening improvements alone do not close that route. Offline message-v5 adds a general junk category for contact invitations without a stated personal relationship or ordinary service/task context, while retaining ordinary callbacks, useful notices and uncertainty. Only instructions change; model, medium reasoning, user-input construction, structured schema, evidence checking, summary rules and failure-to-keep behavior remain intact.

On the first fresh 24-case set, v4 removed **0/8** empty contacts; v5 removed **8/8**. Both kept all **12/12** useful or uncertain messages and removed **4/4** explicit harmful requests. Both also ran the unchanged 22-case legacy voicemail benchmark. V4 and v5 kept all twelve legacy keep cases, including the unnamed bare callback. That legacy label conflicts with the owner's newer stated-context rule; passing it is not evidence that empty-contact filtering works.

Message-v6 clarifies that implied familiarity is not a stated relationship and empty contact is not useful uncertainty. It adds **232 instruction characters** to voicemail-v4: 2,968 versus 2,736. On the unchanged legacy development set it removed that unnamed callback and kept the other eleven legacy ordinary cases. Its resulting **11/12** legacy keep score is retained, alongside a separate explanation of the policy conflict. V4/v5/v6 removed 9/10, 8/10 and 7/10 legacy unwanted messages respectively in these passes. The retained misses are account/official alarms in tension with the conservative notice policy; the results do not prove they are mislabeled or harmless, and were not replaced by earlier favorable trials.

After the v6 freeze, a second fresh 28-case set tested implied familiarity, normal personal/service callbacks, notices, incomplete useful information and explicit harm:

| Second fresh post-call result | voicemail-v4 | message-v6 |
|---|---:|---:|
| Empty contacts removed | 1/8 | 8/8 |
| Ordinary callbacks kept | 10/10 | 10/10 |
| Other useful/uncertain messages kept | 4/4 | 4/4 |
| Explicit harm/pitches removed | 6/6 | 6/6 |

All post-call runs completed without provider failures. Every removal had a clear verdict and supported continuous quote under the existing backend validator. Summary presence was checked, not semantic summary quality. The new post-call set was not used to revise v6. These finite text results support further evaluation of the empty-contact change, not a claim of complete pipeline reliability or verified recording/transcription behavior.

## Reproducibility and remaining work

Evidence is retained under `artifacts/screening-hardening/order-audit-evaluation-snapshot/`, including frozen requests, source hashes, all rows, per-run audits, question review and local logs. The snapshot originates from committed `144c5dc` and task-only overlays, excluding unrelated iOS work. This round contains **1,656 screening trials**, **170 post-call assessments** and **five unscored diagnostics**. Repetitions and overlapping controls are not independent callers. No completed model result was retried or removed. One FTC launch omitted the runner's required approval flag and stopped before inference; its log is preserved separately, then the existing owner exception was supplied correctly.

Audits verify source/request hashes, planned identities, unchanged labels and expectations, full action sequences, source-call weights and recomputed scores. A scan of seven requests found no exact 12-word public benchmark passages or complete short recordings in the prompt/tool/schema text. This does not establish no conceptual overfitting or model pretraining exposure. Evaluator labels, case names and question rubrics remain outside target input, and local mock checks verify the subscription isolation boundary.

Repository validation passed `npm run check` (**182 unit tests**, typecheck and build) and `npm run test:firebase` (**154 emulator tests**) in the isolated source snapshot. The new question observer passed its local sequence/input-preservation test. The post-call request guard rejects changed model, schema or user input before inference. No backend behavior was changed in this round; the added scripts and candidates are offline evaluation work.

The screening replacement remains unresolved. V94's ordinary-call regressions are sufficient to reject it regardless of its harmful-call improvements. The immediate-block versus saved-alarm policy needs a consistent decision before selecting a final prompt. The earlier v88/v91 held-out failures and all prior evidence remain valid; this round does not erase them or establish 100% real-world confidence.

The subsequent [context and question-output audit](SCREENING-CONTEXT-AUDIT.md) preserves message item boundaries, checks MASC's caller-only presentation and records a small matched synthetic diagnostic. It does not replace the outcomes above.

The later [post-call v7 report](SCREENING-MESSAGE-CONTACT-RELEASE.md) records fresh validation and the subsequent undeployed repository adoption of that contact-filter policy, with public disagreements retained.
