# Charge and contact boundaries — October 13, 2026

Repository post-call policy is now `2026-10-13-voicemail-v10`, matching its tested request exactly. It removes unsolicited charge alarms, retains ordinary receipts/refunds and reports about somebody else's call, and makes optional payment offers and requests for software, commands or account permissions explicit. It preserves the v7 empty-contact rule. The change adds 453 instruction characters, from 2,968 to 3,421, with no additional model call, output field or storage change. Removal still requires a clear assessment and supported caller evidence; uncertainty and failures keep the message.

**Live screening is not solved or promoted.** Repository screening remains v99. V126 and v127 are offline experiments; both have useful-clarification misses, and v127 also has an ordinary false block and a harmful MASC approval. The separately recorded deployed release remains screening v31 / voicemail v4. This task did not deploy, place calls, change forwarding or run paid voice tests. All external inference was subscription GPT-6 Luna with medium reasoning, with the existing public FTC exception and no private calls or recordings.

## General changes and development

The owner explicitly requires unexpected-charge alarms to stop, while preserving ordinary receipts and notices. V126 isolates that requirement from the combined v123 change: it adds `charge_alarm` to v111's restricted-conduct categories and gives it block priority before notice saving. Ordinary receipts, completed refunds, reports about another caller and a personal caller's own trouble are excluded. Contact handling and recording-evidence validation remain unchanged.

V126's remaining development empty-contact misses were not priority failures. Luna reported missing purpose but `separateContact: false` for invitations to communicate elsewhere. V127 changes only the contact field description to describe its function across communication media, independently of whether the callback has ordinary context. It reuses the earlier v120 field definition, without changing the mapper or adding examples. Neither revision used fresh or public outcomes to alter wording.

| Same development callers, two passes | v111 control | v126 | v127 |
|---|---:|---:|---:|
| Strict outcomes and sequences | 129/152 | 149/152 | 150/152 |
| Intended ordinary live offers | 44/50 | 50/50 | 50/50 |
| Intended notice saves | 16/16 | 16/16 | 15/16 |
| Ordinary false blocks | 3 | 0 | 0 |
| Source-labeled harmful blocks | 59/74 | 71/74 | 73/74 |
| Source-labeled harmful holds | 2/74 | 0/74 | 0/74 |
| Retained evaluation timeouts | 1 | 0 | 0 |

The 76-case development input consists of the earlier argument-contract, contact-migration and charge-priority controls. A separately recorded expectation overlay changes one historical charge clarification to immediate block, as the owner directed; original text and fixture are retained. That case remains in its original `unclear` category and is separate from the 74 source-labeled harmful trials above. Both new versions block it twice. V127's two misses are one empty invitation questioned and one ordinary recorded account-security notice questioned. V126 questions three empty invitations. No bad model result was rerun or replaced.

Instructions plus serialized tools total 8,285 characters for v126 and 8,405 for v127, versus runtime v99's 12,069: reductions of 31.4% and 30.4%. These are character counts, not measured token, cost or latency savings.

## Fresh validation and useful questions

The 48-case [fresh fixture](../scripts/fixtures/holdout/contact-charge-validation.mjs) was written after both revisions froze. It includes ordinary callbacks, completed refunds, charge alarms, contact invitations, reports versus requests, optional harmful steps, native follow-up turns and trusted recent-scam caution. Both versions ran two preplanned repetitions. This fixture is now spent and must not be used for prompt revision.

Recent category-level motifs were informed by the [FBI's September 1 consent-phishing advisory](https://www.ic3.gov/PSA/2026/PSA260901), [September 17 impersonation advisory](https://www.ic3.gov/PSA/2026/PSA260917) and an [October first-person account of an impersonated investigation](https://www.reddit.com/r/Scams/comments/1wvgc75/87_year_old_mother_in_law_was_contacted_by_the/). The last is an unverified anecdote, not prevalence evidence. The tests use independently written callers; report transcripts, identities and contact details are not copied into the prompt or fixtures.

| Fresh validation, two passes | v126 | v127 |
|---|---:|---:|
| Strict outcomes and sequences | 90/96 | 93/96 |
| Intended ordinary live offers, normal context | 32/34 | 31/34 |
| Intended ordinary notice saves, normal context | 10/10 | 10/10 |
| Ordinary false blocks | 0 | 1 |
| Empty-contact blocks, including follow-up | 10/14 | 14/14 |
| Immediate charge-alarm blocks | 12/12 | 12/12 |
| All harmful blocks | 38/42 | 42/42 |
| Harmful approvals | 0 | 0 |
| Question turns | 16 | 12 |

Both versions hold the same two ordinary security follow-ups after the caller explains a harmless independent-review action. These are clarification failures, not successful scam stops. V127 additionally blocks one ordinary friend's callback. It therefore cannot be promoted just because it gets every harmful case in this fresh set. Both handle all four caution trials correctly, preserving two notices and holding two recent callbacks. All six missing-purpose opening trials receive questions; no question budget is exceeded or question text missing. Prepared answers enter only after the model asks a question.

V127's main/caution regression is 59/64: 41/46 spoken main trials and 18/18 caution trials. The original 24-case main fixture is unchanged; the spoken wrapper omits silence and records two owner-directed charge-policy expectation changes separately. A card-purchase alert is saved twice against that new stop expectation. A hospital update is questioned once despite supplying an ordinary informative purpose. The old saved-government-notice expectation is blocked twice; this remains a disclosed mismatch rather than a silently relabeled success.

## Public regression

V127's complete MASC run offers 80/80 ordinary calls and blocks 40/40 advertisements. It blocks 156/160 harmful callers, questions three and approves one refund-category caller. There are no evaluation failures or no-decisions. The approved caller is classified `ordinary_task` with no restricted conduct; this records the model's classification, not proof that its judgment is correct. The harmful source label and failed result are retained. Questions receive the existing identification credit (159/160), but are not completed stops.

Historical v111 MASC offered 80/80, blocked 40/40 ads, stopped 156/160 harmful callers and questioned four, with no harmful approval. This is a historical comparison, not a newly interleaved control. The original four-action v79 scores are not directly comparable with the newer saved-notice policy. Neither public set is an unseen holdout after this long iteration history.

| FTC outcome, one pass | v127 |
|---|---:|
| Completed blocks | 533/724 |
| Saved unverified notices | 180/724 |
| Questions | 6/724 |
| Approvals | 4/724 |
| Retained timeouts | 1/724 |
| Source-call-weighted stops | 1,063/1,378 |
| Source-call-weighted approvals | 10/1,378 |
| Source-call-weighted saved notices | 288/1,378 |

All three previously identified charge recordings (166, 1100 and the original Amazon recording 1314) block immediately with `charge_alarm`, without questions. The timeout on recording 479 remains in the denominator and was not retried. There are no final no-decisions.

Approvals are 858, 1164, 1168 and 1173. The original family-only greeting 858 remains consistent with the owner's family-call preference from the available text; its harmful source label is nevertheless retained. The other three are classified ordinary tasks with separate contact and no restricted conduct. That does not establish safety or make the approvals acceptable. No public-ID exception is added.

The prior v124 run stopped 489, saved 227, questioned seven and approved one, without failures; its MASC run offered only 62/80 ordinary calls. V127 gains ordinary offers and charge stops but has more harmful approvals. These historical runs are not evidence of a causal prompt-only effect. Saved notices remain separate from completed stops.

## Post-call validation and selected change

The same development callers also checked the existing post-call v7 and new v9/v10 requests. V9 introduces charge priority and makes optional payment collection explicit. It still keeps one software-installation demand. V10 aligns the access category with the screening policy, without changing the keep-on-failure behavior or empty-contact wording.

The initial projection from live screening to message scoring had three unsuitable expectations: two greeting-only hangups were labeled keep, and one charge alarm inherited an uncertain category. These are post-call policy mismatches, not failures to ask a useful live question. The original files and scores are retained. A documented correction is applied identically to both controls, without repeating their inference.

| Same 76 development messages | v7 | v9 | v10 |
|---|---:|---:|---:|
| Original scoring | 65/76 | 72/76 | 76/76 |
| Consistent current-policy scoring | 66/76 | 75/76 | 76/76 |
| Concrete ordinary messages kept | 33/33 | 33/33 | 33/33 |

V10 then passes all 45 fresh post-call checks: 21 harmful messages removed, 19 ordinary live messages kept, and five ordinary notices kept. These inputs were derived from the fresh fixture after v10 froze and before its screening results were inspected; neither model receives outcome labels. The three unresolved live opening probes are excluded by category before results, because this check targets completed useful/harmful messages. This is overlapping text evidence across stages, not 45 additional independent callers.

V10 keeps all 80 ordinary MASC messages. On the original 22-case voicemail set with two explicitly recorded policy changes, it passes 21/22: all ten remaining ordinary messages are kept; the charge alert and empty callback are removed; nine other harmful/junk cases are removed. A fake government-suspension message is kept as uncertain and remains an unresolved limitation. This result does not justify a claim of complete scam removal.

V10 was also applied once to all 180 notices saved by the frozen v127 FTC run, using the same opening text and no later transcript. It removed 39 and kept 141 unverified, with no failures (65 removed and 223 kept when weighted by original call copies). This is a counterfactual text-stage check: the four live approvals stay approvals, and post-call removals do not increase the live completed-stop count. These 141 retained source-labeled recordings remain a visible limitation, not evidence that their senders are safe.

The repository adopts the exact tested v10 post-call request as an incremental improvement. It does **not** replace the live screening prompt, make a saved notice count as a live stop, or claim that the full charge-alarm pipeline is fixed.

## Integrity and software evidence

Frozen sources, requests, input hashes, labels, all planned identities and all outcomes are retained. Audits recompute mapped actions and scores. Caller quotations are validated during inference and omitted from saved observations. Case IDs, benchmark labels, expected outcomes, source names and future replies never enter evaluation requests. No twelve-word public passage or complete short public opening matched either screening request or either new post-call request. This is not proof against conceptual overfitting or unknown model pretraining exposure.

The compiled post-call request exactly matches the tested v10 request, SHA-256 `fe92ced03d819a9350d3debac2fa29684ca809637de1e8bcb8914f0b50657d14`. Screening v99's initial request remains unchanged, SHA-256 `0aee52064eb005c04fe8e22297bb2a6747b9ab217dff234f3620af2b99887e26`.

`npm run check` passes typecheck, 191 unit tests and build. `npm run test:firebase` passes 154 emulator tests. The observation mapper self-checks, script syntax checks and whitespace checks also pass. These are software and synthetic text checks, not voice or real-call evidence. Press-1 acceptance, fixed destination, bounded timers and failure behavior are unchanged.

The complete round contains 14 scored runs and 2,311 trials, with two retained timeouts (one development control and one FTC case) and no final no-decisions. Immutable local snapshots are under `artifacts/screening-hardening/charge-only-v126-snapshot/` and `charge-contact-v127-snapshot/`, with adjacent SHA-256 inventories. `charge-contact-ledger.json` records each run, result hash and audit. `charge-contact-release-checks.json` records the exact compiled-request match and required software checks.
