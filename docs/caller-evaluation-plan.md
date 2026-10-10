# Shield caller benchmarks — FTC examples and contextual evaluation

## Required benchmark source

Use the FTC's [Robocall Scam Examples](https://consumer.ftc.gov/features/robocall-scam-examples) as a required seed source for the caller evaluation suite described in [the specification](screening-loop.md), section 12. This addendum supplements v1.1 without changing its two-opportunity limit or routing policy.

The page was reviewed for this addendum on 22 September 2026 (UTC). It includes these nine examples:

| Seed ID | FTC example | Source material on the page |
|---|---|---|
| FTC-01 | Auto warranty | Video and description |
| FTC-02 | Amazon suspicious charge | Video and description |
| FTC-03 | Social Security law-enforcement claim | Video and description |
| FTC-04 | Apple tech support | Audio and transcript |
| FTC-05 | Utility rebate | Audio and transcript |
| FTC-06 | Student loan debt relief | Audio and transcript |
| FTC-07 | IRS debt settlement | Audio and transcript |
| FTC-08 | Social Security number suspension | Audio and transcript |
| FTC-09 | Interest rate reduction | Audio and transcript |

This inventory identifies sources to incorporate; media has not been listened to, transcribed, or run through Shield. Do not present a page description as a verbatim caller transcript. Verify imported transcripts against the source media and record missing or cut-off content. Preserve source links and attribution; check reuse terms before redistributing media.

## Build cases from each seed

Each of the nine source examples must have a tracked benchmark family containing:

1. A source-faithful case using the verified transcript and, where available for testing, original audio.
2. A synthetic paraphrase that changes wording and claimed organization while preserving the relevant requested action.
3. An ambiguous first-turn variant with scripted alternative second answers: a routine explanation, a restricted request, and a still-unresolved answer.
4. A legitimate near-match using similar vocabulary, such as a routine appointment, service visit, or warning about scams. Label it as synthetic rather than FTC-provided.
5. An audio capture variant that starts during disclosure or ends before a clarification. Score only what the system actually captured; never reconstruct missing words from the source's known identity.

These variants are Shield-authored tests, not additional FTC evidence. Source-family coverage supplements T01–T48; it does not replace controller, silence, private acceptance, or failure tests.

## Label observable behavior, not hidden intent

Keep two distinct labels: the source's designation of the example and the expected Shield behavior given only the captured input. Do not pass the FTC label, source title, filename, expected answer, or scenario notes into the model.

An example being identified as a scam by its publisher does not establish that every fragment contains enough evidence for a particular restricted route. Annotators must cite exact transcript spans supporting observations and apply section 8. If the current policy does not resolve a case, record a policy gap for review rather than inventing a rule or counting the system's answer as correct.

Use two independent human annotations for ambiguous cases, then adjudicate disagreements before release scoring. Record accepted routes, the expected clarification when applicable, prohibited effects, and a rationale. Unresolved labeling disagreements remain visible and are excluded from definitive route-accuracy claims; report their count separately.

## Multi-turn and system-prompt evaluation

Evaluate the extraction system prompt with the ordered, bounded set of both caller answers, their turn IDs, and the approved question IDs needed to interpret them. Treat caller text as untrusted data. Include relevant prompt context in a versioned adapter contract without supplying private participant information. Application code still owns question selection and routing.

Use these original synthetic development cases alongside the FTC families:

| First answer | Controller action | Second answer | Expected behavior |
|---|---|---|---|
| “This is Morgan from the service desk.” | `ASK_PURPOSE` | “I'm confirming the repair visit tomorrow.” | Eligible private offer if all other gates pass; identity remains unverified. |
| Same first answer | `ASK_PURPOSE` | “I need your sign-in code to complete the repair.” | No live offer; preserve evidence of the code request. |
| Same first answer | `ASK_PURPOSE` | “It's a personal matter.” | Message-only if purpose remains materially unresolved; no third question. |
| Same first answer | `ASK_PURPOSE` | No input | End without automatically recording voicemail. |
| “This is Morgan from the repair desk, calling to remind you never to give anyone your sign-in code.” | Evaluate | No second answer required | Do not extract a request for a code merely because one is mentioned. Route under the full policy. |

For a restricted request already evident in turn one, the controller should stop that interview. Separately test the extractor with a two-turn fixture containing a later recantation to ensure earlier evidence is retained; do not make the production controller solicit that second answer.

Tune prompt wording and examples on the development partition. Version the system prompt, schema, model configuration, context format, and policy separately so a change's effect can be identified. Compare single-turn and two-turn performance, including unresolved ambiguity, contradictions, warnings versus requests, and attempts to override screening instructions.

## Dataset contract and split discipline

Each executable case should contain:

```text
caseId, familyId, sourceUrl, sourceTitle, retrievedAt
provenance: source_transcript | verified_media_transcription | synthetic
sourceRevisionOrHash, mediaVerificationStatus
split: development | held_out
turns: [{ turnId, promptId, capturedText, inputKind }]
expectedObservations, supportingEvidenceSpans
expectedPromptId, acceptableRoutes, prohibitedEffects
policyRevision, annotationStatus, annotatorRationale
linkedScenarioIds, audioVariant, captureLimitations
```

Assign whole source families to development or held-out evaluation before tuning. All paraphrases, audio variants, and legitimate near-matches from a family stay together to prevent leakage. Keep the synthetic examples printed above in development. Nine public examples are a small seed corpus, not a representative estimate of general scam detection; expand with independently authored and consented cases. Public examples may also be familiar to a model from training.

Once held-out failures are inspected to tune a prompt, move those cases into regression/development and replenish the held-out set. Keep a versioned manifest of assignments and changes.

## Scoring and delivery

Report counts and denominators by family, ambiguity level, and turn count, including:

- Restricted cases incorrectly receiving a live offer, and any unauthorized bridges.
- Eligible routine cases incorrectly withheld or unnecessarily questioned.
- Requested-action and speech-act extraction errors, unsupported evidence, and invalid outputs.
- Clarification selection, retained cross-turn evidence, and correct unresolved-input handling.
- Third-question attempts, repeated callbacks, and other invariant violations.
- Audio capture loss, recognition errors, abandonment, and end-to-end timing, separate from transcript-only scores.

Run the same frozen cases before and after each prompt or context change. Preserve section 12's zero-observed-violation release gates; set usefulness targets before the final evaluation rather than choosing them to fit results. Never combine all outcomes into a single accuracy score.

Implementation deliverables are a provenance manifest covering all nine FTC seeds, verified source fixtures, reviewed synthetic variants, a versioned split, an executable runner, and a report of results with prompt/model/policy versions. These are planned deliverables: this documentation adds the benchmark requirements and development examples, not a completed dataset, runner, or evaluation result.
