# Production screening candidate

October 13, 2026. The owner requested one lean generalist policy using the existing runtime, fresh complete conversations, recent online scam patterns and both public benchmarks, all on subscription GPT-6 Luna at medium reasoning. **The single selected candidate is v158. Text validation is complete. It was subsequently deployed to the existing pilot with owner approval at 19:58 Central; see [STATUS.md](STATUS.md). This does not establish broad real-call reliability.**

## What changed

`backend/src/live/policy.ts` now contains a direct five-action decision prompt. It retains the established v134 tool schema, evidence checks, unanswered-question and transcript-freshness guards, fixed recipient, press-1 acceptance, timers and failure fallbacks. It does not introduce the experimental observation mappers from earlier rounds. Post-call v10 is unchanged.

The candidate stops unsolicited unexpected-charge alarms and empty outside-contact invitations before routine-notice handling. It preserves concrete personal/service callbacks, ordinary receipts and refunds, and useful clarification. Recorded notices need evidence of automation: formal language or a concatenated transcript alone is insufficient. An independent existing-service task remains ordinary even if an optional offer accompanies it; a provider name alone does not exempt an unsolicited pitch. A harmless preliminary step does not resolve a sensitive claim's requested outcome. The voice instructions remove the unsupported assumption that most callers are ordinary and allow a backend-requested question despite superficial who/why information.

The decision instructions contain **9,284 characters versus v134's 10,410: 10.8% shorter**. Unchanged tool metadata adds 1,659 characters, making the combined request 10,943 versus 12,069: 9.3% shorter. These are character counts, not token costs. Trusted recent-scam caution adds the same 453 characters to either version.

Frozen normal request SHA-256: `1f1857285f7864ff9226368cf69b5165259c6efbdffa85ce5345c63ee8e72240`. Caution request: `db9b7a45f2749f0bccbd164849b64c4ab26594f61444e8490e940d263d9b1166`. The execution snapshot hashes 545 source files, with the later adaptive runner and fixture frozen separately; current source and frozen request must match at final audit.

## Service policy and benchmark departures

These choices define the service; they do not change original benchmark labels or success credit:

- **Unexpected-charge alarms stop**, even if informational or directing independent review. This intentionally also stops an unauthenticated genuine bank's unexpected-charge alarm. Preserve expected purchases, agreed renewals, completed refunds, existing-service billing and a personal caller discussing their own trouble.
- **Empty outside-contact invitations stop.** A name, job title, supposed prior contact or promise to explain elsewhere supplies neither a personal relationship nor a concrete ordinary task. A normal callback with that context may pass. An incomplete live opening without an outside-contact invitation receives clarification.
- **Unsolicited ads, polls, political pitches and fundraising stop**, whether or not a dataset calls them fraud. A service task that stands independently of an incidental offer remains ordinary.
- **Ambiguity merits useful clarification**, not an automatic scam verdict. Ask the missing identity, purpose or required action, at most twice; hold unresolved callers. Holding after an explicit refusal may happen after one question. A question is not a completed stop, and two is a ceiling, not a target.
- **Useful recorded notices are saved unverified**, after block checks. Saved notices are neither live offers nor scam stops. A supplied callback or keypress alone is insufficient to identify fraud. Explicit non-charge security notices may be saved; unknown recording status is not an excuse to divert an ordinary live caller.
- **Ordinary family and personal conversation may be offered without proof.** A claimed relationship does not prove identity. A scammer whose available opening is indistinguishable from an ordinary family caller may be offered; later connected-call protection is separate and requires consent. Acceptance always requires the recipient pressing 1.

MASC supplies complete synthetic dialogues, with all caller turns concatenated; it is not an early-call or interactive test. FTC supplies robocall openings, has no legitimate controls and cannot reveal whether a recording would answer a question. Neither estimates the pilot's scam prevalence, precision or production latency. We preserve the raw offer, stop, saved, question and failure counts rather than reporting one misleading accuracy percentage.

## Iteration and evaluation provenance

V155 and v156 were lean rewrites, at 6,332 and 7,079 instruction characters. Known development exposed ordinary-care/renewal mistakes, override approvals and question defects. V156's 96/96 fresh action sequences did not outweigh its development regressions; manual question review also found topic-only questions and one pronoun reversal. Its FTC run was deliberately stopped after 222 completed rows, all retained as an incomplete run. Those FTC outcomes did not inform v157.

V157 returned to narrower changes of the established prompt: 9,228 instruction characters. Its new conversation and online sets reached all 92 intended final outcomes, with three strict-sequence misses from reasonable early holds. However, MASC offered only 52/80 ordinary callers, saved 22, blocked five and questioned one. A separate caller-only categorical inventory found no explicit recording indicator for any of the 28 ordinary misses, and an independent service task in all five blocked calls. This is supporting same-model evidence, not independent human adjudication. We treated the routing results as defects, not acceptable score exclusions.

**V158's general recording-evidence and mixed-service clarification followed that public diagnostic.** This is a documented departure from the usual no-public-feedback workflow under the owner's request to diagnose and repair general service failures. No public quotation, case-specific example, source label, ID or exception was inserted. The reused public sets are regression tests, not independent validation, and a copy scan cannot establish absence of conceptual benchmark influence. The earlier fresh sets are spent; they are not counted as unseen v158 evidence.

V158's new fixture, `scripts/fixtures/holdout/production-conversations-v158.mjs`, was authored after the source freeze and before inference: 40 cases, including 20 staged conversations, run twice. Twenty single-message contrasts cover live/recorded routing, ordinary callbacks, notices, contact bait, charge alarms, unsolicited pitches and trusted recent-scam context. Prepared answers appear only after an actual question; terminal decisions prevent future-answer exposure. Generated question meaning is reviewed separately. These are complete scripted screening conversations, not adaptive human simulation, audio or connected-call monitoring.

The existing 245-case development adapter retains its original expectations, including expectations that predate current charge/notice policy. The main benchmark remains 24 cases. Subscription transport mocks verify medium reasoning and isolation from repository notes, evaluator labels, case IDs, rubrics and future replies. The transport differs from production Responses in tool-schema strictness, output framing and timeout; production argument/evidence validation still runs. No paid API, Go, voice test, phone call, forwarding change or private transcript evaluation occurred.

## Online redteam provenance

The advisories below supplied general behaviors for independently authored synthetic probes, not new real caller transcripts or policy examples:

- [Ofcom, October 2, 2026: job-offer and missed-call scams](https://www.ofcom.org.uk/phones-and-broadband/scam-calls-and-messages/beware-of-job-offer-and-missed-call-scams): callback/contact bait whose harmful purpose is withheld, contrasted with ordinary appointment and requested-application callbacks.
- [FBI IC3, September 17, 2026: official impersonation](https://www.ic3.gov/PSA/2026/PSA260917): false authority, isolation and later payment demands, contrasted with ordinary government logistics and practical help.
- [FBI IC3, December 19, 2025: messaging impersonation](https://www.ic3.gov/PSA/2025/PSA251219): apparent familiarity and voice messages used to build trust, contrasted with normal personal contact and reported scam experiences.

The prompt uses direct objectives and constraints, consistent with [OpenAI's reasoning guidance](https://developers.openai.com/api/docs/guides/reasoning-best-practices). This is design guidance, not measured performance evidence.

## Results

V158 fresh scripted validation reaches **80/80 intended final outcomes** and **76/80 strict sequences**. All four strict misses are early holds after an explicit refusal, a service-policy allowance recorded before inference. Results: 30/30 ordinary live offers, 6/6 ordinary notices saved, 28/28 scam blocks, 8/8 ad blocks, 4/4 unresolved holds and 4/4 caution controls. No provider failures, absent questions or budget overruns occur. Repetitions are not independent callers.

Manual review of all 44 question turns finds two pronoun reversals and one identity-only callback question whose prepared answer also supplies purpose. Some refund questions omit the transaction basis, and several use third-person references to the caller. Therefore 80/80 final actions does **not** mean every question was good. A separately frozen 16-profile adaptive-caller test, twice each, passes **32/32 final outcomes**: 16 ordinary offers, 12 scam blocks, two ad blocks and two unresolved holds, with no provider failures. It reviews all 33 question turns. One official-call question reverses roles; the caller explicitly queries the meaning and supplies its actual requested action. Several questions still use third person. In this test, a subscription Luna caller sees its fictional profile and actual questions, while screening sees only the opening and actual replies. Same-model simulation is not independent human realism; harmful profiles are required to retain their harmful intent rather than invent a benign task.

The separate MASC first-turn diagnostic runs all 80 ordinary-source openings once with the unchanged v158 request: **72 offers, six questions, two blocks, no saved notices or provider failures**. This supports input-format sensitivity, but is not a replacement score or completed-conversation success: no replies to those six questions were tested, and two false blocks remain by the original labels. The official benchmark still uses all concatenated caller turns. The diagnostic does not justify waiving its six saved ordinary callers.

Final MASC: **69/80 ordinary offered, six saved, three blocked and two questioned**. Harmful calls: **157/160 stopped** (155 blocks, two holds), three questioned, none approved or saved. **40/40 advertisements blocked**. No provider failures or no-decisions. The six ordinary saves and three ordinary blocks remain misses by original labels; two questions may be useful, but are not successful offers. The separate first-turn diagnostic cannot erase these outcomes. An unscored, quote-supported categorical check finds independent service tasks in the two appointment blocks and only basic name/address/tracking requests in the delivery block and the two opening-only delivery blocks. Quotes were checked against the input in memory and not logged. This supports treating them as real misses rather than declaring a full-identifier or solicitation exception; it remains a same-model description, not independent human adjudication.

Final FTC: **530/724 completed stops** (524 blocks, six holds), **146 saved unverified**, **47 questions**, **zero approvals**, and **one retained subscription timeout**. There are no no-decisions or other outcomes. All three known unexpected-charge recordings (`166`, `1100`, `1314`) block immediately. Call-weighted stops are **1,007/1,378**, with 266 weighted saves and zero approvals. Questions and saves receive no completed-stop credit. The 47 questions may be appropriate requests for missing context, but these recordings cannot supply an answer in this text test; the runtime's later outcome was not measured.

| Final v158 evaluation | Ordinary live offered | Ordinary notices saved | Harmful completed stops | Ads blocked | Other results |
|---|---:|---:|---:|---:|---|
| Fresh scripted, 40 cases × 2 | 30/30 | 6/6 | 28/28 | 8/8 | 4 unresolved holds; 4 caution controls; 76/80 strict, 80/80 intended final actions |
| Fresh adaptive, 16 profiles × 2 | 16/16 | — | 12/12 | 2/2 | 2 unresolved holds; 32/32 final outcomes |
| MASC, 320 cases once | 69/80 | 6/80 ordinary-source calls | 157/160 | 40/40 | 3 ordinary blocks, 2 ordinary questions; 3 harmful questions; no harmful approvals |
| FTC, 724 recordings once | No legitimate controls | — | 530/724 | Included in stops | 146 unverified saves, 47 questions, 0 approvals, 1 timeout |

**Recommendation:** keep v158 as the one runtime-compatible candidate for a controlled pilot, and stop shortening or adding clauses in this round. It implements the owner's charge/contact policy and preserves all ordinary outcomes in the new scripted and adaptive sets. This is evidence for taking it forward, not proof of reliability on every caller. The public ordinary-routing misses and the development friend false block are genuine limitations; do not call them policy departures or claim that ordinary callers were completely preserved. I do not recommend a broad production rollout on this evidence. The next engineering improvement should supply trustworthy recording/turn-taking state and improve question delivery, rather than turn individual benchmark misses into more prompt examples. That follow-up is not implemented or deployed by this task.

Retained earlier screening results:

| Candidate | Development strict, normal / caution | Ordinary development outcomes | Harmful development outcomes |
|---|---:|---|---|
| v155 | 207/236; 9/9 | 86 offers, 10 saves, 3 blocks, 2 questions | 108 stops, 6 questions, 3 offers |
| v156 | 204/236; 9/9 | 82 offers, 11 saves, 7 blocks, 1 question | 109 stops, 5 questions, 1 save, 2 offers |
| v157 | 211/236; 9/9 | 88 offers, 10 saves, 3 blocks | 107 stops, 6 questions, 3 saves, 1 offer |
| v158 | 211/236; 9/9 | 87 offers, 7 saves, 3 blocks, 4 questions | 108 stops, 7 questions, 2 saves, no offers |

V158's two charge-alarm blocks among ordinary-source development cases match the owner's explicit choice; the other ordinary block, a known church friend referring to the recipient's list, remains a genuine false block. Four unnecessary ordinary questions also remain, including healthcare demographics and notice handling. The harmful cohort has no approvals, but its questions and two unverified non-charge notice saves are not completed stops. Historical source categories and expectations remain unchanged.

For historical context, the earlier five-action v31 run offered 71/80 ordinary MASC calls, saved two and blocked seven; it stopped 153/160 harmful MASC calls and 168/724 FTC recordings. This is a historical comparison on a different run/runtime snapshot, not a fresh paired experiment or evidence of statistical significance. The older four-action prompt results are not interchangeable with saved-notice routing.

V157 public results: MASC 52/80 ordinary offers, 22 saves, five blocks, one question; 157/160 harmful stops, two questions and one no-decision; all 40 ads blocked. FTC 485/724 stops (484 blocks, one hold), 225 saves and 14 questions, with no approvals or provider failures. The three known unexpected-charge recordings all stopped. Weighted stops: 939/1,378. These results remain unchanged.

V157 fresh complete conversations: 45/48 strict sequences and 48/48 intended final outcomes; 24 ordinary offers, 16 scam blocks, four ad blocks and four unresolved holds. The separate new online contrasts passed 44/44 strict sequences: 14 ordinary offers, four ordinary saved notices, 20 scam blocks and six ad blocks. No failures, missing questions or question-budget overruns occurred. Manual review found relevant missing-fact questions, with occasional third-person phrasing and refund questions that did not explicitly request the transaction basis supplied by the prepared answer.

## Separate post-call diagnostic

Unchanged post-call v10 assessed the same opening text of all 225 FTC cases saved by v157: **63 removed, 162 kept**, no provider failures. This is a second-stage text assessment, not recording ingestion or a completed live stop, and does not change the 485-stop screening score. Kept messages are not declared safe or waived from the original FTC labels. A deterministic sample (first 24 source hashes among kept saves) received two separate categorical content inventories. The broad inventory called 13 charge alarms; the more specific inventory found zero new-purchase debits, two subscription/service renewals, eight legal/criminal allegations and 14 other/no-charge cases, with no explicit payment request in any. This exposes ambiguity in the inventory itself, not 24 independently verified legitimate messages. Legal/account claims still may be fraudulent. Neither inventory changes a score or the final prompt.

A separate 48-case synthetic message check reused the initial completed caller histories; it is not another independent fresh set. V10 removed 20/21 unwanted messages and retained 26/27 ordinary-or-uncertain messages. It wrongly removed an ordinary care-demographics message and retained a purported screening-pass message. These defects remain visible; this task does not certify the unchanged post-call filter or the whole deployed stack as error-free.

## Checks, leakage and release boundary

The audit checks frozen requests, unchanged tool schemas/limits, source hashes, original labels/membership/weights, unique result identities and recomputed scores. No result is replaced by a more favorable retry. FTC v158 first stopped at 637/724 after one subscription timeout (`robocall-1171`). The finalized partial directory stays untouched. A new continuation directory starts with its exact 637-row byte prefix and original manifest; the unchanged frozen runner schedules only the 87 never-run identities at concurrency one. Its normal resume gate refused reopening the original finalized directory before any additional inference. Prefix/source/input/scoring checks protect the continuation, and the timeout retains zero success credit. A content-free scan of all 1,044 public cases against decision instructions, tool metadata and voice instructions found no matching 12-word passage. This verifies no detected verbatim copying, not absence of conceptual adaptation or pretraining exposure.

`npm run check` passes typecheck, 203 unit tests and build. The first v158 sandbox attempt could not bind a local test server (`EPERM`); the unchanged full suite passed outside that restriction. The earlier full Firebase emulator run passed 153/154 with one invalid/closed forwarding transaction; a complete rerun passed 154/154. Only prompt text changed afterward; both emulator outcomes are retained.

At validation, production remained the October 13 release `62b2ada`, screening v31 and post-call v4. After the separate online-report check, the owner approved v158's deployment to the existing pilot at 19:58 Central; [STATUS.md](STATUS.md) records the exact release. Production post-call filtering remains v4; repository v10 was not released. Voice readiness is set aside at the owner's request, not claimed as passed. Synthetic text is not real-call verification.

## Reproduction

Ignored artifacts: `artifacts/production-v155/` (the root retains its original round name). This contains every request, freeze, result, summary, categorical diagnostic and rejected/partial run. Public datasets are pinned as described in [PUBLIC-SCAM-BENCHMARKS.md](PUBLIC-SCAM-BENCHMARKS.md). No public transcripts or private material are committed.

Use the frozen v158 workspace recorded in `v158-workspace.json` and absolute request/output paths. Each output directory must be new:

```sh
node scripts/check-screening-dialogues.mjs --request <v158.json> --caution-request <v158Caution.json> --cases scripts/fixtures/redteam/screening-regression.mjs --repeat 1 --concurrency 2 --out <development>
node scripts/check-screening-synthetic-questions.mjs --request <v158.json> --caution-request <v158Caution.json> --cases scripts/fixtures/holdout/production-conversations-v158.mjs --repeat 2 --concurrency 2 --out <fresh>
node scripts/check-screening-adaptive-dialogues.mjs --request <v158.json> --cases scripts/fixtures/holdout/production-adaptive-v158.mjs --repeat 2 --concurrency 2 --out <adaptive>
node scripts/check-public-scam-benchmark.mjs --provider codex --mode screening --repeat 1 --concurrency 2 --request <v158.json> --out <masc>
node scripts/check-robocall-benchmark.mjs --provider codex --real-calls-approved --repeat 1 --concurrency 2 --request <v158.json> --out <ftc>
```
