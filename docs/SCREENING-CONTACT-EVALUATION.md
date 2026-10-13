# Empty-contact screening evaluation — October 12, 2026

## Scope and method

The owner requested a lean v57 revision that ends unexplained requests to make separate contact, preserves ordinary callbacks and useful clarification, and generalizes to recently reported scams. All model evaluations in this report use subscription **GPT-6 Luna, medium reasoning**. No paid API, voice test, deployment, real call or forwarding change was performed by this task. These experimental prompts are separate from the concurrently changing application policy.

An ordinary relationship or task supplies context; knowing a name alone does not. The requested policy deliberately blocks context-free contact invitations even though such wording does not prove criminal intent. Ordinary service callbacks and claimed personal relationships are still eligible for an offer. Existing explicit harmful requests, immediate unexplained-charge alarms, sensitive-claim clarification and trusted recent-scam caution remain relevant.

The test transport is the audited Codex subscription adapter. It sends frozen instructions, tools and synthetic caller text; case names, categories, expected outcomes and scoring labels stay outside model input. Native-history checks additionally include prior assistant/tool history. It differs from the Go/production transport in tool-schema normalization, non-strict tools, output limits and tool-result packaging, so comparisons here are within that transport. Research lookup returns unavailable. No inference failures were rerun based on their outcomes.

The main benchmark was not expanded. The extra fixtures are development or separately identified validation sets. Repetitions are repeated samples, not independent callers. These cases are author-designed, not blinded or independently authored. MASC and FTC were not rerun for this request, and no public benchmark rows were imported into these new fixtures.

## Public reports and general mechanisms

The research included recent firsthand reports and official guidance. Community posts establish examples people report, not verified fraud rates or the prevalence of any tactic:

- [September 2026 UK calls and voicemail discussion](https://www.reddit.com/r/AskUK/comments/1waitqm/has_anyone_else_been_getting_calls_and_voicemails/): unexplained messaging-app contact and recruitment invitations.
- [August 2026 group impersonation report](https://www.reddit.com/r/Scams/comments/1vj45s2/us_they_got_me_whatsapp_scam/): an apparent familiar group relationship followed by a request for an account activation code.
- [July 2026 unsolicited-loan call reports](https://www.reddit.com/r/Scams/comments/1v2k0kq/us_months_of_personal_loan_scam_calls/): unsolicited eligibility and callback pitches.
- [FBI, September 17, 2026](https://www.ic3.gov/PSA/2026/PSA260917): official impersonation, threats, coercion and payment demands.
- [FTC, January 2026](https://consumer.ftc.gov/consumer-alerts/2026/01/how-handle-unexpected-calls-claim-your-money-risk): unexpected financial alarms and independent verification.
- [Carrier call-forwarding guidance](https://www.jio.com/help/helpful-tips/mobile/beware-of-call-forwarding-scams/): redirecting incoming calls to another party. This does **not** imply that ordinary call forwarding redirects SMS.
- [Isle of Man Cyber Security Centre, January–February 2026](https://csc.gov.im/media/nilefjwi/threat-update-jan-feb-2026.pdf): bank impersonation, approval prompts, codes and money movement.
- [Ofcom, updated August 24, 2026](https://www.ofcom.org.uk/phones-and-broadband/scam-calls-and-messages/what-to-do-about-a-scam-call-text-or-message): unsolicited contact and checking through independently obtained channels.

The resulting synthetic tests cover contact without context, authentication and account control, concealed or deferred harmful requests, coercion, payment, financial alarms and instruction manipulation. Ordinary controls include personal callbacks, requested recruitment, repairs, private healthcare follow-ups, delivery messages, completed refunds and independent security advice. The prompt revisions use general categories, without brands, particular scam scripts or copied report passages. No real caller names, numbers, recordings or transcripts were fed into these new evaluations.

## Development history

V59–v74 are preserved as separate experimental modules. V59 exposed a tool-protocol problem: a `block` with reason `unclear` can be rejected. Subsequent contact wording explicitly names reason `scam`. More aggressive ordered rules often stopped more harmful cases while losing ordinary callers. They are not accepted merely for improving scam counts.

The combined development set contains 59 scenarios, repeated three times: 72 ordinary, 90 harmful and 15 unclear trials. V59 ran the constituent sets separately. Native-history checks supplement the seven staged development callers.

| Candidate | Ordinary offered | Harmful stopped | Ordinary blocks | Notes |
|---|---:|---:|---:|---|
| v57 control | 67/72 | 54/90 | 0 | 35 harmful questions and one no-decision result |
| v59, combined constituent runs | 67/72 | 73/90 | 1 | Three harmful no-decision results |
| v60 | 65/72 | 85/90 | 1 | Native development 21/21 final-outcome passes |
| v61 | 68/72 | 89/90 | 1 | Native development 21/21 passes |
| v62 | 70/72 | 87/90 | 1 | Native check prematurely blocked all three refusal openers |
| v63 | 67/72 | 89/90 | 4 | Rejected ordinary/sensitive-claim regressions |
| v64 | 64/72 | 90/90 | 8 | Rejected despite perfect harmful stops |
| v65 | 55/72 | 90/90 | 16 | Rejected |
| v66 | 60/72 | 90/90 | 11 | Rejected |
| v67 | 54/72 | 89/90 | 14 | One retained ordinary timeout |
| v68 | 64/72 | 89/90 | 4 | Rejected ordinary regressions |
| v69 | 66/72 | 87/90 | 3 | Rejected ordinary regressions |
| v70 | 56/72 | 87/90 | 12 | Rejected |
| v71 | 66/72 | 84/90 | 2 | Also blocked two unclear refusal trials; rejected |

The 245-case known v57/v63 regression also rejected v63: ordinary offers were 98/101 versus 96/101, harmful stops 112/117 for both, and harmful approvals zero versus three. V57 had one retained ordinary timeout. That experiment is not the final candidate comparison.

## V70 validation: rejected

V70 was frozen before authoring 56 new cases. The paired run contains 336 trials, three repetitions per version. It has no provider failures.

| Fresh paired result | v57 | v70 |
|---|---:|---:|
| Ordinary offered, including staged callers | 55/57 | 51/57 |
| Ordinary blocked | 0 | 6 |
| Empty-contact snapshots blocked | 3/36 | 35/36 |
| Incomplete openers questioned | 12/12 | 12/12 |
| Harmful stopped | 44/84 | 80/84 |
| Harmful approved | 0 | 0 |
| Recent-scam caution controls passed | 12/12 | 12/12 |

Supplementary native-history tests of the same eight staged callers offered 9/9 ordinary trials and stopped 12/12 harmful trials for each prompt. V70 blocked two of three empty-contact follow-ups and held one; v57 held all three. Strict final-outcome passes were 23/24 versus 21/24. Useful first clarification is scored separately in `contact-sequence-audit.json`; final-action correctness alone does not prove it happened.

V70 is 6,684 instruction characters versus v57's 6,121. Its extra wording does not justify the ordinary-call losses. No changes were made to v70 after these results.

## Audit and isolation

Another task changed shared screening source while several development runs were executing. The runners correctly rejected the final full-source invariant for v57 development, v68–v70 development and the v57/v63 regression. Their complete raw rows are retained; absent summaries were not fabricated and failures were not dropped. A narrower retained-results audit verifies all planned identities, frozen request hashes, labels, scoring and matching execution files in an inspected snapshot. It does not retroactively claim that the shared source remained unchanged.

Final comparisons run from `/private/tmp/shield-contact-eval-l3h5d6hz`, an isolated evaluation snapshot with the old four-action decision runtime, preserving the exact frozen prompt requests. The v70 prompt freeze predates its new fixture; the later isolated execution freeze changes only source provenance, not request hashes. The final runs have ordinary source/request/result audits. The ongoing app work adds a different `message` action and is outside this experiment; these results do not validate that changed runtime.

Ignored local artifacts retain all requests, manifests, raw results and audits. Principal roots are `artifacts/vNN-contact-development/`, `artifacts/v59-account-development/`, `artifacts/v57-v63-regression/`, and `artifacts/v57-v70-final/`. Research provenance and the retained-development audit are under `artifacts/screening-hardening/`. Raw model outputs, request bundles and collected source material remain ignored. The committed fixtures contain only newly authored synthetic caller text.

## V61 validation and further development

V61 was selected from the known development results for a separate validation after v70 was rejected. Its exact 6,637-character prompt predates both validation sets and was unchanged. A new 36-case set was authored after its evaluation freeze: 216 paired trials, three repetitions per version.

| Paired validation result | v57 | v61 |
|---|---:|---:|
| Ordinary callbacks offered, snapshots | 32/36 | 36/36 |
| Ordinary offered, including staged callers | 41/45 | 43/45 |
| Ordinary blocked | 0 | 0 |
| Empty-contact snapshots blocked | 0/24 | 17/24 |
| Empty-contact snapshots approved | 3/24 | 3/24 |
| Empty-contact snapshots questioned | 20/24 | 4/24 |
| Empty-contact snapshots held | 1/24 | 0/24 |
| All harmful completed stops | 22/48 | 41/48 |
| Incomplete openers correctly questioned | 12/12 | 12/12 |
| Provider failures | 0 | 0 |

Both prompts approved all three repetitions of a bare-name callback. V61 also questioned a generic department callback in three repetitions and an unexplained contact switch once. Ordinary callbacks were preserved, but this still fails the requested empty-contact boundary.

The same six staged callers ran with native history, three repetitions each. Both prompts offered 9/9 ordinary conversations and stopped 6/6 harmful conversations. V61 passed the complete expected sequence, including initial clarification, in **18/18**; v57 passed **15/18**, holding the three empty-contact follow-ups instead of blocking them. Neither had missing questions, question-budget overruns or provider failures. Snapshot sequence passes were 13/18 and 12/18; cumulative snapshots do not preserve the previous question history. Artifacts are `artifacts/v57-v61-validation/`.

After inspecting these failures, the v61 validation set was explicitly retired to development through `scripts/fixtures/redteam/contact-retired-validation.mjs`. It is **not** fresh or held-out evidence for v72 or any subsequent candidate. The frozen original labels, inputs and results remain unchanged. V71 separately integrates the contact boundary into the ordinary-purpose paragraph; v72 uses a two-branch context rule on v61's structure. Neither adds a specific scam script or test-case example.

V72 exposed a separate ambiguity in development: some incomplete requests to speak on the current call were treated as invitations to make separate contact. V73 adds one short distinction between speaking now and making contact after the call. Its normal request hash is `bd807ac3008b89103057eaf020b6296a36e1e901f1be1ba8355e34ac13bc7a9f`. At **6,656 characters**, it is 535 characters (8.7%) longer than v57 and 31.5% shorter than v30. A third fresh synthetic set was authored after the v73/v57 freeze; its outcomes do not supply wording changes.

The final matched **245-case known regression** (one repeat per version) offered 99/101 ordinary trials for v57 and 97/101 for v61. V57 blocked two ordinary-labeled cases; v61 blocked three and had one retained timeout. Both stopped 112/117 harmful trials, questioned four and approved one. All nine caution controls passed for each. These known regression cases are not independent validation, and the timeout remains in the denominator. The complete audited comparison is `artifacts/v57-v61-regression/`.

V72's expanded development run (the original set plus the explicitly retired v61 validation) offered 101/117 ordinary trials, blocked eight and questioned eight. It stopped 136/138 harmful trials, with two remaining questions and no harmful approval. It also blocked twelve unclear trials. This is a rejected result, not a successful near-perfect scam score.

## V73 results and definition correction

V73's 95-case expanded development set, repeated three times, offered 113/117 ordinary trials with no ordinary blocks, stopped 136/138 harmful trials and had no harmful approval or provider failure. Four ordinary trials and two harmful trials remained in clarification. Three unclear trials were blocked. This promising development result did not fully generalize.

On the separate 36-case fresh set, three repetitions per prompt (**216 trials**), v73 offered **39/42** ordinary trials versus **40/42** for v57. It blocked one ordinary trial and questioned two; v57 questioned two and blocked none. V73 blocked **21/24** empty-contact snapshots versus zero for v57; the remaining three were questions. V57 approved six and questioned eighteen. All **12/12 incomplete snapshot openers** received clarification for both. Total harmful stops were **48/51** versus **23/51**, with zero versus six harmful approvals. No provider failures occurred.

The same five staged callers also ran with native history, three times each. V57 offered **6/6** ordinary trials and v73 **4/6**: v73 prematurely blocked two ordinary introductions before their prepared explanations were reached. Both stopped all **6/6 harmful trials**; v73 blocked all three empty follow-ups while v57 held them. Complete expected sequences passed **13/15** for v73 and **12/15** for v57. Snapshot sequences passed 11/15 versus 9/15. These limitations prevent claiming that v73 preserves useful clarification merely from its better final scam score.

V73's separate **245-case known regression** offered **99/101** ordinary trials (one block, one hold), stopped **112/117** harmful trials (four questions, one approval) and had no provider failure. These totals match ordinary offers and harmful stops from the contemporaneous v57 control in the paired v57/v61 run, but this v73 run was separate, not an alternating paired comparison. The old frozen labels and policy conflicts remain in place.

V74 corrects v73's temporal definition: separate contact means asking the recipient to start another call or chat, add a contact or open a site, rather than requiring that it happen *after* the current call. Asking to speak on this incoming call remains eligible for clarification. This is a general actor/action distinction, not an exception for a named scam. The v73 set is explicitly retired into `contact-final-development.mjs` for subsequent development; it is not fresh evidence for v74. Original fixture files and labels remain unchanged.

V74 has **6,759 instruction characters**, 638 (10.4%) more than v57 and 30.4% fewer than v30. Its normal request hash is `c01d69d8a04c5a75d666438a1be6b55caf9d274fa29f2d17e07dc477bb42844d`. A new 33-case synthetic set was authored after the v74/v57 freeze. Its results do not feed back into prompt wording.

V74's expanded development set has 131 cases, repeated twice (**262 trials**). It offered **94/106 ordinary trials**, blocked six and questioned six. It stopped **123/126 harmful trials**, with two questions and one retained provider timeout. No harmful trial was approved. All 30 unclear trials remained in clarification; six of those were final persistent-refusal snapshots whose expected hold cannot rely on preserved assistant history in this mode. The ordinary blocks remain real failures against the requested policy, not an acceptable side effect of the higher harmful-stop score.

## Repository checks

`npm run check` passed typecheck, **170 unit tests** and build in the shared checkout. The first `npm run test:firebase` could not start because another task occupied the default emulator port. The same complete test command on separate local demo-project ports passed **136/137** tests; the voicemail-audio forwarding test failed with `recording_unavailable` during concurrent saved-message changes. A later targeted rerun of that entire forwarding suite passed **47/47** after the shared source/test edits. The original failure remains recorded: this is not a clean complete emulator pass.

Runner self-tests passed for stopping before future caller evidence, exposing follow-ups only after questions, preserving native history, enforcing question limits and retaining failures. All new experimental modules have distinct version IDs, parse successfully, remain below 7,500 instruction characters and contain no brand names, public benchmark references or test-case examples in the decision instructions. Existing application edits, including the new message action, are not part of this task's commit. No voice or real-call claim is made.

## Final v74 fresh comparison and assessment

The new 33-case set completed **198 paired trials**, three repetitions for each prompt, using subscription Luna medium. There were no provider failures.

| Final fresh result | v57 | v74 |
|---|---:|---:|
| Empty-contact snapshots blocked immediately | 0/24 | **24/24** |
| Empty-contact snapshots approved | 3/24 | **0/24** |
| Ordinary callback snapshots offered | 28/30 | **29/30** |
| Ordinary callback snapshots blocked | 0/30 | **1/30** |
| All ordinary offered, including notices and staged callers | **37/42** | **37/42** |
| All harmful stopped | 17/42 | **42/42** |
| All harmful approved | 3 | **0** |
| Incomplete snapshot openers correctly questioned | **12/12** | **12/12** |
| Final unanswered questions across all categories | 41/99 | **19/99** |

The one v74 ordinary block was a delivery caller asking for an ordinary chat message about where to leave an existing order. One receipt notice remained in clarification. Three ordinary staged credit cases stayed in clarification in the cumulative-snapshot mode. V57's ordinary misses were two callback questions plus two questions and one hold on the staged credit. Equal aggregate offers do **not** mean the same ordinary callers got through.

Supplementary native-history evaluation used the **same five staged callers**, repeated three times, not fifteen new independent callers. V74 offered **5/6 ordinary conversations** and held one resolved ordinary credit notice; v57 offered **6/6**. Both stopped **6/6 harmful conversations**. V74 blocked all three empty-contact follow-ups; v57 held them. Complete expected sequences passed **14/15** for v74 and **12/15** for v57. Both asked the expected first question on all fifteen trials, had no missing question text and stayed within the question budget. In the snapshot mode, expected full sequences passed 9/15 and 6/15 respectively, with repeated-refusal cases remaining questions. These modes must not be conflated.

V74's final separate **245-case known regression** offered **99/101 ordinary trials** (one block, one question), stopped **112/117 harmful trials** (one approval, four questions) and passed **9/9 caution controls**, with no provider failures. This matches the aggregate ordinary offers and harmful stops of the contemporaneous v57 control in the v57/v61 comparison, but is a separate run. The shared harmful approval concerned a claimed lawyer describing a relative's trouble; it remains a failure, not proof that this sensitive-claim boundary is safe. Known old alert-policy conflicts remain scored under their original labels.

**Assessment:** v74 is the strongest tested empty-contact candidate in this round, and its new context rule has no app or scam-script exceptions. Nevertheless, the requested combined condition is **not fully met**. Fresh ordinary offers did not fall in aggregate, but a legitimate delivery callback was blocked, one clarified ordinary conversation was held, and the expanded development set contains six ordinary blocks. Do not present v74 as a proven fix that preserves every ordinary caller, or promote it solely because the final harmful-stop score is perfect. Keep the experiment frozen and preserve v57 alongside it; this task does not replace the application policy or claim deployment readiness.

The complete final artifacts are `artifacts/v57-v74-validation/` (paired, native and expected-sequence audits) and `artifacts/v74-regression/`. Earlier failed candidates and validation sets are retained. The isolated source/runtime snapshot is preserved under `artifacts/screening-hardening/contact-evaluation-snapshot/`; its local results can be re-audited without using concurrently modified application code. No final v74 validation case influenced another prompt revision. Repeated, author-designed synthetic evidence is not a real-world error-rate estimate or a guarantee of zero failures.
