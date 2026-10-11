# Public scam benchmarks

Reviewed October 11, 2026. The first public diagnostic used frozen screening v16 and monitor-v2. Subsequent screening changes came only from development cases: v17 clarified manipulation precedence, and v18 clarified ordinary demographics with an existing healthcare office. No public or held-out result was used to tune either prompt. All executed cases here are synthetic; no real caller audio or transcripts are used.

## Sources and suitability

| Source | What it provides | Fit for Shield |
|---|---|---|
| [MASC / BothBosu multi-agent-scam-conversation](https://huggingface.co/datasets/BothBosu/multi-agent-scam-conversation) | 1,600 synthetic English phone dialogues; 320 published test cases, 40 per type; Apache-2.0. Fraud types: SSN, refund, support, reward. Non-fraud types: appointment, delivery, insurance sales, wrong number. | Best immediate public starting point. Our adapter evaluates the published test split only. Varying recipient personalities help exercise context. Family scams and many newer scam mechanisms are absent. |
| [BothBosu scam-dialogue](https://huggingface.co/datasets/BothBosu/scam-dialogue) and [single-agent-scam-conversations](https://huggingface.co/datasets/BothBosu/single-agent-scam-conversations) | Synthetic English scam/non-scam phone conversations. The scam-dialogue card lists 1,600 rows and Apache-2.0. | Useful breadth checks after MASC, but related generation/templates can overlap. Deduplicate across corpora and do not treat them as independent replications. Label 0 includes genuine sales/telemarketing. Not executed in this pass. |
| [TeleAntiFraud 2.0 paper](https://arxiv.org/abs/2609.18748) and [research artifact](https://anonymous.4open.science/r/TeleAntiFraud-2_0-EEB2/) | Monthly frozen sets of 900 Chinese calls: 600 fraud and 300 lawful calls sharing closely related situations. Generated dialogues are rendered as speech, with manifests and provenance. | Strong evaluation design for confusing legitimate/scam pairs and audio. Chinese language and regional scripts limit direct relevance to the English US pilot. Verify the artifact's dataset license and synthetic provenance before importing. Not executed here. |
| [COVA-X authors' site](https://scamlingua.org/) and [paper](https://arxiv.org/abs/2606.06879) | 10,985 synthetic multi-turn conversations across eight elder-targeted scam categories. The authors' site requires requesting access and describes non-commercial research terms. | Very relevant family/grandparent and elder-fraud coverage, but it is not an unrestricted downloadable public benchmark. No access request was sent. Outcome labels also need mapping to Shield's request-level decisions. |

MASC's dataset card and the [authors' project](https://supreme-lab.github.io/ai-in-the-loop/) document its synthetic provenance. Public availability does not make these real-call evidence. A high score on repetitive generated dialogues can be easier than a call with indirect phrasing or imperfect transcription.

## Reproduce the MASC diagnostic

Build the application, then run:

```bash
npm run build
node scripts/check-public-scam-benchmark.mjs --provider go --mode both --concurrency 4
```

The default is all 320 published test cases, once, using `gpt-6-luna` and medium reasoning through the existing OpenCode Go credential. The key is read into memory and never printed. For repeated runs use `--repeat 3`; for a cheap format/smoke check use `--limit-per-type 2`. `--prepare-only` downloads and validates without model requests. `--mode screening` or `--mode monitor` isolates one component.

The download is pinned to repository revision `709db2b6c37f424c3070f29138abb33971e21ab9`, file `agent_conversation_test.csv`. The ignored local cache records a SHA-256 and verifies it on reuse. Each run saves its model/policy versions, dataset revision/hash, selected row IDs, completion counts, failures, and per-type outcomes in `artifacts/public-benchmarks/`. Custom output directories must be fresh to avoid overwriting a prior evaluation. Results and console output contain IDs and aggregate metadata, not caller text or evidence quotes.

## Interpret the scores

- **Screening:** only Suspect/Caller speech reaches the decision backend. It sees all caller turns from the original completed conversation at once. This is a diagnostic of the decision prompt on complete evidence, not a simulation of when screening would approve. An unanswered clarification is reported as `continue`, not as a stopped scam.
- **Legitimate offered:** label-0 appointment and delivery cases only. Insurance sales are deliberately stopped by Shield, despite their label 0. Wrong numbers aren't calls intended for the recipient. Both types get separate policy-difference reporting, with no relabeling based on model outcomes.
- **Harmful stopped:** label-1 calls that reach `block` or `hold`. Harmful approvals and provider failures are reported separately. No dataset type, label or personality is sent to the model.
- **Ads blocked:** all 40 label-0 insurance-sales calls, scored separately at screening. They are excluded from scam and ordinary-call denominators as requested by the owner. A block counts as ad blocking; a hold or clarification does not. Monitoring has no solicitation rule, so its insurance outcomes are diagnostic only, not an ad-blocking score.
- **Monitoring:** Caller and Recipient turns are mapped to the production labels. Only the last 6,000 characters reach the model, matching the application's rolling window; evidence is validated against that same tail. 38/320 MASC test conversations exceed that window. This evaluates one end-of-conversation check, not all the earlier checks the live system would run. `ordinaryConversationsKept` uses only the 80 appointment/delivery cases; `labeledScamStopped` uses the 160 label-1 cases. Insurance sales and wrong numbers remain in per-type diagnostics but do not affect those scores. Older reports pooled all 160 source-labeled non-scams into `labeledNonScamKept`; that is no longer the headline measure. A labeled normal call can contain a request Shield deliberately stops; a labeled scam can stop before any prohibited request. Inspect those discrepancies before calling them model errors.
- **Research:** counts are actual requests to `research_scam_pattern`. Go cannot provide the production web-search lookup, so an attempted lookup returns unavailable. This run cannot establish whether a successful official lookup improves decisions.
- **Failures:** transport, authentication, malformed/incomplete responses and unsupported evidence are not successful decisions. The runner separates provider failures from validation failures; an intervention with an unsupported quote fails validation instead of earning credit. Authentication/quota failures stop a bulk run. Per-type counts make partial completion visible.

For actual timing/early-intervention conclusions, annotate the first prohibited request and replay conversation prefixes in order. Keep that evaluation separate from full-conversation classification. A scripted victim's replies to a scammer are not replies to Shield's clarifying questions, so they must not be injected as if they were.

## Ground rules

The main voice/screening benchmark remains under 25 cases. Public stress data stays outside it. Never adjust prompts against this public test split or existing held-out probes. If a finding becomes a development example, mark it as such and create fresh independent evaluation data. Report legitimate-offered and harmful-stopped separately; report monitoring's kept/stopped outcomes separately too. No deployment or real phone-call verification is implied by these text results.

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

The owner's October 11 scoring choice is fixed independently of results: exclude solicitation from scam and ordinary-call scores, report ad blocking separately at screening, and leave wrong numbers out of ordinary-call scores. All 320 source rows still run, so exclusions cannot hide failed or inconvenient decisions. The score groups are recorded before requests begin.

Fresh development probes found two false blocks of an existing clinic's demographic check in three v17 runs. Screening v18 clarifies the healthcare category; it leaves explicit scam requests and manipulation blocks intact. It offered 36/36 ordinary development calls and stopped 42/42 harmful requests; main text passed 69/69, and main plus development synthetic voice passed 50/50. The production requests and development sources were hashed and frozen at 19:49:51 UTC before this public run. Neither public nor held-out findings shaped the change.

The first full v18 + monitor-v2 pass completed all 320 rows through Go at medium reasoning:

| Measure | Result |
|---|---|
| Screening: labeled scams blocked/held | 155/160 (96.9%) |
| Screening: labeled scams approved | 0/160 |
| Screening: insurance ads blocked, scored separately | 40/40 (100%) |
| Screening: ordinary appointment/delivery calls offered | 80/80 (100%) |
| Monitoring: labeled scams flagged at end of conversation | 142/160 (88.8%) |
| Monitoring: ordinary appointment/delivery calls kept | 78/80 (97.5%) |

The five remaining screening scam cases asked for clarification, not approval. Monitoring had 16 `continue` outcomes and two rejected evidence quotes among the 160 labeled scams. The invalid quotes are failed checks, not successful interventions. No provider failures occurred. Lookup requests were 0/320, or 1/960 across the three public screening versions; Go still cannot measure a successful lookup's value. Raw first-pass results remain in `artifacts/redteam-v18/masc/`.

Two additional monitor-only passes measured variation after those validation failures. No prompt, source group or exclusion changed between passes:

| Monitoring pass | Labeled scams flagged | Ordinary calls kept | Rejected evidence quotes |
|---|---|---|---|
| 1 | 142/160 | 78/80 | 2 |
| 2 | 148/160 | 76/80 | 0 |
| 3 | 146/160 | 78/80 | 1 |
| Combined trials | 436/480 (90.8%) | 232/240 (96.7%) | 3 |

These are repeated checks of the same 160 unique scam and 80 unique ordinary conversations, not 480 distinct scams. Combined monitoring had 41 `continue` outcomes and three failed evidence checks among labeled scams; all failures remain in the denominator. The three invalid quotes were in reward cases, with one source case failing twice. Provider failures were 0 across all three monitoring passes. Repeats are in `artifacts/redteam-v18/masc-monitor-repeats/`; `public-final-summary.json` combines runs and verifies the production-request hashes still match the pre-validation freeze.

Ad blocking remains 40/40 at screening; insurance monitoring results are not ad scores. Wrong numbers stay separate. No public case was relabeled or removed after outcomes were observed. End-of-conversation monitoring still misses source-labeled scams, and its ordinary-call result varies. These checks neither measure live intervention timing nor establish that every source label corresponds to a current prohibited request. No production deployment or real phone call took place.
