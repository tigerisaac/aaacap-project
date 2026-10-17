# October 17 call silence and missing monitoring warning

## Live observations

Read-only inspection followed the owner's reports of silent screening and an inaudible warning after connected-call monitoring stopped a caller. No real caller audio or transcript was retrieved for evaluation. The warning's underlying audibility problem is **not yet resolved or reproduced**.

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

The 24-case main synthetic voice suite is frozen and prepared at ignored `artifacts/hybrid-live-call-silence-v2-2026-10-17/`, using the previously generated benchmark audio and startup protocol. Preparation performs no paid inference. The failed initial local speech-generation preparation and superseded pre-v2 manifests remain separate. No paid voice run or carrier call has been performed for these changes.

## Remaining validation and approval boundary

1. Run the frozen 24-case voice suite through Soniox/OpenAI after owner approval for paid synthetic inference. Report legitimate offers and harmful stops separately. Repair Go authentication or obtain approval for a separate paid text run; never interpret the HTTP 401 results as policy scores.
2. Prepare an isolated two-session browser/SIP warning test using the existing disabled call-lab resources, a fresh ledger, synthetic audio and a local emulator. Exercise the deployed warning sequence first and compare recipient audio with the generic warning. Bound sessions to 60 seconds, use only registered test endpoints, and preserve the production number binding. No owner's phone, production deployment, forwarding change, number purchase, real transcript or real recording is involved. Any resource activation and paid calls require fresh owner approval under [the call-lab contract](CALL-LAB.md).
3. Do not claim the audible warning is fixed from HTTP 200, playback-start, mocks or a synthetic model benchmark. The recipient audio test must establish delivery. External-carrier handset behavior remains a separate real-call verification gate.
4. Only after validation and a scoped release manifest should production deployment be requested, as required by [AGENTS.md](../AGENTS.md).
