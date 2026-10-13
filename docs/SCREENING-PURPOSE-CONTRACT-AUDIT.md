# Ordinary purpose and the observation contract

October 13, 2026. Subscription GPT-6 Luna medium only. V139 repairs a decision-contract defect without changing the model request; v140 separately tests clearer ordinary-purpose wording. Neither candidate is adopted. A final terse-speech validation exposes empty-contact approvals in both, and each falsely blocks two ordinary MASC callers. Runtime screening remains v134, post-call filtering v10, and the separate deployed release v31 / voicemail v4. There is no deployment, voice test, phone call or forwarding change in this round.

## What changed

The [preceding audit](SCREENING-EVENT-ATTRIBUTION-AUDIT.md) found that the observation mapper could choose an ordinary approval with an `unknown` display purpose. Production validation rejects that combination, producing a no-decision despite the mapper's intent.

V139 gives an already-mapped approval a display purpose of `personal` for personal context, or `other` otherwise. It changes neither the action nor restriction priority. Raw model observations remain intact. The instruction/tool request is byte-identical to v138: 9,478 characters, 21.5% below runtime v134's 12,069. This is a character comparison, not a measured token or cost saving.

The contract repair is conditional on the model having classified the context correctly. It does not verify a claimed relationship, and it can make an incorrect mapped approval pass validation too. That limitation matters in the terse-speech results below. The change stays confined to the offline experiment.

V140 changes the ordinary-purpose wording using only three known development misses from v138: an ordinary warning, existing-service billing information and a practical answer about family transport. It explains that useful information can supply purpose without asking the recipient to act, and that a practical answer supplies context. It adds 147 characters, reaching 9,625 combined instruction/tool characters, still 20.3% below runtime. Public and validation results supply no prompt wording; their labels and outcomes remain unchanged.

## Development and fresh validation

Both candidates run the same 196 development scenarios twice. The main benchmark remains 24 cases; the broader wrapper is separate.

| Development | v139 | v140 |
|---|---:|---:|
| Original strict outcomes and sequences | 390/392 | 386/392 |
| Intended ordinary live offers | 142/142 | 140/142 |
| Intended ordinary notices saved | 26/26 | 26/26 |
| Ordinary false blocks | 0 | 0 |
| Intended completed blocks | 164/164 | 162/164 |
| Trusted-caution checks | 28/28 | 28/28 |

Both versions block two older SSA trials whose original expected outcome remains a saved notice. Those mismatches stay in strict scores. Ordinary denominators exclude charge alarms whose historical source category is legitimate. V140's four additional misses are unnecessary questions: two ordinary calls and two endorsements of restricted conduct. The wording change therefore does not improve the development balance. V139's classification gains over historical v138 are sampling variation under the same request, not evidence that repairing display metadata improved reasoning.

Three independently authored validation sets freeze after the candidates, with no label, expected action or prepared future answer in model input:

| Fresh validation, two passes | v139 | v140 |
|---|---:|---:|
| Informative purpose, 24 scenarios | 47/48 | 48/48 |
| Recovery and contact, 16 scenarios | 32/32 | 32/32 |
| Terse conversational speech, 16 scenarios | 31/32 | 30/32 |
| Total | 110/112 | 110/112 |

The recovery set draws general mechanisms from the [FBI's July 20 warning about recovery and agency-impersonation scams](https://www.ic3.gov/PSA/2026/PSA260720). It pairs unsolicited recovery offers, account-access requests and contact migration with ordinary refunds, complaint acknowledgments, contextual callbacks and personal reports. No real transcript or brand-specific instruction is introduced. Both candidates preserve all 14 ordinary live offers and two notices while stopping all 16 harmful trials in this set.

V139's informative-purpose miss asks for the identity behind an explicit recorded refund notice. The facts classify it as a live discussion of a recording rather than current automation. Its expected save remains appropriate and the failure is retained. Both versions preserve all 20 ordinary live offers in that set; v139 saves three of four notices and v140 four of four.

The terse set deliberately removes explanatory language that makes synthetic cases easy. Both preserve all 12 ordinary live offers and four notices. However, a caller supplying only a name and a request to add/contact them is classified as a personal caller: v139 approves it once in two trials and v140 twice. No relationship or independent purpose was supplied, so the blocking expectation remains appropriate. These are genuine empty-contact misses, not benchmark errors. In v139 the raw display purpose is also unknown; the new contract repair makes that incorrect approval admissible. V140 already reports a personal purpose, so reverting the metadata repair would not resolve the underlying context error.

All 33 fresh synthetic questions receive manual review. They ask about missing identity, purpose or intended action without requesting secrets. Apart from the recorded-notice miss, staged replies lead to the expected outcomes. Some questions combine topic and action or address the caller awkwardly in the third person. Passing prepared replies does not establish natural live conversation quality. These validation sets are now spent and must not guide later prompt wording.

## Public regressions

Each candidate runs MASC and the full FTC/NC State set once. These are repeated regressions, not unseen tests.

| MASC | v139 | v140 |
|---|---:|---:|
| Ordinary callers offered | 78/80 | 78/80 |
| Ordinary falsely blocked | 2 | 2 |
| Harmful calls stopped | 159/160 | 158/160 |
| Harmful calls questioned | 1 | 2 |
| Harmful calls approved or saved | 0 | 0 |
| Advertisements blocked | 40/40 | 40/40 |

Both falsely block ordinary sources 24 and 54: one as financial bait, one as an unexplained transaction. The earlier caller-only diagnostics support retaining the ordinary labels; they are not rerun. V139 questions harmful source 151; v140 questions 151 and 154. Successful questions count as identification under the existing public scoring rule, but are reported separately from completed stops.

| FTC, 724 distinct openings | v139 | v140 |
|---|---:|---:|
| Completed stops | 596 | 586 |
| Unverified saved notices | 119 | 131 |
| Questions | 4 | 6 |
| Approvals | 3 | 1 |
| Retained timeouts | 2 | 0 |
| No-decisions | 0 | 0 |
| Source-call-weighted stops, /1,378 | 1,144 | 1,137 |
| Source-call-weighted saves | 210 | 224 |
| Source-call-weighted approvals | 8 | 1 |

Saved notices receive no scam-stop credit. Both versions immediately stop all three known charge sources: 166, 1100 and 1314. Both approve source 191, classified as a personal caller with an unknown raw display purpose; the mapper derives `personal`. V139 also approves sources 1164 and 1168 as ordinary tasks. Original harmful labels remain and none receives successful credit. The two v139 timeouts are sources 1086 and 1196, each with no returned facts or decision. Neither is retried. These offline subscription timeouts do not measure production service behavior.

## Pipeline verification and limits

The inherited mapper checks plus the new contract matrix pass 11,193 assertions. Sixty states exercise the display-purpose repair while preserving action, reason, evidence, identity and priority. Known purposes and non-approval decisions remain unchanged; strict inputs, evidence checks, caution and clarification budgets still apply.

A new local mock sends 11 scripted responses through the actual subscription adapter, with no external inference. It verifies ordinary and personal purpose repair, missing-context clarification, rejection of unsupported evidence, scam/charge priority, and rejection of a routine approval while a question still awaits the caller's answer. A new caller answer permits the mapped approval. The first sandbox attempt cannot bind loopback; the same script passes with permission, and both logs remain.

`npm run check` passes typecheck, 198 unit tests and build. The first Firestore emulator run passes 153/154 tests and hits the previously observed closed-transaction error in stopped-total backfill. One full repeat passes 154/154; the first failure is retained.

Independent audits recompute action and decision metadata, verify source/request/result hashes and preserve every scored outcome. The two requests have no detected normalized twelve-word public passage or complete short public opening across the 1,044 pinned public cases. This checks direct copying, not conceptual overfitting or unknown pretraining exposure. Benchmark IDs, labels, expected actions and future prepared replies stay outside model input. Public source caches and outputs remain ignored. Runtime ordinary and caution initial request hashes remain unchanged.

The round completes 12 scored runs / 3,096 trials, with two retained timeouts, no final no-decisions and no unscored model diagnostics. All inference is terminal. Local `purpose-contract-ledger.json` and `purpose-contract-checks.json` preserve scores and checks; `purpose-contract-snapshot` has an adjacent SHA-256 inventory. The first derived ledger omitted 20 development trials accepting either block or hold from its intended-block denominator; the corrected aggregation includes them, with both calculations retained. No fixture, model outcome or original score changes.

Neither experiment fixes the full charge/contact goal. Unexpected-charge blocking is stronger, but the model still sometimes invents a personal relationship from a name and overclassifies ordinary business as risky. The mapper contract is now explicit and tested; it is not a semantic safety guarantee. Text evidence cannot establish 100% real-world confidence, speech-recognition quality or production latency.
