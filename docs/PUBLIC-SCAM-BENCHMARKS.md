# Public scam benchmarks

Reviewed October 11, 2026. The first public diagnostic used frozen screening v16 and monitor-v2. Subsequent screening changes came only from development cases: v17 clarified manipulation precedence, and v18 clarified ordinary demographics with an existing healthcare office. No public or held-out result was used to tune either production prompt. The owner later requested a separate benchmark-specific binary classifier, described below; it does not enter Shield's production harness or policy. All executed cases here are synthetic; no real caller audio or transcripts are used.

## Sources and suitability

| Source | What it provides | Fit for Shield |
|---|---|---|
| [MASC / BothBosu multi-agent-scam-conversation](https://huggingface.co/datasets/BothBosu/multi-agent-scam-conversation) | 1,600 synthetic English phone dialogues; 320 published test cases, 40 per type; Apache-2.0. Fraud types: SSN, refund, support, reward. Non-fraud types: appointment, delivery, insurance sales, wrong number. | Best immediate public starting point. Our adapter evaluates the published test split only. Varying recipient personalities help exercise context. Family scams and many newer scam mechanisms are absent. |
| [BothBosu scam-dialogue](https://huggingface.co/datasets/BothBosu/scam-dialogue) and [single-agent-scam-conversations](https://huggingface.co/datasets/BothBosu/single-agent-scam-conversations) | Synthetic English scam/non-scam phone conversations. The scam-dialogue card lists 1,600 rows and Apache-2.0. | Useful breadth checks after MASC, but related generation/templates can overlap. Deduplicate across corpora and do not treat them as independent replications. Label 0 includes genuine sales/telemarketing. Not executed in this pass. |
| [TeleAntiFraud 2.0 paper](https://arxiv.org/abs/2609.18748) and [research artifact](https://anonymous.4open.science/r/TeleAntiFraud-2_0-EEB2/) | Monthly frozen sets of 900 Chinese calls: 600 fraud and 300 lawful calls sharing closely related situations. Generated dialogues are rendered as speech, with manifests and provenance. | Strong evaluation design for confusing legitimate/scam pairs and audio. Chinese language and regional scripts limit direct relevance to the English US pilot. Verify the artifact's dataset license and synthetic provenance before importing. Not executed here. |
| [COVA-X authors' site](https://scamlingua.org/) and [paper](https://arxiv.org/abs/2606.06879) | 10,985 synthetic multi-turn conversations across eight elder-targeted scam categories. The authors' site requires requesting access and describes non-commercial research terms. | Very relevant family/grandparent and elder-fraud coverage, but it is not an unrestricted downloadable public benchmark. No access request was sent. Outcome labels also need mapping to Shield's request-level decisions. |

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

The owner requested this benchmark-specific version after the Shield diagnostic and its limitations were known. It uses a separate [runner](../scripts/check-masc-classifier.mjs) and [classifier](../scripts/lib/masc-classifier.mjs), version `2026-10-11-masc-classifier-v1`. Neither imports the production screening or monitoring requests. Only the pinned CSV parser and role mapping are shared. The provider is the existing OpenCode Go Responses endpoint, `https://opencode.ai/zen/go/v1/responses`, with GPT-6 Luna at medium reasoning; the direct OpenAI API is not used.

The adaptations match the classification task rather than live call protection:

- Both speakers' entire completed conversation reaches the model, without the production 6,000-character rolling tail. All 320 test conversations fit; the longest is 12,603 characters, and 38 exceed the production window.
- Source labels remain the original binary scam/non-scam labels. Genuine insurance sales and wrong numbers are included as non-scams. All 320 rows affect the headline accuracy and F1; there is no ad-blocking score in this classifier.
- The classifier assesses a deceptive attempt even if the recipient refuses and prevents its completion. It decides scam or non-scam once; there are no clarifying questions, abstention credit, call offers or monitoring interventions.
- Source labels, type, personality, row ID and previous results never enter the model input. The instructions contain general fraud and ordinary-service distinctions, with no public-row examples, answer mappings or category-to-label lookup. Generated reasons stay in memory; only predictions and non-content metadata are saved.
- Gateway retries send the identical input and follow a fixed transport policy. Incorrect classifications are never retried based on the expected label. Failed and unrun rows stay in accuracy and class-recall denominators; conventional binary precision/recall/F1 are withheld unless all planned rows have valid decisions.

Before MASC requests, the classifier passed 48/48 checks on 16 independently authored [development conversations](../scripts/fixtures/masc-classifier-development.mjs), repeated three times: 24/24 scam attempts and 24/24 non-scams. They exercise solicitation, wrong numbers, ordinary services, recipient scam stories, failed fraud attempts, injected instructions and an early scam request beyond the last 6,000 characters. These are not copied from public MASC rows.

The first frozen classifier, v1, completed three full MASC passes. It identified all 480/480 scam trials and correctly classified 470/480 non-scam trials, with zero provider or schema failures. Accuracy was 950/960 (98.96%); pooled binary F1 was 98.97%. Per-pass accuracy was 317/320, 316/320 and 317/320. The ten errors were false positives in delivery and insurance conversations. All initial results remain in `artifacts/masc-classifier/masc-v1-three-passes/`; classifier and production hashes were unchanged throughout those passes.

Each run freezes the request hash, runner/classifier/development-source hashes, dataset revision/hash, planned IDs and production-policy hashes before model requests. Source and production hashes are checked again afterward. Results are kept in fresh ignored directories under `artifacts/masc-classifier/`. This is a benchmark-adapted evaluation, not a fresh unseen-test result: prior MASC outcomes informed the task/context changes, and model pretraining exposure to this public dataset is unknown. The original Shield diagnostic scores remain separate.

Reproduce without a backend build:

```bash
node scripts/check-masc-classifier.mjs --dataset development --repeat 3
node scripts/check-masc-classifier.mjs --repeat 3 --concurrency 4
```

`--prepare-only` validates the pinned test split without model requests. `--limit-per-type` supports a smoke check; a partial selection is marked as such and cannot be described as full test-split coverage. The main Shield benchmark and every production prompt remain unchanged. No deployment or real call is performed by this runner.

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
