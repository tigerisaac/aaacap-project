# Caller attribution and contact boundaries — October 13, 2026

This continues the [purpose/context experiments](SCREENING-PURPOSE-ROUTING-AUDIT.md). All inference uses subscription **GPT-6 Luna, medium reasoning**. The repository runtime remains v99, its initial v31 request is unchanged, and post-call v7 is unchanged. Deployment remains v30. No paid API, Go, voice session, phone call, forwarding change or deployment was used.

The original [v79 repair](SCREENING-V79-REPAIR.md) distinguished a name-only callback from an actual personal relationship. Its family-style FTC opening remains irreducible from the available speech under the owner's family policy. The newer saved-notice requirement also remains authoritative: uncertain recordings can be saved unverified, never credited as stopped or offered live.

## Development and frozen contract

A new 36-case synthetic development grid varies the caller's relationship, task, contact request, current versus reported automation, payment, instructions disguised as factual classifications, and two native clarification dialogues. It imports no public or held-out cases. The existing 130-case development set remains unchanged, including its two repeated historical outage expectations.

V104's new grid failures reproduced three times each: a vague prior request inferred into an ordinary task, a report about another recording treated as current automation, and interference with fact fields questioned instead of blocked. Subsequent revisions stayed category-level:

- V105 required grounded recording evidence and clarified what counts as a task and an override.
- V106 combined the unresolved-claim flag with the context classification; it was too restrictive about recognizing unlabeled playback menus.
- V107 accepted actual keypad/playback operation. Its broader controls still exposed payment, contact and private-purpose errors.
- V108 distinguished current automation from discussion of another recording, and folded promotion into the context category. Its perfect small-grid score did not survive broader testing.
- V109 clarified that restricted requests remain restricted even when optional or apparently legitimate, and distinguished ordinary practical updates from unresolved claims.
- V110 tied personal context to **this caller's own relationship with the recipient**. A caller name or someone else's relationship does not supply that context. This followed development errors in which a name-only contact or a professional discussing someone else's relative was treated as a personal caller.

Luna still supplies semantic judgments. The deterministic mapper fixes action priority, uses trusted application question/caution state, and passes its result through the existing schema, evidence and unanswered-clarification checks. It cannot make an incorrect semantic judgment correct. These experiments have not been integrated into the runtime.

| Frozen version | New boundary grid | Broader development | Main + caution |
|---|---:|---:|---:|
| v104 control | 99/108 | Previous round | Previous round |
| v105 | 106/108 | — | — |
| v106 | 105/108 | — | — |
| v107 | 107/108 | 252/260 | — |
| v108 | 108/108 | 249/260 | 30/32 |
| v109 | 107/108 | 254/260 | 31/32 |
| v110 | 72/72 | 257/260 | 32/32 |

Repetitions are repeated trials, not independent callers. V110's broader misses were one unnecessary question to a clinic returning a treatment inquiry and two old expectations that would offer a recorded outage notice; the current policy appropriately saves the latter. Historical labels and strict scores were not changed. V109 also blocked one ordinary report of a harmful instruction in development, so conduct attribution was already an unresolved development concern before fresh validation.

V110 has 3,961 instruction characters and 3,859 tool-definition characters: **7,820 combined, 35.2% below v99** and 147 characters above v104. This is a character measurement, not a measured token or dollar saving. Request hash: `6cf6b62fdc69b6f9502d7466e7bbd9ce14c2be3390f2e4312b80e5824fa90ef9`.

## Fresh paired validation

The 32-case attribution fixture was authored after v107 froze and before its inference results were inspected. The separate 16-case current-conduct fixture was authored after v109 froze. Neither was evaluated until v110 was frozen; neither fed back into a subsequent prompt edit. Each frozen v104/v110 request ran all 48 cases twice, including four native dialogues per pass.

The latter fixture contains independently written contrasts informed by the FBI's [September 17 official-impersonation warning](https://www.ic3.gov/PSA/2026/PSA260917), [September 1 consent-phishing warning](https://www.ic3.gov/PSA/2026/PSA260901) and [July 20 recovery-impersonation warning](https://www.ic3.gov/PSA/2026/PSA260720). The review also checked the FTC's [unexpected tax-relief calls warning](https://consumer.ftc.gov/consumer-alerts/2026/01/hang-unexpected-calls-saying-you-owe-back-taxes-those-are-scams). These are mechanisms and new synthetic speech, not imported real transcripts or benchmark examples.

Both versions scored **93/96**, with materially different errors:

- V104 saved two ordinary live callers who discussed recordings and prematurely approved one vague records-office opening before receiving the prepared explanation.
- V110 offered those live callers and completed every expected native sequence, but falsely blocked one ordinary caller reporting and refusing someone else's concealment request. It also held the same automated appointment confirmation in both repetitions under trusted recent-scam caution; it should have saved the notice.

Both blocked all 12 single-turn empty invitations and both empty-contact follow-ups. V110 preserved all expected ordinary callback offers. Its recent-pattern subset passed 31/32: all explicit harmful/empty-contact cases were blocked; the miss was the ordinary report described above. These results do not establish universal safe blocking.

| Fresh normal-context outcomes | v104 | v110 |
|---|---:|---:|
| Intended ordinary live offers | 34/36 | 35/36 |
| Ordinary live callers blocked | 0 | 1 |
| Ordinary live callers saved instead | 2 | 0 |
| Ordinary notices saved | 12/12 | 12/12 |
| Unwanted callers blocked | 34/34 | 34/34 |

Trusted-caution cases are separate: both correctly held the two personal callbacks and offered the two replies to a letter; v104 saved both automated confirmations while v110 incorrectly held them. The two remaining caution cases were intentionally unclear and correctly held by both.

V110 asked 12 fresh questions, with all eight native sequences correct; v104 asked 11 and completed seven of eight sequences correctly. Manual review found v110's questions addressed missing purpose or intended action, without secrets or identity proof. Some unnecessarily asked for both the concern and the required action. V104 repeated already supplied identity in two questions. This qualitative review is separate from the automated score, which checks sequence, presence and bounds, not full question quality.

## Evidence integrity and checks

All runs retain frozen requests, source hashes, labels, repetitions and every completed outcome. Audit scripts recompute scores and mapped actions and verify the absence of evidence/recording quotes from saved fact observations. Current-recording quotations are checked against caller speech during inference and discarded from diagnostics. The public runner now uses that redaction path too.

The frozen v110 request has no normalized 12-word match to any of the 1,044 public benchmark callers and no complete match to a short opening. Labels, IDs, expected actions, acceptance lists and prior outcomes are outside model input. The subscription adapter's isolation preflight runs before inference. These checks do not rule out conceptual overfitting or model pretraining exposure; public sets remain repeated regressions.

Typecheck, 191 unit tests, build and 154 Firebase emulator tests passed. The local interpreter mock passed seven requests and the unanswered-clarification mock passed ten, with no external inference. The six new mapper self-tests passed 85/87/87/148/148/148 checks respectively. V99's original request hash remains `0aee52064eb005c04fe8e22297bb2a6747b9ab217dff234f3620af2b99887e26`.

## Public regressions and selection

Both full public sets ran once with frozen v110. The v104 column reuses its previous complete runs, including its retained FTC failed prefix; it is a historical comparison, not a new interleaved control. Original labels, weights, source selection and scoring remain unchanged.

| Public outcome | v104 | v110 |
|---|---:|---:|
| MASC ordinary live offers | 79/80 | 80/80 |
| MASC ordinary saved instead | 1 | 0 |
| MASC harmful completed stops | 158/160 | 155/160 |
| MASC harmful clarifications | 2 | 2 |
| MASC harmful approvals / saved | 0 / 0 | 0 / 0 |
| MASC harmful no-decision outcomes | 0 | 3 |
| MASC ads blocked | 39/40 | 40/40 |
| FTC completed blocks | 342/724 | 347/724 |
| FTC unverified saved notices | 369 | 361 |
| FTC clarifications | 10 | 13 |
| FTC approvals | 2 | 3 |
| FTC provider failures | 1 | 0 |
| FTC source-call-weighted stops | 586/1,378 | 601/1,378 |
| FTC source-call-weighted approvals | 2 | 8 |
| FTC source-call-weighted saved notices | 750 | 728 |

V110's three MASC no-decisions were support cases 253, 256 and 259. Their facts failed schema parsing repeatedly: four, five and five rejected attempts respectively, with no accepted decision or question. They receive no success credit. The content-free diagnostics established invalid facts but did not retain the original schema issue paths, so the exact offending field cannot be inferred from the downstream `invalid_type` error. There were 18 rejected tool attempts across MASC and one across FTC; remaining rejections were corrected within their existing evaluation. No completed bad outcome was rerun or replaced.

FTC approvals were 191, 1164 and 1168, representing eight source calls. The model classified the latter two as ordinary tasks with separate contact and no established current automation. Recording 191 is the previously documented personal-family boundary. All remain harmful-label benchmark approvals; none is relabeled or excluded. The original brief family opener, 858, was questioned this time, which does not establish better family-call usability.

Known charge recordings 166 and 1100 were saved unverified. Recording 1314 was questioned again, with no inferred current automation. Its complete 347-character text was not truncated and contains neither a literal automation label nor the fixed inventory's playback/menu verbs. That inventory is not semantic adjudication or proof that it is live; it shows why audio provenance and text-visible evidence must be distinguished. No special public-row rule was added. Saved notices and questions never count as completed stops.

**V110 is not promoted.** It improves ordinary MASC offers and advertisement blocking and stops every fresh empty invitation, but the ordinary-report false block, incorrect notice holds and repeated invalid-tool outcomes leave meaningful work. A perfect small development grid was insufficient. The next work should improve general conduct attribution and schema-correction diagnostics using independent development, without feeding these held-out or public callers into prompt edits.

The round contains **18 scored runs and 3,092 trials**, with zero provider failures and three no-decision outcomes. These include overlapping and repeated callers. Every run has a recomputed validation summary. Durable source/results snapshots are under `artifacts/screening-hardening/*-boundary-snapshot/`, each with an adjacent SHA-256 manifest; `attribution-ledger.json` records request/result/summary hashes and counts. All dataset caches and result files remain ignored. No production source, main-benchmark label or held-out expectation changed.
