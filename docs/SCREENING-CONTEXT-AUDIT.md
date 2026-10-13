# Screening context and question-output audit

October 12 Central / October 13 UTC, 2026. This follow-up to the [ordered-prompt report](SCREENING-ORDER-AND-MESSAGE-AUDIT.md) changes evaluation instrumentation and failure reporting, not application prompts, routing or deployment. V94 remains rejected. The charge-alarm policy clarification is still pending.

## What the public benchmark presents

A read-only audit of the pinned MASC source confirms that all 320 source conversations include both speakers. All 80 ordinary appointment/delivery conversations contain recipient replies. Their caller turns range from two to ten, with a median of five; recipient turns range from three to ten, also with a median of five. Screening receives the caller turns joined into one string, without the recipient replies, turn boundaries or trusted audio metadata. The median ordinary input contains 1,166 caller characters. None of those 80 caller texts explicitly says “automated”, “prerecorded”, “pre-recorded”, “recorded message” or “this is a recording”. This lexical check is not an automation classifier.

This is a presentation limitation for the new live-versus-saved-notice routing decision. It does not establish that MASC's ordinary labels are wrong, excuse an ordinary block, or justify counting saved notices as offers. The original public results remain unchanged. No public transcript was sent to a model in this audit.

## Preserve message boundaries before judging questions

The subscription adapter previously returned the concatenation of all completed assistant messages. A repeated question could therefore come from multiple model messages or duplicate delivery events, and an empty final message was indistinguishable from a question delivered in commentary.

The adapter now also returns each completed item's ID, phase and text. The original joined question string, model request, native history, action validation and action scores are unchanged. Only the synthetic question-review runner stores these fragments. Missing phases remain unknown; the adapter does not assume they are final answers, suppress commentary, deduplicate output or quietly choose a better question.

The expanded local mock preflight made eleven requests against a local server, with **no external inference**. It verifies exact instructions and caller snapshots, no extra context/tools, medium reasoning, separate concurrent conversations, retained native history, terminal/release behavior, and commentary/final/unknown phases. A separate observer self-test verifies that capturing fragments changes neither the joined text nor question-turn count and still supports older results without fragments.

## Matched synthetic context diagnostic

The frozen v31 and v94 requests each ran 36 trials on subscription GPT-6 Luna, medium reasoning. Five pairs compare a complete caller snapshot with the **byte-identical cumulative caller text** reached after one clarification in native history. Four pairs are ordinary service/refund purposes and one reveals a full-identifier demand. Two explicit recorded-notice controls complete the 12-case fixture; every case ran three times. This is a development/transport diagnostic, not independent unseen policy validation. No prompt was changed from its outcomes.

| Result | v31 | v94 |
|---|---:|---:|
| Ordinary live offered | 19/24 | 23/24 |
| Explicit recorded notices saved | 6/6 | 6/6 |
| Harmful identifier requests blocked | 6/6 | 6/6 |
| Required native sequences passed | 13/15 | 15/15 |
| Provider failures | 0 | 0 |

V31 held the completed-refund caller three times as a snapshot and twice after clarification. V94 saved that caller once as a snapshot but offered it in all three native-history trials. These observations support treating input context as a meaningful evaluation variable. The small, repeated, author-designed set and model variation do not establish a general causal correction for MASC or erase v94's earlier ordinary-call regressions.

There were 15 question turns per prompt. V31 emitted four commentary items and 15 final items; v94 emitted three commentary items and 15 final items. Seven turns therefore contained multiple items, with **no repeated item IDs**. Six of those turns contained the question in commentary followed by an empty final item. In the remaining turn, v31 repeated the same question in distinct commentary and final items. Selecting final text alone would lose six nonempty questions. The original concatenated outputs remain available, including the repeated question. These are subscription text-message boundaries, not a measurement of what GPT Live would say aloud. They cannot retrospectively recover the missing phase information from earlier runs.

## Failure reporting and evidence

MASC reporting version `2026-10-13-public-identification-v3` adds `codex_*` failures to the existing provider/transport subtotal and tool-loop/unknown-tool failures to the validation subtotal. They were already counted in total evaluation failures and received no success credit. The identification rule, labels, denominators, successful verdicts and previous saved reports are unchanged. A regression test checks that four subscription failures and three invalid-model-behavior failures all remain unsuccessful, even when their rows contain a block-shaped action.

Evidence is preserved under `artifacts/screening-hardening/context-audit-evaluation-snapshot/`: frozen request/source hashes, the source-only MASC context audit, all 72 synthetic trials, question fragments, per-run native-sequence audits and the boundary audit. The request hashes remain v31 `0aee52064eb005c04fe8e22297bb2a6747b9ab217dff234f3620af2b99887e26` and v94 `2c3cb46456b8bac0cd23f258b88d784b0e94ccd5c42187038c963e8c7780ee48`. Expected actions, pair IDs and scoring metadata are not sent to the target. No failed outcome was retried or replaced.

`npm run check` passed: typecheck, 183 unit tests and build. The full `npm run test:firebase` check failed twice, each time with 153 passing tests and the same concurrent stopped-total backfill test returning Firestore `INVALID_ARGUMENT: Transaction is invalid or closed`. The focused cloud suite passed all ten tests. A separate emulator-only reproduction completed 20 pairs of concurrent backfills (40 calls) with correct totals and no duplicate counting. These focused passes do not replace the two failed full runs; their root cause remains unproven. The installed Firestore SDK retries `INVALID_ARGUMENT` only for an expired-transaction message, which does not match this error. No backend retry or test expectation was changed to mask it.

The frozen evaluation snapshot was copied with all 674 file hashes verified. Check logs, the isolated reproduction and hashes of the six tested code/fixture files are preserved separately in `artifacts/screening-hardening/context-audit-checks/`. The copied inference snapshot retains the scorer version present when it was frozen; the subsequent v3 reporting change was tested in a separate checkout. No production backend code, screening prompt or post-call prompt changed in this audit.

This audit improves the reliability of the evidence, not the unresolved screening policy itself. It supplies no basis to claim 100% real-world reliability, promote v94, or deploy without the owner's approval.
