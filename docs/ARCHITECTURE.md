# Architecture

## 25-user capacity — deployed October 16; outbound carrier ceiling remains 10

The current source uses shared limits for 25 enrolled people/active incoming calls, per-person and global daily quotas, and four maximum bridge instances with ten sessions each. Admission queues locally to reduce contention; Firestore remains authoritative across API instances. Call endings atomically remove only their own reservation. Readiness exposes the limits version. Following the approved reliability fixes, the scoped release is live on bridge `shield-live-00017-qrw` and API `shieldapi-00025-wec`, preserving screening v158 and message policy v4. Offered calls that fall back to voicemail now enqueue a durable announcement-recovery job; expiry cleanup drains multiple batches, and accepted calls retain their history status past 7½ minutes. Telnyx application channels are 30/30, but its profile/account outbound ceiling remains 10 after higher limits were rejected. Phone sign-in was activated October 17; caretaker text delivery remains unavailable (see the dated section below). [Deployment, validation and activation gates](PAID-PILOT-25.md).

## Phone audio delivery and offline history — deployed October 16

The owner selected temporary delivery followed by deletion. The app saves and verifies audio on the phone before acknowledging; the server atomically deletes its copy, with a 24-hour maximum delivery window and independent five-minute cleanup. Local files are excluded from backups and remain playable offline. Owner call history loads from a protected, account-scoped local copy before refreshing, bounded to 500 calls and 30 days. Shared helper history requires fresh access. Home can display saved owner configuration with its original confirmation time; this is not proof of current service health or carrier forwarding. Summaries retain their existing 30-day server policy. The matching app is installed; all cloud services remain on demand. See [storage contract and deployment evidence](AUDIO-DELIVERY.md) and [offline behavior](IOS-OFFLINE.md).

## On-demand startup and durable recovery — deployed October 16

New shared calls create a durable startup job at admission. The caller keeps ringing while an on-demand worker prepares the bridge/runtime database channel, then answers with recording and streaming enabled. The actual media session must process audio successfully before the existing greeting is played; successful greeting completion starts the caller’s silence/decision timers. The bridge saves outcomes atomically with durable jobs, so carrier work runs on retried workers after media closes. Scheduled phase deadlines and the minute sweep recover missing callbacks. The bridge and workers keep zero minimum instances and request-based CPU. Confirmed unconnected hangups bypass the executor lease and release only their own reservation. The startup release used bridge `shield-live-00015-qdd` and API `shieldapi-00021-zug`; the API has since received the scoped audio release above; both new job functions and the scoped recovery/cleanup functions are active. Infrastructure and synthetic checks passed; real-carrier behavior remains unverified for this release. [Incident, bounds, tests and deployment evidence](INCIDENT-2026-10-16.md#approved-deployment--october-16-evening). [Running costs](ON-DEMAND-COSTS.md).

## Phone sign-in and optional caretakers — October 17 update

The iPhone entry point now verifies a US/Canadian mobile number with a Telnyx Verify code. Shield keeps an encrypted challenge valid for five minutes, enforces per-number/IP/global limits and a resend cooldown, allows five checks, and atomically consumes a fenced verification before minting a Firebase custom-auth session. Codes are provider-generated and never stored by Shield. Repository retention follow-up (not deployed by this work): successful and exhausted completed checks erase the challenge phone/provider fields; expired or interrupted rows are removed by daily cleanup. [Full retention inventory and limits](DATA-INVENTORY.md). Firebase phone accounts are reused or created; matching a participant's phone does not transfer its ownership to a different UID. The shipped iPhone entry point is phone-only; the legacy email view remains in simulator-only regression fixtures. No iOS Firebase SDK is added.

After the owner's ring and forwarding checks pass and setup reaches `checks`, onboarding asks whether to add a caretaker or continue independently; the same optional feature lives in Settings → Caretakers. Both choices are explicit. An owner who opts in enters/selects a contact name and mobile number. A generic SMS links to `/trusted-contacts.html`; the recipient verifies that number and accepts or declines. Recipients choose texts in the browser, or texts, app notifications, or both in the iPhone app. App notification permission is requested in context. A recipient does not need a protected-phone enrollment to accept or register their device.

`alertContacts` is separate from history-sharing `grants` and `memberships`; it never authorizes call/message/audio access. No alerts are sent while pending. Either person can stop the relationship, and the owner can pause all contact alerts. Only a connected-call monitoring intervention is eligible, with no caller words/numbers. Screening blocks, voicemail/removal, setup problems and pause events do not alert caretakers or helpers. Content-free push receipts deduplicate someone who has both roles. Signed Telnyx STOP/START webhooks maintain a hashed SMS suppression record. SMS has an at-most-once submission attempt per event/contact, no automatic retry after uncertain submission, daily quotas, and content-free receipts retained for 30 days. Provider submission is not delivery confirmation. Accepted relationships persist; other requests expire in 30 days. New sign-in challenges and receipts join daily cleanup.

Phone sign-in was configured and the owner’s handset login verified on October 17 (see Status). Caretaker delivery remains unavailable and unverified: requests need an approved `SMS_ALERTS` sender; the intervention-only rules were deployed in the October 17 scoped app-release update. APNs is an independent optional channel. Live activation prerequisites are in Operations. Phone sign-in creates an account, not a provisioned Shield number or verified forwarding route; pilot enrollment remains an operator step.

## Contacts and access — repository implementation, October 17

Contacts are shared only through an explicit one-time/update action. Opening the screen does not synchronize the address book; adding one contact upserts only that number. Settings separates optional caretakers from call-history/listening sharing, and the person picker appears only with multiple people. The unfinished automatic message-filter extension and its placeholder associated domain are excluded from the app package; manual text checks remain available.

The repository's iPhone blocking handoff is account-scoped, expiring and excluded from backup, with durable reload retry and sign-out clearing. [Complete paged retrieval](IOS-BLOCKED-NUMBERS.md) now avoids the former 200-row limit and publishes no partial traversal. Its matching backend rollout must precede client distribution; actual CallKit behavior and suspended-device expiry remain physical acceptance gates.

Public billing uses a pinned RevenueCat SDK and authenticated server lookups. Public/pilot account classification is operator-assigned; clients cannot create grants. A ten-grant pilot starts its two-calendar-month clock after consent and both setup checks, never shows a paywall and never auto-converts. Existing assisted accounts are not migrated automatically. Expiry gates new activation/resume and flags assisted restoration, without changing live phone routing. Account deletion erases the RevenueCat customer before Firebase Auth, with retries. The scoped API, account-deletion and access-review workers are deployed; purchases remain disabled. Live source/settings and schedule checks are recorded in [the rollout](IOS-BACKEND-ROLLOUT.md). See [RevenueCat](REVENUECAT.md) and [release verification](IOS-RELEASE-VERIFICATION.md).

## Shared-number deployment (October 13, 2026)

At 22:04 Central, the owner-approved hybrid release was verified on `shield-live-00014-pz9`, serving 100% of screening traffic. Soniox transcribes caller audio; GPT-6 Luna medium/Fast assesses the unchanged v158 policy. GPT Live starts only for a useful clarification, carrying caller history, pending question and remaining budgets. The entire screening stays bounded to 75 seconds. Initial silence can end; unresolved speech or provider failures go to voicemail. See [hybrid design and validation](HYBRID-SCREENING.md).

API `shieldapi-00020-mox` allows recipient legs up to 60 minutes, including their brief private summary, with an hour-long durable cleanup deadline. The existing owner's always-on setting removes recurring 30-minute windows; daily admission caps, quiet-hour preferences, immutable recipient and press-1 acceptance remain. Connected-call monitoring distributes its 240-check ceiling across the hour using durable scheduled tasks. Production post-call filtering remains v4. Exact deployed revisions and the lack of new real-carrier verification are recorded in [Status](STATUS.md).

The October 13 shared Call Control release initially supported a ten-person-capacity pilot, with ongoing screening enabled for its existing owner on the existing DID. It uses strict Diversion routing, immutable per-call recipients, per-person controls, durable command receipts, a distributed ten-call cap and independent live sessions. The October 16 capacity release supersedes the ten-call application cap with 25 incoming reservations and 30/30 application channels; the profile and account outbound limit remain 10. One verified participant's route is enrolled and qualified. Capacity is configured, not yet measured with ten real audio sessions. The earlier owner-approved release `62b2ada` deployed October 13 used screening v31, Grace-default/Joanna-backup announcements and the audio/summary/decision message backend. TeXML remains available for operator rollback. See [deployment evidence](STATUS.md) and [pilot routing and tests](SHARED-NUMBER-ROLLOUT.md).

The detailed descriptions below retain the October 10 TeXML baseline where explicitly named. The shared path uses prerecorded Grace playback/audio gathering, streaming, dialing and bridging, with Joanna only as backup. Its current admission, qualification and cleanup rules are in the rollout document.

Current as of October 10, 2026. Shield answers unfamiliar calls that a person's phone forwards to it, screens them with a GPT Live voice agent, and only rings the person if the call looks ordinary. The person then decides privately whether to take it. Screening never verifies who is calling.

## Saved messages (October 13 deployment)

The shared Call Control path captures the inbound track with Telnyx `record-from-answer`, before greeting/model startup, bounded to 240 seconds. The greeting says an unconnected message may be saved. A durable recording job is created from the answer response when available and correlated recording callbacks update it. Ingestion waits for the final outcome; a callback arriving after acceptance cannot hang up the connected call or create a saved message. Recording must stop successfully before a press-1 bridge. Every provider copy is deleted, including answered, blocked, expired, deleted-account and orphaned captures; provider deletion failures retry.

Useful or uncertain automated notices use the new `message` screening decision: no live offer, no questions or replay request. Shield waits eight quiet seconds and rechecks changed speech before ending a notice; the existing overall screening deadline still applies. A caller hanging up before screening finishes still has the original provider capture available for post-call checking. This protects speech spoken during the greeting and one-shot messages that do not repeat at a voicemail prompt. The TeXML operator rollback retains its prior post-prompt recording behavior; use the shared path for capture from answer.

Ingestion stores pending, encrypted audio in a `forwardingAudio` manifest and bounded `forwardingAudioChunks` documents (up to 2 MB overall, 400 KB raw bytes per chunk). All eligible messages are processed irrespective of the legacy `VOICEMAIL_SCREENING_ENABLED` switch. GPT Transcribe creates temporary text in memory, then one storage-disabled GPT-6 Luna Responses request returns the keep/discard assessment and a short summary together. The full temporary transcript and supporting evidence quote are discarded after processing and never saved or returned by the API. An automated voice, keypress or supplied callback alone does not establish fraud. Clear harmful requests and junk are discarded with their audio and readable text; ambiguous information is kept as unverified. A displayed number matching a contact does not bypass content checking. Previously removed legacy messages retain their existing restoration behavior until expiry.

Kept summaries are encrypted within the call's `voicemail` object. API responses decrypt them only for the owner or a helper with `canListen`; history-only helpers receive no summary. Messages retain their decision and policy version as metadata. The API never returns full transcripts, including any left by the earlier repository candidate. All content shares the call's 30-day expiry, and message/account deletion removes audio chunks and readable text together. Text/summary failures keep audio playable. Summaries attribute claims, omit caller-supplied contact details and are generated with OpenAI response storage disabled. The iPhone app uses a single **Messages** tab for **Voicemail** and **Saved notice**, with a summary and playback, without a transcript section. Notices direct users to contact organizations independently.

This section describes the October 13 deployed release. Live synthetic message-worker checks verified summaries, playback, transcript absence and removal of harmful/answered/known-scam captures. Shared record-from-answer audio, stop-before-bridge behavior, provider deletion and one-shot notices still need a supervised real-call check.

## Components

| Component | Where it runs | Code |
|---|---|---|
| Phone number and call control | Telnyx Call Control shared application, one number (+1 507 473 1802); TeXML retained for rollback | `backend/src/cloud/call-control.ts`, `shared-routing.ts` |
| HTTP API and call webhooks | Firebase Functions `shieldApi` (us-central1, scales to zero), served through Firebase Hosting at `shield-calls-isaac.web.app` | `backend/src/cloud/app.ts`, `api.ts`, `forwarding-api.ts` |
| Live screening bridge | Cloud Run service `shield-live` (WebSocket, four instances max, ten sessions per instance) in the same Google Cloud project | `backend/src/live/server.ts`, `session.ts`, `policy.ts` |
| Screening voice | OpenAI `gpt-live-1`, voice `marin`, 8 kHz μ-law (PCMU) | `backend/src/live/policy.ts` |
| Screening decisions | OpenAI `gpt-6-luna`, medium reasoning effort, called by GPT Live through delegation | `backend/src/live/policy.ts`, `research.ts` |
| Connected-call protection (opt-in) | Telnyx transcription, `monitorConnectedCall` outbox dispatcher, Cloud Tasks and `monitorScheduledCall` (`gpt-6-luna`, OpenAI Fast mode) | `backend/src/cloud/monitoring.ts`, `monitor-cadence.ts`, `monitor-queue.ts` |
| Voicemail ingestion | Firebase Function `ingestForwardingVoicemail` | `backend/src/cloud/forwarding-recordings.ts` |
| Cleanup | Firebase Function `cleanupShield`, daily at 04:00 Central | `backend/src/cloud/store.ts` |
| Check tab (paste a text to check it) | `shieldApi` calling `gpt-6-luna`; the text isn't stored | `backend/src/cloud/message-check.ts` |
| Data and sign-in | Firestore (default database, us-central1), Telnyx Verify phone codes and Firebase Authentication sessions | `backend/src/cloud/store.ts`, `forwarding-store.ts` |
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

This only runs when the runtime flag `CALL_MONITORING_ENABLED` is on and the person has saved current consent in the app. After sign-in, main onboarding selects protection by default and lets the owner turn it off before tapping Continue. Continue saves the choice; existing explicit opt-outs are preserved, and Settings can change it later. Helpers do not choose consent for someone else. When a monitored call is offered, the caller is told the call will be transcribed. Telnyx transcription uses Soniox (`soniox/stt-rt-v4`) by default, with final speech from both sides delivered through signed Call Control events or the dedicated TeXML monitoring callback. Text is kept encrypted only while the call lasts.

The October 13 deployed [cadence](MONITORING-CADENCE.md) coalesces that speech into 5/15/20-second windows across a connected hour (60/60/120 possible assessments). `monitorConnectedCall` dispatches contentless delayed Cloud Tasks; `monitorScheduledCall` atomically claims a window before invoking Luna. Quiet periods consume no successful repeated assessments, at most two checks run at once, and duplicate deliveries do not spend an extra attempt. Provider failures are retried in another reserved window. Model, ASR and infrastructure latency add to the scheduled wait; monitoring cannot guarantee a warning before someone acts. Interventions record the arrival and warning timestamps without storing quoted words on the call record.

If the caller clearly asks for a code, password, identity number, payment, remote access, secrecy or an investment, Shield redirects the person's leg to a short spoken warning. That ends the call. Model failures never end a call.

## Voice and speech

The October 13 deployed release uses these voice paths:

| What the caller or recipient hears | How it's produced |
|---|---|
| Greeting, hold, recipient summary and "press 1", voicemail prompt, warnings | Prerecorded Soniox Grace WAV files: Call Control `playback_start` / `gather_using_audio`, or TeXML `<Play>` |
| Confirmed announcement playback failure | Amazon Polly Joanna, with the same generic script and a bounded, signed fallback phase |
| Screening conversation (questions and acknowledgements) | GPT Live, voice `marin` |
| Keypad and probe tones | Call Control DTMF or TeXML `<Play digits>` |

The approved recordings and exact scripts are in `backend/src/cloud/announcement-audio/`. All 30 files are generic: purpose categories and warning categories contain no caller or recipient details. Five October 12 additions cover capture disclosure, voicemail without a tone, the daily setup check, and routing diagnostics. These announcements use Soniox Grace (`tts-rt-v2`) once to generate reusable assets; connected-call transcription uses Soniox through Telnyx. The call runtime needs no separate Soniox key or per-call Soniox generation request. Originals are 24 kHz mono PCM WAV, not the 8 kHz listening previews. The local "One moment, please" acknowledgement is also prerecorded Grace.

Build verifies each recording's SHA-256 and copies it to versioned Firebase Hosting URLs plus the Functions package. TeXML `<Play failoverUrl>` retries a missing static asset using `/public/speech/<version>/<file>` served from that package; its provider-error route explicitly uses Joanna for the unavailable message, followed by hangup. Provider fallback behavior on a playback error still needs a real-call check. Unrecognized or changed text fails catalog lookup until an approved recording is added. Never generate personalized audio into the public catalog.

Shared calls default to Grace. An explicit media failure (`failed`, `file_not_found`, `unknown`) or a definite HTTP 400/422 rejection of an audio command selects Joanna once, with durable receipts and a signed `-backup` phase. Network timeouts retry the original command rather than start a possibly overlapping voice. A completed primary or fallback greeting gates streaming; a completed hold disclosure gates dialing. Late primary callbacks after fallback cannot advance the call or accept a recipient. Gather cancellation for a keypad press stays valid; only the fixed recipient's press 1 on the active gather can bridge, after capture stops. Canceled/unsuccessful prompts and expired deadlines fail closed. Sound checks use the same Grace-default/Joanna-backup rule. Routing diagnostics play Grace with a recorded pause and retain their bounded lifetime.

Deploy the versioned Hosting assets and Functions together, plus the bridge's call outcome/monitoring code, after owner approval. Check every primary and backup audio URL before opening a test window. On October 13, all 30 primary and 30 backup URLs matched their approved hashes after deployment to Hosting and `shieldapi-00018-god`; bridge `shield-live-00012-vrw` serves the Grace integration. Carrier playback remains unverified on real calls. The listening-test plan is in section 5 of the [screening and voice plan](SENIOR-PILOT-SCREENING-AND-VOICE-PLAN.md#5-improve-the-entire-voice-experience).

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
