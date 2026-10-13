# Empty-contact post-call filter

October 13, 2026. This is a post-call message-filter change, not a replacement for live screening. The repository now contains `2026-10-13-voicemail-v7` as the next undeployed post-call candidate. It addresses callers who leave only a request to start another call or chat, add a contact or open a site. It preserves the newer saved-notice requirement; it does not impose a blanket block on account alarms.

## Change and scope

The prior voicemail-v4 instructions said a callback alone was insufficient to establish fraud. Combined with the instruction to keep uncertain messages, this preserved empty contact invitations. V7 distinguishes a callback within a useful message from contact with no stated personal relationship or ordinary task/service context. A name, title or implied familiarity alone is insufficient. The latter messages are junk; the policy does not claim their sender's identity or intent has been verified.

V7 retains v6's tested policy with one capitalization correction. Its complete instructions contain **2,968 characters**, compared with v4's 2,736: **232 additional characters (8.5%)**. The model, medium reasoning, storage-disabled combined assessment/summary request, schema, user-input sanitization, evidence validation and fail-open message preservation are unchanged. Removal still requires a clear assessment with a supported continuous quotation; unsupported evidence, model failure or transcription failure keeps the message. Ordinary callbacks, uncertain useful information and warnings about scams remain eligible for saving.

The request was frozen before writing the new validation fixture. No outcome from this fixture or the subsequent public check changed its wording. Screening v31 is unchanged, including its remaining live-screening failures. A post-call improvement cannot undo a premature live approval.

## Fresh subscription comparison

Both v4 and v7 ran once on 48 distinct, independently written synthetic messages through subscription GPT-6 Luna at medium reasoning: **96 assessments**. Cases cover contact-only invitations, ordinary callbacks, information notices, explicit harmful demands, warnings about somebody else's scam and useful truncated speech. Labels were fixed before inference; failed outcomes were not retried or relabeled.

| Result | v4 | v7 |
|---|---:|---:|
| Empty contact removed | 0/12 | 12/12 |
| Ordinary callbacks kept | 12/12 | 12/12 |
| Ordinary information kept | 8/8 | 8/8 |
| Warnings about scams kept | 4/4 | 4/4 |
| Useful incomplete messages kept | 4/4 | 4/4 |
| Explicit harmful requests removed | 8/8 | 8/8 |
| Provider/assessment failures | 0 | 0 |

The source review included the [FBI's September 17 government-impersonation warning](https://www.ic3.gov/PSA/2026/PSA260917) and the [FTC's May warning about unexpected contact](https://consumer.ftc.gov/consumer-alerts/2026/05/how-are-scammers-trying-reach-you). Those sources establish relevant patterns, not the test outcomes or a claim that every unexpected call is fraudulent. The synthetic examples are independently worded. This is author-designed validation, not a blinded human study or real-call evidence.

## Public post-call regression

V7 completed **623 additional subscription assessments**: all 80 ordinary MASC appointment/delivery messages and exactly the 543 FTC openings saved by the already-frozen v31 screening pass. All **80/80 ordinary MASC messages were kept**, with zero assessment failures. This is a selected post-call regression, not a new screening pass or a full MASC/FTC benchmark rerun. The main screening suite stays at 24 cases.

For the same 543 FTC inputs, the historical v4 post-call results removed 52 and kept 491; v7 removed **98** and kept **445**. The baseline request and input hashes match. Sixty-six inputs changed from keep to remove, and **20 changed from remove to keep**. Historical results were reused unchanged, not rerun to improve the comparison. Model variation and nonrandomized timing limit causal interpretation.

| Joined v31 screening + post-call text diagnostic | v4 filter | v7 filter |
|---|---:|---:|
| Screening stops, unchanged | 168/724 | 168/724 |
| Additional post-call removals | 52 | 98 |
| Unverified messages retained | 491 | 445 |
| Screening questions, unchanged | 12 | 12 |
| Screening approvals, unchanged | 1 | 1 |
| Stops plus removals, weighted by original calls | 386/1,378 | 470/1,378 |

These joined counts are not primary screening-stop scores, end-to-end phone results or overall accuracy. FTC is an all-illegal-robocall source corpus with no ordinary negative set. It uses the same truncated opening as the earlier screening check; this pass does not add later speech. An unverified saved notice is neither an offer nor a stopped scam. The original Amazon charge recording 1314 remains an unverified saved notice under both filters.

An additional **28 unscored content inventories** covered all 20 remove-to-keep changes and eight controls. The diagnostic contract excludes labels and prior outcomes and emits content categories rather than quotations. It tagged 17 of the 20 as lacking an explicit harmful demand, one as ambiguous and **two (166 and 1100) as explicit payment demands**. These tags are model judgments, not verified human adjudication or explanations of the original model's hidden reasoning. They do not waive the original failures or establish that the other 18 retentions are correct. The two potential payment misses remain unresolved and prevent calling the full filter rock solid. No wording was changed from this diagnostic.

## Reconciled product requirement

The earlier charge-alarm clarification is no longer a prerequisite for continued work. A read-only review of **Plan voicemail transcript storage** found the owner's later explicit request to preserve potentially useful prerecorded bank/account notices and then implement capture from the start, while excluding clear scams and answered calls (October 12; turn `01a13291-9755-7b60-940a-6a57cc553779`). This is the authorization underlying v31. Work continues under that product requirement; saved unverified alerts remain separate from completed scam stops. No message was sent to the other task and none of its conversation was supplied to an evaluation target.

## Application verification and limits

The compiled application request exactly matches the frozen v7 candidate: SHA-256 `89826047c2e5154c32ccc8b555dbe9f2cefd84bde110428534777ff97a699164`. Policy-version metadata is separately bumped to `2026-10-13-voicemail-v7`. No tool, schema, model setting or caller-input field was added while transferring the wording.

The isolated source snapshot passed `npm run check` (typecheck, **183 unit tests**, build) and `npm run test:firebase` (**154 emulator tests**). The initial unit attempt could not bind a loopback test-server port in the sandbox; the authorized rerun passed. Both logs are retained. The earlier full-emulator transaction failures recorded in the [context audit](SCREENING-CONTEXT-AUDIT.md) were not fixed or erased by this change; the current full run passed without a counter-code change.

Evidence is retained in `artifacts/screening-hardening/message-contact-release-evaluation-snapshot/`, with application check logs and the exact-request comparison in `artifacts/screening-hardening/message-contact-release-checks/`. The audit verifies frozen source/request hashes, input identities, expected outcomes, supported evidence for removals, the unchanged historical baseline, and the two-stage join. Public results contain metadata and outcomes, not transcripts, quotations or summaries. The target receives only the frozen instructions, sanitized caller text and output schema; expected outcomes, groups, IDs and scoring metadata stay outside the model input.

V7 is adopted into the **undeployed repository candidate** because it improves the requested empty-contact boundary while retaining every tested ordinary message in this round. It is not a release-readiness or perfection claim: the potential public payment misses, ambiguous notice boundaries, and existing live-screening failures remain work for the active hardening goal. The frozen validation sets must not be used to tune subsequent wording.

No deployment, private recording, paid API request, phone call or carrier change occurred. These checks do not measure speech recognition, live voice delivery, audio capture or production latency. The live-screening replacement and potential payment misses remain unresolved; this work does not establish 100% real-world reliability.
