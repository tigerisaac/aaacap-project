# Local hybrid voice prototype

This prototype keeps screening policy `2026-10-13-general-v158`, GPT-6 Luna with medium reasoning, and the existing GPT Live voice/session configuration. It runs five invented callers locally through real Soniox, Luna and GPT Live APIs. It never calls Telnyx, dials a phone, writes to Firestore, changes forwarding or deploys anything.

## Path exercised

1. Play the existing cached greeting. Stream 8 kHz PCMU caller audio to Soniox `stt-rt-v5` in 20 ms frames.
2. Ask Luna to assess the stable transcript using the unchanged policy and tools. Coalesce updates, permit one request at a time, and leave at least 2.5 seconds between requests. Discard decisions whose transcript revision is superseded. Wait for a pause before ordinary routing; a validated scam stop can end immediately. Each call permits at most eight initial checks and twelve total tool calls.
   The local harness now reuses the existing prerecorded Grace “One moment, please” once during the initial assessment/Live startup wait. It uses the production acknowledgement controller's one-second quiet/wait thresholds, yields to caller or Live speech, and stops at a terminal decision. It is playback only: no model input, question count or decision timer changes. First Live speech metrics exclude this local clip.
3. If Luna returns `continue`, open GPT Live and seed its conversation with the Soniox transcript as untrusted user content. A separate developer message identifies the handoff and requests the missing question; it does not embed caller text or alter policy instructions. Buffer audio while the connection starts, then close Soniox.
4. A local actor plays its fixed reply only after an audible, relevant question. The existing screening session evaluates the reply. The entire prototype call remains bounded by 75 seconds, including the initial phase. Approval only records a simulated offer; there is no recipient call or connection operation.

The selected scenarios are a repair visit missing its purpose, a delivery missing its caller identity, family plans missing context, an account concern that becomes a sign-in-code request, and a permit issue that becomes a routine inspection update. Four should be offered after clarification; one should stop. These are listening demonstrations, not a representative accuracy benchmark or a cost comparison. All five intentionally exercise the expensive branch.

## Reproduction and evidence

```sh
npm run build
node scripts/check-hybrid-screening-gate.mjs
node scripts/prototype-hybrid-screening.mjs --out artifacts/hybrid-prototype-NEW-NAME --prepare
node scripts/prototype-hybrid-screening.mjs --out artifacts/hybrid-prototype-NEW-NAME --run --allow-paid-audio
```

Preparation uses macOS `say` and ffmpeg for invented callers. It freezes source, policy request, fixture and audio hashes before inference. The run requires the existing local Soniox configuration and OpenAI credential adapter; secrets are never written into reports. A started directory cannot be rerun. Model misses and transport failures remain in the output, without replacement credit.

Each output directory contains `listen.html`, five mixed WAVs, five stereo WAVs (caller left, Shield right), the frozen plan, individual event/usage reports and a summary. WAVs preserve playback timing and silence instead of concatenating utterances. The greeting/offer are existing cached recordings; the questions are actual GPT Live output. Caller speech uses local synthetic voices. All generated audio and synthetic dialogue reports stay in ignored `artifacts/`.

## Limits

- Cold-start latency includes the initial model decision, Live connection and first speech. “First Live speech” can include an acknowledgement; it does not necessarily mean the useful question has finished.
- The local network, artificial voices and fixed actor replies do not test carrier latency, echo, interruptions, noise, accents or real callers. This is not production voice certification.
- The original provider run below omitted the cached wait acknowledgement. Its original recordings retain that omission. The later offline previews add the clip without another model run; they are not fresh end-to-end voice results.
- The prototype uses the existing session with separately seeded history. It rejects approval before a new caller answer; a production handoff would also need a first-class transfer of pending clarification and question-budget state.
- Initial research requests are retained as unsupported prototype outcomes. Live retains the existing research path. Repeated identical transcripts are not rechecked.
- The initial local gate's transcript freshness and pause controls are orchestration experiments, not changes to the deployed screening policy. Production remains on the existing GPT Live path.

## Results

The completed run is `artifacts/hybrid-prototype-v158-2026-10-13-audiofix/`. All five mixed/stereo WAVs contain audio on both tracks, and all five mixed files load in the local browser player without media errors. Source and request hashes remain unchanged through inference. Production policy and backend source have no diff.

| Caller | Outcome | Opening ends → first Live speech | Live startup |
| --- | --- | --- | --- |
| Repair visit | Useful purpose question; ordinary offer | 8.04 s | 1.08 s |
| Furniture delivery | Initial assessment handling failed; no handoff | — | — |
| Family plans | Useful purpose question; ordinary offer | 3.86 s | 1.05 s |
| Account concern | Asked what action was needed; stopped code request | 4.60 s | 0.65 s |
| Permit issue | Wrong question; scripted conversation stopped | 5.03 s | 0.78 s |

**Three of five intended sequences completed: ordinary offers 2/4, harmful stops 1/1.** The delivery response failed after token usage was received but before a decision was accepted. This first harness retained only `initial_assessment_failed`, not the rejected response or precise validation category, so it cannot establish whether the cause was a missing tool call, invalid decision, or another response-contract problem. It is not a measured false block, successful screen or acceptable ordinary outcome.

The permit caller had already named the city office and described a permit issue. Live asked “Who are they trying to reach?” instead of learning what the recipient needed to do. The actor deliberately did not inject its inspection answer to an unrelated question; this is an incomplete ordinary conversation, not an observed final classification. The repair transcript also contains brief trailing fragments after its useful question. These outcomes and pauses are preserved for listening; no model outcome was rerun or replaced.

The initial model used seven requests across five calls; the permit opening triggered three, with two superseded by transcript changes. Across the completed run Soniox sockets were open for about 75 seconds and Live sockets for about 56 seconds. These are connection timings, not provider invoices or a savings estimate. The recording durations are 33.44, 15.41, 28.45, 34.04 and 20.36 seconds. Every intended scenario needs Live, so this sample cannot estimate the population's escalation rate.

An earlier preparation silently produced zero-length caller audio inside the macOS sandbox. Its first session timed out without a transcript or Luna request; a second was interrupted when the empty files were found. The original plan, first failed recording and abort note remain in `artifacts/hybrid-prototype-v158-2026-10-13/`. Preparation and execution now reject empty/silent source audio before paid inference. Regeneration outside the sandbox produced audible files; the completed run uses the same five caller texts.

Validation: the focused gate check passes (coalescing, stale-response rejection, pauses, provisional corrections, closure and trust separation). `npm run check` passes typecheck, 203 unit tests and build; `npm run test:firebase` passes all 154 emulator tests. The initial sandbox-only check failed because the APNs test could not bind localhost; its unchanged permitted rerun passed. No deployment, real phone call or carrier change occurred.

## Acknowledgement listening preview

At the owner's request, the local harness now plays the existing **1,102.5 ms Grace clip**, using one acknowledgement controller across initial assessment and handoff so it cannot repeat when Live starts. A focused check covers one-shot playback across that boundary, interruption by caller/Live speech or a terminal decision, and silence when Live responds quickly or no caller has spoken.

The five existing synthetic recordings also have separately labeled **offline previews** in `artifacts/hybrid-prototype-v158-2026-10-13-audiofix/ack-preview/`. Reproduce with:

```sh
node scripts/check-hybrid-wait-acknowledgement.mjs
node scripts/preview-hybrid-acknowledgement.mjs artifacts/hybrid-prototype-v158-2026-10-13-audiofix
```

The preview replays the recorded audio and initial-assessment timestamp through the same updated playback controller at 20 ms intervals. It adds the clip to the Shield channel, preserves the caller track sample-for-sample, and verifies unchanged duration and unchanged audio outside the acknowledgement intervals. Original recordings, hashes and outcomes remain untouched. All five previews play the clip once; onset follows at least one second of detected caller quiet and initial waiting. Trailing silence in a source utterance can make onset less than one second after its file ends. Both unsuccessful conversations remain unsuccessful, and the delay before Live speech is unchanged. No paid inference, new phone call or deployment is involved.

The acknowledgement/gate checks and `npm run check` pass, including 203 unit tests and the build. All six preview audio players load without media errors. The first Firebase run passes 153/154 with the existing stopped-total emulator transaction-closed error; the full unchanged rerun passes 154/154. No backend code was changed to obtain that pass.

## What this establishes

Cold handoff is technically feasible, but this prototype is not ready for a rollout. Live startup was below 1.1 seconds; initial classification and response generation added appreciably more waiting. Before another voice experiment, make the clarification handoff explicit (including the question already selected and the remaining question budget), retain fixed diagnostic categories for initial response failures, and define a safe Live fallback when the cheap stage cannot produce a valid decision. Also reduce speculative assessments on a still-changing opening. Keep the screening policy unchanged while testing these orchestration repairs against the retained failures and fresh callers.
