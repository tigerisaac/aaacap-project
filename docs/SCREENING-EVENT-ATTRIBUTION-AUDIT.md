# Financial events, caller intent and ordinary context

October 13, 2026. All external inference in this round uses subscription GPT-6 Luna at medium reasoning. These are offline prompt experiments, with no deployment, paid voice testing, phone calls or forwarding changes. Repository live screening remains v134 and post-call filtering remains v10. The deployed versions remain v31 and v4, respectively.

## Changes and scope

The previous [transaction and freshness audit](SCREENING-TRANSACTION-AND-FRESHNESS-AUDIT.md) found four development problems: a bare unexplained charge treated as having no financial event; a warning against another person's computer instructions mistaken for technical rescue; an expected payment decline mistaken for an unexpected transaction; and a medical follow-up mistaken for an earlier telephone interaction.

V136 clarifies those distinctions and renames the technical-rescue observation to `unsolicited_technical_offer`. The mapper normalizes the renamed value to the existing restriction, preserving priority and action semantics. Expected failed or delayed payments stay ordinary; a separate unexpected transaction remains an alert even beside ordinary business. A work or result follow-up alone does not establish an earlier call. No extra model request is added.

V137 compresses the same rules into coherent paragraphs with the same schema and mapper. V138 then makes two small changes based only on v137 development failures: adopting someone else's unsafe instruction counts as a request, and an unspecified charge claim is still a financial event. Neither public benchmark outcomes nor validation failures supply prompt wording. V138 freezes before v137 public outcomes are inspected.

| Request | Instructions + serialized tools | Reduction from runtime v134 |
|---|---:|---:|
| Runtime v134 | 12,069 characters | — |
| v135 comparison | 9,853 | 18.4% |
| v136 | 10,034 | 16.9% |
| v137 | 9,372 | 22.3% |
| v138 | 9,478 | 21.5% |

These are character counts, not measured token or cost savings. V138 adds 106 characters to v137, including tool descriptions. All candidates retain bounded clarification, trusted recent-scam caution, grounded notice detection and deterministic restriction/charge precedence.

## Development comparison

The same 196 scenarios run twice per version: the previous 172 plus 24 independently authored event, attribution and follow-up contrasts. The main benchmark remains 24 cases. Existing charge-policy overlays stay separate from unchanged source fixtures and categories.

| Development, two passes | v135 | v136 | v137 | v138 |
|---|---:|---:|---:|---:|
| Original strict outcomes/sequences | 378/392 | 373/392 | 386/392 | 387/392 |
| Intended ordinary live offers | 137/142 | 132/142 | 142/142 | 139/142 |
| Intended ordinary notice saves | 26/26 | 26/26 | 26/26 | 26/26 |
| Ordinary false blocks | 3 | 0 | 0 | 0 |
| Intended completed blocks | 160/164 | 158/164 | 160/164 | 164/164 |
| Trusted caution checks | 25/28 | 28/28 | 28/28 | 28/28 |
| Retained timeouts | 0 | 0 | 0 | 0 |

Ordinary denominators exclude the charge alarms whose historical source category is legitimate. Two older SSA expectations still call for a saved notice; all four versions block both repetitions. Those mismatches remain in strict scores and are not ordinary false blocks. V136 also reaches one charge stop only after a question, so its intended-block sequence score is 157/164 despite 158 completed blocks.

V137 eliminates this round's ordinary-offer losses and preserves all notice/caution outcomes. Its four substantive misses are questions: three endorsements of another person's unsafe instructions and one bare unexplained charge. The facts incorrectly record no restricted conduct or no financial event, so the mapper follows the wrong observation. No harmful approval is hidden inside these results.

V138 stops all 164 intended-block trials, including the known charge and endorsed-instruction misses, while preserving notices and caution. It loses three ordinary offers to unnecessary questions: a neighbor warning against unsafe computer instructions, an existing-service billing update, and a practical request to arrange a family member's lift. In the last case it asks a second question after the practical purpose is already given. The recorded context is incorrectly missing. The original expectations remain appropriate; no label change or score adjustment is made. This is an ordinary-context regression, even without an ordinary false block.

## Fresh validation and question quality

The 32-case event-attribution set is authored after v136/v137 freeze and before outcome inspection, then run twice. V135 scores 60/64: one ordinary report false block and three inappropriate caution holds. V136 scores 61/64: one unnecessary question to a personal caller and two questions instead of immediate charge stops. V137 scores **64/64**: 26 ordinary live offers, six notice saves, 22 harmful blocks, eight caution checks and two unclear holds. The staged ordinary resolutions are included in the offer count.

The next 24 independently written scenarios draw general mechanisms from the [FBI's September 17 impersonation warning](https://www.ic3.gov/PSA/2026/PSA260917) and the abstract of the [August 25 phone-scam analysis](https://arxiv.org/abs/2608.24127). They contrast authority, payment pressure, concealment, identity/access requests and empty contact with ordinary official appointments, healthcare demographics, privacy, family reports and requested work. No new real-call corpus or source transcript is imported. The paper describes a selected honeypot population, not the frequency of scams among Shield users.

V135 and v137 each pass **48/48** on that set: 20 ordinary live offers, four notices, 18 harmful blocks, four promotional blocks and two unclear holds. The original source labels and the app's action expectations remain distinct.

After v138 freezes, another 20 independent scenarios are authored and run twice against v137 and v138. Both pass **40/40**: 16 ordinary live offers, four notices, 18 harmful blocks and two unclear holds. These cover expected versus unexplained transactions, adopted versus rejected unsafe instructions, normal advice, contextual callbacks, empty contact and staged clarification.

V137 therefore passes all **152 fresh trials** across the three sets. This does not erase its development or public failures. V138's fresh result is 40/40; it was not run on the earlier validation sets under an unseen-test claim. All new validation sets are now spent and must not guide further wording.

Manual question review checks all 28 v137 fresh questions and all eight v138 fresh questions. They ask for missing purpose, refund context or intended action without requesting secrets or repeating a supplied identity. Some combine the concern and intended action in one sentence; some v137 questions refer to the caller awkwardly in the third person. Passing prepared-answer sequences does not by itself establish natural conversation quality.

## Public regression and integrity

Each selected candidate runs both full public sets once. Historical v135 results below come from the preceding round, not an interleaved public control.

| MASC | Historical v135 | v137 | v138 |
|---|---:|---:|---:|
| Ordinary offered | 79/80 | 78/80 | 77/80 |
| Ordinary falsely blocked | 1 | 2 | 3 |
| Harmful stopped | 157/160 | 159/160 | 158/160 |
| Harmful questioned | 3 | 1 | 2 |
| Harmful approved or saved | 0 | 0 | 0 |
| Ads blocked | 40/40 | 40/40 | 40/40 |
| Timeouts / no-decisions | 0 / 0 | 0 / 0 | 0 / 0 |

V137 falsely blocks ordinary sources 23 and 24 as financial bait despite an ordinary-task observation; harmful source 154 receives clarification. V138 falsely blocks source 24 as financial bait and delivery sources 52 and 54 as unexplained transactions. It questions harmful sources 151 and 154. Original labels and outcomes are retained.

One unscored, caller-only subscription diagnostic checks source 23's ordinary expectation. It describes appointment confirmation with discounts/referral incentives and no payment or secret request. That supports retaining the label under the existing ordinary-work-with-added-offer policy. The diagnostic receives no benchmark ID, source label or previous decision, and saves an abstract description with quoted evidence removed. It is not a retry or a replacement for the scored failure. Source 24's separate diagnostic remains in the preceding audit; it is not repeated.

Two further unscored descriptions check the delivery false blocks. They describe scheduled delivery confirmation, details/availability checks, cancellation or a proposed hold while investigating a mismatch. Both classify the financial statement as absent and report no payment or secret request. This supports retaining the original ordinary expectations; it is model-assisted inspection, not proof of caller authenticity. No label, outcome or prompt is changed. One abstract description reaches its 240-character bound; no source quotation is retained or printed.

| FTC, 724 distinct openings | Historical v135 | v137 | v138 |
|---|---:|---:|---:|
| Completed stops | 611 | 595 | 601 |
| Unverified saved notices | 104 | 122 | 114 |
| Questions | 3 | 3 | 4 |
| Approvals | 6 | 4 | 4 |
| No-decisions | 0 | 0 | 1 |
| Retained timeouts | 0 | 0 | 0 |
| Source-call-weighted stops, /1,378 | 1,165 | 1,139 | 1,147 |
| Source-call-weighted approvals | 12 | 9 | 10 |
| Source-call-weighted saved notices | 188 | 217 | 206 |

Both candidates immediately stop the three known charge recordings, sources 166, 1100 and 1314. V137 approves 191 and 858 as personal callers, and 1164/1168 as ordinary tasks. V138 approves 858, 1164, 1168 and 1173. The source-harmful labels remain and all approvals receive unsuccessful credit. The previously documented family-opener tension remains: owner policy accepts personal-family context, which is not proof that the caller is genuine. No saved-message filter score is added to the live results.

V138 has one no-decision on source 191, retained without retry. Both observed tool attempts map personal context to an approval but leave the display-purpose enum unknown; the production decision validator rejects that combination. This is a mapper/validator contract gap, not a transport timeout or a scam stop. Any future repair must test the generic fact-state invariant while retaining evidence, restriction, caution and clarification guards; it must not special-case this public identity.

All model requests exclude case IDs, labels, expected actions and prepared future replies. Completed runs have independent source/request/result hash and scoring audits. The four instruction/tool requests have no detected normalized twelve-word public passage or complete short public opening from the 1,044 pinned regression cases. That checks direct copying, not conceptual overfitting or unknown model pretraining exposure. The public sets are repeatedly used regressions, not unseen holdouts; saved notices are never credited as scam stops.

`npm run check` passes typecheck, 198 unit tests and build. A final sandboxed attempt cannot bind the APNs test's local loopback server and fails; the same command passes with loopback permission, and both logs are retained. `npm run test:firebase` passes 154 emulator tests. The inherited mapper contracts pass 1,413 local assertions. The runtime's ordinary and caution initial request hashes remain unchanged from the previous audit. The current subscription adapter has a 90-second offline evaluation deadline and differs from production transport; these results do not measure production latency, speech recognition or real-call effectiveness.

The round completes **15 scored runs / 4,024 trials**, with no transport timeouts and one retained no-decision, plus three separate unscored descriptions. All inference is terminal. The local `event-attribution-ledger.json` and `event-attribution-checks.json` retain scores and verification evidence. Frozen `event-attribution-v137-snapshot` and `endorsed-action-v138-snapshot` directories have adjacent SHA-256 inventories. Public source caches, outputs and diagnostics remain ignored; prompt experiments, synthetic fixtures and this report are committed.

Neither revision is promoted. V137's ordinary development gains do not survive MASC, and v138's complete development blocking comes with unnecessary ordinary questions and more public false blocks. The live charge/empty-contact prompt goal remains unfinished. V134's runtime safeguards and post-call v10 stay unchanged. The remaining work concerns ordinary-context interpretation and the fact-to-decision contract; all public and validation outcomes remain assessment evidence, not material for prompt wording. These tests do not warrant claiming 100% real-world confidence.
