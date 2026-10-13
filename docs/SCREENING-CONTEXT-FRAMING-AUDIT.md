# Context, framing and contact audit — October 13, 2026

This continues the [schema and contact-scope audit](SCREENING-SCHEMA-CONTRACT-AUDIT.md). All external inference uses subscription **GPT-6 Luna, medium reasoning**. Runtime v99, post-call v7 and deployed v30 remain unchanged. The owner-authorized public FTC exception applies; no private transcripts, audio, paid API, phone calls or deployment are involved.

## What the failures mean

The original [v79 analysis](SCREENING-V79-REPAIR.md) identified a named callback being treated as a personal relationship. The same semantic error recurs in the structured-observation experiments: the model can report `context: personal_caller` for a name plus an unexplained contact request. The mapper then correctly applies the declared category. Schema validation and a supported quote cannot establish that the category itself is true.

Ordinary-call misses have a different cause: the model sometimes classifies a caller's report or warning as an instruction to perform the reported act, or fails to recognize an explicitly stated relationship or requested service. A family invitation, completed repair callback and report of a rejected scam are valid ordinary controls; these failures are not relabeled to make a score improve.

One historical development expectation is out of date: a recorded planned outage is labeled for a live offer. Saving that useful notice matches the owner's newer policy. The original expectation and strict score remain unchanged, with the mismatch reported separately. The original FTC family-only greeting also remains in the benchmark with its source label; it lacks text-visible harmful conduct and should not receive a special blocking rule.

## Frozen experiments

| Version | Change | Focused development, 104 trials | Broader development, 130 trials |
|---|---|---:|---:|
| v111 control | Previous request and mapper; schema correction v1 | 98 | — |
| v118 | Evidence quote for ordinary context; correction v2 | 92 | 128 |
| v119 | Existing opening question and caller perspective in the input wrapper | 98 | 127 |
| v120 | Only the `separateContact` field description, based on v111 | 98 | 127 |
| v121 | Rename personal category to `caller_relationship_stated`, based on v120 | 96 | 129 |

The focused set combines the existing 28-case argument-contract and 24-case contact-migration development fixtures. It has two repetitions. The broader set has one repetition. These are repeated known callers, not population-level accuracy estimates. Every completed outcome is retained.

V118 is rejected: grounding a quote did not improve interpretation and increased ordinary false blocks and unnecessary questions. Its instructions and tool definition total 8,219 characters.

V119 preserves v111's decision instructions, schema, mapper and correction feedback. It adds only a constant identifying Shield's existing opening question and the incoming caller's perspective. It does not assert that every recording waited for the greeting. The original input wrapper remains byte-for-byte unchanged by default. Local mocks verify both wrapper modes and native conversation history. The ordinary-report false blocks and named empty-contact approval remain, so this framing is not selected.

V120 keeps the original wrapper and changes only one field description: contact outside this incoming call is classified by function and independently of its purpose. Ordinary callbacks can therefore have separate contact and ordinary context simultaneously. The request grows by **120 characters**, to **7,940 characters including tools**, 34.2% below v99. This is character size, not a measured token or dollar saving. The decision mapper, fields, instructions and validation rules remain unchanged. Its named empty-contact approval and ordinary-call development misses prevent promotion despite better fresh results.

V121 tests whether the category name itself encourages confusing a private individual with a stated relationship. The mapper normalizes the new enum back to the old category, with equivalent actions and caution handling checked locally. It adds no decision rule or field. The broader development set improved to 129/130, with only the historical outage-label mismatch. However, focused ordinary false blocks increased and the new validation still includes an empty-contact approval; renaming alone is not a complete fix. V121 is rejected without another full public run.

## Fresh validation and useful questions

The 24-case context-grounding validation was authored after v118 froze, before its inference was inspected. The later 16-case privacy-and-authority set was authored after v119 froze. V120 was developed only from the known development fixtures and froze before either set's individual outcomes were inspected. No validation outcome changed v120.

The privacy set is informed by a recent [anonymous consumer report](https://www.reddit.com/r/Scams/comments/1vz8omp/us_almost_fell_for_a_crazy_ftc_chinese_police/) describing screening evasions, authority claims, isolation and screen sharing, checked October 13, and the FTC's [guidance on isolation tactics](https://consumer.ftc.gov/consumer-alerts/2025/11/agent-told-me-stay-internet-it-scam). The report is anecdotal, not verified prevalence evidence. The fixtures use invented callers and general mechanisms; no report transcript is sent to Luna.

| Combined fresh sets, two repetitions | v111 | v119 | v120 |
|---|---:|---:|---:|
| Expected outcomes and sequences | 78/80 | 78/80 | 80/80 |
| Intended ordinary live offers | 28/28 | 28/28 | 28/28 |
| Intended ordinary notice saves | 10/10 | 10/10 | 10/10 |
| Harmful/unwanted completed blocks | 28/30 | 28/30 | 30/30 |
| Harmful approvals | 0 | 0 | 0 |
| Empty requests held instead of blocked | 2 | 2 | 0 |
| Clarifying questions | 24 | 24 | 24 |

The held empty requests never offered a live connection, but they failed the intended immediate-stop behavior and are not reported as blocks. All 24 questions per version occurred where the fixed scenario required clarification. Manual review found questions about missing purpose or intended action, without requests for secrets or proof. Some questions combined the general subject and required action, so successful sequence scoring is not proof of optimal wording. Native replies are supplied only after an actual question; future answers never enter an opening request.

V120 also passed all 32 main/caution checks: nine intended ordinary live offers, two ordinary notice saves and all nine trusted-caution controls. The main benchmark remains 24 cases; silence is not evaluated by this text adapter.

After v121 froze, a further 20-case relationship-and-name validation was authored without importing either earlier validation set or public callers. V111 passed 38/40 trials and v121 passed 37/40. Both approved the same empty-contact caller in both repetitions. V121 also asked for the name of a caller who described a shared leisure activity. That identity question is defensible in practice; it remains a strict miss against the frozen expectation that the stated social connection suffices. It is not counted as a false block. The ordinary family-invitation and reported-scam blocks in development remain clear errors. These new validation callers cannot be used to rewrite a later prompt.

## Public regression

Public runs retain the pinned 320 MASC rows and 724 distinct English FTC openings, original labels, weights and scoring. Questions, saved unverified notices and completed stops remain separate. The earlier four-action v79 counts are not directly comparable with the current saved-notice policy. FTC contains no ordinary-call control group.

V119's complete MASC run offered 80/80 ordinary calls, blocked 40/40 advertisements, blocked 155/160 harmful callers and questioned five. There were zero harmful approvals, no-decisions or provider failures. Six invalid `context` values were corrected within their original evaluations, each ending in a block. This is a correction of tool arguments, not evidence of semantic correctness.

V120 had the same MASC headline counts: 80/80 ordinary offers, 40/40 advertisements blocked, 155 harmful blocks and five harmful questions, with no harmful approvals, no-decisions or provider failures. One invalid context field and one separate mapped-evidence rejection recovered in their original trials. The prior v111 MASC run had 156 blocks and four questions; it is historical, not an interleaved control for this round.

The new v111 FTC control uses the same initial request and mapper as v119, with the original wrapper. All three complete FTC runs have no provider failures or no-decisions. They are separate single passes, not a randomized interleaved comparison.

| FTC outcome, 724 distinct openings | v111 control | v119 framing | v120 contact field |
|---|---:|---:|---:|
| Blocks | 357 | 349 | 344 |
| Saved unverified notices | 351 | 355 | 365 |
| Questions | 11 | 15 | 9 |
| Approvals | 5 | 5 | 6 |
| Source-call-weighted stops, of 1,378 | 637 | 585 | 598 |
| Source-call-weighted approvals | 10 | 11 | 12 |
| Source-call-weighted saved notices | 712 | 733 | 725 |

V111 approved recordings 191, 858, 1164, 1168 and 1184. V119 approved 191, 858, 1164, 1168 and 1173. V120 approved 191, 858, 1164, 1168, 1173 and 1185. The original family-only opening 858 remains a scored benchmark approval despite the owner's family-caller preference. That boundary does not explain away the other approvals. No public outcome was retried for replacement credit, and no public wording or identity was added to a prompt.

The known charge openings 166 and 1100 were saved unverified by all three versions. Opening 1314 was saved by the control and questioned by both revisions. None of these three was approved, and none is credited as a completed stop. Saving an unresolved prerecorded alarm follows the newer notice policy; these results cannot be represented as three immediate scam blocks. V119 and v120 each corrected one mapped-evidence rejection within the original FTC trial; v111 required none.

**No semantic candidate is promoted.** V120's 80/80 fresh result is encouraging, but its named empty-contact development approval, ordinary false blocks and weaker FTC comparison remain. The wider quote, framing and enum changes do not resolve those errors. Successful schema correction and deterministic action priority preserve useful pipeline safeguards; they cannot repair every wrong interpretation. Further work needs a different, independently validated way of checking the basis for an offer, rather than more edits chosen from these held-out or public outcomes.

## Integrity and software checks

Initial request hashes:

- v111/v119: `6cf6b62fdc69b6f9502d7466e7bbd9ce14c2be3390f2e4312b80e5824fa90ef9`. V119's separately versioned input framing is additional behavior, recorded in the transport manifest and source hashes; matching initial hashes do not imply identical inputs.
- v118: `347fe440e8855e863f47db54c2e2e7d68af87ca55c6463a0200cf40bfe47ee8c`.
- v120: `38d14620ae3379cafe5a4a975f8a7feb5edce750707ae0a03d50e5bbc39bab21`.
- v121: `3bcbbfee79c5ae2a27bd5c0187938da44c9ebd83e2478af02eba51c965712b6f`.

Audits verify source/request hashes, identities, unchanged expectations, future-turn boundaries, mapper output, bounded clarification and original schema-issue diagnostics. Public artifacts retain no caller quotes. Passage matching includes the new input framing as well as instructions and tools: no normalized twelve-word public passage or complete short opening matched the checked requests. This does not rule out conceptual overfitting or unknown model pretraining exposure. Repeated public benchmarks are regressions, not fresh holdouts.

Typecheck, 191 unit tests, build and 154 Firestore emulator tests passed. Local mocks passed both input modes, native history, seven mapper requests, ten progress-guard requests and 52 schema-correction requests. V118's context guard and v121's enum normalization also passed their local checks. These tests do not establish voice or real-call performance.

The round completed **23 scored runs and 4,204 trials**, including repetitions and overlapping callers, with zero final provider failures or no-decisions. Every run has a recomputed validation summary and content-free argument audit. The four durable `observed-v118-context-snapshot` through `observed-v121-context-snapshot` directories under `artifacts/screening-hardening/` have adjacent SHA-256 manifests; all 3,090 files were verified. `context-ledger.json` records each request, result, summary and audit hash. Caches, source snapshots and evaluation logs remain ignored.

The runtime initial request remains `0aee52064eb005c04fe8e22297bb2a6747b9ab217dff234f3620af2b99887e26`. No inference jobs remain. No production code, main-benchmark expectation or previously evaluated held-out fixture was changed in this round. The three new validation sets stay frozen for future evaluation, never prompt tuning.
