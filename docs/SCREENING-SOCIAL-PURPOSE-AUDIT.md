# Ordinary purpose and outside contact

October 13, 2026. V153 is an offline subscription GPT-6 Luna medium experiment. It clarifies that ordinary social, informative and practical purposes do not require an asserted personal relationship, and that requests to initiate contact outside the current call are outside contact regardless of medium. It preserves v152's action mapping, charge/payment safeguards, evidence validation, question limits, clarification hints and recording consistency checks. Runtime screening v134, post-call v10 and the deployed release remain unchanged.

## Development basis and size

The [v152 development review](SCREENING-CALLER-REQUEST-AUDIT.md) found two ordinary callers whose social/informative purposes became missing context after invalid relationship observations, and an empty profile invitation misclassified as conversation on the current call. These known development cases ground the description changes. No public or spent fresh result supplies prompt wording or a decision exception.

V153 has 4,390 instruction characters and 5,602 tool characters, totaling 9,992 versus v152's 9,932: 60 additional characters, or 0.6%. The unchanged greeting adds 207 characters. The frozen initial request hash is `cbbe7f00c0150c52ae7fe4c8a29db8b4cb0f5bcdeef257540eeb1705c90760eb`. The schema's fields, enums and cross-field constraints are unchanged. The local equivalence check verifies the inherited refinements survive the description update.

## Known development

The separate 196-case development wrapper runs twice: 389/392 strict passes, 141/142 ordinary live offers, 26/26 ordinary notices, 164/164 intended blocks and 28/28 caution passes, with no provider failures or final no-decisions. Both social/informative callers and the profile invitation that motivated the change now meet their expectations in both repeats. The remaining ordinary miss asks for identity despite a stated service role and regular-bill update. Two historical SSA saved-notice expectations produce blocks; their original expectations and failures remain unchanged. There are no false blocks among the legitimate-labeled development callers.

V152's preceding development run had 140/142 ordinary offers and 160/164 intended blocks, including three failed trials and one empty-contact question. This is a historical comparison, not a new paired development control. Source, label, sequence, action-mapping and hint audits pass for all 392 v153 trials.

The remaining billing miss motivates a separate, newly authored development diagnostic, frozen before inference. Twelve cases compare a service-role fragment, full introduction, office introduction and named employee with absent identity, a report about another organization, ordinary personal reports, and restricted requests. Each runs twice under both frozen prompts. No original trial is replaced or rerun for replacement credit.

V152 passes 22/24 and v153 21/24. Both offer all four service introductions in both repeats, preserve the ordinary reports and receipts, and block all six empty-contact/payment/charge trials. Both approve the two third-party-only reports despite the frozen expectation to ask who is calling; v153 also approves one update with no stated identity. In all five misses, the observation records `name_or_role`. The third-party wording has some attribution ambiguity, but its original strict identity expectation remains and the failures are not waived. The absent-role approval is a clearer identity-inference miss. This diagnostic does not establish that short grammar caused the original billing question. It points to inconsistent identity attribution in both directions and supplies no new prompt edit in this round.

## Fresh comparison

Twenty-four synthetic cases were authored after the request freeze, with expectations and question rubrics fixed before inference. Each runs twice for v152 and v153. The set includes ordinary social news and callbacks, notices, empty outside-contact requests, unexpected charges, account permissions, command execution, payment collection and staged clarifications. It remains separate from the unchanged 24-case main benchmark.

| Fresh outcome | V152 | V153 |
| --- | ---: | ---: |
| Strict passes | 45/48 | 46/48 |
| Ordinary live offers, caution off | 13/16 | 14/16 |
| Ordinary notice saves | 4/4 | 4/4 |
| Intended blocks | 20/20 | 20/20 |
| Caution cases | 4/4 | 4/4 |
| Provider failures / final no-decisions | 0 / 0 | 0 / 0 |

All misses are unnecessary ordinary-call questions. V152 questions a wellbeing caller once and completed personal news twice; v153 questions the wellbeing caller twice. These original outcomes remain scored. Neither version falsely blocks an ordinary fresh caller. Passing empty-contact and charge cases does not make the remaining ordinary questions acceptable or establish universal reliability.

Manual review covers all 21 generated questions: sixteen are needed and ask the missing fact, while five ask for an action when a sufficient social/informative purpose was already stated. V152 has eight useful and three unnecessary questions; v153 has eight useful and two unnecessary questions. One v152 question awkwardly names the caller in the third person. Prepared replies are not conditioned on question wording, so sequence scoring is separate from this review. The fresh set is now spent and cannot guide prompt tuning.

## Recent scam patterns

The [FBI's September 1 consent-phishing advisory](https://www.ic3.gov/PSA/2026/PSA260901) describes malicious applications obtaining account access through permission grants without collecting passwords. The [FTC's June 8 fake-CAPTCHA warning](https://consumer.ftc.gov/consumer-alerts/2026/06/how-spot-captcha-scam) describes verification pretexts that induce command execution. Only these general behaviors informed independently authored synthetic contrasts, including a caller reporting and rejecting a suspicious request. Both versions stop every consent-access and supplied-command case while preserving the ordinary report.

An October 7 consumer post about alleged voice harvesting appeared in search, but its full page was unavailable. Its claim is not treated as verified or used to label calls. No new real-call transcript dataset, advisory wording or benchmark dialogue enters the fresh fixtures.

## Public MASC regression

All 320 cases complete without provider failures or final no-decisions: 79/80 ordinary offers, 157/160 harmful stops, three harmful clarifications, no harmful approvals or saved harmful notices, and 40/40 ad blocks. The preceding v152 pass offered 77/80 ordinary callers with the same aggregate harmful-stop/question/ad counts. This is a historical comparison, not a paired public experiment.

The ordinary block is source case `24`, observed as an appointment task plus financial bait. Its earlier mixed service/promotion review remains in the [transaction audit](SCREENING-TRANSACTION-AND-FRESHNESS-AUDIT.md); its ordinary label and failed outcome are not waived. Harmful cases `150`, `154` and `153` are unresolved sensitive claims and receive questions. Questions are reported separately from completed stops. The full result audit verifies source membership, labels, action mapping and all thirteen accepted clarifications. Public outcomes do not supply prompt wording.

## Public FTC regression

FTC completes all 724 openings: 602 stops, 115 unverified saved notices, three questions, three approvals and one retained subscription timeout, with zero final no-decisions. The timeout is source `648`; it receives no success credit and is never retried. Weighted by 1,378 source calls, outcomes are 1,167 stops, 194 saves, thirteen questions, three approvals and one failure. All three known unexpected-charge recordings (`166`, `1100`, `1314`) stop immediately. V152's preceding pass had 572 stops, 141 saves, eight questions and three approvals, without a timeout. These are repeated public regressions and separate model draws, not unseen validation or a causal estimate of improvement.

V153 approves sources `191`, `858` and `1184`. The first two are observed as personal callers; the last as an ordinary task requesting outside contact. Their source labels remain harmful and all approvals remain unsuccessful benchmark outcomes. The already documented family-opener policy tension does not prove any caller genuine or excuse the separate ordinary-task approval. No source label, expectation, input or completed result changes. Saved notices are not scam stops, and no post-call filtering credit is added to these live-screening results.

## Input isolation and checks

Both fresh result audits verify source and input hashes, original labels, action mapping, expected sequences and clarification hints. Labels, expected answers, case IDs and future replies remain outside target input. Native subscription preflight uses local mocks to check input isolation. No public caller transcript or supporting quote is committed.

The frozen requests and audit-only unions of their greeting and fixed hint strings have zero matching twelve-word public passages or complete short openings across 1,044 pinned cases. This checks copied passages, not conceptual overfitting or pretraining exposure.

V153 passes 27,941 inherited and description-equivalence assertions. Its local tool-protocol mock passes all 44 requests, including invalid guidance, evidence checks, bounded clarification, recording corrections and immediate restricted-conduct blocks. `npm run check` passes typecheck, 203 unit tests and build; `npm run test:firebase` passes all 154 emulator tests. The original sandboxed unit run failed when the APNs mock could not bind a local socket; that log remains, and the successful rerun uses local socket permission. No cloud/application code changes.

Seven scored runs total 1,580 trials. Every run is terminal; audits recompute outcomes and verify frozen source, labels, input hashes, action mapping, sequences and clarification hints. One timeout and zero final no-decisions remain. Two public setup attempts failed before inference because cache metadata had not yet been copied; their logs are retained, no trial ran, and the metadata was restored before the scored runs began. Evidence is retained in the ignored `artifacts/screening-hardening/purpose-contact-ledger.json`, workspace snapshot and SHA-256 manifest.

V153 remains experimental. It fixes all three motivating development cases and improves this round's ordinary-offer counts, but the fresh social questions, identity-attribution inconsistencies, ordinary MASC block and FTC approvals remain. The small fresh score difference is not statistical proof of better reliability. No deployment, voice test, phone call, forwarding change or real-call readiness claim occurs. The goal remains active; subsequent development must use development evidence, not the spent fresh set or public outcomes.
