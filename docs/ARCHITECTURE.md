# Architecture

## Shared-number deployment (October 12, 2026)

The shared Call Control path is deployed for a supervised ten-person pilot on the existing DID. It uses strict Diversion routing, immutable per-call recipients, per-person controls, durable command receipts, a distributed ten-call cap and independent live sessions. Telnyx's shared application is active at 10 inbound/10 outbound channels; the profile and account outbound limit are 10. One verified participant is enrolled and awaits a fresh forwarding check. Capacity is configured, not yet measured with ten real audio sessions. Policy v30 is unchanged. TeXML remains available for operator rollback. See [current rollout evidence and tests](SHARED-NUMBER-ROLLOUT.md).

The detailed descriptions below retain the October 10 TeXML baseline where explicitly named. The shared path uses Call Control speech, streaming, dialing, gathering and bridging throughout a call; its current admission, qualification and cleanup rules are in the rollout document.

Current as of October 10, 2026. Shield answers unfamiliar calls that a person's phone forwards to it, screens them with a GPT Live voice agent, and only rings the person if the call looks ordinary. The person then decides privately whether to take it. Screening never verifies who is calling.

## Saved messages (October 12 implementation, not deployed)

The shared Call Control path captures the inbound track with Telnyx `record-from-answer`, before greeting/model startup, bounded to 240 seconds. The greeting says an unconnected message may be saved. A durable recording job is created from the answer response when available and correlated recording callbacks update it. Ingestion waits for the final outcome; a callback arriving after acceptance cannot hang up the connected call or create a saved message. Recording must stop successfully before a press-1 bridge. Every provider copy is deleted, including answered, blocked, expired, deleted-account and orphaned captures; provider deletion failures retry.

Useful or uncertain automated notices use the new `message` screening decision: no live offer, no questions or replay request. Shield waits eight quiet seconds and rechecks changed speech before ending a notice; the existing overall screening deadline still applies. A caller hanging up before screening finishes still has the original provider capture available for post-call checking. This protects speech spoken during the greeting and one-shot messages that do not repeat at a voicemail prompt. The TeXML operator rollback retains its prior post-prompt recording behavior; use the shared path for capture from answer.

Ingestion stores pending, encrypted audio in a `forwardingAudio` manifest and bounded `forwardingAudioChunks` documents (up to 2 MB overall, 400 KB raw bytes per chunk). All eligible messages are processed irrespective of the legacy `VOICEMAIL_SCREENING_ENABLED` switch. GPT Transcribe creates temporary text in memory, then one storage-disabled GPT-6 Luna Responses request returns the keep/discard assessment and a short summary together. The full temporary transcript and supporting evidence quote are discarded after processing and never saved or returned by the API. An automated voice, keypress or supplied callback alone does not establish fraud. Clear harmful requests and junk are discarded with their audio and readable text; ambiguous information is kept as unverified. A displayed number matching a contact does not bypass content checking. Previously removed legacy messages retain their existing restoration behavior until expiry.

Kept summaries are encrypted within the call's `voicemail` object. API responses decrypt them only for the owner or a helper with `canListen`; history-only helpers receive no summary. Messages retain their decision and policy version as metadata. The API never returns full transcripts, including any left by the earlier repository candidate. All content shares the call's 30-day expiry, and message/account deletion removes audio chunks and readable text together. Text/summary failures keep audio playable. Summaries attribute claims, omit caller-supplied contact details and are generated with OpenAI response storage disabled. The iPhone app uses a single **Messages** tab for **Voicemail** and **Saved notice**, with a summary and playback, without a transcript section. Notices direct users to contact organizations independently.

This section describes repository code, not deployment or real-call verification. Shared record-from-answer audio, stop-before-bridge behavior, provider deletion and one-shot notices still need a supervised real-call check after owner-approved deployment.

## Components

| Component | Where it runs | Code |
|---|---|---|
| Phone number and call control | Telnyx Call Control shared application, one number (+1 507 473 1802); TeXML retained for rollback | `backend/src/cloud/call-control.ts`, `shared-routing.ts` |
| HTTP API and call webhooks | Firebase Functions `shieldApi` (us-central1, scales to zero), served through Firebase Hosting at `shield-calls-isaac.web.app` | `backend/src/cloud/app.ts`, `api.ts`, `forwarding-api.ts` |
| Live screening bridge | Cloud Run service `shield-live` (WebSocket, two instances max, ten sessions per instance) in the same Google Cloud project | `backend/src/live/server.ts`, `session.ts`, `policy.ts` |
| Screening voice | OpenAI `gpt-live-1`, voice `marin`, 8 kHz μ-law (PCMU) | `backend/src/live/policy.ts` |
| Screening decisions | OpenAI `gpt-6-luna`, medium reasoning effort, called by GPT Live through delegation | `backend/src/live/policy.ts`, `research.ts` |
| Connected-call protection (opt-in) | Telnyx transcription plus Firebase Function `monitorConnectedCall` (`gpt-6-luna`, OpenAI Fast mode since October 11) | `backend/src/cloud/monitoring.ts` |
| Voicemail ingestion | Firebase Function `ingestForwardingVoicemail` | `backend/src/cloud/forwarding-recordings.ts` |
| Cleanup | Firebase Function `cleanupShield`, daily at 04:00 Central | `backend/src/cloud/store.ts` |
| Check tab (paste a text to check it) | `shieldApi` calling `gpt-6-luna`; the text isn't stored | `backend/src/cloud/message-check.ts` |
| Data and sign-in | Firestore (default database, us-central1), Firebase Authentication email links | `backend/src/cloud/store.ts`, `forwarding-store.ts` |
| iPhone app | SwiftUI, iOS 26+ | `ios/` (see [ios/README.md](../ios/README.md)) |

Everything lives in the Google Cloud project `shield-calls-isaac`. Runtime configuration is one JSON secret, `SHIELD_RUNTIME`; the OpenAI key is a separate secret, `SHIELD_OPENAI_API_KEY`. See [Operations](OPERATIONS.md).

## How a call flows

1. **Forwarding.** The person's carrier (Tello in the pilot) conditionally forwards unanswered, busy and unreachable calls to the Telnyx number. On the iPhone, *Screen Unknown Callers = Silence* sends unknown callers straight to that path while contacts ring normally.
2. **Admission.** Telnyx fetches `/forwarding/:secret/inbound`. Shield checks the webhook signature and looks the call up in Telnyx before trusting it. The call is screened only if a supervised test window is open, which allows at most 10 screenings in 30 minutes and one call at a time. Numbers in the person's synced contacts, every call outside a window, and every call while live screening is switched off go to voicemail instead. Callers with a withheld or non-US number are screened like any other; history shows "No caller ID" (deployed October 11). Above 50 forwarded calls in a day, Shield turns calls away.
   - **Blocked numbers (in code, not deployed):** a number Shield stopped a scam from, during screening or by ending a connected call, is ended at once for 180 days. There's no screening, model cost or voicemail, and the caller hears "This person cannot take this call…". These attempts don't count toward the 50 a day, and at most 20 a day are kept in history. Withheld numbers can't be blocked. The person can unblock a number in the app.
3. **Greeting and stream.** TeXML plays a prerecorded Soniox Grace greeting with `<Play>` ("I'm Shield, an AI call assistant. Who's calling, and what is the call about?") and starts a one-way `<Stream>` to the `shield-live` bridge. The stream URL carries a short-lived signed ticket for that call only. Nothing is recorded.
4. **Screening.** The bridge relays caller audio to GPT Live. GPT Live listens, asks at most two short questions, and delegates to the decision model through the `screen_call` tool. The decision model may make one bounded lookup of official scam guidance (`research_scam_pattern`). Every decision must quote the caller's own words, and the bridge checks that quote against the transcript. See [Screening](SCREENING.md).
5. **Outcome.** The bridge records the decision in Firestore and redirects the Telnyx call:
   - **Approve:** the caller hears "Please hold while Shield offers your call," and Shield dials the person.
   - **Scam, robocall, solicitation or silence:** Shield hangs up.
   - **Hold, timeout or failure:** the caller is offered voicemail.
6. **Private offer.** When the person answers, only they hear a short summary: "Shield screened a call about … This does not verify who is calling. Press 1 to connect, or 2 for voicemail." Only digit 1 on that exact call leg bridges the two people. Connected calls are limited to 5 minutes in the pilot.
7. **After the call.** The call appears in the app's history with its outcome. Voicemails are downloaded from Telnyx, encrypted, stored, and deleted from Telnyx. Call records expire after 30 days.

### Connected-call protection

This only runs when the runtime flag `CALL_MONITORING_ENABLED` is on and the person has saved current consent in the app. After email sign-in, main onboarding selects protection by default and lets the owner turn it off before tapping Continue. Continue saves the choice; existing explicit opt-outs are preserved, and Settings can change it later. Helpers do not choose consent for someone else. When a monitored call is offered, the caller is told the call will be transcribed. Telnyx `<Transcription>` uses Soniox (`soniox/stt-rt-v4`) by default and then sends both sides' final text to `/forwarding/:secret/monitor/:id`. Text is kept encrypted only while the call lasts. Each new piece of speech queues one check by `monitorConnectedCall`. In code, not deployed: up to 2 checks run at once, and an intervention records when the quoted words arrived and when the warning started (timestamps only).

If the caller clearly asks for a code, password, identity number, payment, remote access, secrecy or an investment, Shield redirects the person's leg to a short spoken warning. That ends the call. Model failures never end a call.

## Voice and speech

There are three voice paths today:

| What the caller or recipient hears | How it's produced |
|---|---|
| Greeting, hold, recipient summary and "press 1", voicemail prompt, warnings | Prerecorded Soniox Grace WAV files, played with Telnyx TeXML `<Play>` |
| Screening conversation (questions and acknowledgements) | GPT Live, voice `marin` |
| Keypad and probe tones | TeXML `<Play digits>` |

The approved recordings and exact scripts are in `backend/src/cloud/announcement-audio/`. All 25 files are generic: purpose categories and warning categories contain no caller or recipient details. These announcements use Soniox to generate assets; connected-call transcription uses Soniox through Telnyx. The call runtime needs no separate Soniox key. Originals are 24 kHz mono PCM WAV, not the 8 kHz listening previews.

Build verifies each recording's SHA-256 and copies it to versioned Firebase Hosting URLs plus the Functions package. `<Play failoverUrl>` retries a missing static asset using `/public/speech/<version>/<file>` served from that package. Playback does not continue on error: if both sources fail, the call cannot advance silently past a disclosure or acceptance instruction. The application's provider-error fallback remains ordinary Telnyx `<Say>` followed by hangup; provider fallback behavior on a playback error still needs a real-call check. Unrecognized or newly changed text uses `<Say>` until an approved recording is added. Never generate personalized audio into the public catalog.

Deploy Hosting assets and Functions together after approval, and check all primary and backup audio URLs before opening a test window. Deployed October 10 to Hosting and `shieldApi` revision `shieldapi-00012-heq`. All 25 primary and 25 backup audio URLs returned HTTP 200 with the original SHA-256 and WAV content type; public health was ready. Not yet verified on a real call. The listening-test plan is in section 5 of the [screening and voice plan](SENIOR-PILOT-SCREENING-AND-VOICE-PLAN.md#5-improve-the-entire-voice-experience).

## Data

Firestore holds the following. Clients can't read or write it directly (deny-all rules); everything goes through `shieldApi`.

- **`participants`:** the enrolled person, consent, forwarding stage, and `scamStoppedAt` (starts 24 hours of cautious screening). Subcollections:
  - `statistics/stoppedCalls` (API and cleanup deployed October 12): persistent stopped-call total, seeded once from recoverable history. Transactional per-call markers prevent duplicate counts. Cleanup and message restoration do not reduce it; account deletion removes it. Calls already deleted before tracking cannot be reconstructed. Counter hooks for repository-only blocked-number/message-removal features accompany those features when deployed.
  - `trusted-numbers`: contacts synced from the phone
  - `blocked-numbers`: one document per blocked number, keyed by its keyed hash, holding the number encrypted, the reason, the source call and a 180-day expiry
- **`callSessions`:** one record per call, with state, outcome, reason, purpose and an event timeline. The caller's number is encrypted with `DATA_ENCRYPTION_KEY`.
- **`forwarding/control`:** the test window, usage counters and the active call.
- **`forwardingRecordings`:** voicemail ingestion jobs. Audio is stored encrypted.
- **`monitoredCalls`, `monitorChecks`:** connected-call protection transcripts and check jobs, deleted when the call ends.
- **`voicemailChecks` (in code, not deployed):** one job per stored voicemail while voicemail checking is on. A removed message keeps its encrypted audio for 7 days so it can be restored.
- **`devices`, `alerts` (in code, not deployed):**
  - `devices`: push tokens, encrypted and keyed by hash, one per phone for whoever is signed in. They expire after 60 days without a refresh.
  - `alerts`: contentless alert jobs that `sendShieldAlert` sends through APNs and deletes.

## Retired

Shield retired these on October 10, 2026. They're in git history and the [archive](archive/README.md):

- **Twilio.** This covered the September direct-call trial and Twilio forwarding. TeXML is now built by Shield's own `backend/src/cloud/texml.ts`, and its output is byte-identical to what the Twilio library produced.
- **Gemini through OpenRouter.** This covered the Gather-based fallback screener and the `screenCall` function. Calls that GPT Live can't screen now go to voicemail, and the Check tab uses `gpt-6-luna`.
- **The always-on PostgreSQL server and local demo backend.** The app keeps its offline **Explore the demo** mode.
