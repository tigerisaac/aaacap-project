# Transaction context, contact destination and stale decisions

October 13, 2026. External inference uses subscription GPT-6 Luna with medium reasoning. V132, v133 and v135 are offline prompt experiments. Repository runtime v134 adds a transcript-freshness guard while retaining v99's initial instructions; post-call filtering remains v10. The separate deployed release remains screening v31 / voicemail v4. This task does not deploy, run paid voice checks, place calls or change forwarding.

## Runtime defect and fix

A delayed scam verdict previously bypassed the transcript-change check. If a caller added words identifying an apparent demand as a quotation or report while the backend was deciding, the old verdict could still hang up. The six-second patience rule could also force a stale robocall or solicitation verdict. Finally, a response arriving late could replace a pending decision that had assessed more caller words.

Seven new local session tests cover those boundaries, known snapshot requirements and the overall deadline. The first five regressions fail against the prior code. V134 requires reassessment of every stale verdict, including scam blocks. A pending decision based on more caller speech survives an older response. Six seconds of continuous speech triggers reassessment of a pending block rather than permission to apply stale evidence. A current scam verdict still stops immediately. Three existing tests now supply the response/delegation start event needed to establish a fresh snapshot; their intended behavior remains covered. The old forced-stale-robocall expectation is explicitly replaced.

This has a real tradeoff: continuous recordings can require an additional model decision or reach the existing failure fallback. There is no claim that every robocall ends within six seconds. The 75-second total deadline, 20-second backend deadline, 12-tool budget, two accepted questions, fixed recipient, press-1 connection and failure-never-connect behavior remain. The fix does not anticipate words the caller has not yet spoken, guarantee semantic correctness, or establish live audio behavior.

Both ordinary and recent-scam-caution initial session configurations match v99 exactly. The ordinary decision request hash is `0aee52064eb005c04fe8e22297bb2a6747b9ab217dff234f3620af2b99887e26`; the caution request hash is `428f3043531aff39cb78dd46564de8e1382a227671dee9b73d630ab357625fd8`. V134 versions the runtime guard, not a newly adopted classification prompt. In particular, the live runtime still needs the owner-directed charge/empty-contact prompt replacement.

## General prompt changes

V132 separates transaction context from prohibited requests. The earlier schema described prohibited conduct as a request, yet an unexplained charge must stop even when no action is requested. A separate transaction field records unexplained alerts, expected ordinary updates or neither; deterministic priority stops unexplained alerts before notice saving or approval. Expected receipts, completed refunds, agreed-service billing and personal reports keep their ordinary treatment.

V133 adds explicit actor/stance attribution to the restricted-conduct description. An actual request, offer or endorsement differs from reporting or rejecting another person's conduct. It uses v132's mapping. V135 instead builds on v132: it distinguishes a vague refund/money-owed topic from unsolicited winnings or recovery opportunities, and replaces the separate-contact boolean with a contact destination (elsewhere, this call, none). The destination maps to the same existing priority rules. Its added wording is almost offset by removing duplicate explanations.

These changes use known development evidence. No public or validation outcome supplies new wording. The observation mapper is an offline tool; it is not integrated into the live session in this round.

| Request | Instructions + serialized tools | Reduction from v99/v134 |
|---|---:|---:|
| Runtime v99/v134 | 12,069 characters | — |
| v131 comparison | 9,181 | 23.9% |
| v132 | 9,701 | 19.6% |
| v133 | 9,918 | 17.8% |
| v135 | 9,853 | 18.4% |

These are character counts, not measured token or cost savings. No additional model review call is introduced by the prompt variants.

## Development

The first comparison uses the same 156 independently authored development scenarios twice: the prior 132 plus 24 actor/transaction contrasts. The original main benchmark remains 24 cases. Charge-policy expectation overlays remain separate; source fixtures and categories are unchanged.

| Development, two passes | v131 | v132 | v133 |
|---|---:|---:|---:|
| Original strict outcomes/sequences | 304/312 | 306/312 | 305/312 |
| Intended ordinary live offers | 111/112 | 111/112 | 111/112 |
| Intended ordinary notice saves | 22/22 | 22/22 | 22/22 |
| Ordinary false blocks | 0 | 0 | 0 |
| Intended block outcomes | 131/136 | 135/136 | 133/136 |
| Trusted caution checks | 20/20 | 20/20 | 20/20 |
| Retained timeouts | 0 | 1 | 0 |

The ordinary denominators exclude charge alarms even when their historical source category is legitimate. The prior SSA recording still expects a saved notice: v131/v132 block both repetitions and v133 blocks one. Those original score mismatches remain; they are not ordinary false blocks. V132's timeout on a bare-identity opener is retained.

V132's substantive misses are an empty meeting invitation questioned, a vague refund topic blocked as financial bait, and an ordinary service caller asked for identity despite an adequate business type. The latter happens under all three versions once. These are model interpretation failures; the mapping follows the recorded facts. V133 additionally misses an endorsed remote-intervention request and an empty profile request. Its longer attribution explanation is not an overall improvement in development.

V135 adds 16 new independent contact/refund development contrasts to that same suite. V132 runs those 16 twice as a control; it scores 31/32, preserving all 14 ordinary offers and 10 intended blocks, but blocking one vague refund topic that should receive clarification. All labels remain fixed.

V135's full 172-case development suite, twice, scores **336/344**. It preserves 124/126 intended ordinary offers and 22/22 notices, reaches 144/146 intended block outcomes, and passes 19/20 caution checks. One timeout is retained. All previously missed empty-contact development requests now block, and the vague refund block disappears. Nevertheless, two ordinary callers are falsely blocked: a warning against another caller's computer instructions is misclassified as technical rescue, and a payment decline for a stated existing booking is misclassified as an unexplained transaction. Two repetitions of a bare unexplained-charge alarm are asked about and then held, with transaction incorrectly marked none. A medical follow-up is held under trusted caution because it is incorrectly treated as a reference to an earlier call. These failures prevent promotion even though the fresh sets pass. The two older SSA expectation mismatches remain in the strict count.

## Fresh checks and question quality

The 36-case actor/transaction validation is authored after v132/v133 freeze and before outcomes are inspected. V131 scores 71/72; v132 and v133 each score 72/72. V131 approves one charge alarm. Both new variants preserve 26 ordinary live offers and eight notice saves, stop all 28 harmful trials, and pass all four caution trials; useful clarification and staged resolution account for the rest.

A manual review retains a question-quality limitation in v133: one question asks the purpose of an alleged settings change instead of clearly asking what the caller wants the recipient to do. Another combines two missing details. No reviewed question asks for a secret or repeats an already supplied identity. V135’s 12 later boundary questions ask for missing purpose, refund context or intended action; one uses awkward third-person wording for the caller, but none asks for sensitive proof. Passing prepared-answer sequences alone does not establish conversational quality.

After v135 freezes, a separate 24-case contact/refund validation and 12 current-guidance scenarios are authored with expectations fixed before inference. The latter contrast account permission grants, backup-key requests, contact migration and insurance pitches with ordinary event, family, requested assistance and existing-plan notices. They are synthetic adaptations of mechanisms, not copied call scripts. V135 passes all 72 trials across these two sets: 26 ordinary live offers, six ordinary notice saves, 28 harmful blocks, two promotional blocks, four trusted-caution outcomes and six clarification/hold outcomes. V132 scores 70/72: both repetitions of a staged ordinary refund callback are blocked at the first vague opener, before useful clarification. The two permission-migration runs each pass 24/24. There are no timeouts in these fresh comparisons.

The fresh source review checks the current [FTC alerts index](https://consumer.ftc.gov/consumer-alerts) and [FBI/IC3 index](https://www.ic3.gov/PSA). Category sources include [September 1 consent phishing](https://www.ic3.gov/PSA/2026/PSA260901), [June 26 messaging-account recovery-key theft](https://www.ic3.gov/PSA/2026/PSA260626), and [September 28 enrollment guidance](https://consumer.ftc.gov/consumer-alerts/2026/09/what-know-ahead-open-enrollment-avoid-health-insurance-scams). None establishes the frequency of these calls among Shield users.

## Public regressions

Each selected candidate runs each full pinned set once. Historical v131 results come from the prior round; they are not an interleaved control.

| MASC | Historical v131 | v132 | v135 |
|---|---:|---:|---:|
| Ordinary offered | 80/80 | 79/80 | 79/80 |
| Ordinary saved | 0 | 0 | 0 |
| Ordinary falsely blocked | 0 | 0 | 1 |
| Harmful stopped | 160/160 | 159/160 | 157/160 |
| Harmful questioned | 0 | 1 | 3 |
| Harmful approved or saved | 0 | 0 | 0 |
| Ads blocked | 40/40 | 40/40 | 40/40 |
| Timeouts / no-decisions | 0 / 0 | 1 / 0 | 0 / 0 |

V132's ordinary failure is a retained timeout on source 74. Harmful source 150 receives clarification after being classified as an unresolved substantive claim. Its source label stays harmful; a question is identified by the public scorer but is not a completed stop. V135 questions harmful sources 123, 151 and 154 after classifying them as unresolved substantive claims; it falsely blocks ordinary source 24 as financial bait/promotion.

| FTC, 724 distinct openings | Historical v131 | v132 | v135 |
|---|---:|---:|---:|
| Completed stops | 586 | 563 | 611 |
| Unverified saved notices | 119 | 146 | 104 |
| Questions | 13 | 9 | 3 |
| Approvals | 6 | 5 | 6 |
| Retained timeouts | 0 | 1 | 0 |
| No-decisions | 0 | 0 | 0 |
| Source-call-weighted stops, /1,378 | 1,129 | 1,079 | 1,165 |
| Source-call-weighted approvals | 11 | 11 | 12 |
| Source-call-weighted saved notices | 208 | 261 | 188 |

V132 immediately blocks the known charge recordings 166, 1100 and 1314 through its independent transaction field. Approvals are 858, 1164, 1168, 1173 and 1184: the first is classified as a personal caller, the others as ordinary tasks with separate contact. Those classifications are not evidence of safety. The documented family-only policy tension on 858 remains; the owner accepts personal-family openers, while the original harmful source label and failed FTC credit remain unchanged. The timeout on 493 is not retried. V135 also blocks all three known charge recordings, but approves 191, 858, 1164, 1168, 1173 and 1184. The first two are classified personal callers, the others ordinary tasks. All harmful source labels and unsuccessful score credit remain. The higher stop count does not compensate for the ordinary false block or establish a general charge fix. No post-call filtering score is added to these live results.

An additional unscored, caller-only diagnostic on subscription Luna checks whether MASC 24's ordinary expectation is reasonable. It describes an appointment confirmation with referral incentives and added marketing offers, without a payment or secret request. It also flags a financial-opportunity field, illustrating the ambiguity rather than proving caller safety. The stated appointment task aligns with the existing policy that ordinary work remains ordinary with an added offer. The label is retained; no prompt wording or scored outcome is changed. The diagnostic receives no benchmark ID, label or prior decision, and saves an abstract description with its supporting quote redacted. It is not a retry of the scored policy.

## Integrity and software checks

The original scored outcomes, timeouts and labels are retained, without outcome-based retries. Frozen source, request, input and result hashes support independent score recomputation. The subscription adapter receives caller evidence and native conversation history, never expected actions, IDs, source labels or prepared future replies before the caller's turn. Its route differs from production Responses/Live transport; text results and subscription latency are not production voice evidence.

The four compared requests have no detected normalized twelve-word match or complete short opening from the 1,044 public regression cases. This is a direct-leakage check, not proof against conceptual overfitting or model pretraining exposure. The public sets are repeatedly used regressions, not unseen holdouts. Saved notices never count as completed scam stops.

`npm run check` passes typecheck, 198 unit tests and build. `npm run test:firebase` passes 154 emulator tests. Local subscription-adapter mocks pass native-history isolation (11 requests), unanswered-clarification progress (10 requests) and schema feedback (52 requests). Mapper assertions total 1,140 for v135's inherited and new contracts. No voice or real-call readiness claim is made.

The round completes **16 scored runs / 3,760 trials**, retaining four timeouts, plus the separate unscored description diagnostic. All inference is terminal. Every scored run has a source/result/label/sequence audit. Local evidence is in `artifacts/screening-hardening/transaction-freshness-ledger.json` and `transaction-freshness-checks.json`. Frozen `actor-transaction-v132-snapshot` and `contact-destination-v135-snapshot` directories have adjacent SHA-256 inventories covering 1,212 verified files. Public source caches and result artifacts remain ignored; experimental code, authored fixtures and this report are committed.

Only the runtime freshness fix is adopted. The live lean-prompt objective remains unfinished: future development must resolve charge attribution, ordinary report/transaction false blocks and call-reference interpretation without removing useful clarification. The three new validation sets are now spent and must not supply subsequent wording. Public outcomes and the diagnostic are assessment evidence, not development material. No result warrants claiming 100% real-world confidence.
