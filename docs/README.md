# Shield documentation — collaborator start here

To finish caller questioning, follow the [agent continuation playbook](QUESTIONING-LOOP-HANDOFF.md) and update the [progress checkpoint](QUESTIONING-LOOP-PROGRESS.md). They define the implementation/evaluation cycle and the evidence required for completion.

## Purpose and status

Shield screens forwarded telephone calls before offering an unfamiliar caller to a participant. The proposed design uses a short, bounded interview to collect the caller's claimed identity and general purpose, applies routing rules in application code, and requires the participant's private keypad acceptance before connecting a call. Screening does not authenticate callers or guarantee that a caller is safe.

Start with [Questioning Loop and Silence-Control Specification v1.1](screening-loop.md), prepared 21 September 2026. It is a proposed implementation and test specification, not a description of verified running behavior. Its timing values, scripts, and thresholds are initial settings to validate.

For evaluation work, follow the [Caller benchmark plan and FTC source inventory](caller-evaluation-plan.md). It requires all nine FTC examples as benchmark seeds, with ambiguous multi-turn variants, legitimate near-matches, prompt-tuning discipline, and separate safety/usefulness metrics. This is an addendum to section 12; executable fixtures and results remain to be built.

The specification was copied unchanged from `Shield_Questioning_Loop_Spec_v1_1.md`. Its embedded prompts, sample XML, suggested file layout, and contributor requirements describe the proposed product implementation; the XML is illustrative and contains placeholder endpoints.

This repository contains the application source and existing verification records. Start with [collaborator setup](COLLABORATOR-SETUP.md) for access and runnable commands, and [implementation status](IMPLEMENTATION-STATUS.md) for recorded progress. The specification was written separately from the implementation and must be reconciled against current code; its requirements are not automatically implemented or tested.

## Architecture and scope

The intended flow is:

1. Conditional forwarding sends an incoming call to a participant-specific Twilio number.
2. Fixed prompts collect at most two screening responses: the initial answer and one shared recovery or clarification opportunity.
3. A language model extracts observations from nonempty caller statements. Application code selects questions, enforces deadlines, and decides which routes are permitted.
4. An eligible call can trigger one native cellular callback. The participant hears a private summary and must press 1 on the correctly bound callback leg before a bridge is authorized.
5. Where permitted, unresolved input or an unsuccessful offer can enter one disclosed, bounded voicemail flow.

The existing known-contact missed-call route remains voicemail-only. A known-contact match is not authentication. Streaming conversation, a VoIP replacement, number porting, and monitoring the connected human conversation are outside this specification's scope.

## Rules to understand before contributing

- Silence, unclear speech, and technical failure have different outcomes. Repeated no input ends the call without an automatic voicemail or participant ring. Meaningful but unresolved input can receive message-only handling. Technical failure never authorizes a live offer and is not labeled fraud.
- All repair prompts share one recovery allowance. A silence retry consumes the same allowance as a missing-field question or service explanation; there is no third screening turn.
- Empty input never invokes the model. Model output supplies observations, not permission to dial, a destination, executable instructions, or a final route.
- Restricted requests and independent-verification rules take precedence over routine-purpose eligibility. Eligibility permits a private offer, not automatic connection.
- Allow at most one callback per original session, one pending callback per participant, and one voicemail recording flow per session.
- Delayed results, duplicate events, restarts, and uncertain provider responses must not revive ended sessions or produce additional callbacks. Screening timers must not interrupt an accepted conversation.
- Keep participant details, credentials, actual transcripts, and recording links out of public repositories and test artifacts. Consent, recording, transcription, and retention need explicit review.

These are orientation notes; the full invariants and edge cases in the specification govern the proposed design.

## Reading and implementation order

| Work | Read in the specification | Required evidence |
|---|---|---|
| A. Build bounded call control with the model unavailable | Sections 2–6 and 10 | Silence, noise, deadlines, disconnect cleanup, duplicate-event and failure behavior |
| B. Add extraction and deterministic policy | Sections 7–8 | Human-labeled semantic cases, schema/evidence validation, restricted-route regressions |
| C. Implement private handoff | Sections 9–10 | Controlled telephone tests for acceptance, decline, voicemail pickup, errors, recursion, and races |
| D. Validate release readiness | Sections 11–15 | Completed scenario register, audio/accessibility checks, privacy review, operational metrics, and rollback ownership |

The proposed contributor boundary is a pure transition core with an injectable clock, an extraction adapter returning observations, and a telephony adapter carrying out approved effects. Section 14 suggests a repository layout; map those responsibilities onto the existing backend before introducing parallel modules.

Section 12 lists scenarios T01–T48 and release conditions. Treat them as required test cases to implement and execute, not as passing results. Transcript tests alone cannot demonstrate real telephone timing or private-leg isolation. Each policy-changing pull request should explain expected behavior and include regression coverage; changes to retries, deadlines, routes, prompts, recording, and acceptance require review under the proposed specification.

## Missing context and handoff questions

The referenced [baseline implementation plan](Shield_Implementation_Plan_v1.md) is included in this repository. The v1.1 spec explicitly changes its silence behavior: repeated no input ends the call instead of being grouped with unclear speech under message-only handling. Reconcile those proposed changes against existing code and recorded deployment behavior.

Before implementation or a pilot, identify:

- The actual application repository, current pipeline behavior, deployment configuration, and responsible technical owner.
- The selected recognizer, supported languages, voice, carrier paths, and measured timing/accessibility behavior.
- The approved disclosure, recording consent, retention settings, and authorized QA-data workflow.
- The pilot operator, live-offer disable-switch owner, acceptance targets, and where test evidence will be stored.

The source/evidence register at the end of the specification records its author's references and review date. This handoff preserves that register; it does not represent a fresh provider-documentation audit or completed legal, privacy, or operational approval.
