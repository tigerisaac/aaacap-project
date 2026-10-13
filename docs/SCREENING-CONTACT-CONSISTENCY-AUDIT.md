# Contact direction and consistent observations

October 13, 2026. Thirteen scored runs / 3,536 trials on subscription GPT-6 Luna medium, retaining one timeout and one no-decision. This round returns to the structured v139 approach after the [direct-decision regression](SCREENING-DIRECT-DECISION-AUDIT.md). It separates contact direction and identity kind, then tests correction of contradictory facts. None of the candidates is adopted. Runtime screening remains v134, post-call filtering v10, and the separate deployed release v31 / voicemail v4. No deployment, voice test, phone call or forwarding change occurs.

## Changes and the priority defect

V143 replaces the identity boolean with three kinds: missing, name/role, or this caller's stated personal relationship. It replaces contact destination with the person asked to initiate contact: this incoming caller, the recipient starting a separate contact, or neither. The existing development suite supplies the motivation: current-call openings had been treated as outbound invitations, while names sometimes supplied an invented personal relationship. No public or validation wording is added.

The mapper initially treats personal context without a stated relationship as missing context. V143 development reveals the cost: two ordinary friend-warning trials correctly identify personal context but report only a name/role. Silently downgrading that conflict leads to unnecessary questions.

V144 rejects this inconsistent pair for correction using the existing content-free field/code feedback. It recovers both friend-warning trials, after three and two rejected attempts respectively. However, a separate local contract audit exposes a priority defect: the unconditional consistency check rejects 150 combinations with an independently decisive restriction or charge alarm. That adds a correction step before a clear stop. It is not an approval bypass, but is an avoidable delay and failure path.

V145 repairs that defect. Restricted conduct or an unexplained transaction still yields an immediate supported block; the identity/context consistency check applies otherwise. It neither invents a relationship nor selects the corrected fact. If the model supplies a consistent but wrong interpretation, the guard cannot correct it. This remains an offline experiment.

All three versions have byte-identical initial model requests: 4,318 instruction characters plus 5,593 tool characters, totaling 9,911. That is 17.9% below runtime v134's 12,069, but 433 characters longer than v139. V144/v145 change validation and possible correction turns, not initial prompt wording. Differences on trials that never use correction are sampling differences under the same initial request, not evidence of a validator improvement. Character reduction is not measured token or cost reduction; repeated corrections can add work.

## Development results

Each version runs the same 196 development scenarios twice. The main benchmark remains 24 cases; the larger wrapper is separate.

| Development | v143 | v144 | v145 |
|---|---:|---:|---:|
| Original strict outcomes/sequences | 385/392 | 386/392 | 388/392 |
| Intended ordinary live offers | 137/142 | 140/142 | 140/142 |
| Intended ordinary notices saved | 26/26 | 25/26 | 26/26 |
| Ordinary false blocks | 0 | 0 | 0 |
| Intended completed blocks | 164/164 | 164/164 | 164/164 |
| Trusted-caution checks | 28/28 | 28/28 | 28/28 |
| Retained subscription timeouts | 0 | 1 | 0 |

V143's five ordinary misses are unnecessary questions about warnings, a friend checking in and existing-service billing. V144 unnecessarily questions an ordinary warning and billing call, asks an automated security notice to explain itself, and times out after accepting a clarification request in a sensitive-claim trial. That timeout is retained and not retried. V145's remaining two ordinary misses both question the existing-service billing case. Its friend-warning correction path occurs once, with three rejected attempts before approval.

All versions also block the two historical SSA trials whose original expectation is a saved notice. As documented in the preceding audit, those are prior-policy mismatches, not ordinary-call false blocks; their strict failures remain. No fixture label or sequence is changed. Ordinary denominators exclude historically legitimate-labeled charge alarms, and intended blocks include cases accepting either block or hold.

## Fresh red teaming

Each set is independently authored after the relevant candidate freeze, and run twice. The sets are now spent; their wording and outcomes must not guide later prompt wording. Prepared future replies, labels and IDs are never screening-model input.

| Fresh set | Comparison | Candidate |
|---|---:|---:|
| Contact initiator, 24 scenarios | v139: 48/48 | v143: 46/48 |
| Conversational consistency, 24 scenarios | v143: 48/48 | v144: 48/48 |
| Priority and ordinary context, 20 scenarios | v143: 40/40 | v145: 40/40 |

The first set's two v143 misses block a substantive refund callback before asking what action is needed. Its name/role and outbound-contact observations are compatible; the mistaken fact is missing context. An offline replay of those original observations through v145 still produces both blocks. This replay makes no model request, changes no score and demonstrates why later perfect fresh sets do not establish repair of that boundary. The expected clarification remains appropriate.

On the final set, both versions offer all 16 intended ordinary live trials, save all four ordinary notices, stop all 14 harmful trials and pass all four caution checks. The two remaining trials ask and then hold after a refusal to explain. These successes preserve useful behavior in those cases, not universal correctness.

Recent research includes the FTC's [September 28 health-coverage warning](https://consumer.ftc.gov/consumer-alerts/2026/09/what-know-ahead-open-enrollment-avoid-health-insurance-scams), [August tax-relief warning](https://consumer.ftc.gov/consumer-alerts/2026/08/struggling-tax-debt-heres-what-know) and the FBI's [June cash-courier warning](https://www.ic3.gov/PSA/2026/PSA260615). Synthetic cases test broad unsolicited offers, identity-number collection, courier payments, commands and contact invitations, paired with ordinary service and personal calls. No real script is reused. A recent self-reported unwanted-call discussion appeared in search, but its page could not be retrieved; it is not treated as verified evidence or evaluation input.

All 46 generated fresh questions receive manual review. None requests secrets, payment or private proof. Some ask broadly about a topic instead of the intended action, or awkwardly address the caller in the third person. One asks for a practical task or outcome rather than using natural everyday language. Prepared replies can therefore overstate conversational quality; successful final outcomes alone do not prove that a real caller would supply the missing information.

## Public regressions

V143 and v145 each run MASC and all 724 distinct FTC openings once. V144 has no public pass. These are repeated regressions, not unseen holdouts.

| MASC | v143 | v145 |
|---|---:|---:|
| Ordinary callers offered | 79/80 | 78/80 |
| Ordinary falsely blocked | 1 | 2 |
| Ordinary saved or questioned | 0 | 0 |
| Harmful calls stopped | 159/160 | 159/160 |
| Harmful calls questioned | 1 | 1 |
| Harmful approvals or saves | 0 | 0 |
| Advertisements blocked | 40/40 | 40/40 |
| No-decision outcomes, all groups | 0 | 1 |

Both falsely block ordinary source 24 as financial bait; v145 also blocks ordinary delivery source 54 as an unexplained transaction. Neither involves an identity correction. The existing caller-only diagnostic evidence supports retaining both ordinary expectations; no diagnosis is repeated to obtain a favorable label. The shared harmful clarification is reported separately from a stop.

V145's no-decision is wrong-number diagnostic 319. It submits three incompatible identity/context observations and ends without an accepted decision. Wrong-number membership remains outside the ordinary/scam headline denominators, but the failure to decide remains visible. Source 300 also requires correction and ends in clarification; source 311 requires correction and is offered. These diagnostic outcomes neither establish caller safety nor change source labels.

| FTC, 724 distinct openings | v143 | v145 |
|---|---:|---:|
| Completed stops | 595 | 584 |
| Unverified saved notices | 119 | 126 |
| Questions | 5 | 10 |
| Approvals | 5 | 4 |
| Timeouts | 0 | 0 |
| No-decisions | 0 | 0 |
| Source-call-weighted stops, /1,378 | 1,138 | 1,115 |
| Source-call-weighted saves | 215 | 225 |
| Source-call-weighted approvals | 7 | 10 |

Both stop all three known charge sources, 166, 1100 and 1314. V143 approves 191, 858, 1164, 1173 and 1184; v145 approves 858, 1164, 1168 and 1173. The first two v143 approvals and first v145 approval are classified as personal callers; the others as ordinary tasks with separate contact. Prior investigation of the family-only greeting 858 found no text-visible harmful request, so reliably forcing that opening to stop would conflict with the owner's family-caller preference. That does not excuse the other approvals, establish safety or justify relabeling. All retain their harmful source labels and receive no successful FTC credit. Saved notices receive no scam-stop credit. No identity/context correction occurs in v145's FTC run, so its changes in outcomes cannot be attributed to the new correction gate.

## Reporting and verification

The run exposes a reporting gap: an absent decision without an explicit error code was visible only inside detailed outcome counts. Reporting version `2026-10-13-public-identification-v4` adds a top-level `noDecisions` count to MASC and FTC summaries, including diagnostic groups. It may overlap a coded failure count. Score membership and every success calculation remain unchanged. Separate offline MASC summaries preserve both original summaries and raw outcomes; no model is rerun for this change. A new regression test covers a wrong-number no-decision and overlap with a coded failure.

V143/v144/v145 pass 11,608 / 11,792 / 14,048 local assertions including inherited checks. V145's new matrix includes 2,250 immediate restricted blocks. Separate local subscription-adapter mocks pass 23 / 27 / 29 requests, covering correction, restrictions, contextual callbacks, notice saving, evidence rejection and the unanswered-question guard. None makes external inference.

The first `npm run check` cannot bind the APNs mock under the sandbox and its failure is retained. The permitted repeat passes 198 unit tests, typecheck and build; after the reporting change, the final check passes 199 unit tests, typecheck and build. `npm run test:firebase` passes all 154 tests this round. The recurring closed-transaction failure seen in earlier rounds is not claimed fixed.

Independent audits recompute all scores, sequences, actions and decision metadata from frozen sources and results. The initial runtime ordinary/caution requests are unchanged. Direct-copy checks find no normalized twelve-word public passage or complete short public opening in the frozen requests across 1,044 pinned public inputs. This does not rule out conceptual overfitting or unknown pretraining exposure. Public caches and outputs remain ignored. No benchmark IDs, expected labels or future replies enter screening requests.

All inference is terminal. `contact-initiator-ledger.json`, `contact-initiator-checks.json`, `contact-initiator-question-review.json` and `contact-reporting-audit.json` preserve exact counts, checks, question review and reporting equivalence. The three frozen workspaces are saved locally as `contact-initiator-snapshot`, `contact-consistency-snapshot` and `contact-priority-snapshot`, each with an adjacent SHA-256 inventory. The later reporting implementation is archived separately. The sole timeout is v144 development `action-claim-no-action`, run 1; the sole no-decision is v145 MASC diagnostic 319. No completed outcome is retried or given replacement credit, and there are no unscored model diagnostics.

The consistency checks improve the handling of contradictory output and preserve independent restriction priority. They do not solve incorrect purpose classification, ordinary transaction false alarms, or natural clarification quality. None of these text results warrants a claim of 100% real-world confidence, and none establishes voice or deployment readiness. The full goal remains unfinished.
