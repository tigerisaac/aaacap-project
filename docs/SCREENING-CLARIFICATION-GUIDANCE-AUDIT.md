# Clarification guidance

October 13, 2026. V151 tests a pipeline change on subscription GPT-6 Luna medium. It preserves v150's initial request, action mapping, greeting context and schema correction. Runtime screening v134, post-call v10 and the separately deployed release remain unchanged. No deployment, voice test, call or forwarding change occurs.

## Change and scope

The preceding [caller-framing audit](SCREENING-CALLER-FRAMING-AND-RECORDING-AUDIT.md) found a specific development defect. Nine v149 continuations had an unresolved sensitive action in their observations. Seven subsequent questions asked about the topic instead; only one asked directly for the intended action. The adapter had fixed missing-information guidance for an optional approval reviewer, but ordinary continuations received generic guidance.

V151 supplies that existing fixed guidance after an accepted continuation: ask for the requested action when a substantive claim remains unresolved, otherwise ask for missing identity or purpose. The selector cannot change the decision, run before input validation, bypass the wait for new caller words, or act on a terminal decision. Only three fixed hint values are accepted. A thrown or invalid hint fails without exposing its contents or making an offer. Older versions retain their original behavior.

There is no initial prompt growth: 4,333 instruction plus 5,599 tool characters, with the same 207-character greeting context and JSON wrapper. The initial request hash remains `116164705408ef3ffe8bc923b724d494403ae2ddcbbf073f9ad15518247a85f1`. The conditional tool response is versioned and recorded in the manifest and content-free diagnostics. No labels, case IDs, question rubrics or future replies reach the target.

## Fresh question comparison

After the policy freeze, 24 cases are authored and run twice for both v150 and v151. V150 passes 47/48 sequences; v151 passes 48/48. Each offers all 12 intended ordinary live trials, saves all four notices and stops all 14 intended harmful trials. V150 approves one callback under trusted recent-call caution; v151 passes all four caution trials. That first-decision difference cannot be credited to guidance sent only after a continuation.

The fixture freezes a missing-information rubric before inference. Manual review of all 40 actual questions gives a weaker result than sequence scores:

| Question quality | v150 | v151 |
|---|---:|---:|
| Requested action included when required | 2/10 | 4/10 |
| Requested action asked without an extra topic question | 1/10 | 4/10 |
| Identity or purpose question matches its rubric | 10/10 | 10/10 |
| Generated question follows the supplied hint | Not supplied | 20/20 |

One v150 identity question additionally asks for the relationship. None asks for secrets, payment or proof. All six wrong-axis v151 questions follow a purpose hint because the model observes missing context instead of a substantive unresolved claim. The selector cannot recover a distinction absent from the observations. Prepared replies disclose the useful action regardless of the actual question, so a passing sequence does not prove adequate conversation. Original expectations and the caution failure remain intact; this fresh set is now spent and is not a tuning source.

## Further validation

Development completes 392 trials: 384 strict passes, 137/142 intended ordinary offers, 26/26 ordinary notice saves, 164/164 intended blocks and 27/28 caution passes. There are no ordinary false blocks. Five ordinary trials are questioned unnecessarily, one caution trial misses its expected hold, and two historical SSA saved-notice expectations remain failures when blocked. All original expectations remain. The main benchmark stays at 24 cases; the 196-case development wrapper is separate.

In the ten known sensitive-topic trials, nine questions now ask for the requested action. The remaining security-topic question receives a purpose hint because the model marks context missing while also marking the action unresolved. One otherwise targeted question awkwardly refers to the caller in the third person. This confirms progress on guidance while leaving interpretation and conversational quality unfinished. Ordinary-offer losses are not excused by better questions.

The completed public regressions retain every outcome and original source label:

| Measure | v150, preceding round | v151, this round |
|---|---:|---:|
| MASC ordinary live offers | 77/80 | 79/80 |
| MASC harmful stops | 160/160 | 157/160 |
| MASC harmful questions / approvals | 0 / 0 | 2 / 1 |
| MASC ads stopped | 39/40 | 40/40 |
| FTC stops | 579/724 | 586/724 |
| FTC saved unverified | 134 | 128 |
| FTC questions / approvals | 8 / 3 | 7 / 3 |

These are separate single passes, not evidence that guidance improves first-decision accuracy. V151's missing ordinary MASC offer is a subscription timeout (`masc-test-13`), retained as a failed trial. There are no ordinary false blocks in this MASC run. The two harmful questions receive requested-action guidance. The harmful approval (`masc-test-153`) happens on the first decision, before guidance can run: the observations incorrectly treat the requested action as ordinary.

One separately recorded, unscored subscription Luna medium diagnostic inventories that approved caller's event and requested actions. It receives caller content without the source label, prior verdict or case ID. It reports available money and an explicit payment/transfer request; both supporting quotes are checked against the input in memory and discarded. This supports retaining the harmful expectation, not waiving the miss as a benchmark problem. It is another model judgment, not independent human adjudication, and it neither replaces the scored result nor feeds a prompt revision.

FTC's three approvals are `robocall-858`, `robocall-1164` and `robocall-1168`. All three known unexpected-charge recordings (`166`, `1100`, `1314`) stop. Weighted by 1,378 underlying calls, the results are 1,123 stops, 230 unverified saves, 17 questions and eight approvals. Saved notices are not credited as stops. FTC has no failures or no-decisions; MASC retains its one timeout and no final no-decisions.

The second fresh set contains twelve independently written contrasts after reviewing [NCSC messaging-account guidance, updated July 14](https://www.ncsc.gov.uk/news/ncsc-warns-of-messaging-app-targeting), and its [September 15 contact-impersonation and spyware warning](https://www.ncsc.gov.uk/news/uk-allies-expose-spyware-iranian-state-actors-target-dissidents-activists-journalists). It contrasts device linking and software installation with ordinary timetables, appointment notices and removing unwanted access. The source advisories concern high-risk targets; the tested action boundaries are general. No new real-call transcript is used. A current forum search result about purported consulate calls could not be fetched and is not treated as verified evidence.

Both v150 and v151 pass all 24 trials in this additional comparison: ten ordinary offers, two notice saves and twelve harmful/ad stops each. No question is needed, so these passes test retained boundaries rather than the new guidance. Both versions remain exactly as frozen; no revision uses these outcomes.

## Local checks and limitations

V151 passes 25,414 mapper assertions including inherited checks and a 44-request local protocol mock. The mock verifies all three guidance kinds, pending-answer protection, unchanged terminal decisions, correction behavior and failure without leaking invalid selector values. The 52-request older-feedback mock and 38-request recording mock pass. These mocks make no external inference. The question-observer self-test confirms that rubrics do not enter target input.

`npm run check` passes typecheck, 203 unit tests and build. The full Firestore emulator run passes 153/154 tests: the existing ten-concurrent-admission test fails with `INVALID_ARGUMENT: Transaction is invalid or closed`. The affected shared-pilot suite then passes 31/31 in a separate emulator run. The original full-run failure remains recorded; the targeted pass is not a clean full-suite pass. No cloud source changes are included.

The frozen initial request and an audit-only union containing the greeting and all fixed question hints have no matching 12-word public passage or complete short opening across 1,044 pinned cases. This checks copying, not conceptual overfitting or pretraining exposure. Public benchmarks remain repeated regressions rather than unseen holdouts. No completed model outcome is retried for replacement credit. This is text/protocol evidence, not real-call evidence or a claim of 100% reliability.

## Evidence and decision

Seven scored runs contain 1,580 trials, plus the one unscored content inventory. All inference is terminal. Source hashes, labels, sequences, mapped decisions, metadata and clarification hints pass the result audit. Across v151 runs, 91 accepted continuations receive a fixed hint with no selector failure; this verifies delivery, not question adequacy. The ignored local ledger is `artifacts/screening-hardening/clarification-guidance-ledger.json`; frozen source/result snapshots contain 629 and 594 hash-verified files, with SHA-256 manifests retained under the same directory. Public caller text and diagnostic evidence quotes are not added to this report or committed.

V151 remains experimental. Its fixed hint reliably directs question generation when the observations identify the missing fact, with no initial prompt growth. It still loses ordinary development offers, sometimes asks about a topic when it needs the requested action, and retains harmful public approvals. The next work must use known development evidence to improve interpretation and clarification, without tuning from these now-spent fresh sets or public failures. Runtime screening v134, post-call v10 and the deployed release remain unchanged.
