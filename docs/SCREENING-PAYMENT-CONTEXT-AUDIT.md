# Payment, contact and action audit — October 13

This round improves the experimental empty-contact and payment boundaries but does **not** select a replacement for the v31 decision instructions or post-call v7. V97 is the strongest fresh screening result in this round, yet it loses ordinary live offers on MASC and saves an unsolicited recorded upgrade in an existing development suite. V98's extra action definitions do not resolve that tradeoff. A separate runtime defect is fixed as repository version **v99**: unanswered clarification can no longer be replaced by a routine decision on unchanged evidence. Deployment remains on v30.

All inference uses subscription GPT-6 Luna at medium reasoning. The owner-authorized public FTC/NC State exception applies; no private recordings, paid API inference, voice tests, real calls or deployment are involved. The newer saved-notice requirement remains in force: unresolved recorded account alerts may be saved unverified, and are never counted as scam stops. This report continues the [post-call v7 audit](SCREENING-MESSAGE-CONTACT-RELEASE.md).

## Development and prompt changes

The new [payment development fixture](../scripts/fixtures/redteam/payment-context.mjs) was written from general requirements, with expected actions fixed before inference. It contains 12 payment-information snapshots, 12 collection snapshots, four empty-contact controls and four two-turn conversations. Each ran three times. The live/recorded snapshot pairs have the same core wording; the recorded version explicitly identifies automation. The unmarked version's live label does not by itself prove interactivity to the model. We preserve those strict offer expectations and report mistaken message decisions separately; we do not credit them as offers.

V31 saved the optional recorded payment offer in all three trials and sometimes questioned its live counterpart. It blocked all firmly worded collection requests in this fixture. A name-only contact request was approved three times; the other empty-contact controls were questioned. This supports a general requested-conduct distinction, rather than a new brand or scam-script rule.

| Frozen screening request | Instruction characters | Strict payment-development passes | Unwanted requests blocked | Ordinary outcomes: offered / saved / questioned / held |
|---|---:|---:|---:|---:|
| V31 baseline | 10,410 | 70/96 | 37/54 | 15 / 22 / 3 / 2 |
| V95 | 9,216 | 80/96 | 51/54 | 11 / 22 / 6 / 3 |
| V96 | 5,588 | 92/96 | 54/54 | 20 / 22 / 0 / 0 |
| V97 | 5,817 | 89/96 | 54/54 | 17 / 25 / 0 / 0 |
| V98 | 5,892 | 88/96 | 54/54 | 16 / 25 / 1 / 0 |

Of the 42 ordinary trials, 18 explicitly recorded notices should be saved and 24 should be offered. The 54 unwanted trials include empty contact. None of these runs had an inference failure.

- [V95](../scripts/experiments/distilled-screening-v95.mjs) removes the appended reference sheet, adds the empty-contact rule and clarifies optional payment. It still saves the optional recorded collection offer three times and adds ordinary-call friction.
- [V96](../scripts/experiments/distilled-screening-v96.mjs) rewrites the five-action policy around stated context and requested conduct. It retains useful notices, ordinary callbacks, useful questions, payment protection, manipulation protection and recent-scam caution. In the separate existing 58-case development set, it passes 114/116 trials but falsely blocks one healthcare demographic check and one vague private-office opener.
- [V97](../scripts/experiments/distilled-screening-v97.mjs) distinguishes routine healthcare identity checks from secrets, privacy from concealment, and information from inferred automation. It passes 171/174 broad development trials. Remaining misses are an unresolved live financial opener approved once, a third-party emergency held before clarification once, and an ordinary native follow-up blocked once. Its instructions are 44.1% shorter than v31; instructions plus tools are 35.9% shorter.
- [V98](../scripts/experiments/distilled-screening-v98.mjs) narrows the recording criterion and aligns action/`hasReason` descriptions. Its basis is v97's development misses, not public or fresh-held-out caller wording. It still mistakes informational live callers for recordings and introduces a main-suite sales-notice regression. Extra tool descriptions are not automatically safer.

The prompt experiments change no model, reasoning setting, production tool schema or application timer. These files only construct offline requests. Every request has its own version and frozen hash. The subsequent runtime guard is documented separately below; the reported prompt comparisons retain their original, unguarded runtime.

## Fresh comparisons and useful questions

The [64-case v97 validation](../scripts/fixtures/holdout/lean-context-release-validation.mjs) was authored after v97 was frozen, then run three times for both v31 and v97. Expected sequences, groups and IDs stay outside model input. Prepared replies appear only after an actual question, in the same native assistant/tool history.

| Fresh result | V31 | V97 |
|---|---:|---:|
| Strict sequence passes | 145/192 | **192/192** |
| Ordinary live snapshots offered | 42/48 | 48/48 |
| Ordinary native conversations offered | 12/12 | 12/12 |
| Explicit notices saved | 24/24 | 24/24 |
| Empty contact blocked | 0/36 | 36/36 |
| Explicit harmful snapshots blocked | 35/36; one held | 36/36 |
| Harmful native conversations blocked | 12/12 | 12/12 |
| Recent-caution sequences correct | 20/24 | 24/24 |
| Inference failures | 0 | 0 |

V31's 36 empty-contact outcomes were 23 questions, six saved messages, four holds and three approvals. V97's 24 native conversations all asked before seeing the prepared answer and then reached the expected terminal decision. Manual review found relevant missing-purpose questions, with a few unnecessary identity/recipient references. Correct action sequences do not establish perfect question wording or adaptive conversation quality.

The independently written [48-case v98 validation](../scripts/fixtures/holdout/lean-action-release-validation.mjs), also frozen before inference, scored 142/144 versus v31's 108/144. V98 offered 35/36 ordinary live snapshots, saved 18/18 notices, blocked 24/24 empty invitations and 30/30 explicit harmful snapshots. Its eight native conversations passed 23/24 trials: one vague opener was held before clarification, so the later prepared override was never exposed. One ordinary healthcare demographic request was falsely blocked. Recent-caution behavior passed 12/12. V31 offered 29/36 ordinary snapshots and blocked 5/24 empty invitations. Both prompts had zero inference failures.

These validation results were not used to revise either prompt. The different fresh sets do not form a paired v97-versus-v98 comparison.

## Main suite and older service controls

The main benchmark remains 24 cases. Its 23 spoken cases ran three times using native history; the silence timer is a deterministic application check, not a text-model result. V97 passed 69/69. V98 passed 66/69, saving the unsolicited energy-program recording on all three trials. Its saved result is a failure, not a scam stop.

The pre-existing 22-case existing-provider/healthcare development adapter preserves original expectations. V31 passed 62/66 versus v97's 58/66. Both saved the explicitly automated outage reminder on all three trials, a historical expectation mismatch under the newer notice policy. Apart from that difference, v31 falsely blocked one service call with an add-on offer; v97 saved an ordinary live billing notice twice and the unsolicited recorded upgrade three times. All 12 v97 service-with-add-on trials were offered. The recorded-upgrade failure is a genuine regression against the v31 comparison and cannot be excused as a notice-policy difference.

## Public benchmarks

Each candidate runs MASC's 320 test conversations and the 724 distinct English FTC recordings once. The fixed historical v31 pass supplies the baseline; it is not a new matched rerun. Public sets are repeatedly used regression checks, not unseen tests. No source label is changed after seeing the outcome.

| MASC | V31, historical | V97 | V98 |
|---|---:|---:|---:|
| Ordinary live offers | 71/80 | 68/80 | 67/80 |
| Ordinary saved messages | 2/80 | 8/80 | 11/80 |
| Ordinary blocks | 7/80 | 4/80 | 2/80 |
| Harmful stopped | 153/160 | 157/160 | 156/160 |
| Harmful questions | 6 | 3 | 4 |
| Harmful approvals | 1 | 0 | 0 |
| Harmful saved messages | 0 | 0 | 0 |
| Sales blocked | 40/40 | 40/40 | 40/40 |
| Evaluation failures | 0 | 0 | 0 |

Fewer ordinary blocks are useful, but saved messages are not live offers. Neither candidate preserves the baseline offer count. MASC joins caller turns from a completed conversation and omits the recipient replies; this limits its ability to represent live interactivity. That presentation limitation does not erase the misses or justify labeling an ordinary conversation a recording.

An unscored content inventory inspected all 12 v97 ordinary non-offers plus four ordinary offered controls, without sending labels, prior decisions or the candidate prompt. It tagged all 16 as concrete ordinary contexts without an explicit harmful demand or recording/menu cue. All four blocks were tagged as existing service with an additional offer; the original screening reason was solicitation. These model judgments support retaining the failures, not blaming the benchmark or changing its labels. They are not human adjudication or a reconstruction of the original model's reasoning. Diagnostic quotes are discarded after support checking.

V97's FTC pass completed all 724 cases: **417 stopped** (416 blocks, one hold), 301 saved unverified, five questioned, zero approved and one `no_decision` (`robocall-860`). There were zero transport failures. Call-frequency weighting gives 757/1,378 stopped and 612/1,378 saved. The historical v31 comparison stopped 168, saved 543, questioned 12 and approved one; its weighted stop count was 293/1,378.

V98's full FTC pass stopped 315, saved 401, questioned eight and approved none, with no missing decisions or transport failures. Weighted stops were 580/1,378, with 790/1,378 saved. It is weaker than v97 on this run despite its more restrictive action description.

Both previously flagged payment recordings (`robocall-166` and `robocall-1100`) were blocked by both candidates. The known unexpected-charge recording (`robocall-1314`) was saved unverified by both, as required by the newer notice policy. This is neither a live approval nor a scam stop. No public wording was used to make the optional-payment change. The previously approved family opener (`robocall-191`) was held by v97 and questioned by v98; these draws do not establish a general family-impersonation fix.

## Post-call experiment

[Voicemail v8](../scripts/experiments/message-contact-v8.mjs) changes v7's demand wording to requests and explicitly includes optional offers to collect payment on the incoming call. It adds 36 instruction characters, with the same schema, model and one-call decision/summary operation.

On the 32-case payment development set repeated three times, v7 passed 95/96 and v8 passed 96/96. Both kept all 42 ordinary messages; v7 kept one optional collection request. The subsequent [32 fresh cases](../scripts/fixtures/holdout/message-payment-offer-validation.mjs) reversed the comparison: v7 passed 32/32, while v8 passed 31/32 after marking one ordinary family callback as junk. Both removed all eight payment offers and four empty-contact invitations. No failures were retried or replaced. **V8 is not adopted; repository post-call v7 remains unchanged.**

## Recent reports, leakage and checks

October reports still describe repeated messaging-app invitations and unsolicited recruitment robocalls. These are anecdotal reports, not verified prevalence estimates: [October 7 discussion](https://www.reddit.com/r/britishproblems/comments/1x03t23/the_amount_of_calls_from_an_automated_voice/), [October 9 discussion](https://www.reddit.com/r/unitedkingdom/comments/1x1i624/add_me_on_whatsapp_scam_calls_to_be_investigated/). Official guidance also covers [messaging-account recovery-key theft](https://www.ic3.gov/PSA/2026/PSA260626) and [health-insurance impersonation](https://consumer.ftc.gov/consumer-alerts/2026/09/what-know-ahead-open-enrollment-avoid-health-insurance-scams). Fresh probes use independently authored wording for contact bait, recruitment, credentials, account permissions, software commands and payment collection, with ordinary counterparts. Reported calls were not copied into evaluation fixtures.

The boundary audit finds no shared normalized 12-word public benchmark passage or complete short recording in the checked prompt instructions/tools. Expected actions, source groups, case IDs and scores remain outside model input. Each subscription runner executes the local no-inference context-isolation preflight. Public runners and adapters match the Git objects from the initial `dbab083` archive. Source/request hashes, case identities, weights, original labels and recomputed metrics are checked. This does not prove absence of conceptual overfitting or model pretraining exposure.

Before the runtime change, `npm run check` passed typecheck, 183 unit tests and build in a separate clean snapshot, and `npm run test:firebase` passed 154/154. All nine experiment/fixture modules passed syntax checks, and both dialogue/observation self-tests passed. These checks do not validate unrelated dirty iOS/UI work or constitute voice/real-call evidence.

## Runtime fix: preserve unanswered clarification

In the v98 fresh run, the failed two-turn case issued an accepted `continue`, then issued `hold` on the same caller text before returning a question. The prepared second caller turn was never exposed. This was not a refusal or an unsuccessful answer; it was a model changing its decision without receiving one. `ScreeningSession` already prevented the periodic fallback from rechecking unchanged speech, but did not reject this second tool call.

The shared [decision-progress guard](../backend/src/live/decision-progress.ts) now tracks the caller speech present when clarification is accepted. Another approval, hold, message, ordinary block or duplicate clarification on unchanged speech receives an `awaiting_caller_answer` tool result instead. This happens before notice settling can delay it, and is checked again when applying a deferred decision. Punctuation/spacing does not count as an answer. Fresh caller words permit normal re-evaluation. An evidenced `block` with reason `scam` remains immediately actionable, including a correction of an earlier mistaken clarification.

Duplicate requests do not consume another clarification. The existing two-question, twelve-tool-call and overall time limits remain; no rejected decision can connect a call. The subscription adapter uses the same guard and records rejected attempts and `decisionProgressVersion: 1`. Earlier results are unchanged and use the earlier adapter. This is a state-control fix, not a claim that every question or classification is now correct.

The policy version is bumped to `2026-10-13-general-v99` because the runtime now supplies a new corrective tool response. The initial decision request is byte-for-byte equivalent after JSON serialization to v31: hash `0aee52064eb005c04fe8e22297bb2a6747b9ab217dff234f3620af2b99887e26`. None of the lean experimental prompts is installed.

Eight new runtime tests cover unchanged-text approvals/holds/messages/blocks, duplicate clarification, punctuation, fresh replies and immediate scam corrections. Typecheck, **191 unit tests** and build passed. A ten-request local subscription mock verifies the rejected hold/duplicate tool calls, the eventual question, fresh-answer approval and immediate scam correction, with no account inference. The existing eleven-request native-history and one-request isolation mocks also passed.

The [16 fresh protocol cases](../scripts/fixtures/holdout/clarification-progress-validation.mjs), repeated three times through subscription Luna, passed 48/48 with the guard versus 47/48 on the original runtime. The old-runtime miss was an extra question after an ordinary refund explanation. No guard rejection occurred naturally in either model run, so this small score difference cannot be attributed to the guard; the forced local mock and runtime tests establish the correction. The new set checks ordinary answers, explicit harmful answers, refusals, two-question conversations and terminal controls without using the earlier held-out failure to tune a prompt.

The first post-change full emulator run passed 153/154 and repeated the previously documented `INVALID_ARGUMENT: Transaction is invalid or closed` in the unchanged stopped-total integration test. Its failure is retained; it is not attributed to the screening guard. One full repeat passed **154/154**. No counter implementation was changed, and the earlier failure is not erased by the pass.

This round contains 4,186 scored screening trials, 256 post-call assessments and 16 unscored content inventories. These are trial counts, not a count of underlying model requests: conversations can require several requests. There were no inference transport failures; the one FTC `no_decision` remains separate from stops and approvals. An initial observer invocation rejected a legacy fixture lacking its synthetic-capture flag before inference; the ordinary established runner was used instead, and that setup failure is preserved.

Evidence is retained under `artifacts/screening-hardening/payment-context-evaluation-snapshot/`, with the initial check logs under `payment-context-checks/` and the guard under `clarification-progress-evaluation-snapshot/`. The original prompt-evaluation workspace is `/private/tmp/shield-payment-context-n7r6q7ou`. No lean runtime prompt is promoted by this report. The remaining priority is preserving ordinary service and recognizing recorded promotion while retaining the successful empty-contact/payment boundary, using independent development evidence and newly frozen validation.
