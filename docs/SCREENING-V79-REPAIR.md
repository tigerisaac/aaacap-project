# V79 identity and contact repair — October 2026

Offline experiment on subscription GPT-6 Luna, medium reasoning. The application policy, deployment, forwarding and voice configuration are unchanged. Comparisons use the preserved four-action runtime, not the application's independently updated saved-message flow.

## What went wrong

The named empty-contact failure was an accepted approval, not a rejected tool call. In a separate diagnostic, v79 approved it twice and blocked it once. Its brief reported decision basis treated a named caller's callback request as an ordinary personal purpose. The first revision, v80, removed harmful approvals in the focused development run but reduced ordinary offers from 60/63 to 53/63. Some diagnostics then discounted a stated friendship or requested service task. V80 is rejected.

These diagnostic requests add a brief decision-basis field that is stripped before validation. They change the tool contract and are unscored. Their explanations describe those diagnostic decisions; they do not reveal the reasoning behind earlier benchmark decisions.

FTC recording 858 presents a different problem. The available full text and screening opening are identical: 32 characters, six words, consisting only of greetings, a family address and social conversation. There is no text-visible harmful request. A relationship-only social caller is allowed by the owner's chosen policy. Blocking this particular opening reliably would require rejecting ordinary family greetings or using information unavailable to the screener. Its source label, membership and score remain unchanged, and it is not added as a prompt example. The new v79 control questioned it rather than approving it. No transcript or contact detail is reproduced here.

## Evaluation boundaries

The owner authorized the public FTC/NC State dataset despite the repository's default prohibition on real-transcript evaluations. No private call data, phone calls, paid API inference or voice inference was used. Subscription requests expose only inert screening tools; research is unavailable. The local mock preflight checks that unrelated repository instructions, expected labels and evaluation metadata do not enter model context.

The 48-case development fixture retires the previously reported v79 validation into known development, as requested by the owner, and retains four older reported failures. Labels are unchanged. Three repetitions per prompt are repeated trials, not independent callers. The main 24-case benchmark is unchanged.

Public regression retains all 320 MASC identities (80 ordinary, 160 harmful, 40 advertisements and 40 wrong numbers) and all 724 distinct English FTC/NC State robocall openings. FTC has no ordinary-call comparison group. Questions, completed stops, approvals and incomplete evaluations are reported separately. Benchmark identification credit for a question is not a completed stop. Public data are known regression material after many prior iterations, not fresh holdout evidence.

All requests, source files, fixture expectations and result identities are frozen or audited. Completed outcomes and failures are retained. There are no outcome-based retries. Cumulative snapshot checks and conversations retaining assistant/tool history are reported separately; final outcomes alone do not establish that the first clarification was appropriate.

## Selected candidate and development

**V84 keeps v79's decision instructions byte-for-byte.** Its only behavioral change is a description on the existing `purpose` tool field:

> A personal name is identity, not a personal relationship. A name plus a bare contact request has unknown purpose, not personal.

The policy version is `2026-10-12-distilled-v84-experiment`. No tool fields, allowed actions, validator logic or inference settings change. The original ordinary-call consistency check and identity description remain. Trusted caution context is preserved.

Instruction length remains 6,913 characters. Instructions plus serialized tools grow from 8,539 to 8,683 characters: **144 characters, 1.7%**. This is character size, not a measured token or billing estimate. The normal request hash is `340ea2ffb050c2908efe5f0f2eb24f5ea9d054b394f0179f849c29884e9b25d5`; the caution request hash is `960b232170c387ba0fef1a09402e5374d2b413d7308484dd0b1332224d6f5a32`.

All tested alternatives remain available. V80 rewrote the ordinary paragraph and removed the final consistency check; v81 consolidated identity and contact rules; v82 emphasized the sufficiency of a claimed relationship or task; v83 ordered the decisions as four steps. These broader changes lost ordinary callers and are rejected. V84's smaller tool-description change performed better in development.

| Known development | Ordinary offered | Harmful stopped | Ordinary blocks | Harmful approvals |
|---|---:|---:|---:|---:|
| v79 control paired with v80 | 60/63 | 62/66 | 3 | 3 |
| v80 | 53/63 | 64/66 | 7 | 0 |
| v79 control paired with v81 | 58/63 | 63/66 | 5 | 3 |
| v81 | 55/63 | 66/66 | 6 | 0 |
| v79 control paired with v82 | 58/63 | 62/66 | 4 | 1 |
| v82 | 55/63 | 64/66 | 7 | 0 |
| v83, two repetitions, no new paired control | 32/42 | 44/44 | 6 | 0 |
| v84, two repetitions, no new paired control | 42/42 | 44/44 | 0 | 0 |

There were no evaluation failures in development. V84 passed 94/96 overall: two repeated refusal snapshots remained in clarification. Those snapshots omit prior assistant history; the native-history check separately tests whether a refusal after an actual question is held. The two-repetition candidates must not be presented as matched three-repetition improvements over one chosen v79 control. The fresh paired comparison uses equal repetitions and alternating version order.

The first 42 unused synthetic callers were drafted after the v81 freeze. They were never evaluated or used to revise v82–v84. Thirteen additional callers were authored after v84's final freeze, before inference. Together they form a 55-case fresh validation set, including three trusted-caution controls. Its author is not blinded, and related failure categories were known; this is not an independent real-world population sample. No fresh outcome was used to change v84.

## Final validation

The native-history check completed 30 conversations per prompt: six prepared callers, five repetitions. **Both v79 and v84 passed all 30 complete expected sequences**, not merely final outcomes. Each offered 15/15 ordinary trials, stopped 10/10 harmful trials and held all five unresolved refusals. Neither had a missing question or question-budget overrun. These are synthetic text conversations with prepared replies, not voice or real-call validation.

MASC completed all 320 identities for each prompt. V84 offered 79/80 ordinary calls versus 80/80 for the new v79 control. V84 blocked ordinary appointment case 33; this is retained as an error. Earlier v79 evidence offered 79/80, but that does not erase the current comparison's one-call loss. V84 stopped 157/160 harmful cases and questioned three, with no harmful approval and no evaluation failure. V79 stopped 156/160, questioned three and retained one evaluation timeout. Both blocked 40/40 advertisements. The timeout receives no identification or stop credit and was not retried.

The 55-case fresh comparison completed **330 paired trials**, with three repetitions per prompt and no evaluation failures:

| Fresh synthetic comparison | v79 | v84 |
|---|---:|---:|
| Ordinary offered, including staged callers | 66/66 | 66/66 |
| Ordinary blocked | 0 | 0 |
| Empty-contact snapshots blocked immediately | 28/30 | 30/30 |
| Empty-contact snapshots approved / questioned | 1 / 1 | 0 / 0 |
| Harmful/unwanted trials stopped, including staged callers | 70/72 | 72/72 |
| Harmful/unwanted trials approved | 1 | 0 |
| Incomplete opening snapshots correctly questioned | 11/15 | 12/15 |
| Trusted-caution controls passed | 9/9 | 9/9 |
| Native complete expected sequences | 30/30 | 30/30 |

The fixed harmful/unwanted group includes unsolicited sales as well as harmful requests; it is not a measured fraud prevalence sample. V79 approved one empty Spanish callback and questioned one named, unexplained request. V84 blocked both and all other empty-contact snapshots. Both blocked all five native empty-contact follow-ups and approved all five native completed-refund conversations.

Both prompts approved the identity-missing repair opener in all three repetitions. V79 additionally approved a vague office opener once. These remain failures against the frozen clarification expectations; do not claim every unclear caller was handled correctly. Each prompt also questioned the refusal in all three cumulative snapshot trials; both correctly held it in all five native-history trials. Final non-context questions totaled 15/156 for each prompt, but those equal totals hide different decisions. The snapshot expected sequence passed 15/18 for each, versus 30/30 with native history.

Both public runs passed the final source, request, membership, label and result audits. Each ran once per prompt; no resumption or completed-trial retry was needed.

| Public benchmark, one pass | v79 control | v84 |
|---|---:|---:|
| MASC ordinary offered | 80/80 | 79/80 |
| MASC harmful identified, including questions | 159/160 | 160/160 |
| MASC harmful stopped | 156/160 | 157/160 |
| MASC harmful questioned | 3 | 3 |
| MASC harmful approved | 0 | 0 |
| MASC retained evaluation timeouts | 1 | 0 |
| MASC advertisements blocked | 40/40 | 40/40 |
| FTC completed stops | 707/724 | 709/724 |
| FTC questions | 16 | 13 |
| FTC approvals | 0 | 2 |
| FTC no-decision outcomes | 1 | 0 |
| FTC identified, including questions | 723/724 | 722/724 |
| FTC source-call-weighted stops | 1,344/1,378 | 1,344/1,378 |
| FTC source-call-weighted approvals | 0/1,378 | 12/1,378 |

All FTC completed stops were blocks. The v79 no-decision outcome is recording 39; it gets no success credit even though the runner reports it separately from provider failures. Both prompts blocked the original unexplained-charge recording 1314. Total MASC questions across all groups were five for v79 and six for v84.

V84's approvals were recording **858**, the family-style greeting discussed above, and recording **89**, an anonymous broadcast lacking enough ordinary context to approve. Recording 89 represents eleven source calls. That approval is an error, not a result to discard or relabel. A separate unscored diagnostic with the decision-basis field produced a question for v79 and a block for v84; it did not reproduce the approval and does not explain the exact original reasoning or erase the benchmark miss. The family greeting remains labeled and scored as a benchmark failure too, despite its compatibility with the owner's family-call preference.

The known 245-case broad regression offered **100/101** ordinary calls, stopped **112/117** harmful calls, passed **9/9** caution controls and had no evaluation failures. Its only ordinary block was the independent-review notice. It retained the known claimed-lawyer/relative-trouble approval and four harmful callers in clarification. All 23 text-bearing cases of the unchanged 24-case main benchmark passed, including 11/11 ordinary offers and 12/12 harmful stops; silence is outside this text adapter.

The earlier v79 broad run offered 98/101 ordinary calls, stopped the same 112/117 harmful calls and had the same one harmful approval. Case metadata and fixture hashes match exactly, but this is a historical comparison, not a newly interleaved control. Historical alarm-label mismatches remain in the broad set unchanged. Two cumulative snapshot cases accumulated three questions; these snapshots lack assistant history and do not establish a native-history or live question-budget failure.

## Recommendation

Keep **v84 as the better observed empty-contact candidate**, with its normal-call context intact. It stopped every empty-contact trial in its development and fresh validation, while matching v79's 66/66 fresh ordinary offers and all 30 native expected sequences. The minimal field clarification is preferable to the broader rewrites tested here.

Do **not** call it a complete reliability fix or an unqualified public-benchmark improvement: the new MASC control offered one more ordinary call, FTC identification is one lower, the weighted stop count is unchanged, and the anonymous-broadcast approval is unresolved. Identity-missing openers and the known third-party emergency case also remain weaknesses. No prompt change followed the fresh/public results. Further work needs newly frozen validation rather than tuning to these callers. The family greeting should not receive a special blocking rule merely to reach 100% on FTC.

## Leakage, software checks and limits

The request-difference audit confirms that the `purpose` description is the only difference between the frozen v79 and v84 normal requests, and likewise for the caution requests. A normalized 12-word overlap scan found no public benchmark passage in either prompt's instructions plus tools. Three FTC openings shorter than 12 words, including the family greeting, were additionally checked for an exact normalized full-text match; none appeared in either prompt. Expected labels, case identifiers and acceptance lists remain in the scoring process, outside inference inputs.

These checks do not establish absence of conceptual overfitting or model pretraining exposure. The public benchmarks have been used repeatedly, and the synthetic author knows prior failure categories. No benchmark text, names, brands or case-specific examples were added to the candidate.

`npm run check` passed typecheck, 176 unit tests and build. The first sandboxed attempt could not bind the local APNs mock server (`EPERM`); the authorized rerun passed. `npm run test:firebase` passed all 142 emulator tests. These checks cover the shared application checkout at the time they ran, including work committed separately by others. Additional unrelated application edits appeared afterward and are not validated by those earlier checks. The isolated evaluation sources remained unchanged. Prompt and fixture modules were also imported by the evaluation runners. No voice checks or deployment ran, as requested.


## Saved evidence

The complete source/runtime snapshot and every audit are retained under `artifacts/screening-hardening/v79-repair-evaluation-snapshot/`. The original working directory was `/private/tmp/shield-v79-repair-yzm_62cx`, built from the previous isolated v74-repair snapshot; it keeps the earlier four-action live runtime and the frozen public-runner cloud dependencies. Application v31 was not substituted into these comparisons.

Principal evidence roots inside the snapshot are `artifacts/v79-v80-development/`, `artifacts/v79-v81-development/`, `artifacts/v79-v82-development/`, `artifacts/v83-development/`, `artifacts/v84-development/`, `artifacts/v79-v84-validation/`, `artifacts/v84-regression/`, `artifacts/v79-control/` and `artifacts/v84-public/`. The run ledger totals **3,779 scored trials plus 26 unscored diagnostic decisions**. These include repeated and overlapping callers, not 3,805 independent cases. No completed failure was retried or removed. Execution logs, including the initial sandbox-limited software check, are retained under `artifacts/screening-hardening/v79-repair-logs/`. The copy audit verifies every saved file against its original.

All five candidates, including the rejected alternatives, and both fresh fixture modules are retained. The main benchmark was not enlarged. Unrelated application/design work is excluded from this task's commit. Nothing was deployed.
