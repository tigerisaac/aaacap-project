# Hybrid screening

Production uses Soniox `stt-rt-v5` for streaming transcription and GPT-6 Luna medium for decisions. GPT Live starts only when Luna requests clarification. Screening policy `2026-10-13-general-v158`, its tools and the recipient's press-1 requirement are unchanged. See [Status](STATUS.md) for deployed revisions and [the earlier prototype](HYBRID-SCREENING-PROTOTYPE.md) for historical recordings.

## Call handling

- The existing disclosure/greeting plays before 8 kHz PCMU caller audio streams to Soniox. Luna uses the same policy as the voice path, with Fast service. The initial phase coalesces updates, permits one request at a time, at least 2.5 seconds apart, and at most eight checks. Each assessment has at most three tool-response repair rounds.
- Transcript revisions invalidate old decisions. A result cannot apply until recognition has finalized the latest audible input. Ordinary routing waits for a pause; saved notices wait eight seconds for a possible harmful continuation. Scam decisions can end sooner once their evidence is finalized.
- A `continue` decision starts Live with the caller text as untrusted input, the already-played greeting, an explicit pending question, and one question remaining afterward. It carries raw audio after the finalized boundary through startup. An unchanged opening cannot satisfy the unanswered-question guard.
- The cached “One moment, please” plays at most once across both stages and yields to caller or assistant speech. It adds no model/TTS request.
- Both stages share one 75-second screening deadline, twelve tool calls and one research allowance. Provider failures and unresolved callers go to voicemail, never directly to the recipient. Silence after a caller has already supplied words preserves the message; initial silence can still end the call.
- Soniox liveness tracks **processed** audio, not just finalized words. A long but still-provisional utterance must not be treated as a failed recognizer. Buffered audio remains bounded by the screening duration; startup queues have a separate ten-second bound.

`SHIELD_SCREENING_MODE=hybrid` enables this path. `live` retains the previous voice-only path. The Soniox key is a dedicated Secret Manager secret with an explicit version. `/ready` reports the selected mode; readiness alone does not test either provider or the phone network. Production timing logs contain counters and timings, never caller words or audio.

## Always-on and connected calls

Always-on is an existing per-person admission setting. It removes the repeated 30-minute test-window requirement for the enrolled owner; it does not enroll more people or change carrier forwarding. Pause and quiet-hour preferences still apply. Existing daily limits remain 30 screenings per person, 200 across Shield and 500 incoming calls across Shield. Screening-limit overflow gets voicemail; the incoming-call flood limit refuses further calls.

The recipient leg now has a 3,600-second carrier limit from answer, including the short private summary. A durable cleanup deadline also ends an accepted call after an hour. The carrier may therefore end it a few seconds before a full hour of conversation. Reservation timing allows for screening and offering, and shared capacity is released only after a confirmed end. See [Telnyx's duration semantics](https://developers.telnyx.com/api-reference/call-commands/dial).

Connected-call monitoring is unchanged: it uses the owner's existing opt-in and a maximum of 240 decision checks per call. Raising the call-duration limit does **not** establish uninterrupted fraud monitoring for the entire hour; that budget may be exhausted earlier on a talkative call. Its transcript retention bound remains two hours. Shared-mode automatic setup calls remain disabled.

## Validation on October 13

The actual `HybridScreeningSession` class was exercised locally through paid Soniox/Luna/Live APIs. Caller audio is synthetic; no Telnyx call, real transcript, owner phone or forwarding setting is used. Each run freezes source, request, fixtures and audio before inference. Original failures are retained. Reruns reuse the exact audio and are development regressions, not new held-out evidence.

| Final run | Ordinary outcomes | Harmful/unwanted outcomes | Original-label passes |
| --- | --- | --- | --- |
| Five clarification demonstrations | 4/4 offered after useful questions | 1/1 blocked | 5/5 |
| Twelve fresh cases, replay after fixes | 5 offered, 1 saved | 6/6 blocked | 11/12 |
| Existing 24-case voice benchmark, replay | 8 offered, 1 saved, 1 unanswered clarification to voicemail, 1 bank alarm blocked | 11 blocked, 1 held for voicemail; none offered | 20/24, including initial silence |
| Existing text benchmark, OpenCode Go/Luna medium | 9 offered, 1 saved, 1 bank alarm blocked | 11 blocked, 1 still asking; none offered | 20/23; silence omitted |

The receipt in the fresh set was **offered instead of saved** after Soniox mistranscribed its automated opening. It is a routing miss, not a correct notice save. The hospital update was accurately transcribed but received an extra action question; the single-utterance benchmark has no reply, so it falls back to voicemail. This is a missed live offer. The bank alarm is labelled legitimate by the benchmark but is blocked under the owner's charge-alarm preference. The Amazon alarm also stops despite its old saved-notice label. The Social Security recording is held for voicemail, not a completed scam stop. These distinctions preserve source labels and do not turn departures into accuracy credit.

The first broad voice run caught a real orchestration fault: a long utterance advanced provisional recognition but not final words, triggering the eight-second failure timer. The fixed replay offers that caller. The first receipt and hospital attempts also ended as `silent_caller` after clarification; the fixed orchestration preserves a nonempty message instead. Neither fix changes the screening prompt or adds case-specific rules. All original artifacts remain.

Final five-call question delay is 2.95–4.78 seconds after the opening, including the acknowledgement. Those selected calls all use Live and cost an estimated **$0.06319**. Final twelve- and 24-case runs cost **$0.02922** and **$0.05997** respectively; 10/12 and 21/24 avoid Live. All six production-class voice runs in this release review total **$0.32589**. These use [OpenAI list pricing](https://developers.openai.com/api/docs/pricing) and the [Soniox typical rate](https://soniox.com/pricing), with reported Luna tokens plus estimated Live/Soniox duration charges, excluding telephony, hosting and earlier prototypes. They are not invoices or population savings estimates. Cached TTS adds no new generation cost.

Evidence lives in ignored `artifacts/hybrid-live-release-{five,fresh,main,fresh-fixed,main-fixed,five-final}/`. The first three precede the two general fixes. The frozen benchmark and policy are unchanged. The raw runner historically grouped `hold` with harmful stops; the table above reports actual call handling separately.

Final typecheck, unit tests and build pass; all 155 Firebase emulator tests pass. A prior emulator run retained a concurrent-admission timeout and its cascading failure. A restricted final-check attempt could not bind the APNs test's local server; the same complete check passed with localhost permission. The assembled production-based bridge passes startup in both modes, and Cloud Build checks every packaged file hash. These are synthetic and infrastructure checks, **not real-carrier verification** of the hybrid handoff or hour-long connection.

## Reproduce

```sh
npm run check
npm run test:firebase
node scripts/check-hybrid-live.mjs --suite fresh --out artifacts/hybrid-live-NEW --prepare
node scripts/check-hybrid-live.mjs --suite fresh --out artifacts/hybrid-live-NEW --run --allow-paid-audio
```

Use `--suite prototype` for the five demonstrations or `--suite main` for the unchanged 24-case benchmark. Preparation can copy an earlier identical suite's audio with `--audio-from artifacts/hybrid-live-PREVIOUS`; it verifies case identities before copying. A started run directory cannot be overwritten. Paid provider tests require owner authorization; they never authorize phone calls or deployment.
