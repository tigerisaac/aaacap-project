# Claim intent, ordinary context and charge priority

October 13, 2026. All inference in this round uses subscription GPT-6 Luna, medium reasoning. V128–v131 remain offline experiments. Repository screening stays v99 and post-call filtering stays v10; the separately recorded deployment remains screening v31 / voicemail v4. This task did not deploy, make calls, change forwarding or run paid voice checks.

V131 has the strongest public MASC result in this round: **80/80 ordinary offers, 160/160 harmful stops and 40/40 advertisements blocked**, with no harmful approval, saved harmful notice or evaluation failure. It also passes all 72 latest fresh trials. It is nevertheless **not promoted**: development retains three ordinary-report false blocks, one empty invitation questioned and one charge alert saved. Those are real errors, not erased by perfect headline results elsewhere.

## General changes

V128 separates the topic of a sensitive claim from whether its intended action is explained. An account-security or third-party emergency topic can remain sensitive after the caller supplies an ordinary practical purpose. `claimAction` records that distinction; restricted conduct and charge alarms retain priority. It also includes attempted and unconfirmed transactions in the existing owner-directed charge-alarm rule. This comes from the documented policy and development cases, not public or held-out outcomes.

V129 removes the redundant `not_applicable` action value. Development had shown a substantive claim marked not applicable despite instructions requiring an intent judgment. The remaining values are ordinary and unresolved; the field affects routing only for substantive claims. All retained combinations map exactly as in v128. This fixes a representational inconsistency, but does not guarantee better model interpretation: v129 loses ordinary callers in development and MASC.

V130 clarifies that a stated ordinary activity or result supplies a purpose, including what a callback or message will accomplish. Full private details are unnecessary. This addresses development callers whose explicit repair or personal purpose had been classified as missing. V131 then aligns the charge category's tool description with the existing instruction: attempted/completed, unexpected/unauthorized/unconfirmed transactions without expected-transaction context need no harmful demand to count as alarms. No brand, source ID, amount, test example, new output field or additional model call is added by v130/v131.

| Request | Instructions + serialized tools | Reduction from v99 |
|---|---:|---:|
| v99 repository | 12,069 characters | — |
| v127 control | 8,405 | 30.4% |
| v128 | 8,990 | 25.5% |
| v129 | 8,980 | 25.6% |
| v130 | 9,093 | 24.7% |
| v131 | 9,181 | 23.9% |

These are character counts, not measured token, latency or cost savings. The structured observation mapper remains an offline evaluation feature; it has not been integrated into the runtime session.

## Development and benchmark expectations

Each version runs the same 132 development callers twice: the prior 76-case development wrapper, 24 new [claim/action cases](../scripts/fixtures/redteam/claim-action-development.mjs), and the existing 32 spoken main/caution controls. The original main benchmark remains 24 cases. Earlier charge-policy expectation overlays remain separate from unchanged source fixtures.

| Development, two passes | v127 | v128 | v129 | v130 | v131 |
|---|---:|---:|---:|---:|---:|
| Original strict outcomes/sequences | 253/264 | 253/264 | 252/264 | 260/264 | 257/264 |
| Intended ordinary live offers | 86/90 | 84/90 | 82/90 | 89/90 | 87/90 |
| Intended ordinary notice saves | 20/20 | 20/20 | 20/20 | 20/20 | 20/20 |
| Ordinary false blocks | 0 | 2 | 6 | 1 | 3 |
| Intended block outcomes | 108/114 | 111/114 | 112/114 | 113/114 | 112/114 |
| Trusted caution checks | 20/20 | 20/20 | 20/20 | 20/20 | 20/20 |
| Retained timeouts | 1 | 1 | 0 | 0 | 0 |

The old `ssa-legal-robocall` expectation still asks for a saved notice under the earlier policy. It blocks once under v127 and twice under each newer version. That mismatch is disclosed and the original score retained. It is not an ordinary caller false block. The ordinary offer/notice denominators above exclude owner-directed charge stops even where a historical source category remains legitimate.

The other ordinary failures are not benchmark errors. The callers state a relationship, concrete task or warning about somebody else's scam. V129's false blocks come from `context: missing`, not a missing callback exception in the mapper. V130 recovers those callbacks, but approves one development unconfirmed-purchase alarm and blocks one warning. V131 fixes that particular purchase trial yet saves one other charge alert. Its three ordinary-report blocks are all misclassified `technical_rescue` despite personal context. An empty meeting invitation is also questioned because the model reports no separate contact. These are interpretation failures; deterministic priority is behaving as specified.

## Fresh checks and question quality

All expectations are fixed before inference. The fixtures contain independently authored callers, never imported benchmark dialogues. Prepared future replies enter only after an accepted question. Repetitions remain separate trials, not independent caller samples.

| Frozen validation set | Control | Candidate |
|---|---:|---:|
| 40 claim/action callers × 2 | v127 76/80 | v128 79/80 |
| 32 intent-routing callers × 2 | v128 63/64 | v129 64/64 |
| 24 context-sufficiency callers × 2 | v128 48/48 | v130 48/48; v131 48/48 |
| 12 equipment-impersonation callers × 2 | — | v131 24/24 |

V128's 80-trial set preserves all 30 intended ordinary live offers, 12 notices and 28 harmful blocks. Its only failure is a retained timeout on a vague-role opener. V127 holds two harmless account-security follow-ups and questions two charge alarms. V129's 64-trial set preserves 28 offers and eight notices and blocks all 22 harmful trials. V128 questions one informative care update in that comparison.

V131's two latest sets total **36 distinct scenarios / 72 trials**: 32 ordinary live offers, eight ordinary saved notices, 28 harmful/promotional stops and four useful clarification/hold outcomes. All match their expectations. V131 froze before the context-sufficiency outcomes were inspected; its last schema change used the known development purchase miss only. The final equipment set was authored after v131 froze. No validation outcome is used to revise the frozen prompts.

Manual review of v128's first 15 fresh questions and v131's eight latest questions finds no request for secrets or repeated answered identity. V129's 12-question review finds one unexpected mixed-language phrase despite requesting the correct missing detail. The 64/64 action score does not erase that wording defect. Prepared synthetic replies and text-only checks do not establish voice or real-call quality.

Recent category-level sources include the [FTC's September enrollment guidance](https://consumer.ftc.gov/consumer-alerts/2026/09/what-know-ahead-open-enrollment-avoid-health-insurance-scams), [September government-impersonation warning](https://www.ic3.gov/PSA/2026/PSA260917), [FTC recruitment warning](https://consumer.ftc.gov/consumer-alerts/2026/04/job-offer-text-probably-scam), and September alerts about [equipment sellers](https://consumer.ftc.gov/consumer-alerts/2026/09/scammers-are-impersonating-farm-equipment-businesses) and [dealership impersonation](https://consumer.ftc.gov/consumer-alerts/2026/09/scammers-are-spoofing-car-dealership-websites-what-you-need-know). The equipment set contrasts restricted payment collection/transfers with inspections, ordinary deliveries, completed refunds and personal scam warnings. Source text, names and contact information are not copied into fixtures or prompts. These sources establish scam mechanisms, not their prevalence among Shield users.

## Public regressions

Each selected policy runs each complete pinned public set once, retaining source labels and failed outcomes. MASC and FTC are repeatedly used regression sets, not unseen holdouts. V127 below is the prior round's historical run, not an interleaved control. Older four-action v79 results are not directly comparable with the later saved-notice policy.

| MASC | Historical v127 | v129 | v131 |
|---|---:|---:|---:|
| Ordinary offered | 80/80 | 78/80 | 80/80 |
| Ordinary saved | 0 | 1 | 0 |
| Ordinary blocked | 0 | 1 | 0 |
| Harmful stopped | 156/160 | 159/160 | 160/160 |
| Harmful questioned | 3 | 1 | 0 |
| Harmful approved | 1 | 0 | 0 |
| Advertisements blocked | 40/40 | 40/40 | 40/40 |
| Failures / no-decisions | 0 / 0 | 0 / 0 | 0 / 0 |

V129's two ordinary delivery misses are a saved notice from a current-recording classification and a false charge-alarm block. Source labels remain unchanged. V131 recovers both; that public outcome did not inform its changes.

| FTC, 724 distinct openings | Historical v127 | v129 | v131 |
|---|---:|---:|---:|
| Completed stops | 533 | 565 | 586 |
| Saved unverified notices | 180 | 143 | 119 |
| Questions | 6 | 15 | 13 |
| Approvals | 4 | 0 | 6 |
| Retained timeouts | 1 | 1 | 0 |
| No-decisions | 0 | 0 | 0 |
| Source-call-weighted stops, /1,378 | 1,063 | 1,102 | 1,129 |
| Source-call-weighted approvals | 10 | 0 | 11 |
| Source-call-weighted saved notices | 288 | 238 | 208 |

Both new public passes immediately block the three previously identified charge recordings (166, 1100 and 1314) as charge alarms. That does not establish a general fix: v131 still saves one development card-purchase alert. V129's timeout on 1229 is retained without retry.

V131 approves 191, 858, 1164, 1168, 1184 and 1185. The first two are classified personal callers; the other four are classified ordinary tasks with separate contact and no restricted conduct. These model classifications are not evidence that the senders are safe. The already documented family-only opening 858 remains a deliberate policy tension: the owner accepts family-only greetings, while the source label remains harmful and the approval still receives no FTC success credit. None of the six labels is changed and no ID-specific exception is added. The additional approvals mean the higher stop count is not an unqualified improvement over v127 or v129.

Saved notices are never counted as live stops or verified safe calls. No new post-call filtering run is combined with these live results. FTC has no legitimate control group; MASC and the authored ordinary-call contrasts are necessary to evaluate false blocking.

## Integrity and software evidence

Source, request, case-input and result hashes are retained. Audits recompute all actions, sequence scores and public scores; preserve every planned identity; and check that source labels and expected outcomes are not model inputs. Native-history isolation, unanswered-clarification protection and schema-correction feedback pass local mock checks. No completed trial is retried to replace an unfavorable outcome.

The subscription adapter uses Codex dynamic tools and its schema normalization/correction behavior, not the production Responses transport. Its manifest records these differences. Comparisons here use the same subscription route; neither its observed latency nor its text results establish production voice behavior.

No normalized twelve-word public passage or complete short public opening matches the new requests. This supports the narrower conclusion of no detected direct answer/transcript leakage. It does not prove absence of conceptual overfitting or unknown model pretraining exposure. Public scores and source-inspired historical development cases cannot be presented as fully independent evidence.

`npm run check` passes typecheck, 191 unit tests and build. `npm run test:firebase` passes 154 emulator tests. The first sandboxed unit run could not bind the existing localhost APNs mock (`EPERM`); the authorized localhost rerun passes. Mapper assertions, script syntax and whitespace checks pass. Application policy/session code, fixed-recipient handling, press-1 acceptance, bounded timers and failure behavior are unchanged. No voice or real-call readiness claim is made.

The round contains **17 scored runs / 3,864 trials**, with four retained timeouts and no final no-decisions. Every run is terminal. Local evidence is recorded in `artifacts/screening-hardening/claim-action-ledger.json` and `claim-action-checks.json`. Frozen roots are `claim-action-v128-snapshot`, `claim-action-v129-snapshot`, `context-sufficiency-v130-snapshot` and `charge-schema-v131-snapshot`, with adjacent SHA-256 inventories; 2,510 files were verified. The reports and experimental sources are committed; public source caches and local result artifacts remain ignored.

The full goal remains unfinished. Future work must address general caller-attribution, empty-contact recognition and charge recognition using independent development evidence. The four new validation fixtures are now spent and must not be used to tune subsequent prompts. More variants should not be accepted merely because they pass one small fresh set or improve one public headline.
