# Direct decisions and contact priority

October 13, 2026. Eight scored runs / 2,020 trials on subscription GPT-6 Luna medium. V141 tests a substantially shorter direct-decision prompt; v142 adds two independent priority observations. Neither is adopted. V142 stops every intended development block but loses ordinary callers and useful clarification. Runtime screening remains v134, post-call filtering v10, and the separate deployed release v31 / voicemail v4. This round makes no deployment, voice test, phone call or forwarding change.

## The experiment

The [preceding audit](SCREENING-PURPOSE-CONTRACT-AUDIT.md) leaves v139 as an imperfect structured comparison. Its mapper depends on correctly observed context; it cannot substantiate a relationship inferred from a name. This round tests whether a simpler, ordered policy lets Luna make better decisions with less schema overhead.

V141 asks directly for the production decision, with one additional fact about an earlier phone interaction. The offline mapper enforces trusted callback caution and the question limit. Production evidence, schema, identity and purpose validation still applies. Its instruction and tool payload totals 6,918 characters, 42.7% below runtime v134's 12,069.

V141 development results show that direct instructions alone do not reliably enforce charge and empty-contact priority: some alarms are saved or questioned, one is approved, and empty invitations receive questions. V142 therefore adds independent transaction and contact-invitation observations. An unexplained alarm or empty outside-contact invitation overrides the proposed action to a scam block. Other decisions retain the v141 guards. V142 totals 8,275 instruction/tool characters, 31.4% below runtime. These are character comparisons, not measured token or cost savings.

Both changes use the existing general policy and development failures. Public results and fresh validation supply no prompt wording. Each candidate and its request are frozen before its fresh evaluation. No application policy or runtime guard changes.

## Development

Both candidates run the same 196 scenarios twice. The main benchmark remains 24 cases; the larger wrapper is separate.

| Development | v141 | v142 |
|---|---:|---:|
| Original strict outcomes and sequences | 354/392 | 360/392 |
| Intended ordinary live offers | 136/142 | 125/142 |
| Intended ordinary notices saved | 26/26 | 26/26 |
| Ordinary false blocks | 0 | 2 |
| Intended completed blocks | 135/164 | 164/164 |
| Trusted-caution checks | 26/28 | 25/28 |

The ordinary denominators exclude charge alarms historically categorized as legitimate. Intended blocks include cases accepting either block or hold. The strict score preserves every original sequence expectation, including cases requiring a question before a harmful reply: blocking the incomplete opening does not pass that sequence merely because a later prepared reply would be harmful.

V142's contact observation sometimes treats a request to speak on the current incoming call as an invitation to start a separate outbound contact. It prematurely blocks incomplete openings that should receive one question. It also asks unnecessary questions about already explained billing, completed refunds and ordinary work. The two versions sometimes treat work follow-ups as references to an earlier phone interaction, causing unnecessary caution holds; another caution case receives an unnecessary question. The local guards enforce their inputs, but those inputs are not always correct.

Both versions block two older SSA trials whose original expected outcome remains a saved notice. These are a prior-policy mismatch, not evidence of ordinary callers being rejected. [SSA's guidance](https://www.ssa.gov/faqs/en/questions/KA-10018.html) distinguishes legitimate agency contact from threats, suspension claims and immediate-payment demands; [SSA OIG's warning](https://oig.ssa.gov/scam-alerts/2025-11-12-unexpected-letter-text-or-email-from-the-social-security-administration-office-of-inspector-general-think-scam-first/) describes fabricated legal trouble used to induce contact. The original labels and strict scores remain unchanged. No agency-specific prompt rule is added.

## Fresh validation

Two independently authored 24-scenario sets run twice, each against its frozen candidate and v139. Prepared future replies, labels and IDs stay outside model input. Both sets are now spent and must not guide further prompt wording.

| First fresh set | v139 | v141 |
|---|---:|---:|
| Strict outcomes and sequences | 47/48 | 44/48 |
| Ordinary live offers | 19/20 | 19/20 |
| Ordinary notices saved | 4/4 | 4/4 |
| Intended blocks, including two advertisements | 18/18 | 15/18 |
| Caution checks | 4/4 | 4/4 |

V141 questions an empty return-contact request twice and saves an unexpected-charge alarm once. It also asks for identity already supplied by an official role. V139 unnecessarily asks for a name despite a stated shared social relationship. These expectations remain appropriate and the misses are retained.

| Second fresh set | v139 | v142 |
|---|---:|---:|
| Strict outcomes and sequences | 44/48 | 43/48 |
| Ordinary live offers | 17/20 | 15/20 |
| Ordinary notices saved | 4/4 | 4/4 |
| Ordinary false blocks | 3 | 3 |
| Intended blocks, including two advertisements | 18/18 | 18/18 |
| Caution checks | 4/4 | 4/4 |

Both versions prematurely block an incomplete incoming-call opener twice and a substantive refund callback once. Those calls should receive clarification. V142 additionally questions an ordinary security review in an established app twice. V139 blocks another incomplete sensitive opening instead of asking and then holding after refusal. None of those expectations is changed to accommodate the model.

The first set draws general mechanisms from the [FBI's September 17 impersonation warning](https://www.ic3.gov/PSA/2026/PSA260917) and a [self-reported business-listing call discussion](https://www.reddit.com/r/Scams/comments/1u7l9e4/our_business_keeps_getting_spam_phone_calls_from/). The discussion is anecdotal, not verified fraud or prevalence evidence. The cases pair concealment, device intervention, contact invitations and marketing with ordinary service, personal and notice contexts. No public script is reproduced. The current FTC unwanted-call index was also reviewed; an index does not establish exhaustive coverage of new scams.

All 31 questions in the fresh runs receive manual review. None asks for secrets or payment. Some repeat supplied identity or ask about the recipient instead of the missing action, and some unnecessary questions follow adequate ordinary explanations. Successful prepared replies alone do not establish conversational quality.

## Public regressions

V142 runs all 320 MASC and 724 distinct FTC openings once. V139 below is the preceding round's recorded result, not a new paired public run. These public sets are repeated regressions, not unseen holdouts.

| MASC | Earlier v139 | v142 |
|---|---:|---:|
| Ordinary callers offered | 78/80 | 63/80 |
| Ordinary saved instead | 0 | 10 |
| Ordinary falsely blocked | 2 | 6 |
| Ordinary questioned | 0 | 1 |
| Harmful calls stopped | 159/160 | 155/160 |
| Harmful calls questioned | 1 | 5 |
| Harmful approvals or saves | 0 | 0 |
| Advertisements blocked | 40/40 | 40/40 |

V142's six ordinary blocks use the solicitation reason. One first proposes approval with that incompatible reason twice, is rejected by production validation, and finally blocks. This exposes a generic action/reason feedback limitation; it does not justify changing the public label. V142 does not record an independent automation observation, so the reasons behind its ten saved ordinary calls cannot be established from the retained facts alone. Existing caller-only assessments support retaining the ordinary expectations on previously investigated cases. There are no new unscored model diagnostics or label changes this round.

| FTC, 724 distinct openings | Earlier v139 | v142 |
|---|---:|---:|
| Completed stops | 596 | 514 |
| Unverified saved notices | 119 | 205 |
| Questions | 4 | 5 |
| Approvals | 3 | 0 |
| Retained timeouts | 2 | 0 |
| No-decisions | 0 | 0 |
| Source-call-weighted stops, /1,378 | 1,144 | 1,021 |
| Source-call-weighted saves | 210 | 352 |
| Source-call-weighted approvals | 8 | 0 |

V142 immediately blocks all three known charge sources, 166, 1100 and 1314. That success does not outweigh ordinary-call regressions or establish a general solution. Saved notices are unverified and receive no scam-stop credit; questions remain distinct from completed stops. Zero approvals is not equivalent to identifying every scam.

## Verification and provenance

V141 passes 126 local mapper assertions. V142 passes 670 including the parent checks. A 12-request local subscription-adapter mock verifies charge/contact precedence, ordinary approvals, caution, useful clarification, evidence rejection and the unanswered-question guard. It makes no external model request.

`npm run check` passes typecheck, 198 unit tests and build. The first Firestore run passes 153/154 and encounters the recurring closed-transaction error in concurrent stopped-total backfill. One full repeat passes 154/154. The first failure remains; no code on that path changes and the error is not claimed fixed.

All eight runs are terminal, with no transport failures or final no-decisions. The first development launch failed before target creation because the isolated wrapper lacked an existing local import; unchanged dependencies were restored before inference began. No completed model outcome is retried. Independent audits verify hashes, original labels and sequences, and recompute decision metadata and actions. Runtime ordinary and caution initial request hashes remain unchanged.

The v139/v141/v142 requests have no detected normalized twelve-word public passage or complete short opening across the 1,044 pinned public inputs. A separate twenty-word development/public comparison also finds no match. Some longstanding main-benchmark scenarios cite public guidance and recording sources, so the development corpus is not claimed wholly independent of public sources. These checks detect direct copying, not conceptual overfitting or unknown pretraining exposure. Public caches, outputs and source text remain ignored; none is copied into prompts or this report.

Local `direct-policy-ledger.json`, `direct-policy-checks.json` and `direct-policy-question-review.json` preserve the results. `direct-policy-snapshot` and `direct-priority-snapshot` preserve both frozen workspaces with adjacent SHA-256 inventories. The exact result aggregation includes five caution misses that an earlier working note overlooked; original results and scores never change.

The direct architecture is rejected for this task. The stronger next starting point is the structured observation approach, with development-based attention to who is being asked to initiate contact and what establishes a relationship. This is an unresolved semantic problem, not something a valid tool schema can guarantee. The goal remains unfinished; these text checks cannot establish 100% real-world confidence.
