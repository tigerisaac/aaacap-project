# Schema correction and contact scope — October 13, 2026

This continues the [caller-attribution audit](SCREENING-ATTRIBUTION-AUDIT.md). Every external inference uses subscription **GPT-6 Luna, medium reasoning**. Repository runtime v99, post-call v7 and deployed v30 remain unchanged. No paid API, Go, voice session, phone call, forwarding change or deployment was used.

The improvement with the clearest evidence is a repair to the offline subscription adapter: malformed observation fields now receive useful, content-free correction feedback. The semantic prompt revisions remain experiments; their fresh ordinary-call and harmful-call failures are retained. A successful correction of invalid JSON fields does not imply that the model interpreted the caller correctly.

## Contract repair

The previous v110 MASC run had three no-decision outcomes following repeated invalid observation arguments. Its diagnostics did not retain the original field or schema issue, so that run cannot establish which field failed. The new adapter records only trusted field names and fixed issue codes. It never records rejected values, unknown property names or free-form schema messages. Invalid observation input is rejected even if a permissive mapper would return an otherwise valid approval.

V111 preserves v110's initial request and mapper exactly, adding versioned corrective tool feedback. Its new complete MASC run had three natural `context/invalid_value` rejections. All three were corrected on the next tool attempt within their original evaluations, ending in blocks. There were zero final no-decisions or provider failures. Those observations identify the new errors, not the exact cause of the old v110 failures. A fourth rejection concerned mapped evidence validation rather than an invalid observation field.

A local transport mock also confirmed that Codex's schema normalization removes `maxLength`, while the application's validator still enforces it. Correction version 2 supplies the trusted type, enum and length constraints when relevant. It does not change the initial request. The natural MASC errors above were enum errors, not evidence of a length failure.

The local mock passed 52 requests covering wrong types, enum values, missing fields, unknown keys, overlong quotes, unsupported evidence, privacy canaries, legacy feedback and the adapter's twelve-attempt bound per decision turn. Corrections consume no clarification and cannot bypass evidence validation. The old default feedback remains unchanged unless explicitly opted in. These are local protocol tests without external inference. The text adapter's per-turn timeout and retry bound are not a voice-session timing test; production separately enforces the whole-call deadline and tool-call limit.

## Development revisions

The independent 28-case argument-contract fixture contrasts a caller's own harmful request with reports, warnings and refusals, ordinary service and personal context, current automation and native clarification. It imports no public or held-out cases. The unchanged 130-case development set remains a separate regression.

| Version | Argument-contract trials | Broader development | Change |
|---|---:|---:|---|
| v110 control | 81/84 | Earlier round | Original observation request |
| v111 | 79/84 | — | Schema correction only |
| v112 | 79/84 | 253/260 | Distinguish the caller's request from reported conduct |
| v113 | No inference | No inference | Version 2 constraint feedback; same initial request as v112 |
| v114 | 80/84 | 257/260 | Clarify that abbreviated identities answer Shield's greeting |
| v115 | 77/84 | 251/260 | Separate identity and purpose enums; rejected |
| v116 | 80/84 | 256/260 | Include interference directed at the screener |
| v117 | Contact grid: 70/72 | 255/260 | Define contact outside the call by its function |

V112 includes one retained subscription evaluation timeout. The others in this table completed without provider failures. Repetitions are trials, not independent callers.

V115's broader run approved one named empty-contact request and one explicit screening override. Its otherwise successful continuation tests do not erase those failures. V116 returned to v114's schema and made screening interference an explicit restricted act. It still held one unexplained group invitation and one ordinary private assessment call. The other two broader misses are historical expectations that offer a recorded outage notice; saving those notices is appropriate under the owner's newer policy. Original labels and strict scores remain unchanged.

V117 replaced the contact-channel list with a general definition: an invitation to start or continue contact outside this incoming call, independently of purpose. The instruction and tool definition together are 8,118 characters, **32.7% below v99**, ten characters below v116 and 298 above v111. This is character size, not a measured token or dollar saving. Request hash: `dceadaecca70595bd9568e7c002c78eec127b557f9b13c0041e4b839bad850b1`.

The new 24-case contact-migration development set passed 70/72 trials: one empty connection invitation was questioned, and one ordinary family invitation was blocked. Ordinary context remains necessary; recognizing a request to move channels is not enough if the model misses a stated relationship.

V117's broader run also approved one named empty callback after inferring a personal relationship, questioned one bare chat invitation and one ordinary report, and retained the two historical outage-label misses. This does not fix the original empty-contact issue reliably. The main/caution run passed 31/32: all nine intended ordinary live offers, both ordinary notice saves and all nine caution cases passed. One legal-alarm recording was blocked as a threat rather than saved unverified. Its source is harmful, but the conservative notice-policy expectation remains `message`; the strict miss is retained and is not a lost ordinary caller.

## Questions and fresh validation

A separate sixteen-case continuation fixture gives ordinary callers natural replies if Shield asks for identity or purpose. These are extensions of development callers, **not fresh validation**. Original single-turn expectations and misses remain unchanged. V111 passed 47/48 conversations, with one ordinary report blocked. V115 and v116 each passed 48/48, offering all 30 intended ordinary calls and stopping all twelve unwanted trials. This shows that some unnecessary questions recover after a reply; it does not make those first questions useful.

The 24-case scope validation was authored after v114 froze and before its inference results were inspected. V116 and v117 were developed from the separate development sets. V117 froze before the v116 validation failures were inspected. No validation outcome changed a later prompt in this round.

| Two repetitions of the same fresh callers | v111 | v116 | v117 |
|---|---:|---:|---:|
| Complete expected outcomes and sequences | 48/48 | 46/48 | 46/48 |
| Intended ordinary live offers | 16/16 | 16/16 | 15/16 |
| Ordinary notices saved, including caution | 8/8 | 7/8 | 8/8 |
| Harmful/unwanted completed stops | 18/18 | 17/18 | 17/18 |
| Harmful approvals | 0 | 1 | 1 |
| Native expected sequences | 8/8 | 8/8 | 8/8 |
| Questions asked | 12 | 12 | 13 |

Both newer candidates approved one optional payment collection. V116 additionally offered a prerecorded confirmation after classifying its automation as merely discussed. V117 instead unnecessarily questioned an ordinary report of a fraudulent recording. All four empty-contact trials were blocked by every version. These fixed expectations remain sensible for the chosen product policy; the misses are not relabeled as benchmark errors.

Manual review found that most fresh questions addressed missing purpose or intended action, without requesting secrets or proof. V117's extra question repeated an already supplied purpose. One v116 financial-alarm question asked for both the transaction and the intended action when the latter alone would have sufficed. Presence, sequence and question limits are scored mechanically; this question-quality review is separate.

After the final prompt freeze, a further sixteen-case fixture was independently written from the FTC's [September enrollment warning](https://consumer.ftc.gov/consumer-alerts/2026/09/what-know-ahead-open-enrollment-avoid-health-insurance-scams) and the FBI's [messaging-account recovery-key warning](https://www.ic3.gov/PSA/2026/PSA260626). It pairs these mechanisms with ordinary family reports, booked services, useful notices and callbacks. Source transcripts and earlier held-out cases are not imported. V111 passed 30/32: every harmful/empty-contact case was blocked, but one booked benefits-counseling confirmation was blocked and one ordinary clinic call questioned.

V117 passed 32/32 on this further fixture: twelve ordinary live offers, four saved notices and sixteen harmful/empty-contact blocks. Combined fresh results are therefore 78/80 for each version, with different errors. V111's two failures concern ordinary service callers; v117 has one unnecessary ordinary-report question and one harmful payment approval. Equal aggregate scores do not make these tradeoffs equivalent or establish an unqualified improvement. The synthetic author knew earlier failure categories; these are new callers, not a blinded or representative real-call sample.

## Public regression and selection

Public runs use unchanged source revisions, labels, membership and weights. Saved unverified notices and questions are never counted as completed stops. The original v79 four-action counts cannot be compared directly with this newer five-action saved-notice policy. The [v79 report](SCREENING-V79-REPAIR.md) explains its named empty-contact error and the FTC family-only opening; no special rule for that public opening is added here.

V111's complete MASC run offered 80/80 ordinary calls and blocked 40/40 advertisements. Of 160 harmful callers, it blocked 156 and questioned four, with no harmful approval, saved notice, no-decision or provider failure. This is a new run with versioned correction feedback; v110's earlier three no-decisions remain in its historical score.

V117 likewise offered 80/80 ordinary calls and blocked 40/40 advertisements. It stopped 157/160 harmful callers and questioned three, with zero harmful approvals, saved notices, no-decisions or provider failures. All 320 first observation calls passed validation; no schema correction was needed in this run. The three harmful clarifications receive identification credit under the existing scorer but are not completed stops. These full-conversation text results do not measure early interception during streaming speech.

The full FTC run completed with no provider failure or no-decision. The v110 column below is historical, with its original feedback; it is not an interleaved control or a new v111 FTC run.

| FTC outcome, 724 distinct recordings | Historical v110 | v117 |
|---|---:|---:|
| Completed blocks | 347 | 297 |
| Saved unverified notices | 361 | 409 |
| Questions | 13 | 12 |
| Approvals | 3 | 6 |
| Failures / no-decisions | 0 / 0 | 0 / 0 |
| Source-call-weighted stops, of 1,378 | 601 | 504 |
| Source-call-weighted approvals | 8 | 12 |
| Source-call-weighted saved notices | 728 | 821 |

Fifty previously blocked recordings became saved notices. In 44, the recorded fact changed from `prohibited: threat` to `none` while context remained `substantive_claim`; two similarly lost a secrets flag and four lost a promotion classification. This describes the observed classifications, not hidden model reasoning or an adjudication that all changed notice outcomes are wrong. Four previous notices became blocks. Saved notices never receive completed-stop credit.

The six approvals were recordings 191, 858, 1164, 1168, 1173 and 1185. The model classified the first two as personal callers and the other four as ordinary tasks, without current automation. All retain their harmful source labels and count as benchmark approvals. Recording 858 is the original family-only opening: reliably rejecting it from those words would conflict with the owner's family-caller preference. That boundary does not excuse the other approvals or justify relabeling the dataset.

Known charge recordings 166 and 1100 were saved unverified; 1314 was questioned. None was approved, but none counts as a completed stop. As established in the previous audit, 1314's text lacks the literal automation/menu cues checked by the fixed inventory; audio provenance is not part of this text input. No special charge-recording or public-ID rule was added. One FTC mapped-evidence rejection was corrected within its original evaluation, without an invalid observation field.

**No semantic candidate is promoted.** V117 preserves ordinary MASC offers and improves the recent-pattern ordinary controls, but still approves a named empty contact in development and a payment request in fresh validation, and has more FTC approvals. V111's schema feedback improves diagnosability and recovered malformed arguments in this run, but its ordinary-report and service false blocks remain. The next work requires independent development and new validation; neither new held-out fixture may feed prompt wording.

## Integrity and software checks

Frozen requests, source hashes, labels, future-turn boundaries, outcomes and scores are retained. Audits recompute mapped actions, verify original schema issue fields/codes and reject saved caller quotes in observations. Labels, expected actions, IDs and prepared future replies are not model input. No completed bad outcome is rerun or replaced.

Both v111 and v117 initial requests have no normalized twelve-word match to any of the 1,044 public benchmark callers and no complete match to a short opening. This does not establish absence of conceptual overfitting or model pretraining exposure. The public sets are repeated regressions, not fresh holdouts.

Typecheck, 191 unit tests, build and 154 Firestore emulator tests passed. The initial sandboxed test attempt failed because the local APNs mock could not bind its loopback socket; the authorized rerun passed. The schema-correction mock and existing mapper/progress mocks passed. The initial runtime request remains `0aee52064eb005c04fe8e22297bb2a6747b9ab217dff234f3620af2b99887e26`.

The round contains **24 scored runs and 3,624 trials**, including repetitions and overlapping callers. One development subscription timeout remains scored; there are zero final no-decisions. Every run has a recomputed validation summary and content-free argument audit. Durable source/results snapshots are under `artifacts/screening-hardening/observed-v*-schema-snapshot/`, each with an adjacent SHA-256 manifest. `schema-ledger.json` records request, result and summary hashes. Public caches, result files and logs remain ignored. No production source, main-benchmark label or held-out expectation changed.
