# Charge priority and offer review — October 13, 2026

No candidate in this round is selected for the application. Repository v99 and post-call v7 remain unchanged by these experiments. The round began with deployed v30; a separate owner-approved release is now recorded in STATUS.md as screening v31 and voicemail v4, verified October 13 at 08:09 Central. This experiment did not deploy or independently verify that release. All external inference used subscription GPT-6 Luna with medium reasoning. The public FTC/NC State exception was already authorized; no private caller data, audio, paid API, calls or deployment were used.

## Current owner preference

During this round the owner explicitly selected **stop unexpected-charge alarms; preserve ordinary receipts and notices**. This supersedes the earlier preference to save those alarms unverified. Saving an alarm is therefore a miss against the new target, even though it prevents a live offer. Other useful or uncertain recordings remain eligible for unverified saving. A normal receipt, completed refund or ordinary billing discussion is not an unexpected-charge alarm.

The repository and deployed policies have **not yet been changed to implement this preference**. The screening and post-call paths both need alignment when a replacement passes validation. The owner has declined paid voice testing and asked to ignore voice readiness for now; none of these text results is voice or real-call evidence.

The original v79 named-contact failure confused identity with a relationship. The original FTC family greeting, recording 858, supplies no text-visible harmful request and remains compatible with the owner's family-call preference. Its public source label is preserved; no rule is added to force that particular greeting to fail. See the [v79 analysis](SCREENING-V79-REPAIR.md).

## Experiments and development

V122 leaves v111's first pass unchanged and independently reviews only validated proposed offers. The reviewer receives current caller words, without the first pass's answer, scoring labels or future replies. It can confirm, stop, save or request a bounded clarification. Invalid reviews cannot release offers. Results are cached for unchanged caller input within a session; this is not outcome-based retrying.

V122 is rejected. On the focused 104 trials it passes 95 versus 96 for a new v111 control. It offers 29/36 intended live ordinary calls versus 33/36, with four ordinary blocks versus one. Both save all eight intended notices. The reviewer ran 31 times and changed two offers into unnecessary identity questions; the workshop role was already stated. The four blocks were first-pass decisions, not reviewer overrides, so they cannot be attributed causally to the extra check. Observed review latency had a 4.06-second median and 13.51-second p95 in this concurrent offline run; this is not production latency. The added work did not justify adoption.

V123 returns to one pass and adds explicit `empty_contact` and `charge_alarm` prohibited categories. It implements the owner's new charge preference but is rejected for ordinary-call loss. Development diagnostics show `empty_contact` assigned even when `separateContact` is false, and to stated family/service callbacks. One personal report of the caller's own financial trouble also became a charge alarm. Separating those two new categories is a useful future experiment; this combined change does not establish the cause of every regression.

V124 uses the earlier v84 direct-decision wording with five-action notice handling, the latest charge preference, optional payment safeguards and supplied-command blocking. V125 adds only a 157-character recording-cue sentence after a known development live-billing caller was saved as a recording. No held-out/public wording was used for either revision. V124 froze before the first fresh outcomes were inspected. V125's change was based on that development error; its new validation was authored after its freeze.

| Development | Strict passes | Intended ordinary live offers | Intended ordinary notice saves | Ordinary false blocks |
|---|---:|---:|---:|---:|
| v111 focused control | 96/104 | 33/36 | 8/8 | 1 |
| v122 focused review | 95/104 | 29/36 | 8/8 | 4 |
| v123 expanded development | 128/152 | 37/50 | 14/16 | 13 |
| v124 expanded development | 144/152 | 47/50 | 16/16 | 1 |
| v125 expanded development | 146/152 | 48/50 | 16/16 | 0 |

The expanded set is the same 52 focused callers plus 24 new charge/contact development contrasts, with two repetitions. It is not the same denominator as the focused control. Two strict misses per expanded run are an unchanged historical expectation to clarify an unexplained charge; immediate blocking now matches the owner's instruction. Original scores remain intact. V125 also approves two role-only opening trials before the required clarification; a final offer count does not make those sequences correct. Both v124 and v125 save the ordinary live billing callback twice instead of offering it.

Normal instructions plus serialized tools total 12,069 characters for runtime v99, 8,144 for v123, 9,176 for v124 and 9,333 for v125. V124 and v125 are respectively 24.0% and 22.7% shorter than v99 by this measure. Character counts are not token, cost or quality estimates. The rejected review adds a second request on proposed offers; it is not a free reliability improvement.

## Fresh validation and questions

The 36-call offer-review fixture was authored after v122 froze. Before any fresh inference, four charge scenarios received separately recorded expected-outcome changes following the owner's explicit answer. Caller wording and original source categories remain unchanged. The derivative fixture and original expectations are both retained. The main benchmark likewise has a separate two-case charge-policy expectation overlay; its original 24 cases were not edited or enlarged.

| First fresh set, two repetitions | v111 control | v123 | v124 |
|---|---:|---:|---:|
| Strict outcomes and sequences | 59/72 | 63/72 | 67/72 |
| Intended ordinary live offers | 23/24 | 20/24 | 22/24 |
| Intended ordinary notice saves | 6/6 | 6/6 | 6/6 |
| Ordinary false blocks | 0 | 4 | 0 |
| Harmful approvals | 1 | 0 | 0 |
| Question turns | 20 | 5 | 13 |

V124 blocks all ten empty-contact trials, including two after useful clarification. It stops all eight charge scenarios eventually, but one receives an unnecessary question first. Two optional remote-access requests are questioned rather than blocked, and the live completed-refund callback is saved twice. These misses are retained. V123's fewer questions partly reflect premature blocking and are not an improvement in question quality.

The later 24-call recording-cue validation has two repetitions per prompt. V124 and v125 each pass 45/48. V125 offers 16/18 intended live callers versus 15/18, saves all 8/8 intended notices and has no ordinary false blocks versus one. Both still save the live cancellation/refund callback twice. V125 saves one conditional purchase alarm instead of stopping it; v124 stops all 16 harmful/unwanted trials. Neither has a harmful live approval. This is insufficient evidence to promote v125 or claim its recording sentence fixed the issue.

The v124 main/caution run passes 28/32 against the charge-policy overlay. V125 passes 58/64 across two planned repetitions. Both retain nine ordinary main live offers per repetition, but save charge alerts contrary to the new preference. The previously saved government-threat case is blocked; this remains a strict mismatch against its unchanged old expectation and is disclosed separately. One clinic callback is saved in each version's caution evaluation. No new public rerun was performed for v125 after these failures.

Synthetic questions were inspected separately. Missing-purpose questions were generally useful, but the optional-access cases already contained prohibited requests and should not have been questioned. V122's two identity questions repeated information supplied by the caller's role. No question budget was exceeded and no question text was missing. Prepared replies were released only after a native question, never in an opening request.

## Public regression: v124, one pass

| Measure | Result |
|---|---:|
| MASC ordinary offered | 62/80 |
| MASC ordinary saved as notices | 17/80 |
| MASC ordinary blocked | 1/80 |
| MASC harmful stopped | 158/160 |
| MASC harmful questioned | 2/160 |
| MASC harmful approved | 0/160 |
| MASC advertisements blocked | 39/40 |
| MASC retained evaluation timeouts | 1 |
| FTC completed blocks | 489/724 |
| FTC saved unverified | 227/724 |
| FTC questioned | 7/724 |
| FTC approved | 1/724 |
| FTC call-frequency-weighted blocks | 923/1,378 |
| FTC call-frequency-weighted saves | 441/1,378 |

This is an unacceptable ordinary-offer regression relative to the earlier v111/v119/v120 runs that offered all 80 MASC ordinary callers. A saved message is not an ordinary live offer. Those earlier controls are historical, not newly paired public runs under identical policy. The five-action results must not be presented as a like-for-like improvement over v79's four-action FTC score.

The only FTC approval is family greeting 858, discussed above. Original charge recording 1314 and charge regression 1100 are blocked; charge regression 166 is saved, which misses the new target. Saved notices and questions receive no completed-stop credit. The FTC corpus has no ordinary-call control group.

MASC's original run stopped after 169 completed rows when one advertisement evaluation timed out. The finalized prefix remains untouched. A new output directory copied that exact prefix and scheduled only the 151 unrun identities. The timeout was not retried and receives no success credit. Final membership is all 320 unique identities, one result each. A first attempt to use the existing finalized-run resume command was rejected before inference; no result was replaced.

## Evidence, integrity and next work

Current patterns were checked against the ICO's [October 9 automated-call report](https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2026/10/complaints-about-automated-nuisance-calls-hit-five-year-high/), recent [consumer reports of messaging-app invitations](https://www.reddit.com/r/britishproblems/comments/1x03t23/the_amount_of_calls_from_an_automated_voice/), an [August group-impersonation report](https://www.reddit.com/r/Scams/comments/1vj45s2/us_they_got_me_whatsapp_scam/) and the FTC's [June guidance on malicious verification commands](https://www.militaryconsumer.gov/blog/how-spot-captcha-scam). Anonymous reports are anecdotes, not verified prevalence estimates. Fresh fixtures use invented callers and general mechanisms, without copied real transcripts or brand-specific decision rules.

All source membership, labels, expectations, request hashes and final scoring were audited. The reviewer audit also recomputes its decisions and checks each input hash against the caller turns available at that point. Seven normal/caution/review requests were scanned against both public datasets: no shared 12-word passage or exact short public opening was found. Local transport mocks verify caller-only inputs, no scoring context or future replies, Luna medium, cancellation, evidence rejection, parallel-tool handling and fail-closed review. These checks cannot establish absence of conceptual overfitting or unknown model pretraining exposure. The repeatedly used public datasets are regressions, not fresh holdouts.

Required checks passed: typecheck, 191 unit tests, build and 154 Firestore emulator tests. The initial sandboxed unit run could not bind its local HTTP mock; the authorized rerun passed. The new review mock covers 11 scenarios with 18 primary requests and 14 review/cancellation requests; existing mapper, message and clarification-progress mocks also pass. No application runtime changed.

This round contains **14 complete scored runs and 2,116 trials**, including repetitions and shared callers, with one retained provider timeout and no final no-decisions. The MASC continuation is one logical run, not an extra benchmark. Durable snapshots and a result ledger live under ignored `artifacts/screening-hardening/`; the local audit code and hashes are preserved with them.

The main lessons are that an extra offer review did not help enough, an unrestricted empty-contact category harmed ordinary callers, and direct prompts lost the structured mapper's reliable distinction between live calls and recorded notices. Next work should isolate charge blocking from the rejected empty-contact category, and test a narrow recording-evidence requirement rather than another broad rewrite. All newly evaluated validation cases are now unavailable for prompt tuning. Runtime and post-call charge handling still need implementation and validation; the goal is active, not complete.
