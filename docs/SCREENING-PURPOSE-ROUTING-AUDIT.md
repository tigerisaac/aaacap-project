# Purpose and notice routing — October 13

V100–v104 remain offline experiments. V101 fixes the development promotion leak and passes its fresh cases, but loses ordinary MASC offers. V103 recovers all 80 ordinary MASC offers, but approves sales calls, fails one existing recent-caution case and produces 18 public cases with no accepted decision. V104 has the strongest balance in this round, with no unresolved public no-decision outcomes, but retains an empty-contact question, an ordinary caller saved rather than offered, and a sales approval. No replacement for repository v99 is selected.

All model inference uses subscription GPT-6 Luna at medium reasoning. V99 retains v31's initial request and the unanswered-clarification guard. The five-action notice requirement remains in force: an unresolved recorded account alert may be saved unverified, never credited as a scam stop or a live offer.

The starting commit is `6d156b0`. Evaluation runs in an isolated archive with the current clarification guard. The public FTC/NC State transcript exception is owner-authorized; no private transcripts, audio, paid model API, voice testing, phone calls or deployment are involved. Post-call v7 is unchanged.

The later v104 archives start from `fcf16fa`, an intervening iPhone UI commit. The screening/runtime files and initial v99 request remain unchanged; each run records its own source hashes. The original v79 identity-versus-purpose defect and the family-style FTC opening are documented in the [v79 repair report](SCREENING-V79-REPAIR.md). Newer saved-notice requirements change the applicable FTC behavior, so four-action v79 stop counts are not interchangeable with this five-action comparison.

## Development

The previous audit reproduced a recorded promotion being saved by v97 despite an instruction to block unsolicited sales. This round uses the existing payment, private-purpose, existing-provider and healthcare development fixtures: 112 cases, two trials per prompt. Original expectations remain unchanged. In particular, the older automated-outage fixture still expects approval; under the newer product requirement its saved-message outcome is appropriate. Both historical-expectation misses remain in the strict score.

V100 rewrites the policy as an ordered decision list and makes promotion classification precede notice routing. It stops the recorded promotion but falsely blocks vague private-office openers and one normal callback. It is not selected. One subscription evaluation timeout remains a failed trial; it was not retried or replaced.

[V101](../scripts/experiments/distilled-screening-v101.mjs) therefore keeps v97 and changes only its promotion paragraph. The caller must state an ordinary task independent of an offer; claiming an account relationship alone is insufficient. A real service call remains ordinary even with an additional offer. A recording with only a promotional purpose stays a pitch. This is a general distinction supported by existing development cases, not a rule derived from public callers or fresh validation outcomes.

| Development result | V99 current | V97 | V100 | V101 |
|---|---:|---:|---:|---:|
| Strict passes / 224 | 196 | 214 | 209 | 217 |
| Unwanted calls blocked / 92 | 72 | 90 | 91 | 92 |
| Ordinary live offers / 108 ordinary trials | 76 | 77 | 77 | 78 |
| Ordinary saved messages | 29 | 31 | 26 | 29 |
| Ordinary questions | 3 | 0 | 4 | 1 |
| Ordinary blocks | 0 | 0 | 1 | 0 |
| Inference failures | 0 | 0 | 1 | 0 |

The ordinary denominator includes intended recorded notices, so the offer column is not an accuracy percentage. Under the current product requirement, 82 of these trials should be live offers and 26 saved notices; the preserved historical labels expect 84 offers and 24 notices. V101's seven strict misses are three informative live callers saved, one unnecessary question on a completed refund, one vague clinical-records opener approved prematurely, and the two historical outage expectations. These are not erased by stronger aggregate performance.

V97 saves the recorded upgrade twice; v101 blocks it twice. Both offer all eight trials of ordinary service plus an additional offer. V101 blocks every empty-contact and payment-collection development trial. Its instructions are 6,020 characters versus v99's 10,410, **42.2% shorter**; instructions plus tools are 34.2% shorter. It is 203 instruction characters longer than v97.

## Fresh red-team and question review

The [48 fresh synthetic cases](../scripts/fixtures/holdout/purpose-routing-validation.mjs) include ordinary callbacks, service plus optional offers, payment information, saved notices, empty contact, recorded promotion, harmful requests, six two-turn conversations and recent-scam caution. They were authored after v100 froze and before the narrow v101 freeze. No validation inference had occurred, and their content did not inform v101's promotion paragraph. They are now held out from further tuning.

Each prompt ran all 48 cases three times, preserving native assistant/tool history. Prepared replies appear only after a returned question turn. Expected actions, category labels and question rubrics stay outside model input.

| Fresh result | V99 | V101 |
|---|---:|---:|
| Strict action-sequence passes | 111/144 | **144/144** |
| Ordinary live snapshots offered | 30/36 | 36/36 |
| Ordinary two-turn conversations offered | 6/9 | 9/9 |
| Intended recorded notices saved | 18/18 | 18/18 |
| Empty contact blocked | 0/24 | 24/24 |
| Explicit harmful snapshots blocked | 24/24 | 24/24 |
| Promotional snapshots blocked | 12/12 | 12/12 |
| Harmful two-turn conversations blocked | 6/6 | 6/6 |
| Refusal conversations held | 3/3 | 3/3 |
| Recent-caution sequences correct | 12/12 | 12/12 |
| Inference failures | 0 | 0 |

V99's empty-contact outcomes are three approvals, three saved messages, ten questions and eight holds. Its nine ordinary-call misses concern completed payment/refund information. Holds and questions are reported as their actual outcomes, not as successful empty-contact blocking or ordinary offers.

Manual review of v101's 18 native question turns found the relevant missing detail was requested each time. Three also unnecessarily repeated who was calling. Correct action sequences therefore do not establish perfect wording. V99 twice asked for a person's identity when the role was already present and the missing information was the reservation task; the prepared answer was still supplied by the scripted runner. These are prepared-answer diagnostics, not adaptive callers. One baseline snapshot returned a statement after `continue`; it remains a failed ordinary-call trial and is not credited as a useful question.

The clarification guard activated naturally once per prompt. V101 attempted a duplicate continue on unchanged text; it was rejected without consuming another question, after which the model asked the pending purpose question and approved the ordinary reply. V99 attempted to approve unchanged text after continue; the guard rejected it, and the subsequent statement was not a real question. This confirms observable guard behavior without attributing the overall score difference to it.

Both prompts also pass **69/69** main-suite spoken trials: 23 spoken cases three times. The main fixture remains 24 cases; silence is covered by runtime tests. The four saved notices per pass retain their original legitimate/harmful-source categories and are not counted as scam stops.

## Full public comparison

These are matched one-pass runs on the pinned 320 MASC rows and 724 distinct English FTC/NC State recordings, with the existing caller-only adapters and original labels. They are regression checks, not held-out validation.

| MASC | V99 | V101 | V103 structured observations |
|---|---:|---:|---:|
| Ordinary offered / 80 | 72 | 69 | **80** |
| Ordinary saved | 1 | 6 | 0 |
| Ordinary blocked | 7 | 5 | 0 |
| Harmful stopped / 160 | 154 | 157 | 154 |
| Harmful questioned | 6 | 3 | 3 |
| Harmful approved or saved | 0 | 0 | 0 |
| Harmful without a decision | 0 | 0 | 3 |
| Advertising blocked / 40 | 40 | 40 | 31 |
| Advertising approved | 0 | 0 | 4 |
| Advertising without a decision | 0 | 0 | 5 |
| Evaluation timeouts, all groups | 1 | 0 | 0 |

V99's timeout is a wrong-number/policy-difference row, `masc-test-285`; it does not alter the ordinary or harmful denominators. V101's lower ordinary offer count is a material regression even though it blocks fewer ordinary callers: saving a live caller is still a lost live offer.

| FTC / 724 recordings | V99 | V101 | V103 structured observations |
|---|---:|---:|---:|
| Completed stops | 170 | 499 | 334 |
| Block / hold | 169 / 1 | 497 / 2 | 334 / 0 |
| Saved unverified | 544 | 219 | 362 |
| Questioned | 8 | 6 | 16 |
| Approved | 1 | 0 | 2 |
| No accepted decision | 0 | 0 | 10 |
| Evaluation timeouts | 1 | 0 | 0 |
| Call-weighted stops / 1,378 | 305 | 929 | 586 |
| Call-weighted saved | 1,057 | 443 | 727 |
| Call-weighted approved | 1 | 0 | 4 |

V99's first run stopped after 617 completed rows, including the retained timeout on `robocall-967`. A separate completion directory copied that exact byte prefix and the manifest, then requested only the 107 missing rows. The original partial summary remains intact; no outcome was rerun or replaced. The table uses the completed 724 rows once.

Known records `166` and `1100` are saved by v99 and blocked by v101. Record `191` is approved by v99 and held by v101. The charge-alarm record `1314` is saved unverified by both under the later notice requirement. That result is neither a stop nor an approval. The public labels remain unchanged, including where a family-style opener or saved notice is compatible with the owner's product choices.

## Structured-observation experiment

The ordinary-offer regressions motivated an offline architectural diagnostic: have Luna report caller facts, then map those facts to the existing five actions. This tests whether separating interpretation from action priority helps. It is not production integration, and its public comparison was not blind to the earlier aggregate regressions.

An optional interpreter in the subscription adapter applies the frozen mapping before the **unchanged production schema, evidence and unanswered-clarification checks**. A mapper exception or invalid result is rejected. The default adapter path remains unchanged. The model receives no fixture identity, expected action, category or score. Recorded facts retain only enums/booleans; supporting caller quotes are not saved. Trusted recent-caution state comes from the application, not caller speech.

[V102](../scripts/experiments/observed-screening-v102.mjs) scored 109/112 on the existing development suite. It exposed two real errors: a substantive recorded account claim with a callback was treated as empty contact, and a name alone was classified as a personal relationship. The third miss was the preserved historical outage expectation. V102 explicitly rejects recent-caution requests rather than silently claiming support.

[V103](../scripts/experiments/observed-screening-v103.mjs) separates a substantive unresolved claim from missing purpose and requires a stated relationship rather than a name. It also adds an explicit technical-rescue category and trusted recent-call handling. It has 3,685 instruction and 3,511 tool-definition characters: 64.6% fewer instruction characters and 40.4% fewer combined characters than v99. These character counts are not token or cost measurements.

V103 development scored **220/224**. All 82 intended ordinary live trials were offered and all 26 notices saved; 91/92 unwanted trials were blocked. The two actual failures were a private professional-office opener incorrectly treated as a personal relationship, and a sales call incorrectly treated as a concrete existing-service task. The two old outage-label misses remain in the strict score. These interpretation errors persist despite deterministic action priority.

The [40 independently written fresh cases](../scripts/fixtures/holdout/observed-context-validation.mjs) were authored after v103 froze. Three paired passes scored **120/120 for v103 versus 91/120 for v99**. V103 offered all 42 ordinary live trials, saved all 12 intended notices, blocked all 24 empty invitations and all other harmful/promotional trials, and passed all 12 recent-caution trials. All 12 returned native questions asked for a relevant missing detail. Prepared answers are scripted, not adaptive callers; these cases are now excluded from tuning.

The existing main spoken suite passed **23/23**, but the separate existing caution suite passed **8/9**: a returning-call opener was questioned instead of held. The mapper applies caution only when it would otherwise approve, leaving ambiguous returning calls on the ordinary clarification path. This retained miss is not canceled by the fresh caution score.

The public results above explain why v103 is not selected. Four advertising approvals classified promotion as an ordinary service task. Its two FTC approvals are a sales-context error (`64`) and a family-style opener (`191`); both retain the harmful source label. Eighteen other public rows have no accepted decision. Several contain schema-valid observations mapped to a terminal action that was repeatedly rejected. Because those public rows did not retain the adapter's content-free validation-attempt diagnostics or the evidence quotes, evidence rejection is inferred from the recorded fields and validator, not confirmed by replaying the original quotes. Other attempts have invalid observation fields. All 18 remain unsuccessful outcomes, separate from transport failures; the runner's zero exit status is not a claim of perfect completion quality.

## V104: context precision and the evidence contract

An [independent 18-case development extension](../scripts/fixtures/observed-context-development.mjs) separates social relationships from professional roles, existing work from sales, and long ordinary notices from harmful requests embedded in longer speech. V103 passed 35/36 trials. The remaining long-notice trial recorded three rejected evidence quotes despite a correct message action. Unlike the earlier public rows, this synthetic runner retained content-free validation diagnostics, confirming unsupported evidence rather than a mapper-priority error. It did not retain the quotes themselves.

[V104](../scripts/experiments/observed-screening-v104.mjs) narrows the context choices to a social relationship, an existing task, a response to a specific request, an unresolved substantive claim, or missing context. The evidence contract asks for one exact consecutive excerpt and explicitly says it need not cover every observed fact. Evidence validation is unchanged. Recent-call caution now precedes live approval and clarification, after harmful/empty-contact/promotion blocks and recorded-message routing. These changes use the existing development defects, the new independent development controls and the existing caution requirement. No held-out outcome or public caller wording is used to revise v104.

The combined 130-case development suite ran twice: **257/260 strict passes**, with all 94 intended live ordinary trials offered, all 28 intended notices saved, and all 104 unwanted trials blocked. The three misses are the two preserved historical outage expectations and one subscription timeout on a third-party-emergency opener; the timeout was not retried. The main spoken suite then passed **23/23**, and the existing caution suite **9/9**. V104 has 3,798 instruction and 3,875 tool-definition characters: 63.5% fewer instruction characters and 36.4% fewer combined characters than v99. Additional fact fields mean these reductions should not be presented as measured output-token, latency or cost savings.

The [32 new validation cases](../scripts/fixtures/holdout/observed-boundary-validation.mjs) were authored after the v104 request froze and development inference started, before inspecting its development outcomes. Three matched passes scored **95/96 for v104 versus 69/96 for v99**:

| Fresh result | V99 | V104 |
|---|---:|---:|
| Normal-context ordinary snapshots offered / 30 | 24 | 30 |
| Ordinary native conversations offered / 6 | 6 | 6 |
| Recorded notices saved / 15 | 15 | 15 |
| Empty contact blocked / 15 | 0 | 14 |
| Empty contact approved / saved | 2 / 4 | 0 / 0 |
| Empty contact questioned / held | 6 / 3 | 1 / 0 |
| Explicit harmful/promotional snapshots blocked / 12 | 9 | 12 |
| Native expected sequences / 12 | 12 | 12 |
| Recent-caution sequences / 12 | 9 | 12 |
| Inference failures | 0 | 0 |

All 12 v104 native clarification turns ask for a relevant missing detail without repeating answered identity or requesting proof/secrets. Its one extra question is a real empty-contact miss: the observations incorrectly mark the separate-contact request false, so the mapper asks for missing purpose. That is not an approval, but it does not satisfy the requested immediate block. It remains a failed held-out trial and has not been used to revise the candidate. V99's three fresh caution misses hold an ordinary response to a written inquiry, although the caller does not refer to an earlier call.

V104 then completed both full public sets once, with the same request hash, `8cdcf3daafdda9e758392309f457d251f477312b495cef742cabc286ee3d54f8`:

| Public outcome | V99 control | V104 |
|---|---:|---:|
| MASC ordinary offered / 80 | 72 | 79 |
| MASC ordinary saved / blocked | 1 / 7 | 1 / 0 |
| MASC harmful stopped / 160 | 154 | 158 |
| MASC harmful questioned / approved | 6 / 0 | 2 / 0 |
| MASC advertisements blocked / 40 | 40 | 39 |
| MASC evaluation failures | 1 | 0 |
| FTC stopped / 724 | 170 | 342 |
| FTC saved unverified | 544 | 369 |
| FTC questioned | 8 | 10 |
| FTC approved | 1 | 2 |
| FTC evaluation failures | 1 | 1 |
| FTC no accepted decision | 0 | 0 |
| FTC call-weighted stops / 1,378 | 305 | 586 |

The MASC ordinary miss, `52`, is classified as recorded. A literal cue inventory finds no automation, recording or keypad term; that inventory is not a full semantic proof, and the lost ordinary offer remains a failure. Advertising row `94` is classified as a response to a specific request and approved, despite its promotion flag. Its frozen ad-block expectation is unchanged. Deterministic action priority does not remove errors in the model's observations.

Both FTC approvals (`191`, `858`) are classified as personal/social openers. The earlier independent audit of `858` found only a short family greeting and no visible harmful request. These source-labeled scams remain approvals in the table; they are not relabeled, excluded or described as verified ordinary callers. Known alerts `166` and `1100` are saved unverified. Charge-alarm record `1314` is questioned because recording status is classified false; it is neither approved nor credited as a stop. The text-only caller input does not supply the benchmark's known recording metadata.

V104 has **zero no-decision outcomes across the 1,044 public rows**. MASC row `124` first supplied unsupported evidence, then corrected it and blocked on the same evaluation; this is the one rejected tool attempt. FTC had no rejected attempts. Correcting an unapplied tool call within the same bounded evaluation is not a completed-outcome retry. This is one observed pass, not proof of universal evidence reliability. One FTC subscription turn failed (`148`) after 124 completed rows. A new completion archive verifies the prior source/request hashes and exact row prefix, carries the failure unchanged, and requests only the 600 missing identities. Six local negative checks reject changed request hashes, counts, duplicate identities, unknown identities, altered call weights and modified prefix bytes. The completed result retains the failure and the exact original byte prefix. No completed outcome is retried.

## Recent reports and evaluation boundaries

[Ofcom's October 2 warning](https://www.ofcom.org.uk/phones-and-broadband/scam-calls-and-messages/beware-of-job-offer-and-missed-call-scams) describes automated job offers and missed-call bait that encourage a callback. The new probes use independently written invitations and recruitment counterparts, not reported transcripts. The official warning does not establish the share of Shield's future calls that will be scams. The checks also exercise mechanisms in [September government-impersonation guidance](https://www.ic3.gov/PSA/2026/PSA260917) and [account-permission phishing guidance](https://www.ic3.gov/PSA/2026/PSA260901).

A later source check found an [August 2026 honeypot preprint](https://arxiv.org/abs/2608.24127) reporting repeated scripts, identity-information requests and stronger prediction after several caller turns than from the first line. Only its abstract was reviewed; its recordings/transcripts were not downloaded or evaluated. Its population and escalation task differ from Shield's, so its statistics cannot estimate Shield's accuracy or scam prevalence. It reinforces the limitation already exposed by the family-style FTC opening: an innocuous opening cannot establish what the caller will request later.

Before primary public inference, 16 runner, adapter, runtime and compiled-source files were hashed; the separate v103 public run froze 14 and each v104 public archive froze 15. Request and fixture hashes were frozen separately. Normalized overlap scans find no shared 12-word public benchmark passage and no complete short recording in v99, v97, v100, v101, v103 or v104 instructions/tools. Labels, IDs, expected outcomes and scores remain in the scorer; each subscription target runs the local isolation preflight. This does not rule out conceptual overfitting or model pretraining exposure. Public benchmarks are repeated regression checks, not unseen holdouts. The same evaluator authored the fresh synthetic cases while knowing the general failure categories; they are new utterances, not a blinded or representative real-call sample. Source hashes, dataset identities, input hashes, original labels, weights, sequence scores and aggregate results were independently recomputed after the runs.

## Local checks

The initial sandboxed `npm run check` passed 183 tests but could not start the APNs localhost mock (`listen EPERM`); its failure is retained. Re-running with localhost permission passed typecheck, **191 unit tests** and build. `npm run test:firebase` passed **154/154**. A final repository check after adding v104 also passed 191 unit tests, typecheck and build. The optional adapter interpreter passed a seven-request local mock covering valid mapping, evidence rejection, mapper exceptions and malformed mapped decisions. The isolation, native-history and clarification-progress mocks also passed. V102, v103 and v104 have 58, 81 and 101 deterministic mapper checks, respectively. All new experiment and fixture modules passed syntax checks. These checks do not establish voice or real-call performance.

## Evidence checkpoint

The round contains **6,626 scored trials across 26 completed runs**, retaining four evaluation timeouts, one failed subscription turn and 19 no-decision outcomes. The 617-row v99 FTC prefix and 124-row v104 FTC prefix are counted only within their completed 724-row results, never twice. Rejected tool calls corrected inside a single evaluation are distinct from those terminal failures.

The ignored `artifacts/screening-hardening/purpose-routing-ledger.json` lists each result/audit hash. Frozen source and result copies are retained under `purpose-routing-evaluation-snapshot`, `observed-context-evaluation-snapshot`, `observed-v103-evaluation-snapshot`, `observed-next-evaluation-snapshot`, `observed-v104-evaluation-snapshot` and `observed-v104-completion-evaluation-snapshot`, with adjacent SHA-256 manifests. Local check logs are in `purpose-routing-checks`. The continuation file records that the goal remains active, no inference job is running, and v105 is the next unused experiment version.

V104 is the most promising development direction in this round, not a production-ready replacement. Further work must preserve ordinary callbacks and useful questions while testing general context/recording distinctions on independent development material. Do not revise this candidate from its fresh validation or public caller wording, erase the retained failures, weaken evidence checks, or treat a saved notice as a completed scam stop.
