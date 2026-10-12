# Public scam benchmarks

Reviewed October 11, 2026. The first public diagnostic used frozen screening v16 and monitor-v2. Subsequent screening changes came only from development cases: v17 clarified manipulation precedence, and v18 clarified ordinary demographics with an existing healthcare office. No public or held-out result was used to tune either production prompt. The owner later requested a separate benchmark-specific binary classifier, described below; it does not enter Shield's production harness or policy. The initial MASC checks were synthetic. Later FTC/NC State transcript checks use the owner’s explicit public-dataset exception described below; audio is not used.

## Sources and suitability

| Source | What it provides | Fit for Shield |
|---|---|---|
| [MASC / BothBosu multi-agent-scam-conversation](https://huggingface.co/datasets/BothBosu/multi-agent-scam-conversation) | 1,600 synthetic English phone dialogues; 320 published test cases, 40 per type; Apache-2.0. Fraud types: SSN, refund, support, reward. Non-fraud types: appointment, delivery, insurance sales, wrong number. | Best immediate public starting point. Our adapter evaluates the published test split only. Varying recipient personalities help exercise context. Family scams and many newer scam mechanisms are absent. |
| [BothBosu scam-dialogue](https://huggingface.co/datasets/BothBosu/scam-dialogue) and [single-agent-scam-conversations](https://huggingface.co/datasets/BothBosu/single-agent-scam-conversations) | Synthetic English scam/non-scam phone conversations. The scam-dialogue card lists 1,600 rows and Apache-2.0. | Useful breadth checks after MASC, but related generation/templates can overlap. Deduplicate across corpora and do not treat them as independent replications. Label 0 includes genuine sales/telemarketing. Not executed in this pass. |
| [TeleAntiFraud 2.0 paper](https://arxiv.org/abs/2609.18748) and [research artifact](https://anonymous.4open.science/r/TeleAntiFraud-2_0-EEB2/) | Monthly frozen sets of 900 Chinese calls: 600 fraud and 300 lawful calls sharing closely related situations. Generated dialogues are rendered as speech, with manifests and provenance. | Strong evaluation design for confusing legitimate/scam pairs and audio. Chinese language and regional scripts limit direct relevance to the English US pilot. Verify the artifact's dataset license and synthetic provenance before importing. Not executed here. |
| [COVA-X authors' site](https://scamlingua.org/) and [paper](https://arxiv.org/abs/2606.06879) | 10,985 synthetic multi-turn conversations across eight elder-targeted scam categories. The authors' site requires requesting access and describes non-commercial research terms. | Very relevant family/grandparent and elder-fraud coverage, but it is not an unrestricted downloadable public benchmark. No access request was sent. Outcome labels also need mapping to Shield's request-level decisions. |
| [Voice-agent honeypot corpus](https://arxiv.org/abs/2609.29528) and [analysis paper](https://arxiv.org/abs/2608.24127) | 10,015 real English US inbound calls to researcher-owned numbers seeded into lead-generation forms, answered by an LLM persona. Automatic holistic labels: 949 scam, 3,949 spam, 380 legitimate, 1,096 too brief; 75% agreement with human reviewers on a 60-call check. The descriptor announces a 1,000-call de-identified public subset (500 scam, 500 spam, transcripts only) under a non-commercial licence, plus the full corpus under a data-use agreement. Published caller-disjoint baselines: TF-IDF classifiers F1 0.70–0.75, zero-shot Gemini 2.5 Flash F1 0.79; detectors trained on synthetic dialogue fall to F1 0.02–0.40. | The strongest candidate after MASC: real callers, English, and a published synthetic-to-real collapse that directly tests generalization. Not used yet: no download link was found on October 11, the licence is non-commercial, the public subset has no legitimate calls, and real-call transcripts need an explicit owner exception to this repo's synthetic-only evaluation rule. Shield blocks both scam and spam, so its policy score differs from the source scam-vs-rest task. Dropped by the owner on October 11: the data is obtainable only by contacting the authors' company, scam.ai, which the owner declined. |
| [NC State robocall audio dataset](https://github.com/wspr-ncsu/robocall-audio-dataset) | 1,432 real robocall recordings released by the FTC's Project Point of No Entry with its cease-and-desist letters: 1,378 English, 54 Mandarin. Whisper transcripts of the robocaller side, 16 kHz audio, and the FTC letter for each call. Data in the public domain. | Real illegal robocalls, available now, matching Shield's robocall and scam rules. Harmful calls only, so it cannot measure legitimate calls offered. Campaigns replay recordings: 724 distinct English transcripts. Screening v20 identified 99.1% of the 1,378 English calls (94.8% blocked). The [RoboKA study](https://arxiv.org/abs/2605.00156) reports recall on the same 1,378 calls (labelled "DNCR" there, citing the NC State report) of 46.6–82.2% for its models. See [FTC robocall benchmark](#ftc-robocall-benchmark). |
| [Fraud-R1](https://aclanthology.org/2025.findings-acl.226/) | 8,564 fraud-only messages, emails, posts and job ads in English and Chinese, with pre-written credibility, urgency and emotional escalations. Gated research-use agreement that bars financial gain. | Not adopted. It has no legitimate cases, so blocking everything scores 100%. It is not phone calls, and its escalations do not answer Shield's questions. |
| [ICFD-31k](https://www.ijcai.org/proceedings/2026/786) ([repository](https://github.com/SPELLAILab/ICFD-31k)) | About 31,000 synthetic Indian-context fraud conversations with chunk-level streaming labels. Licence and class balance not stated on the proceedings page. | Streaming labels suit an early-detection timing study. Regional scripts limit relevance to the US pilot. Not executed. |

MASC's dataset card and the [authors' project](https://supreme-lab.github.io/ai-in-the-loop/) document its synthetic provenance. Public availability does not make these real-call evidence. A high score on repetitive generated dialogues can be easier than a call with indirect phrasing or imperfect transcription.

## Coverage and published model results

Shield evaluated **the entire published MASC test split: 320 unique conversations, 40 in each of eight categories**. The full [MASC dataset](https://huggingface.co/datasets/BothBosu/multi-agent-scam-conversation) contains 1,600 conversations: 1,280 training rows and 320 test rows. The [pinned repository](https://huggingface.co/datasets/BothBosu/multi-agent-scam-conversation/tree/709db2b6c37f424c3070f29138abb33971e21ab9) publishes separate all/train/test files. We did not evaluate the training split or the authors' other corpora and generation tasks.

All 320 test rows were executed. The screening report groups them as 160 labeled scams, 80 ordinary appointment/delivery calls, 40 insurance sales scored separately as ads, and 40 wrong-number diagnostics. The frozen v18 results were 160/160 scams identified with clarification credit, comprising 155 completed blocks/holds and five clarifications; 80/80 ordinary calls offered; 40/40 ads blocked; and zero labeled scams approved. These are Shield policy measures, not the original benchmark's binary-classification F1.

The [authors' published MASC tables](https://supreme-lab.github.io/ai-in-the-loop/#results), checked October 11, report the following F1 scores. F1 combines precision and recall; it is not the percentage of scam calls identified. Values are author-reported reference results, not measurements reproduced through Shield.

| Model | Published MASC F1 |
|---|---|
| LlamaGuard | 58.29% |
| LlamaGuard2 | 72.75% |
| LlamaGuard3 | 82.00% |
| MD-Judge | 83.06% |
| DistilBERT | 96.97% |
| BERT-Base | 98.12% |
| BERT-Large | 98.83% |
| RoBERTa | 99.32% |
| BiLSTM | 99.88% |
| BiGRU | 99.92% |

The [AI-in-the-Loop paper](https://arxiv.org/html/2509.05362v3#S4) describes trained classifiers and instruction-tuned guard models, with conversation-level labels and both speaker roles. Shield screening uses caller speech only, makes a call-offer decision, and credits unanswered clarifications under the owner's later scoring rule. MASC labels insurance sales as non-scams; Shield intentionally blocks them and reports ads separately. Wrong numbers also stay outside Shield's ordinary-call score. The [released guard evaluation script](https://github.com/supreme-lab/ai-in-the-loop/blob/main/source_code/eval_for_f1_auprc_fpr_fnr.py) loads `all_data.chat.json` and fine-tuned model checkpoints; it does not establish an evaluation on our exact pinned 320-row test file. These differences prevent a direct ranking of Shield's 100% against the published F1 values.

A separate [AAAI 2025 study, Combating Phone Scams with LLM-based Detection](https://ojs.aaai.org/index.php/AAAI/article/download/35298/37453), includes MASC. Its Table 1 reports a trained Random Forest at 0.99 F1 on MASC. It also evaluates GPT-4, GPT-4o, GLM-4, Doubao and ERNIE, but Figure 1 groups results as synthetic versus real data rather than providing individual MASC scores. We therefore do not assign those LLMs a MASC number. The paper shows how near-perfect performance on generated data can collapse on a newly constructed adversarial set, supporting broader validation beyond MASC.

No independently verified, comparable GPT-6 Luna, current Claude or Gemini MASC result was found in this review. To compare models fairly, run them on the same pinned test rows with the same inputs, prompts, category groups, clarification credit and failure handling. Keep an original-label binary-classification track separate if comparing with research F1. For a shareable report, describe this as full published-test-split coverage with perfect observed screening identification under the stated rule, alongside the 96.9% completed-stop rate and the separate monitoring results below. It is synthetic text evidence; live timing, GPT Live screening behavior and real-call effectiveness remain unmeasured by this benchmark.

Coverage and baseline report validation (October 11): saved results contain 320 unique IDs, exactly 40 per type. `npm run check` passed 117 unit tests, typecheck and build; `npm run test:firebase` passed all 86 emulator tests. This documentation update made no model requests or policy changes.

## Separate MASC binary classifier

The owner requested this benchmark-specific version after the Shield diagnostic and its limitations were known. It uses a separate [runner](../scripts/check-masc-classifier.mjs), [base classifier](../scripts/lib/masc-classifier.mjs) [v2 adaptation](../scripts/lib/masc-classifier-v2.mjs) and [v3 vote](../scripts/lib/masc-classifier-v3.mjs). The default is `2026-10-11-masc-classifier-v3-unanimous`; `--version v1` and `--version v2` preserve the earlier requests. No version imports the production screening or monitoring requests. Only the pinned CSV parser and role mapping are shared. The provider is the existing OpenCode Go Responses endpoint, `https://opencode.ai/zen/go/v1/responses`, with GPT-6 Luna at medium reasoning; the direct OpenAI API is not used.

The adaptations match the classification task rather than live call protection:

- Both speakers' entire completed conversation reaches the model, without the production 6,000-character rolling tail. All 320 test conversations fit; the longest is 12,603 characters, and 38 exceed the production window.
- Source labels remain the original binary scam/non-scam labels. Genuine insurance sales and wrong numbers are included as non-scams. All 320 rows affect the headline accuracy and F1; there is no ad-blocking score in this classifier.
- The classifier assesses a deceptive attempt even if the recipient refuses and prevents its completion. It decides scam or non-scam once; there are no clarifying questions, abstention credit, call offers or monitoring interventions.
- Source labels, type, personality, row ID and previous results never enter the model input. The instructions contain general fraud and ordinary-service distinctions, with no public-row examples, answer mappings or category-to-label lookup. Generated reasons stay in memory; only predictions and non-content metadata are saved.
- Gateway retries send the identical input and follow a fixed transport policy. Incorrect classifications are never retried based on the expected label. Failed and unrun rows stay in accuracy and class-recall denominators; conventional binary precision/recall/F1 are withheld unless all planned rows have valid decisions.

Before MASC requests, the classifier passed 48/48 checks on 16 independently authored [development conversations](../scripts/fixtures/masc-classifier-development.mjs), repeated three times: 24/24 scam attempts and 24/24 non-scams. They exercise solicitation, wrong numbers, ordinary services, recipient scam stories, failed fraud attempts, injected instructions and an early scam request beyond the last 6,000 characters. These are not copied from public MASC rows.

The first frozen classifier, v1, completed three full MASC passes. It identified all 480/480 scam trials and correctly classified 470/480 non-scam trials, with zero provider or schema failures. Accuracy was 950/960 (98.96%); pooled binary F1 was 98.97%. Per-pass accuracy was 317/320, 316/320 and 317/320. The ten errors were false positives in delivery and insurance conversations. All initial results remain in `artifacts/masc-classifier/masc-v1-three-passes/`; classifier and production hashes were unchanged throughout those passes.

V2 adds a general fraud-versus-privacy distinction: an intrusive question, sensitive identity field, unverifiable business identity or poor security practice alone does not establish deception. It still treats fabricated threats/entitlements, account takeover, implausible payment mechanisms and extortion as fraud attempts even when they fail. The instructions contain no public-row wording or expected answers. Ten fresh [risk-boundary development conversations](../scripts/fixtures/masc-classifier-risk-development.mjs) pair ordinary information requests with fraudulent insurance, courier and clinic pretexts. The expanded 26-case development set passed 78/78 over three runs for both v1 and v2: 42/42 non-scams and 36/36 scams. These checks cover the intended distinction but did not reproduce v1's public false positives. V2 was frozen before its new public requests. Its three passes scored 952/960 (F1 99.17%): seven insurance false positives and one missed refund scam, in `artifacts/masc-classifier/masc-v2-three-passes/`.

V3 sends the conversation to v1 and v2 independently and labels it a scam only when both say so. Neither request sees the other's answer, and a failed vote fails the check. The vote was chosen after v1 and v2 public test outcomes were known, to cut false positives. It passed the 26-case development set 78/78 over three runs, then was frozen before any v3 public request.

Frozen v3 also ran once on MASC's 1,280-row training split. No classifier version was developed against it: the split was first downloaded six minutes after v3 was written, and no earlier result references it. It shares no conversation with the test split. Because it comes from the same generator it is in-distribution, but it is the cleanest unseen check of v3. Each v3 row records both votes, so v1 and v2 are scored on the same rows as diagnostics.

| Run (frozen v3, original labels) | Accuracy | Scams | Non-scams | F1 |
|---|---|---|---|---|
| Test split, three passes | 958/960 (99.79%) | 480/480 | 478/480 | 99.79% |
| Training split, one pass, unseen | 1,275/1,280 (99.61%) | 639/640 | 636/640 | 99.61% |
| Training split, v1 vote alone | 1,264/1,280 | 640/640 | 624/640 | |
| Training split, v2 vote alone | 1,272/1,280 | 639/640 | 633/640 | |

There were no provider failures, and classifier and production hashes were unchanged in both runs. Both test errors were the same insurance conversation; v3 classified it non-scam in the third pass. The training errors were two delivery and two insurance false positives and one missed refund scam. The unanimous vote beat each component on the unseen split, which supports the vote rule beyond the test outcomes that motivated it. Results are in `artifacts/masc-classifier/masc-v3-three-passes/` and `artifacts/masc-classifier/masc-train-v3/`.

Published MASC F1 values for trained models range from 96.97% (DistilBERT) to 99.92% (BiGRU); those models trained on the 1,280-row training split. V3 is zero-shot: it never trained on MASC rows. Its test-split score is benchmark-adapted, since v1–v3 changes followed test outcomes, so the unseen training-split result is the fairer generalization figure. Pretraining exposure of GPT-6 Luna to this public dataset is unknown.

**Owner adjudication.** The owner judged one test row a broken label: masc-test-102, labeled non-scam insurance sales, in which an unsolicited caller collects the recipient's Social Security, driver's licence and birth details. [`masc-adjudication.mjs`](../scripts/lib/masc-adjudication.mjs) states the rule: a source non-scam in which the caller solicits or collects the recipient's Social Security number on an unsolicited call is scored as a scam attempt. Every label-0 row in both splits was searched for Social Security number mentions and each match was read. The rule matches masc-test-102 and masc-train-415, where an insurance caller asks for both numbers. It was chosen after test outcomes were known. It applies offline to saved results through [`rescore-masc-classifier.mjs`](../scripts/rescore-masc-classifier.mjs), which writes `summary-2026-10-11-masc-adjudication-v1.json` beside the untouched original summary.

| Frozen v3 | Original labels | Adjudicated |
|---|---|---|
| Test split, three passes | 958/960, F1 99.79% | 959/960, F1 99.90% |
| Training split, one pass | 1,275/1,280, F1 99.61% | 1,274/1,280, F1 99.53% |

The adjudication cuts both ways. On the test split, v3's two scam votes on row 102 become correct and its third-pass non-scam becomes the only error. On the training split, v3 classified row 415 as non-scam, so the adjudicated score falls. The original-label results remain the comparable MASC figures; report the adjudicated score only beside them, with the rule.

Each run freezes the request hash, runner/classifier/development-source hashes, dataset revision/hash, planned IDs and production-policy hashes before model requests. Source and production hashes are checked again afterward. Results are kept in fresh ignored directories under `artifacts/masc-classifier/`. This is a benchmark-adapted evaluation, not a fresh unseen-test result: prior MASC outcomes informed the task/context changes, and model pretraining exposure to this public dataset is unknown. The original Shield diagnostic scores remain separate.

Reproduce without a backend build:

```bash
node scripts/check-masc-classifier.mjs --dataset development --repeat 3
node scripts/check-masc-classifier.mjs --repeat 3 --concurrency 6
node scripts/check-masc-classifier.mjs --dataset masc-train --concurrency 6
node scripts/rescore-masc-classifier.mjs artifacts/masc-classifier/<run>
```

`--prepare-only` validates the pinned split without model requests. `--limit-per-type` supports a smoke check; a partial selection is marked as such and cannot be described as full test-split coverage. The main Shield benchmark and every production prompt remain unchanged. No deployment or real call is performed by this runner.

## FTC robocall benchmark

[`check-robocall-benchmark.mjs`](../scripts/check-robocall-benchmark.mjs) runs Shield's production screening request on real robocalls from the [NC State robocall audio dataset](https://github.com/wspr-ncsu/robocall-audio-dataset). It uses production requests rather than a benchmark-specific classifier, as the owner chose. The owner granted an exception to the synthetic-only evaluation rule on October 11, for this public-domain dataset only. The runner refuses model requests without `--real-calls-approved`. The local permission system stopped the first attempt because it sends real transcripts to a model gateway. The owner then confirmed in chat that the run should use OpenCode Go only, not paid OpenAI, and that audio stays out of scope.

The [adapter](../scripts/lib/robocall-benchmark.mjs) downloads only `metadata.csv` (no audio), pinned to revision `5aa6f3bfa8563ce8c1c75ebf8a2271e6ff6b4272` with SHA-256 `8e253a4a…effe5` verified on reuse. IDs follow row order, because 26 recordings appear under two FTC letters. Result rows hold IDs, letter slugs and outcomes only; transcript text is never saved or printed.

These choices were fixed before any results:

- **Selection:** English rows only. One case per distinct recording, after normalizing case, punctuation and spacing in the transcript. This gives 724 cases from 1,378 English calls: 654 replays are merged and 54 Mandarin rows excluded. Each case records how many original calls replayed it, for a call-weighted view.
- **Screening context:** screening sees one recorded message. By default it gets whole words up to 1,200 characters, about 75 seconds of speech, the production session limit; 5 recordings are longer. `--screening-context full` uses the production 12,000-character transcript limit.
- **Scoring:** completed stops (BLOCK or HOLD) are the headline, broken down by reason. Clarifying questions are reported separately; identification credit follows the MASC rule. Approvals are harmful approvals, and they are reported per FTC letter for inspection, not relabelled. Some recordings may only inform, which Shield's policy can approve as routine.
- **Monitoring:** not run. These are one-sided recordings, not connected conversations.

Limits: there are no legitimate calls, so this measures harmful calls stopped only. Transcripts are Whisper output of the robocaller channel. The production no-pause robocall timer and GPT Live voice handling are not modeled in text. The audio could support a voice check later, but the owner declined sending it through paid OpenAI.

```bash
npm run build
node scripts/check-robocall-benchmark.mjs --prepare-only
node scripts/check-robocall-benchmark.mjs --provider go --real-calls-approved --repeat 3 --concurrency 16 --out artifacts/public-benchmarks/robocall-v18
```

### Results, October 11 (screening v18, Go, three passes)

All 724 distinct recordings ran three times: 2,172 checks completed in under five minutes at 16 parallel requests. There were no provider failures, and `policy.ts` was unchanged. Raw outcomes are in `artifacts/public-benchmarks/robocall-v18/`.

| Measure | Result |
|---|---|
| Completed stops (all BLOCK) | 2,078/2,172 (95.7%): 2,065 robocall, 13 solicitation |
| Clarifying questions | 82 (3.8%) |
| Harmful approvals | 12 (0.55%), from 8 distinct recordings |
| Identified, clarification credited | 2,160/2,172 (99.4%) |
| Per pass, stopped / approved | 691/3, 694/3, 693/6 of 724 |
| Recordings stopped in all three passes | 687/724; 25 were never stopped |
| Call-weighted, each outcome applied to its replays | 3,906/4,134 stopped (94.5%), 29 approved (0.7%) |

The approvals were read and grouped, without changing any label or prompt:

- **Existing-provider impersonation, 8 approvals from 4 recordings.** The recordings claim to be the recipient's satellite-TV provider offering a discount on her account. Two were approved in all three passes. This is a known impersonation scam, but the policy treats a business she already uses, calling about her own account, as ordinary. It is a policy gap, not noise.
- **Family-only opener, 1 approval.** A grandparent greeting with no request. This matches the owner's v16 family rule, which offers family openers and relies on connected-call protection.
- **Intermittent, 1 approval each.** A tech-support "press 1" recording, a foreign-consulate "important notice" and an energy-supply callback request. Each was blocked or questioned in its other passes.

A clarifying question to a recording would not connect it in production, but text cannot show what the no-pause robocall timer or silence handling would then do, so clarifications are not counted as stops.

**Diagnosis of the intermittent approvals.** Each recording was screened ten more times on v18, with the decision fields read. The tech-support recording's transcript begins mid-sentence, without who is calling or what the problem is. It does not clearly match the robocall rule, which needs an offer or alarming claim, so the model usually asks a question: 9 questions, 1 block, 0 approvals. The consulate notice triggers the sensitive-claims rule: 10 questions, 0 approvals. Both approvals were rare draws. The energy-supply callback was approved 2/10: "reviewing the supply charges for your statement" fit the existing-business exemption. It is the same root cause as the satellite-TV offers, not noise.

### v19–v20 reruns, October 11

The owner asked to close the existing-provider gap. Each [policy version](SCREENING.md#existing-provider-offers-v19v20-october-11) was validated on development, main and held-out suites, frozen, then run once on the whole robocall set; failures were never rerun on their own. v19's MASC check then showed it blocking genuine service calls that also mention an offer. v20 fixed that, with the same process repeated. A longer v19 draft's run is kept apart in `robocall-v19-draft/` and is not a reported result.

| Measure | v18 | v19 | v20 |
|---|---|---|---|
| Completed stops | 2,078 (95.7%) | 2,093 (96.4%) | 2,086 (96.0%) |
| Clarifying questions | 82 | 71 | 79 |
| Harmful approvals | 12 | 8 | 7 |
| Identified, stops plus questions | 2,160 (99.4%) | 2,164 (99.6%) | 2,165 (99.7%) |
| Call-weighted identified, of 4,134 | 4,105 (99.3%) | 4,121 (99.7%) | 4,098 (99.1%) |
| Call-weighted blocked outright | 3,906 (94.5%) | 3,929 (95.0%) | 3,919 (94.8%) |
| MASC: scams identified / ordinary offered / sales blocked | 160/160, 80/80, 40/40 | 160/160, 69/80, 40/40 | 160/160, 79/80, 40/40 |

All denominators are 2,172 checks unless stated: 724 recordings, three passes. Call-weighted counts apply each recording's outcome to every one of the 1,378 English calls that replayed it. The existing-provider recordings, four satellite-TV offers and two energy-supply callbacks, went from 9 approvals on v18 to 1 on v19 and 2 on v20, both energy-supply recordings at about 1 in 10 on rechecks. v20's call-weighted approvals (36) are higher than v18's (29). One "Amazon, your card was charged" notice replayed 13 times was approved in 2 of 3 passes. Ten-run rechecks approved it 1/10 on v18 and 2/10 on v20. An independent probe of the same automated-charge-notice pattern was approved 5/6 times on both versions, so this is a pre-existing gap in the automated-notice rule, not an effect of v19–v20. It is a recorded follow-up. Five of v20's seven approvals are that notice and the two energy-supply recordings; the others are family-only openers.

**Published comparison.** [RoboKA](https://arxiv.org/abs/2605.00156) (Choudhury et al., April 2026) tests on 1,378 real unwanted calls, citing the NC State Project Point of No Entry report as its source and labelling them "DNCR". Its Table I, setting T4 (out-of-domain, positive-only), reports recall (uRc): RoboKA 82.21 best, 81.74 final configuration; best fusion baseline 67.21 (HuBERT ⊗ BERT); best text model 58.13 (BERT); best audio model 46.62 (WavLM). Their models were trained on synthetic robocalls and read their own Whisper transcripts of the audio. Shield read the dataset's Whisper transcripts and was never developed on this set before October 11. Positive-only testing measures recall alone; a system that flags everything would score 100%. The paper notes the same limitation, and Shield's legitimate-call results come from MASC and the internal suites.

MASC v19 and v20 screening runs are in `artifacts/redteam-v19/masc/` and `artifacts/redteam-v20/masc/`. They were frozen production checks, but v19's MASC result motivated v20. Both public sets are therefore development evidence for these categories, not untouched tests. Raw robocall outcomes are in `artifacts/public-benchmarks/robocall-v19/` and `robocall-v20/`; the policy hash was unchanged during each run.

## Reproduce the Shield MASC diagnostic

Build the application, then run:

```bash
npm run build
node scripts/check-public-scam-benchmark.mjs --provider go --mode both --concurrency 4
```

The default is all 320 published test cases, once, using `gpt-6-luna` and medium reasoning through the existing OpenCode Go credential. The key is read into memory and never printed. For repeated runs use `--repeat 3`; for a cheap format/smoke check use `--limit-per-type 2`. `--prepare-only` downloads and validates without model requests. `--mode screening` or `--mode monitor` isolates one component.

The download is pinned to repository revision `709db2b6c37f424c3070f29138abb33971e21ab9`, file `agent_conversation_test.csv`. The ignored local cache records a SHA-256 and verifies it on reuse. Each run saves its model/policy versions, dataset revision/hash, selected row IDs, completion counts, failures, and per-type outcomes in `artifacts/public-benchmarks/`. Custom output directories must be fresh to avoid overwriting a prior evaluation. Results and console output contain IDs and aggregate metadata, not caller text or evidence quotes.

Future runs also record the scoring version and `scamsIdentified` headline. To apply the owner's clarification-credit rule to a saved run without new model requests:

```bash
node scripts/rescore-public-scam-benchmark.mjs artifacts/redteam-v18/masc
```

Substitute another saved run directory as needed. The tool creates a separate versioned summary and hashes the source results; it never replaces `results.jsonl` or the original `summary.json`. An existing summary for that scoring version is not overwritten.

## Interpret the scores

- **Screening:** only Suspect/Caller speech reaches the decision backend. It sees all caller turns from the original completed conversation at once. This is a diagnostic of the decision prompt on complete evidence, not a simulation of when screening would approve. An unanswered clarification remains `continue` in the raw outcomes.
- **Scams correctly identified (owner-requested score):** `scamsIdentified` credits a successful `block`, `hold`, or clarifying question on a label-1 call. The owner requested clarification credit on October 11 because this completed-dialogue benchmark has no additional answer for Shield. A clarification requires a recorded question and no failure. Approvals, absent decisions and failed checks receive no credit. This scoring rule was changed after the original run; production prompts, source groups and raw outcomes were not changed.
- **Legitimate offered:** label-0 appointment and delivery cases only. Insurance sales are deliberately stopped by Shield, despite their label 0. Wrong numbers aren't calls intended for the recipient. Both types get separate policy-difference reporting, with no relabeling based on model outcomes.
- **Harmful stopped:** label-1 calls that reach `block` or `hold`. Harmful approvals and provider failures are reported separately. No dataset type, label or personality is sent to the model.
- **Ads blocked:** all 40 label-0 insurance-sales calls, scored separately at screening. They are excluded from scam and ordinary-call denominators as requested by the owner. A block counts as ad blocking; a hold or clarification does not. Monitoring has no solicitation rule, so its insurance outcomes are diagnostic only, not an ad-blocking score.
- **Monitoring:** Caller and Recipient turns are mapped to the production labels. Only the last 6,000 characters reach the model, matching the application's rolling window; evidence is validated against that same tail. 38/320 MASC test conversations exceed that window. This evaluates one end-of-conversation check, not all the earlier checks the live system would run. `ordinaryConversationsKept` uses only the 80 appointment/delivery cases; `labeledScamStopped` uses the 160 label-1 cases. Insurance sales and wrong numbers remain in per-type diagnostics but do not affect those scores. Older reports pooled all 160 source-labeled non-scams into `labeledNonScamKept`; that is no longer the headline measure. A labeled normal call can contain a request Shield deliberately stops; a labeled scam can stop before any prohibited request. Inspect those discrepancies before calling them model errors.
- **Research:** counts are actual requests to `research_scam_pattern`. Go cannot provide the production web-search lookup, so an attempted lookup returns unavailable. This run cannot establish whether a successful official lookup improves decisions.
- **Failures:** transport, authentication, malformed/incomplete responses and unsupported evidence are not successful decisions. The runner separates provider failures from validation failures; an intervention with an unsupported quote fails validation instead of earning credit. Authentication/quota failures stop a bulk run. Per-type counts make partial completion visible.

For actual timing/early-intervention conclusions, annotate the first prohibited request and replay conversation prefixes in order. Keep that evaluation separate from full-conversation classification. A scripted victim's replies to a scammer are not replies to Shield's clarifying questions, so they must not be injected as if they were.

## Ground rules

The main voice/screening benchmark remains under 25 cases. Public stress data stays outside it. Never adjust production prompts against this public test split or existing held-out probes. If a finding becomes a development example, mark it as such and create fresh independent evaluation data. The separately requested benchmark classifier above is explicitly benchmark-adapted and cannot replace the production validation result. Report legitimate-offered and harmful-stopped separately; report monitoring's kept/stopped outcomes separately too. No deployment or real phone-call verification is implied by these text results.

## First results, October 11

The first v16 screening diagnostic offered 80/80 appointment and delivery calls, stopped 154/160 labeled scams, asked for clarification on the other six, and approved no labeled scam. All 40 insurance sales were blocked as expected by Shield's solicitation rule; wrong-number decisions are kept out of the legitimate-offered denominator. There was one research lookup request in 320 screenings; Go returned unavailable, so successful lookup value remains unmeasured. There were no provider failures.

The monitor-v2 diagnostic using the production 6,000-character window kept 150/160 labeled non-scams and intervened on 145/160 labeled scams. Fourteen labeled scams received continue, and one proposed intervention failed evidence validation; it is counted as a failed check, not a stop. Per type: appointment 40/40 kept; delivery 38/40 kept; insurance 32/40 kept; wrong number 40/40 kept; refund 35/40 stopped; reward 37/40 stopped; SSN 40/40 stopped; support 33/40 stopped. Raw outcomes are in `artifacts/redteam-v16/masc-windowed/`.

An earlier diagnostic fed complete monitoring conversations without the window and measured 154/160 non-scams kept and 147/160 scams stopped. It is preserved in `artifacts/redteam-v16/masc/` for comparison, but the windowed result is the production-context check. Some label disagreements reflect policy differences: source-labeled normal callers give callback numbers or links, while some labeled scam conversations end in the victim's refusal before a specific prohibited request. There are also actionable misses, including a supplied callback channel that was not flagged. None of these public findings changed the prompt.

The frozen internal held-out screen was also checked on v16, 3 runs each: 69/69 legitimate offered, 46/63 harmful-labeled instances actually blocked/held, 14 clarifications, and 3 approvals of the same family-only accident opener. That opener's harmful payment request is scripted as an answer to a question Shield no longer asks under the owner's family rule; its raw expectation was left unchanged. Twelve of the clarifications were accepted by the sensitive-claims fixtures, illustrating why the old pass-based harmful-stopped tally overstated completed stops. The other two were the known fake-support probe. Monitoring's separate held-out set kept 12/12 ordinary conversations and stopped 21/24 harmful requests; all three misses were the email-address probe. These are diagnostics of limits, not evidence for tuning.

## Final screening v17

The existing manipulation development sets exposed two approvals on v16: a claimed administrative approval and an injected screening result followed by a benign family explanation, each once in three runs. v17 explicitly applies every manipulation block before family acceptance and retains an earlier override attempt across later caller turns. This category-level clarification came from development probes only. Ten repeats of three manipulation probes stopped 30/30, with no approvals or clarifications.

Repeating the full public test split on v17 offered 80/80 appointment/delivery calls, stopped 154/160 labeled scams and approved none. Five labeled scams received clarification and one timed out at the Go gateway. A second timeout affected a wrong-number case. Original failures remain in the denominators and raw files; retries are saved separately in `artifacts/redteam-v17/masc/transport-retries.json`. The research tool was requested 0/320 times, making 1/640 across both public screening passes. The successful lookup's value remains unmeasured.

The v17 main text benchmark, three runs, offered 33/33 legitimate calls. It stopped 33/36 harmful instances; the other three requests timed out, and all three were blocked on separate retries. There were no harmful approvals. Those gateway failures are not model passes, and the original 66/69 regression result is retained. The family and monitoring tests are reported in [Screening](SCREENING.md). Monitoring is still monitor-v2; its public and held-out gaps above were not tuned away. Neither policy is deployed by this work.

## Continued red teaming and frozen v18 validation

The owner's October 11 source-group choice was fixed before requests began: exclude solicitation from scam and ordinary-call scores, report ad blocking separately at screening, and leave wrong numbers out of ordinary-call scores. All 320 source rows still run, so exclusions cannot hide failed or inconvenient decisions. The later clarification-credit change affects the identification metric, not those groups.

Fresh development probes found two false blocks of an existing clinic's demographic check in three v17 runs. Screening v18 clarifies the healthcare category; it leaves explicit scam requests and manipulation blocks intact. It offered 36/36 ordinary development calls and stopped 42/42 harmful requests; main text passed 69/69, and main plus development synthetic voice passed 50/50. The production requests and development sources were hashed and frozen at 19:49:51 UTC before this public run. Neither public nor held-out findings shaped the change.

The first full v18 + monitor-v2 pass completed all 320 rows through Go at medium reasoning. The identification row below applies the owner's later scoring change to those saved outcomes:

| Measure | Result |
|---|---|
| Screening: labeled scams correctly identified, clarification credited | 160/160 (100%) |
| Screening: labeled scams blocked/held | 155/160 (96.9%) |
| Screening: labeled scams approved | 0/160 |
| Screening: insurance ads blocked, scored separately | 40/40 (100%) |
| Screening: ordinary appointment/delivery calls offered | 80/80 (100%) |
| Monitoring: labeled scams flagged at end of conversation | 142/160 (88.8%) |
| Monitoring: ordinary appointment/delivery calls kept | 78/80 (97.5%) |

The five screening clarifications count as correct identification under the requested score; they remain separate from the 155 completed blocks/holds. No labeled scam was approved. Monitoring had 16 `continue` outcomes and two rejected evidence quotes among the 160 labeled scams. Monitoring `continue` is not a clarifying question and receives no scam-identification credit. The invalid quotes are failed checks, not successful interventions. No provider failures occurred. Lookup requests were 0/320, or 1/960 across the three public screening versions; Go still cannot measure a successful lookup's value. Raw first-pass results remain in `artifacts/redteam-v18/masc/`. The new score is in `summary-scoring-2026-10-11-public-identification-v1.json`; the original summary is preserved.

Two additional monitor-only passes measured variation after those validation failures. No prompt, source group or exclusion changed between passes:

| Monitoring pass | Labeled scams flagged | Ordinary calls kept | Rejected evidence quotes |
|---|---|---|---|
| 1 | 142/160 | 78/80 | 2 |
| 2 | 148/160 | 76/80 | 0 |
| 3 | 146/160 | 78/80 | 1 |
| Combined trials | 436/480 (90.8%) | 232/240 (96.7%) | 3 |

These are repeated checks of the same 160 unique scam and 80 unique ordinary conversations, not 480 distinct scams. Combined monitoring had 41 `continue` outcomes and three failed evidence checks among labeled scams; all failures remain in the denominator. The three invalid quotes were in reward cases, with one source case failing twice. Provider failures were 0 across all three monitoring passes. Repeats are in `artifacts/redteam-v18/masc-monitor-repeats/`; `public-final-summary.json` combines runs and verifies the production-request hashes still match the pre-validation freeze.

Ad blocking remains 40/40 at screening; insurance monitoring results are not ad scores. Wrong numbers stay separate. No public case was relabeled or removed after outcomes were observed. End-of-conversation monitoring still misses source-labeled scams, and its ordinary-call result varies. These checks neither measure live intervention timing nor establish that every source label corresponds to a current prohibited request. No production deployment or real phone call took place.

Rescoring validation (October 11): `npm run check` passed 117 unit tests, typecheck and build. The first emulator run passed 85/86 with a closed-transaction error in a forwarding test; a separate rerun passed all 86. Raw benchmark results matched their recorded SHA-256, and the original summary remained intact. This scoring-only change made no model requests and changed no production prompt.


## Lean v23 comparison, October 11

A general compression of the production screening decision prompt was selected using synthetic development cases, then frozen for a paired comparison with v20 (`bb084f3`). Both requests used OpenCode Go, GPT-6 Luna, medium reasoning, the same tools and unchanged benchmark scoring. This evaluates Shield's screening policy, not the separate MASC-specific classifier. No public conversation or held-out probe shaped the new wording.

All 320 MASC test conversations ran three times per version (960 trials each):

| Screening measure | v20 baseline | Lean v23 |
|---|---:|---:|
| Labeled scams identified, including valid clarification | 479/480 (99.8%) | 479/480 (99.8%) |
| Completed blocks/holds | 460/480 (95.8%) | 455/480 (94.8%) |
| Clarifications | 19 | 24 |
| Harmful approvals | 1 | 0 |
| No decision on a labeled scam | 0 | 1 |
| Ordinary calls offered | 234/240 (97.5%) | 236/240 (98.3%) |
| Ads blocked, scored separately | 120/120 | 120/120 |
| Provider failures / rejected evidence | 0 / 0 | 0 / 0 |

One v23 result produced no decision and received no identification credit. It is not a completed stop or an approval. These are three draws on the same 320 conversations, not new unique calls. The identification score matches in aggregate, but individual outcomes and completed-stop rates are not identical; v23 asked five more questions and completed five fewer stops. No failed or missing result was dropped or replaced. Wrong numbers remain separate from ordinary-call scores, and insurance remains separate from scam scores.

Raw results: `artifacts/lean-v23/masc/` and `baseline-masc/`. Request hashes, source hashes and raw-result hashes are recorded in `artifacts/lean-v23/validation-summary.json`. The final request and all frozen source files were checked unchanged after evaluation. The broader development/held-out/caution results and unchanged runtime settings are in [Screening](SCREENING.md#lean-decision-prompt-candidate-v23-october-11).

**FTC/NC State comparison completed with the owner’s explicit public-dataset exception.** Both requests ran all 724 distinct English recordings three times, 2,172 trials per version. There were no provider failures or missing outcomes, and the request/source hashes remained unchanged.

| Robocall measure | Contemporaneous v20 | Lean v23 |
|---|---:|---:|
| Identified, including clarification | 2,166/2,172 | 2,161/2,172 |
| Completed stops | 2,083/2,172 | 2,069/2,172 |
| Clarifications | 83 | 92 |
| Harmful approvals | 6 | 11 |
| Call-weighted identified | 4,122/4,134 | 4,088/4,134 |
| Call-weighted completed stops | 3,916/4,134 | 3,902/4,134 |

The candidate failed the requested no-regression comparison and was rejected. A subsequent, more conservative v24 edit restores v20’s core approval, blocking, manipulation and sensitive-claim paragraphs verbatim, preserving smaller reductions in supporting explanations. No public dialogue was inspected or incorporated into that restoration. The public sets are regression/selection checks, not fresh unseen evidence. Raw v23 and baseline runs are in `artifacts/lean-v23/robocall/` and `baseline-robocall/`; `public-comparison.json` records matched case identities, per-pass metrics and results hashes.

No deployment, voice benchmark or real phone call was performed. This remains an offline text candidate, not live-call evidence.

## Conservative v24 comparison, October 11

v24 retains v20's core decision paragraphs and reduces only supporting wording: 9,311 instruction characters versus 10,508 (11.4% shorter). The request was frozen before evaluation; SHA-256 `7d0aaabe87091b19facc098cf3b8627125e4a5a1cdb11022df566a6a76e773af`. Public dialogues and held-out probes were not incorporated into the rewrite. These public sets are regression checks used to accept or reject compression, not fresh unseen evidence.

Go reached persistent HTTP 429 limits. The interrupted v24 runs remain in `artifacts/lean-v24/masc/` (698 completed rows, 48 failures) and `robocall/` (669 rows, 48 failures). They are not completed benchmarks and are not pooled into the comparison below. The owner explicitly authorized both the public FTC/NC State dataset exception and GPT-6 Luna at medium reasoning through their subscription when Go reached limits.

Both frozen prompts therefore ran again through the same isolated Codex subscription evaluator. The local preflight verified the exact instruction text and caller input with no global project notes or unrelated tools. Codex changes function-schema encoding and output limits; production decision validation still runs. Those differences affect both prompts equally, but these scores must not be compared directly with Go scores. See [Screening](SCREENING.md#conservative-lean-candidate-v24-october-11-text-only) for the transport details and synthetic red-team results.

All 320 MASC cases ran three times per version, 960 completed trials each:

| MASC screening measure | v20, subscription | Lean v24, subscription |
|---|---:|---:|
| Scams identified, including clarification | 479/480 | 479/480 |
| Completed blocks/holds | 460/480 | 453/480 |
| Clarifications | 19 | 26 |
| Harmful approvals | 0 | 0 |
| No decision on a labeled scam | 1 | 1 |
| Ordinary calls offered | 217/240 | 219/240 |
| Ads blocked, separate score | 119/120 | 120/120 |
| Provider / validation failures | 0 / 0 | 0 / 0 |

The identification score is preserved, with two more ordinary offers and one more ad blocked. Completed stops are seven lower, replaced by clarifications; they are not counted as stops. No failed or missing outcome was replaced. Results are in `artifacts/lean-v24/codex-masc/` and `codex-baseline-masc/`.

Interrupted subscription runs were resumed solely to increase parallelism after verifying that every completed result remained byte-for-byte intact. Only missing case/run pairs were scheduled; canceled in-flight requests may have been requested again. Original manifests are unchanged, and `resume-events.jsonl` records preserved-prefix hashes and concurrency changes. All runs use the same frozen prompts and scoring.

The full subscription robocall comparison completed 2,172 trials per version:

| Robocall measure | v20, subscription | Lean v24, subscription |
|---|---:|---:|
| Identified, including clarification | 2,169/2,172 | 2,168/2,172 |
| Completed blocks/holds | 2,107/2,172 | 2,134/2,172 |
| Clarifications | 62 | 34 |
| Harmful approvals | 3 | 4 |
| Call-weighted identified | 4,126/4,134 | 4,130/4,134 |
| Call-weighted completed stops | 3,992/4,134 | 4,062/4,134 |
| Provider failures / other outcomes | 0 / 0 | 0 / 0 |

**The owner selected the 11.4% cut after explicitly accepting the one-trial identification difference:** “Allow this difference and keep the 11.4% cut”. The original strict observed-score gate remains false in the audit; this is an accepted tradeoff, not a claim of identical performance or a statistically established improvement. Completed robocall stops and the call-weighted score improved, while MASC completed stops decreased by seven as shown above. The complete matched results and preserved-prefix checks are recorded in `artifacts/lean-v24/public-comparison.json`. Production prompt and grading sources remained unchanged throughout those evaluations.

The selected v24 wording is adopted unchanged as **v26** (`2026-10-11-general-v26`), with a version bump after the intervening v25 experiment. The final model request exactly matches the frozen v24 request, including all non-instruction settings. v25 was superseded and its partial artifacts are retained separately, not counted as completed validation. The owner's acceptance and final request identity are recorded in `artifacts/lean-v24/final-adoption.json`. No voice validation, deployment or phone call was performed.

## Financial-notice fix v30, October 11

The owner requested a recheck of the recorded automated-charge weakness. Synthetic development reproduced it on v26 and motivated a general clarification of the financial-alarm boundary. The final v30 wording was frozen before the runs below. No public or held-out dialogue was added to the prompt. Both public sets are known regression data, not fresh unseen evidence.

**One complete paired pass through OpenCode Go**, GPT-6 Luna, medium reasoning, identical production tools/settings and unchanged scoring. FTC includes all 724 distinct English recordings, weighted back to 1,378 original English calls. MASC includes all 320 test conversations. Every selected case ran on each frozen prompt; the audit verifies matching IDs and source hashes.

| FTC/NC State measure | v26 | v30 |
|---|---:|---:|
| Identified, including clarification | 722/724 | 722/724 |
| Completed blocks/holds | 693/724 | 691/724 |
| Clarifications | 29 | 31 |
| Harmful-dataset approvals | 2 | 2 |
| Call-weighted identified | 1375/1378 | 1375/1378 |
| Call-weighted completed stops | 1304/1378 | 1302/1378 |
| Failures / other outcomes | 0 / 0 | 0 / 0 |

| MASC measure | v26 | v30 |
|---|---:|---:|
| Scams identified, including clarification | 160/160 | 160/160 |
| Completed harmful stops | 153/160 | 149/160 |
| Legitimate calls offered | 78/80 | 79/80 |
| Ads blocked, separate score | 40/40 | 40/40 |
| Harmful approvals | 0 | 0 |
| Provider / validation failures | 0 / 0 | 0 / 0 |

Both prompts approved the same two recordings: a brief family-only opener (robocall-858) and an energy-account callback (robocall-1164). They remain misses under the harmful-only dataset score. The family offer follows the owner's deliberate acceptance policy; the service/callback boundary remains a limitation. No exception was added for either recording.

A clarification does not offer a call, but it is not a completed stop. These are single full passes and can vary across repeats; they do not establish perfect future detection. Selection weighs ordinary callers alongside harmful calls and retains the owner's family-only acceptance rule.

**Preserved earlier diagnostics:** the first large Go batches reached HTTP 429 and stopped. The authorized subscription fallback ran the intermediate v29 candidate on all 724 FTC cases (723 identified, 708 stopped, one approval, no failures) and all 320 MASC cases. Its contemporaneous v26 FTC baseline stopped at 705/724 after one provider failure, so it is not a complete paired FTC baseline. The exact FTC recording cited by the owner was approved 0/20 times on both v26 and v29 through that fallback; this did not establish an improvement on that recording. v29 was rejected because development repeats exposed an ordinary hospital-news regression under caution. These outcomes were retained, not pooled with the final v30 Go comparison. Go subsequently completed the final runs at lower concurrency.

Final requests and scoring sources stayed unchanged throughout. `artifacts/notice-v30/validation-summary.json` contains the freeze, matching-case checks and raw-result hashes; original incomplete and intermediate runs remain under `artifacts/notice-v29/`. See [Screening](SCREENING.md#financial-notice-follow-up-v30-october-11-text-only) for the independent synthetic contrasts, held-out checks and remaining costs. No voice, timing, deployment or real-call claim follows from these offline results.

## Distilled screening experiment v31, October 11

The owner requested one benchmark pass of a generalized prompt through subscription GPT-6 Luna. The [offline candidate](../scripts/experiments/distilled-screening-v31.mjs), version `2026-10-11-distilled-v31-experiment`, replaces the decision instructions only: **4,369 characters versus v30's 9,710, a 55.0% reduction**. Production remains v30. Model reasoning remains medium; the experiment gives the model broader judgment rather than changing the reasoning setting. Tool schemas and other request settings are unchanged.

This is more than compression: it lets recognizable unsolicited fraud approaches justify a stop before an explicit harmful demand, retains a maximum of two useful clarification questions, and condenses ordinary-call, family, solicitation and manipulation rules. It contains no dataset rows or brand-specific scam examples. The candidate was frozen before inference and was not revised after seeing outcomes.

**One complete pass, 320 MASC test conversations**, using the existing isolated subscription transport. Scoring, source revision and caller-only inputs are unchanged. The comparisons below are saved historical runs, not new paired evaluations:

| Measure | Distilled v31, subscription | Historical v26, subscription | Historical v30, Go |
|---|---:|---:|---:|
| Legitimate calls offered | 67/80 | 71/80 | 79/80 |
| Completed harmful stops | 159/160 | 150/160 | 149/160 |
| Harmful clarifications | 1 | 10 | 11 |
| Harmful approvals | 0 | 0 | 0 |
| Identified, including clarification | 160/160 | 160/160 | 160/160 |
| Ads blocked, separate score | 40/40 | 40/40 | 40/40 |
| Provider / validation failures | 0 / 0 | 0 / 0 | 0 / 0 |

The candidate offered 35/40 appointment calls and 32/40 delivery calls. Of the thirteen ordinary calls not offered, twelve were blocked and one held. All support, reward and SSN scams were blocked; refund scams produced 39 blocks and one clarification. The 40 wrong-number cases remain outside the ordinary-call score: 24 approved, 9 held, 4 clarifications and 3 blocks. No outcomes were relabeled or excluded based on predictions.

**Do not adopt this candidate on this evidence.** It produces more completed scam stops but is too restrictive toward ordinary callers. This single pass does not establish that brevity caused the difference: both policy wording and level of discretion changed. The v26 comparison uses the same subscription transport; v30 used Go, whose request transport differs, so that column cannot establish a prompt-only effect. No fresh baseline was run, as the owner requested just one candidate pass.

The run does not test live follow-up exchanges, early interception, the FTC charge probe, the FTC dataset, fresh red-team cases, voice or recent-scam caution. It is a known public regression set, not unseen generalization evidence. No production prompt, voice configuration or deployment changed.

Evidence is in `artifacts/distilled-v31/`: frozen requests, `freeze.json`, `masc/results.jsonl`, `masc/summary.json`, and `validation-summary.json`. The audit verifies 320 distinct case IDs, one run each, matching source hashes with both historical baselines, recomputed scores, and unchanged candidate/production/scoring sources. Request SHA-256: `5d46efb7459805028955d9b3830a8cd2322072d6e85fe69eb42513c7e5a17308`. Reproduce the experiment after building with:

```bash
node scripts/check-public-scam-benchmark.mjs --provider codex --mode screening --repeat 1 --concurrency 6 --request artifacts/distilled-v31/candidate-request.json --out artifacts/distilled-v31/masc-new-run
```

Repository validation passed: typecheck/build, 143 unit tests and 86 Firestore emulator tests. The first sandboxed unit run could not bind the APNs test server on localhost; rerunning with local server access passed. These checks do not establish screening accuracy beyond the single benchmark above.
