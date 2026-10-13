# Caller framing and recording consistency

October 13, 2026. This round tests v148–v150 in thirteen scored runs / 3,536 trials on subscription GPT-6 Luna at medium reasoning. There are no provider failures or final no-decisions. Candidates remain offline. Runtime v134, post-call v10 and the separately deployed v31 / voicemail v4 remain unchanged. No deployment, voice test, phone call or forwarding change occurs.

## Changes and provenance

V148 clarifies that a brief personal-relationship answer supplies claimed identity, and that a practical task or informative update supplies purpose without requiring completion or verification. It removes a redundant sentence to limit growth to 18 characters above v147. The change is grounded in known development misses, not public or spent validation cases.

V149 returns to v147's unchanged instructions, schema and mapper, adding the existing trusted greeting-context wrapper. It tells the model which opening question the caller is answering and identifies the transcript as this caller's own speech. This is the application's existing greeting; no source labels or expected answers enter it. Earlier v119 tested the same wrapper against an older schema and did not solve every semantic error.

V149 development exposes a specific contradiction: a recorded security notice is labeled a report of another recording while also supplying the evidence field reserved for current automation. V150 enforces the existing mode/quote contract in both directions. Versioned correction feedback asks Luna to reconsider both fields using the same caller evidence. A decisive restricted request or unexplained charge still stops immediately. Older correction versions, evidence validation and unanswered-clarification guards are preserved. Consistency checks cannot establish that a consistent interpretation is correct.

V148 uses 4,327 instruction plus 5,623 tool characters, totaling 9,950. V149 and v150 share v147's initial request: 4,333 plus 5,599, totaling 9,932; request hash `116164705408ef3ffe8bc923b724d494403ae2ddcbbf073f9ad15518247a85f1`. Both also send 207 characters of greeting context plus its JSON wrapper. V150 adds no initial prompt text; correction feedback is sent only when needed. These are character counts, not token or cost measurements.

## Completed v148/v149 comparisons

| Development, 196 cases twice | v147, previous round | v148 | v149 |
|---|---:|---:|---:|
| Strict outcome/sequence passes | 384/392 | 386/392 | 387/392 |
| Intended ordinary live offers | 136/142 | 139/142 | 141/142 |
| Ordinary notices saved | 26/26 | 26/26 | 25/26 |
| Ordinary false blocks | 1 | 0 | 0 |
| Intended blocks completed | 164/164 | 163/164 | 163/164 |
| Trusted-caution passes | 28/28 | 28/28 | 28/28 |

V148 questions two ordinary warning trials and one ordinary bill update; it also questions one endorsed remote-access request. V149 offers a recorded notice instead of saving it, questions one empty profile invitation and questions one social checking-in caller. Both retain two historical SSA saved-notice expectations as strict failures when they block. Those are source-scam cases, not ordinary-caller false blocks. The main benchmark remains 24 cases; the larger development wrapper is separate.

The first fresh comparison is authored after v148 freeze: 24 cases twice per version. V147 scores 47/48; v148 scores 44/48. V148 offers all 20 ordinary live trials and saves all four notices, but approves both repetitions of a named empty-contact request and blocks both unclear refusal dialogues rather than holding. The empty requests are consistently mislabeled personal in both identity and context; joint consistency validation cannot catch them. V147 holds one ordinary credit/collection dialogue. All original labels and failures remain.

The second fresh comparison is authored after v149 freeze: 20 cases twice per version. V147 scores 39/40, unnecessarily questioning a neighbor's report once. V149 scores 40/40: 14 ordinary offers, four notice saves, 16 intended blocks, four caution outcomes and two ask-then-hold refusals. These are authored synthetic checks, not independently blinded evidence. Both sets are now spent and are not tuning sources.

| Public regression, one pass | v147, previous round | v149 |
|---|---:|---:|
| MASC ordinary offers | 78/80 | 78/80 |
| MASC harmful stops | 160/160 | 159/160 |
| MASC harmful questions | 0 | 1 |
| MASC harmful approvals/saves | 0 | 0 |
| MASC ads blocked | 40/40 | 40/40 |
| FTC stops | 587/724 | 579/724 |
| FTC unverified saves | 126 | 132 |
| FTC questions | 7 | 9 |
| FTC approvals | 4 | 4 |
| FTC stops weighted by 1,378 calls | 1,115 | 1,111 |

V149 blocks ordinary-source MASC IDs 54 and 63 and questions harmful ID 154. FTC approvals are 191, 858, 1164 and 1173. The previously audited family-only opening 858 remains a source-label failure under the owner's family-call policy. All three known unexpected-charge recordings, 166, 1100 and 1314, stop. There are no provider failures or final no-decisions in these eight runs / 2,004 trials. Historical v147 is not a newly rerun control; sampling differences prevent a causal score claim.

## V150 validation

The third fresh comparison is frozen after v150: 24 cases twice per version. Both v149 and v150 score 46/48. Each offers all 16 intended ordinary live trials, saves all eight ordinary notices, stops all 18 intended harmful/ad trials and passes all four caution outcomes. The fresh empty-contact and charge-alarm cases all stop; normal callbacks and reports of earlier scam recordings remain eligible.

Both versions stop a vague benefit-available opening before its expected question, in both repetitions. Observations mark promotion/financial bait on the first turn; no new correction is invoked. The opening supplies no existing-service basis, making that interpretation plausible. Its original unclear label, ask-then-hold expectation and failure score remain unchanged; ambiguity is not replacement credit.

All twelve fresh questions are short and ask for no secrets, payment or proof. Four incomplete-opening questions are useful. Eight credit questions ask what the credit is for instead of what the caller needs the recipient to do. Prepared future replies reveal that action anyway, so passing sequences overstate conversation quality. Those future replies are never sent before the model asks.

V150 development scores 386/392: 139/142 intended ordinary offers, 26/26 ordinary notices, 163/164 intended blocks and 28/28 caution outcomes, with no ordinary false blocks. Two social checking-in trials and one friend's scam warning receive unnecessary questions. An empty profile invitation is questioned once. The two historical SSA expectations remain strict failures.

MASC offers 77/80 ordinary calls, stops 160/160 harmful calls and blocks 39/40 ads. Ordinary-source IDs 22, 52 and 54 block; their observations mark financial bait or an unexplained transaction. Insurance ID 104 is approved after being observed as ordinary work. Original source labels remain. These misses prevent promotion despite the perfect observed harmful-stop count.

No mode/quote correction is invoked in either v150 development or MASC. Both known recorded-security-notice trials now save, but their first observations already classify current automation correctly. The changed scores therefore do not establish a gain or regression caused by the new correction. Its behavior is verified by local controlled protocol checks; consistent semantic mistakes remain possible.

V150's complete FTC pass stops 579/724 openings, saves 134 as unverified, questions eight and approves three. Weighted by the 1,378 reported calls, it stops 1,119, saves 231 and approves four. Approvals are IDs 191, 858 and 1164. All three known unexpected-charge recordings stop. Saved notices and questions are not completed scam stops.

The new correction is exercised in four v150 trials: both repetitions of the fresh live report of an earlier recording ultimately approve, one FTC trial ultimately blocks, and another saves. None consumes a caller question or ends without a decision. The corresponding rejected arguments are not retained, so content-free field diagnostics establish the inconsistency and subsequent result, not which semantic interpretation was originally intended. No v150 accepted observation retains a mode/quote contradiction outside the decisive-block exemption.

No candidate is promoted. The charge-alarm examples and fresh ordinary callers pass, but development retains empty-contact questions and ordinary-call losses, MASC retains ordinary-source blocks, and the FTC approvals remain. Higher scam-stop scores alone do not meet the owner's balanced acceptance condition.

## Recent reports and evaluation integrity

The [FBI's September 17 government-impersonation warning](https://www.ic3.gov/PSA/2026/PSA260917) covers secrecy and courier payments. Its [September 1 consent-phishing warning](https://www.ic3.gov/PSA/2026/PSA260901) covers granting account access without disclosing a password. A [recent first-person discussion](https://www.reddit.com/r/britishproblems/comments/1x03t23/the_amount_of_calls_from_an_automated_voice/) also describes unsolicited messaging-app job invitations. These sources inform independently written contrasts; no new real-call transcript is copied into evaluation. Forum reports are anecdotes, not prevalence estimates.

The frozen requests and an audit-only union including greeting context and v150 correction feedback contain no matching 12-word public passage or entire short opening across all 1,044 pinned public cases. This is a copying check, not proof against conceptual overfitting or pretraining exposure. Public benchmarks are repeated regressions, not unseen holdouts. Case IDs, labels, expected decisions and prepared future replies are excluded from target input. All original failures are retained without outcome-based retries.

All thirteen audits verify source/request hashes, original membership and labels, expected sequences, future-reply boundaries and decision mapping. The v148/v149 snapshots contain 607 and 620 hash-verified files; the v150 snapshot contains 625 hash-verified files. The combined ledger, application audit, question reviews, source review and snapshot manifests are under ignored `artifacts/screening-hardening/`. There are no unscored model diagnostics. No public caller quotes or credentials are included in this report or committed artifacts.

`npm run check` passes typecheck, 203 unit tests and build. The first attempt is retained with a sandbox `listen EPERM` failure; rerunning with loopback access succeeds. All 154 Firestore emulator tests pass in this round. The recording protocol mock passes 38 requests, and the older-feedback compatibility mock passes 52, with no external inference. Candidate self-tests pass 19,735 assertions for v148, 19,329 for v149 and 22,979 for v150 including inherited assertions. Initial runtime request hashes remain unchanged.

Known development also exposes a separate question-generation gap: of nine continuations with an unresolved sensitive action, seven ask about the topic, one asks both topic and action, and only one asks directly for the intended action. The adapter already has fixed guidance for the missing detail but supplies it only when an optional approval reviewer requests clarification. Ordinary observation-based continuations receive generic guidance. This evidence is recorded separately from fresh questions; no change to that behavior is included here.
