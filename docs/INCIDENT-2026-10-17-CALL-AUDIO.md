# October 17 call silence and missing monitoring warning

## Live observations

Read-only inspection followed the owner's reports of silent screening and an inaudible warning after connected-call monitoring stopped a caller. No real caller audio or transcript was retrieved for evaluation. The warning failure has now been reproduced with isolated synthetic calls (see the approved diagnostic runs below), but its underlying carrier-media cause is **not yet resolved**.

The latest inspected call began at 17:01:41 Central. Startup and the greeting took 11.9 seconds; screening then took another 26.0 seconds before the offer. Six initial assessments ran, generally taking 1–3 seconds each. The logs show repeated recognition/checking work, but do not establish why the particular ordinary request needed those checks. Another call reached the 75-second screening limit.

Monitoring later submitted its intervention 4.84 seconds after the relevant final text reached the backend. Telnyx accepted the caller hangup and the recipient warning playback. The recipient's playback-start event followed at 17:03:08.953 Central; playback ended with `call_hangup` at 17:03:21.399, without a completed-playback receipt. The generic approved audio is 13.82 seconds long, is non-silent, and the public file returned HTTP 200 with the approved SHA-256. A carrier playback-start event does not prove that the recipient heard audio. The owner's report remains the evidence of inaudibility.

Several carrier callbacks exhausted their retries while another event held the per-call executor, including warning playback start/end. This is a confirmed delivery/reliability gap; it is not proof of the missing audio's cause. Production was not modified.

## Local changes, not deployed

- Hybrid orchestration v2 checks a short finalized utterance after an 800 ms speech pause even when the recognizer's transient endpoint marker is absent. Previously the 24-character batching threshold could prevent any question/check for a short turn. The 2.5-second check interval and eight-check budget remain.
- Buffered silent media no longer converts a valid voice decision into `screening_unavailable`. Unheard audible input still prevents applying it. Carrier media continues during silence, including between the 20 ms drain and the model response.
- Signed warning callbacks bound to the recipient can be processed while the caller hangup holds the main executor. Primary/backup phase checks, command deduplication and the fixed recipient remain. Playback start, completion and interruption receive separate content-free timestamps, also visible in `check-monitoring.mjs`.
- The warning's 30-second cleanup is now queued transactionally with the intervention. It no longer relies solely on the periodic sweep. The existing primary/backup warning text and audio are unchanged.

Screening policy v158 and monitoring policy v2 are unchanged. Transcript freshness, finalized recognition before routing, the 75-second screening deadline, and recipient press-1 acceptance remain. These local fixes address reproduced defects; they do not establish that either reported real-call symptom is fully fixed.

## Validation

Two new synthetic regressions failed before the screening changes and passed afterward: short text without an endpoint marker, and a valid decision arriving with a queued silent frame. The companion audible-frame case still fails closed. The three focused screening/startup suites passed 97 tests. `npm run check` passed typecheck, 338 unit tests, and build.

The initial emulator run exposed a duplicate warning deadline job during fallback, corrected by recording its existing 30-second phase. That run also encountered a cloud-history transaction failure and was stopped before completion while cloud-metadata discovery repeatedly timed out. The final full `npm run test:firebase` run with `METADATA_SERVER_DETECTION=none` passed **251/252** tests, including all 60 shared-call tests; the sole failure was `Transaction is invalid or closed` during the unchanged stopped-call-history backfill. Its isolated check passed on an untouched main snapshot, and the final checkout's entire affected cloud suite then passed **18/18**. This is successful focused revalidation after an emulator failure, not a claim that the complete run was clean.

The unchanged main text benchmark through `--provider go` stopped after three HTTP 401 authentication failures (23 planned). It produced no usable model-validation result; these are provider failures, not ordinary-call or scam outcomes. No alternate paid provider was silently substituted.

The 24-case main synthetic voice suite is frozen and prepared at ignored `artifacts/hybrid-live-call-silence-v2-2026-10-17/`, using the previously generated benchmark audio and startup protocol. Preparation performs no paid inference. The failed initial local speech-generation preparation and superseded pre-v2 manifests remain separate. That was preparation-only evidence; the subsequently approved paid runs are recorded below.

## Remaining validation and approval boundary

The owner-approved 24-case voice suite and two separately approved pairs of carrier calls are complete below. No additional call budget remains. The paid voice suite is not a release pass; the free text provider still returned HTTP 401. No prompt change was made.

The post-bridge warning path must produce a verified audible result before a fix is considered complete. Waiting for parking removes the stuck playback in the controlled tests, but neither uncached recipient-targeted playback nor recipient-targeted backup speech restored measured speech. Carrier internal behavior remains unproven; no speculative change to production warning delivery was made. Further work should isolate the recipient bridge teardown/media state, with new approval for any paid calls. External-carrier handset behavior remains a separate qualification gate.

Only after validation and a scoped release manifest should production deployment be requested, as required by [AGENTS.md](../AGENTS.md).

## Approved diagnostic runs — October 17, 17:29–17:33 Central

The owner approved the frozen paid synthetic voice suite and two isolated browser/SIP calls. The unchanged 24-case main suite completed with source/hash checks intact: **21/24 passed**, estimated model/transcription cost **$0.06631**. Of 11 ordinary cases, nine were offered, one automated notice was saved, and one bank notice was incorrectly blocked. All nine explicit scam cases were blocked; no harmful case was approved. Of three other automated-call cases, one matched its expected block, one was incorrectly blocked instead of saved, and one timed out instead of being saved. The silent case passed. The short relative case asked its question about 3.34 seconds after the opening and approved the answer. These are synthetic results, not real-call qualification, and the suite is not a release pass. Policy v158 was not changed or tuned from these results.

The first isolated test replayed the deployed caller-hangup → recipient-playback command sequence with `park_after_unbridge: self`. Its recipient hold event preceded warning playback-start, no unhold occurred until cleanup, and the warning never completed: cleanup after more than the 13.824-second file duration produced `call_hangup`. The second waited until 750 ms after receipt of the recipient hold event. It produced an unhold followed by playback-start and a completed warning 13.84 seconds later. This reproduces a command-ordering/hold race and shows that deferring playback changes carrier behavior; it does not yet establish audible delivery.

Both recordings contained the acceptance prompt and bridged test tone, but the measured warning windows had RMS about 0.003 versus 0.094 for the source warning, with no strong waveform match (maximum normalized correlation below 0.057). The first recorder directly captured the original browser remote track; track replacement was not instrumented, so the audio result requires a stronger capture check before concluding that the delayed variant is inaudible at the actual output. Playback receipts alone are insufficient.

All four controlled legs ended. The independent audit at 17:31:41 Central confirmed every pre-existing provider setting and number assignment unchanged, the lab resources disabled, temporary credentials revoked and provider recordings deleted. Carrier callback subtotal was $0.0076 across these calls; that is not final itemized billing. Private synthetic evidence is under `artifacts/private/call-lab/warning-audio-2026-10-17/`.

The owner subsequently approved two additional isolated calls, with the same 60-second session limits and 13-cent planning allowance. The prepared variants wait for parking, then test (1) uncached playback explicitly targeting the recipient with the queue cleared and (2) the existing Joanna backup speech explicitly targeting the recipient. The capture follows remote-track replacements through a stable Web Audio destination. Neither variant changes production. The follow-up tests completed at approximately 17:36 Central. Both variants emitted unhold/start/completed events, but the stable recipient capture again contained no warning speech. The respective warning-window RMS values were 0.00422 and 0.00417; each received 88,000 audio bytes during the interior measured window while cumulative WebRTC audio energy increased by only about 0.00075. The same recipients had clear acceptance-prompt and caller-tone energy before the disconnect. No track replacement occurred. This narrows the reproduced failure to media delivery after bridge teardown/parking and rules out a cached warning asset as a sufficient explanation. It does not identify Telnyx's internal failure mechanism.

The follow-up cleanup audit at 17:36:51 Central again passed every production-setting, number-binding, call-end, credential-revocation and recording-deletion check. All eight legs across the four approved calls ended. The displayed balance moved from $6.76 before the first pair to $6.73 after the second; this is a rounded account movement, not itemized attribution. No extra calls, owner-phone calls, production deployment, number reassignment or forwarding changes occurred. Follow-up evidence is private under `artifacts/private/call-lab/warning-audio-followup-2026-10-17/`.

Final local validation: `npm run check` passed **339 unit tests**, typecheck and build. `METADATA_SERVER_DETECTION=none npm run test:firebase` passed **252/252**. A new browser regression verifies that remote-track replacement reconnects the synthetic capture to its stable destination. These checks validate the harness and earlier code changes; they do not turn the failing audible-warning checks into passes.
