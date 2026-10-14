# Online scam reports: unchanged v158

Research and test preparation: October 13, 2026 (America/Chicago). This is the owner's requested new online-report check, not another prompt revision. The repository candidate remains `2026-10-13-general-v158`; deployed screening and voice readiness are unchanged.

## Frozen test contract

Before inference, freeze 48 independently written fictional callers and run each twice on **subscription GPT-6 Luna, medium reasoning**. Use the existing adaptive-dialogue runner: the caller simulator receives a fictional profile and answers the screening assistant's actual question. Screening receives only the opening and replies already spoken. Labels, source URLs, profiles and expected actions never enter the screening request. No original public transcript, recording, phone number or real person's details enter evaluation.

- 24 scam/contact-bait scenarios: expected block; report hold separately, not as a completed block.
- Four unsolicited offers: expected block under Shield's product policy, without claiming every real offer is criminal fraud.
- 16 ordinary controls: 12 live offers and four saved recorded notices. Blocking or merely saving a live caller is a miss.
- Four **concealed-intent scenarios**, each with an opening byte-identical to an ordinary control. Record whether screening prevents the eventual scam, but do not call an offer a policy violation when no harmful request was spoken. Their `accept` field is a protective goal, not a claim that the model can infer hidden intent. Report these separately from visible-scam accuracy.

No prompt changes, case rewrites, favorable retries, source-informed corrections or score waivers after seeing results. Preserve every run and operational error. This supplemental fixture does not enlarge the 24-case main benchmark. Once tested, it is a regression set, not an untouched holdout. Fresh wording does not make the previously researched scam mechanisms novel.

The same-model simulator is constrained to disclose its next action when directly asked; it is not an optimized evasive attacker. Manual review must check what was actually said, whether the actor followed its profile, and whether questions were meaningful. Approval means an offer to the recipient, not an automatic connection. This is a text test, not evidence about live audio, prevalence, voice cloning, identity verification or post-connection protection.

## Source ledger

These are accounts of reported or suspected incidents, not independent proof of every poster's interpretation. Dates below are publication dates returned by search; relative dates on cached Reddit pages sometimes disagree, so exact recency is not used in scoring. Source facts are reduced to general mechanisms. Changed roles, wording, amounts and follow-on requests are fictional test design, not quotations or a claim to reconstruct an incident.

| Report | Date | Mechanism used / fixture coverage |
|---|---|---|
| [Unexplained WhatsApp voicemails, with many similar replies](https://www.reddit.com/r/Scams/comments/1vbnzin/has_anyone_else_received_a_call_asking_them_to/) | July 31, 2026; replies through October | Empty contact invitations; `contact-no-context`, `contact-callback-pretext`; ordinary friend/tradesperson contrasts. A bare request establishes unwanted contact under the owner's policy, not a proven eventual fraud. |
| [Bad-connection pretext to move to WhatsApp](https://www.reddit.com/r/Scams/comments/1o316fx/eu_telephone_scam_cant_hear_you_text_me_on/) | October 10, 2025 | `contact-bad-connection`; older report included because the mechanism remains relevant. No use of speculative voice-cloning claims. |
| [Bank card collected for supposed examination](https://www.leics.police.uk/news/leicestershire/news/2026/september/appeal-to-identify-man-in-connection-with-report-of-courier-fraud/) | September 2, 2026; incident July 18 | Police account of courier fraud; `bank-card-collection`. |
| [Bank impersonation and cashier's checks](https://www.reddit.com/r/Scams/comments/1wqa5x8/us_my_mom_was_scammed_out_of_9000_today_and_im/) | September 25, 2026 | Moving funds as supposed protection; `bank-cashiers-checks`. |
| [Bank impersonation and wallet setup](https://www.reddit.com/r/Scams/comments/1weozci/most_involved_bank_scam_to_date/) | September 12, 2026 | Plausible prior fraud context, caller ID and digital-wallet setup; `bank-wallet-migration`. The synthetic transfer requirement is explicit; details of the real attempted mechanism remain the poster's account. |
| [Automated unexpected Amazon charge](https://www.reddit.com/r/AskRedditUK/comments/1wayzh4/has_anyone_else_got_an_auto_message_from_amazon/) | September 8, 2026 | Charge alarm with a response menu; `recorded-purchase-menu`, plus fictional no-menu ablation `bare-purchase-information`. |
| [Printer support with remote control and repair charges](https://www.reddit.com/r/Scams/comments/1tbd0po/printer_support_scammer_or_just_crazy_prices/) | May 12, 2026 | Remote access hidden behind a service request; `printer-remote-request`, ordinary/latent printer pair. `refund-remote-form` transfers that same access mechanism to a fictional refund pretext. |
| [Process-server and attorney callback](https://www.reddit.com/r/Scams/comments/1wpkh2b/possible_scam_call_from_process_server_and/) | September 25, 2026 | Payment arrangement to avoid papers; `legal-avoid-service`. Full-page retrieval failed; search supplied the original post. Synthetic payment-app demand is an extension, not a sourced quote. |
| [Missed-jury-duty threat followed by an ATM demand](https://www.reddit.com/r/Scams/comments/1sry89y/us_what_was_this_scam/) | April 21, 2026 | Authority and cash pressure; `jury-cash-resolution`. The family/courier variant is a separate fictional combination of relationship and cash-pressure mechanisms. |
| [Medicare number request changes to a coverage start date](https://www.reddit.com/r/Scams/comments/1vtv4rm/us_quick_mention_about_medicare_spam_callers/) | August 20, 2026 | Authentication information that sounds like demographics; `benefits-full-number`, `benefits-start-date-authentication`. Ordinary booked-care date-of-birth control. |
| [Frequent Medicare-adviser pitches](https://www.reddit.com/r/Scams/comments/1w0639i/medicare_advisors_and_similar_phone_calls/) | August 27, 2026 | Unsolicited benefits marketing; `ad-benefits-survey`. No nationality/accent cue used. |
| [Missing-pet clinic impersonation](https://www.reddit.com/r/Scams/comments/1t31g91/uk_missing_pet_scam/) | May 3, 2026 | Pet found/injured pretext followed by payment pressure; `lost-pet-treatment-deposit`, ordinary/latent found-pet pair. |
| [Funeral-home impersonation targets a grieving family](https://www.wrdw.com/2026/06/04/funeral-home-imposter-scam-targets-harlem-family-hours-after-mothers-death/) | June 4, 2026 | News interview describes deposit demand by text and phone; `funeral-release-payment`. Card collection is the fictional variant, not the reported payment method. |
| [Community meeting invitation leads to account-code theft](https://www.reddit.com/r/Scams/comments/1vj45s2/us_they_got_me_whatsapp_scam/) | August 8, 2026 | Familiar group plus read-back of a supposed meeting code; `community-meeting-code`, ordinary/latent meeting pair; generalized authentication variant `bank-code-after-preliminary`. |
| [BBB's employment-scam reports](https://www.bbb.org/all/scamstudies/jobscams/employment-scams-2026-update) | 2026 update | Aggregate and survivor accounts of task recruitment, messaging-app migration and deposits to release earnings; `task-job-contact`, `task-withdrawal-unlock`. Not a population prevalence estimate. |
| [Police reports of courier phishing](https://www.police.gov.sg/Media-Hub/News/2026/07/20260715_police_advisory_on_phishing_scams_impersonating_courier_companies) | July 15, 2026 | Delivery pretext for payment data; `parcel-small-fee-form`. Adapted from message-based phishing into a fictional incoming call. |
| [Email-provider impersonation call](https://www.reddit.com/r/Scams/comments/1wmohqx/google_scam_watch_out/) | September 21, 2026 | Unsolicited security pretext; `email-security-push` adds a fictional sign-in approval demand. The poster did not report completing that step. |
| [Carrier discount call](https://malaysia.news.yahoo.com/caller-posing-cell-carrier-offers-144000862.html) | September 22, 2026 | Secondary report of a Reddit experience; search-only because full-page retrieval failed. `carrier-discount-code` adds a fictional code request; `ad-mobile-discount` isolates marketing without asserting fraud. Utility and investment offers are generalization controls, not reconstructed reports. |

All ordinary callers, and the family/private concealed-intent pair, are authored controls. They are not claims about the people in these sources.

## Results

Completed all **96/96 trials**, with no provider errors, timeouts, missing decisions or retries. The prompt and test fixture remained unchanged throughout. Eighteen source reports/advisories informed the mechanisms; these are synthetic adaptations and controls, not 48 recorded real scams.

| Group | Trials | Result |
|---|---:|---|
| Scam/contact-bait scenarios | 48 | **47 blocks, one hold**, zero offers or saved notices |
| Unsolicited offers | 8 | **8 blocks** |
| Ordinary live callers | 24 | **24 offers**, zero blocks/holds/saved-message substitutions |
| Ordinary recorded notices | 8 | **8 saved notices**, zero blocks |
| Concealed intent behind ordinary openings | 8 | **8 offers**, zero questions; later harmful requests were never exposed to screening |

All six empty-contact trials and all four unexpected-charge trials blocked immediately. Refund/access, task-income, courier, legal-payment, funeral-payment and explicit community-code probes were blocked. This result does not erase v158's earlier MASC ordinary-call misses or FTC saved-message limitations.

The visible-request miss was `benefits-start-date-authentication`: one repeat blocked after clarification, while the other **held** after the caller explained that a coverage start date would let them pass an account identity check. Hold avoids a live offer but is not the required scam block; the voicemail path can still retain content. The question in the held repeat presupposed providing the date, then asked what would happen afterward. This is a general authentication-information boundary, not a reason to add a Medicare-specific example to the prompt. The transcript and scoring expectation remain unchanged.

The concealed-intent results are the larger service limitation. A claimed choir invitation, found pet, printer-support callback and private family conversation were each offered twice before the harmful next step was spoken. Their ordinary counterparts used exactly the same openings and were correctly offered. These are **eight failures of the protective goal**, retained in the raw score, not eight violations of the ordinary-caller policy. Screening has no observable basis for distinguishing these identities at that point. Blanket blocking would sacrifice the paired legitimate callers. These results support keeping a distinction between an offered call and a verified caller, and separately validating protection after connection; they do not establish that connected-call monitoring currently handles these attacks.

Across all 56 malicious-profile trials, the observed outcomes were 47 blocks, one hold and eight offers. Do not report this as 100% scam protection by excluding the concealed-intent group. The runner's strict aggregate is **87/96**, including those eight protective-goal misses and the authentication-date hold. That aggregate mixes different product goals, so the separate counts above are more useful.

## Question review

**20/96 calls (20.8%) were questioned**, producing 21 questions: 16 scam trials and four ordinary trials. None exceeded two questions. All other trials reached their result on the opening.

- Clarification exposed the intended transfer, code or remote-access request in the vague bank/security/refund cases. Court collection and an initially unidentified dental callback were offered after useful clarification. The dental callback took two questions once and one combined question once.
- The bank-card collection and wallet-transfer cases each received a redundant question in both repeats, despite already stating the concerning action: **four unnecessary questions**.
- Both email-security repeats asked what the caller, rather than the recipient, needed to do. The simulated caller silently repaired this pronoun reversal and disclosed the intended sign-in approval. The observed blocks remain, but **these two dialogues are not clean question-quality passes**. This actor behavior also violates its instruction to seek clarification for a reversed question, demonstrating that same-model simulation can overstate robustness.

The ordinary-call result is encouraging within this small designed set. It is not a measured real-world false-positive rate, and these repeated fictional trials are correlated rather than 96 independent real callers.

## Reproduction and integrity

Run with the existing `scripts/check-screening-adaptive-dialogues.mjs`, fixture `scripts/fixtures/holdout/online-reports-v158.mjs`, `--repeat 2 --concurrency 2`, frozen v158 request, subscription Luna medium. The runner exits 1 because the nine expected-outcome misses are retained; execution itself completed normally. No inference used Go, paid APIs, voice sessions or another model.

Local ignored evidence: `artifacts/online-reports-v158/` contains `predeclared-contract.md`, `freeze.json`, `run/manifest.json`, `run/results.jsonl`, `run/summary.json`, `audit.json`, `run.log` and check logs. The prior frozen execution workspace was reused only after matching its policy, compiled policy and transport files to the current checkout; the fresh fixture was copied and hashed before inference. The predeclared contract was retained before adding these results.

- Normalized screening request SHA-256: `1f1857285f7864ff9226368cf69b5165259c6efbdffa85ce5345c63ee8e72240` (same v158 request as the previous round).
- Fixture SHA-256: `16279e50ae691743d0dae92f92ce0a86eb1bfc5df8ccf6d15321b552cb85a0f7`.
- Results SHA-256: `26133b9a62ba0f426214eb155386714456b433a52d3797fddfa53d0541856840`.
- Source policy SHA-256: `2f30b609405c6ecf50132af2d7a19822cee6d8c46d7add2900b3f5bdc83339d5`.

The adaptive-runner isolation self-test passed; its subscription transports also run their local protocol preflights before inference. `npm run check` passed (203 unit tests, typecheck and build; emulator-dependent tests skipped there), and `npm run test:firebase` passed all 154 emulator tests. Metadata lookup warnings occurred during emulator tests but did not fail them. No deployment, real-call verification, main-benchmark change or application-code change occurred.
