# Local hybrid voice prototype

This prototype keeps screening policy `2026-10-13-general-v158`, GPT-6 Luna with medium reasoning, and the existing GPT Live voice/codec settings. The revised run requests Fast service for Luna; this changes latency and pricing, not reasoning effort or policy. It runs five invented callers locally through real Soniox, Luna and GPT Live APIs. It never calls Telnyx, dials a phone, writes to Firestore, changes forwarding or deploys anything.

## Path exercised

1. Play the existing cached greeting. Stream 8 kHz PCMU caller audio to Soniox `stt-rt-v5` in 20 ms frames.
2. Ask Luna to assess the stable transcript using the unchanged policy and tools. Coalesce updates, permit one request at a time, and leave at least 2.5 seconds between requests. Discard decisions whose transcript revision is superseded. Wait for a pause before ordinary routing; a validated scam stop can end immediately. Each call permits at most eight initial checks and twelve total tool calls.
   The local harness now reuses the existing prerecorded Grace “One moment, please” once during the initial assessment/Live startup wait. It uses the production acknowledgement controller's one-second quiet/wait thresholds, yields to caller or Live speech, and stops at a terminal decision. It is playback only: no model input, question count or decision timer changes. First Live speech metrics exclude this local clip.
3. Require an initial tool decision; use the existing production correction feedback for an invalid decision, bounded to three response rounds. If Luna returns `continue`, render one general question from its validated fields: missing identity → “Who's calling, please?”, missing purpose → “What can I tell them it's about?”, otherwise → “What do you need them to do?”. There is no extra model request to word this first question. Seed Live with the already-played greeting, Soniox transcript as untrusted user content, and a separate developer message carrying the actual pending question. Transfer the transcript, unanswered-question guard and one-used-question budget into `ScreeningSession.resumeClarification` before starting it. Buffer audio while the connection starts, then close Soniox. The production entry point never calls this optional method.
4. A local actor plays its fixed reply only after an audible, relevant question. The existing screening session evaluates the reply. The entire prototype call remains bounded by 75 seconds, including the initial phase. Approval only records a simulated offer; there is no recipient call or connection operation.

The selected scenarios are a repair visit missing its purpose, a delivery missing its caller identity, family plans missing context, an account concern that becomes a sign-in-code request, and a permit issue that becomes a routine inspection update. Four should be offered after clarification; one should stop. These are listening demonstrations, not a representative accuracy benchmark or a cost comparison. All five intentionally exercise the expensive branch.

## Reproduction and evidence

```sh
npm run build
node scripts/check-hybrid-screening-gate.mjs
node scripts/check-hybrid-initial-assessment.mjs
node scripts/check-hybrid-wait-acknowledgement.mjs
node scripts/prototype-hybrid-screening.mjs --out artifacts/hybrid-prototype-NEW-NAME --prepare
node scripts/prototype-hybrid-screening.mjs --out artifacts/hybrid-prototype-NEW-NAME --run --allow-paid-audio
```

Preparation uses macOS `say` and ffmpeg for invented callers. It freezes source, policy request, fixture and audio hashes before inference. The run requires the existing local Soniox configuration and OpenAI credential adapter; secrets are never written into reports. A started directory cannot be rerun. Model misses and transport failures remain in the output, without replacement credit.

Add `--audio-from artifacts/hybrid-prototype-v158-2026-10-13-audiofix` to preparation to reuse the exact original caller audio. The fixture manifest must match; all copied audio is hashed before inference. This is a development regression comparison, not fresh held-out evidence.

Each output directory contains `listen.html`, five mixed WAVs, five stereo WAVs (caller left, Shield right), the frozen plan, individual event/usage reports and a summary. WAVs preserve playback timing and silence instead of concatenating utterances. The greeting/offer are existing cached recordings; the questions are actual GPT Live output. Caller speech uses local synthetic voices. All generated audio and synthetic dialogue reports stay in ignored `artifacts/`.

## Limits

- Cold-start latency includes the initial model decision, question preparation, Live connection and first speech. “First Live speech” excludes the local prerecorded acknowledgement; it does not necessarily mean the useful question has finished.
- The local network, artificial voices and fixed actor replies do not test carrier latency, echo, interruptions, noise, accents or real callers. This is not production voice certification.
- The original provider run below omitted the cached wait acknowledgement. Its original recordings retain that omission. The later offline previews add the clip without another model run; they are not fresh end-to-end voice results.
- The revised prototype transfers pending clarification and question-budget state. It rejects approval before a new caller answer. Production still needs testing for speech arriving during handoff, interruptions, incomplete questions, provider outages and fallback behavior.
- Initial research uses the existing constrained research path, at most once in the initial assessment. Repeated identical transcripts are not rechecked. An unrecoverable initial assessment fails closed; automatic Live fallback is not implemented.
- The initial local gate's transcript freshness and pause controls are orchestration experiments, not changes to the deployed screening policy. Production remains on the existing GPT Live path.

## Original results

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

## Handoff repair and recorded reruns — October 13

The owner requested repairs to delivery handling, the permit question and handoff delay, with the acknowledgement included in a real provider rerun. Two five-call iterations are preserved:

- `artifacts/hybrid-prototype-v158-handoff-fix-2026-10-13/`: all five pass. Initial assessment requires a tool decision and supports bounded correction using existing production feedback. Luna words the clarification in another response while the Live socket opens. Explicit pending-question state fixes the permit handoff. The extra wording request costs about 1.2–1.7 seconds, so this is an intermediate experiment, not the selected implementation.
- `artifacts/hybrid-prototype-v158-fast-handoff-2026-10-13/`: all five pass with the general question rendering described above, removing that extra request. This is the final listening set. Both runs request Fast service; every reported Luna response confirms the priority tier. Reasoning remains medium. No screening prompt or tool-schema edits were made.

Both iterations reuse all ten original caller audio assets byte-for-byte, retain the same fixtures, and verify identical policy-source and base-request hashes against the original run. These are reused development cases. The earlier failures remain failures; neither iteration replaces them or establishes broader accuracy. The original delivery failure was under-instrumented, so its exact cause remains unknown. Requiring a decision, retaining safe diagnostic categories, and bounded correction address the response-contract gap; delivery succeeds in both new runs without requiring a correction.

| Caller | Final outcome and question | Original opening → Live speech | Final opening → Live speech | Final Live startup | Estimated API cost |
| --- | --- | --- | --- | --- | --- |
| Repair | Offer; asks what the call is about | 8.04 s | 6.33 s | 0.64 s | $0.01192 |
| Delivery | Offer; asks who's calling | Failed before handoff | 3.82 s | 0.82 s | $0.01067 |
| Family | Offer; asks what the call is about | 3.86 s | 2.94 s | 0.68 s | $0.01176 |
| Account | Stop after asking what action is needed | 4.60 s | 6.40 s | 0.91 s | $0.01303 |
| Permit | Offer after asking what action is needed | 5.03 s; wrong question | 2.88 s | 0.72 s | $0.01386 |

**Final ordinary offers: 4/4. Harmful stops: 1/1. Useful first questions: 5/5.** First Live speech is the start of the useful question in all five. Each recorded call plays the acknowledgement once, to completion. Original pauses remain in the mixed and stereo files. The five final mixed files load fully in the browser with no media errors; headers, sample rates and recording hashes are verified. Short Live backchannels (“Oh”, “Right”, “Mhm”) remain in the original output.

Across the same four callers with original timing data, mean opening-to-first-Live-speech decreases from **5.38 to 4.64 seconds (14%)**. The delivery baseline has no successful handoff and is excluded from that mean. The account example gets slower because initial classification varies; this is not evidence of consistent per-call speedup. Final socket/session startup is 0.64–0.91 seconds. There are six initial checks instead of the original seven; the final permit opening still has one superseded assessment.

### Cost accounting

The final five cost approximately **$0.06123 USD**, or **1.22¢ per call**: Live **$0.05427**, Luna **$0.00467**, Soniox **$0.00229**. The intermediate five cost **$0.07215**. Total for the ten paid calls in this repair task is approximately **$0.13339 (13.3¢)**. Prior-turn experiments are excluded. Both iterations and their costs remain recorded; there were no additional model retries outside the recorded runs.

Rates checked October 13: [OpenAI API pricing](https://developers.openai.com/api/docs/pricing) lists GPT Live at $0.05/minute and Standard Luna at $0.10/$0.01/$0.125/$0.50 per million uncached-input/cached-input/cache-write/output tokens; Fast doubles the Luna rates. The calculator uses reported service tier, partitions cached/written input without double counting, and includes reasoning within output. [Soniox pricing](https://soniox.com/pricing) gives a typical realtime equivalent of $0.12/hour, while its actual invoice uses tokens.

These are **API estimates, not an invoice**: Live socket-open duration is a conservative proxy for billable session time, and Soniox socket duration uses its typical hourly equivalent. No fresh TTS charge is incurred for local caller voices or cached announcements; Live speech is included in Live's rate. Telephony, hosting, taxes and account credits are excluded. Every Luna response in the final run includes token/tier counters; no missing-usage warning is present. `comparison.json` records the paired comparison and both iteration totals. Since all five callers need Live, this set cannot estimate the production escalation rate or population savings.

Validation: `npm run check` passes typecheck, **206 unit tests** and build; `npm run test:firebase` passes **154/154** in its first run. Focused gate, initial-assessment/cost and acknowledgement checks pass. Added session tests cover inherited question budget, unchanged-speech rejection, fresh answers and invalid/late handoff rejection. Frozen inference audits pass. The optional session method is added to source but is called only by the local prototype; no production entry point is changed, and nothing is deployed.

## What this establishes

An explicit clarification handoff fixes these two retained conversation failures, and rendering a general question avoids an extra model round trip. Initial Luna latency still dominates some calls. This is a local prototype, not a rollout recommendation: provider-failure fallback, mid-handoff caller speech, interruption behavior and representative fresh callers still need validation. Production remains on the existing GPT Live path and unchanged v158 policy.
