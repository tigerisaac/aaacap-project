# Protection plan

Agreed with the owner on October 10, 2026. **Mostly not deployed.** Monitoring Fast mode and the bridge wake-up were deployed October 11. Since then, more has been built in code but not deployed; each section says which. It comes from a critique of Shield after two real monitored calls were ended by an intervention that day (see [Status](STATUS.md)). Each section says what to build, where in the code, and how to check it.

The target user is an older adult, often with cognitive impairment, who is likely to press 1 on any offered call and answer a caller's questions at once. That's why speed, memory and caregiver alerts matter more here than the private summary.

## 1. Make in-call monitoring faster

**Problem.** An intervention has to land before she answers. Someone asked for "the code we just texted" can read it back in 2–3 seconds. On October 10, interventions came 22–24 s after she accepted, but nobody recorded when the request was spoken. Today each check goes through these steps:
1. a final transcript segment arrives after a pause in speech
2. a webhook and a Firestore transaction
3. a queued Cloud Function that scales to zero
4. `gpt-6-luna` at medium reasoning, with a 25 s timeout
5. a Telnyx redirect

Only one check runs at a time, so a check still working on earlier small talk delays the one that contains the request.

**Build:**
- **Fast mode: deployed October 11.** `monitorRequest()` (`backend/src/cloud/monitoring.ts`) now sends:
  - **Request:** `gpt-6-luna`, `reasoning: { effort: 'medium' }` and `service_tier: 'priority'`. `'fast'` has been an alias since July 30, 2026, but some routes reject it.
  - **Scope:** this applies only to in-call monitoring. GPT Live screening stays on the standard tier, by owner decision.
  - **Price:** Fast costs twice the standard rate ($0.20 in and $1.00 out per 1M tokens), about $0.002 per check.
  - **Measured:** in a 12-request comparison on two monitor cases, the median model time was 1.1 s with Fast against 2.3 s without. All 12 decisions were correct, and OpenAI reported the `fast` tier.
  - **Logging:** each check logs its time and the tier OpenAI used. `default` means Fast mode was downgraded.
  - **Free checks:** `check-monitor-policy.mjs --provider go` leaves out the tier.
- **Measure first. Built October 11, not deployed.**
  - **Arrival times:** each transcript line's arrival time is kept next to the encrypted transcript (`heardAt`), without its text.
  - **On intervention:** `evidenceHeardAt()` finds the earliest line, or pair of adjacent lines, that holds the evidence quote. The call stores:
    - `monitorEvidenceAt`: when that line arrived. It's left out when the quote can't be placed.
    - `monitorIntervenedAt`: when the check decided.
    - `monitorRedirectedAt`: when Telnyx accepted the redirect.
  - **Logs, all without content:**
    - `monitor_intervention`: the three gaps between those times
    - `monitor_check`: queue delay, which includes cold starts, and check time
    - `monitor_assessment`: model time and tier
  - **Reading it:** `check-live-calls.mjs` shows the times and these logs.
  - **Limit:** arrival is when the final transcript reached Shield. The time Telnyx and Soniox take to transcribe speech isn't included.
  - **Target:** the warning starts under 3 s after the request is spoken.
- **No head-of-line blocking. Built October 11, not deployed.** New speech that no queued check covers starts a check at once, with at most 2 at a time. A check whose 45 s lease lapses stops counting. `intervene()` is still idempotent through `monitorIntervenedAt`.
- **Cold starts.** If `monitor_check` queue delays show cold starts matter, keep one `monitorConnectedCall` instance warm, or run the check in `shieldApi`, which stays warm during a call.
- **Interim transcripts.** Telnyx's `<Transcription>` docs say `interimResults` applies only to the Google engine (engine A). With Soniox, Shield gets final segments only. A no-content `monitor_interim_transcript` log records the first non-final callback per call, to confirm this on a real call.
- **Version:** `MONITOR_POLICY_VERSION` (`2026-10-11-monitor-v1`, the current prompt) is stored on each monitored call and printed by `check-monitor-policy.mjs`.

**Check:**
- `node scripts/check-monitor-policy.mjs --provider go --repeat 3` still keeps real conversations and stops scams.
- One supervised real call records the new delay.

## 2. Watch for more kinds of requests

**Status (October 11):** monitor-v2 is built and text-checked, not deployed.
- **New concerns:** `call_another_number`, `save_number` and `open_link`. `identity_numbers` now covers security answers, and date of birth or address requested by a claimed bank, card company or government office. Requests aimed at later count.
- **Main set:** 24 cases. Retired cases are in `scripts/fixtures/monitor-extra.mjs`, a development set.
- **Held-out set:** `scripts/fixtures/holdout/monitor.mjs`, 12 cases, written before the v2 wording.

Results with `--provider go`, 3 runs each:

| Set | Policy | Real conversations kept | Scams stopped |
|---|---|---|---|
| Main | v1 | 36/36 | 36/36 |
| Main | v2 | 36/36 | 36/36 |
| Development (`monitor-extra.mjs`) | v2 | 9/9 | 9/9 |
| Held-out | v1 | 12/12 | 5/24 |
| Held-out | v2 | 12/12 | 21/24 |

- **Held-out miss:** v2 kept talking when a "refund" caller asked her to email her details to an address. The wording wasn't changed for it, since it's held out.
- **Warnings:** the three new warnings have no prerecorded audio yet, so they fall back to Telnyx `<Say>`. Record them in the same session as the shorter disclosures.

**Problem.** Monitoring intervenes on codes, payments, remote access, ID numbers, secrecy and investments. A scammer who hears the transcription notice can move the request somewhere it doesn't look.

**Build:** add these concerns to `assessmentSchema`, `MONITOR_INSTRUCTIONS` and `WARNINGS`. Each new warning needs a prerecorded generic WAV and a manifest entry.

| Concern | Intervene when | Keep talking when |
|---|---|---|
| `call_another_number` | The caller tells her to hang up and call, text or email a number or address they give | They point to a number she already has, like the one on her card or statement |
| `save_number` | A caller claiming to be a bank, agency, company or relative in trouble asks her to save their number or add them to contacts. Once saved, their next call rings her directly and is never screened. | A neighbor, friend or clinic says "save my number" |
| `open_link` | They ask her to open a link they sent, visit a website they name, or scan a code | They mention a website without asking her to open it now |
| `identity_numbers` (extended) | They ask for security answers such as her mother's maiden name, or, from a claimed bank, card company or government office, her date of birth or address | A pharmacy or clinic confirms her date of birth. They do this routinely, so date of birth alone must not end a call. |

Also add test cases for requests aimed at later ("go to the bank tomorrow and take out cash, I'll call you back").

**Check:**
- Keep `scripts/fixtures/monitor-cases.mjs` under 25 cases by swapping cases in.
- Write a fresh held-out set for the new concerns.
- Report real conversations kept and scams stopped separately.
- Bump `MONITOR_POLICY_VERSION` (added October 11) for the new prompt.

## 3. Make sure scammers can't call back

**Status (October 11):** built and tested, not deployed or installed.
- **Server:** the blocklist, admission, the 24-hour flag (policy v15), and a list and unblock API. Results are in [Screening](SCREENING.md#recent-scam-caution-results-v15-text-only).
- **App:** Settings → Blocked numbers. The person sees an Unblock button with a confirmation; helpers see the list only.
- **Call Directory extension:** built, and it builds and embeds in the simulator app. Signing and the device checks below are in the [iOS README](../ios/README.md#call-directory-extension).

**Problem.**
- **Shield has no memory.** After a scam block or an intervention, the same number can call again and is screened from scratch.
- **Calling back makes it known.** The number sits in her Recents. If she calls it back, iOS treats it as known, so its next call rings her directly.

**Build:**
- **Blocklist.** Keep a blocklist for each person in `participants/{id}/blocked-numbers/{phoneHash}`. Each entry holds:
  - the number, sealed
  - the reason (`scam` or `monitor_intervened`)
  - the source call ID
  - `createdAt`, and `expiresAt` 180 days later
- **Adding entries.** Add a number in the same transaction that records a screening block with reason `scam` (`forwarding-live.ts`) or an intervention (`CallMonitor.intervene`). Robocall and solicitation numbers are usually spoofed and change constantly, so leave them off.
- **Admission.** In `ForwardingStore.begin`, a blocked number ends at once, with no screening, model cost or voicemail. History records it as a blocked caller trying again.
- **Withheld numbers.** A withheld caller can't be blocked by number, so it's always screened.
- **Spoofing.** Scammers often borrow real people's numbers, so a blocked number may later belong to someone innocent. Entries expire, and the app lists blocked numbers with an Unblock action for the person, or a caregiver with permission.
- **24 hours of extra caution.** For 24 hours after a scam block or an intervention, tell the screener a scam attempt was stopped for this person today. A caller who mentions a dropped call, an earlier call or the same organization is held, not approved. This is a generic flag, not wording aimed at test cases. Bump `SCREENING_POLICY_VERSION` and run the text and voice checks.
- **Blocking on the phone.** Add a CallKit Call Directory extension that blocks every number on the list. That covers numbers that would otherwise ring her directly because she called them back or saved them. The app gets the numbers from the owner-only API. The extension can also label numbers, for example "Shield: stopped scam".
- **Calls she makes.** iOS doesn't let an app stop an outgoing call. Caregiver alerts (section 4) are the backstop.

**Check on a device:**
- Does a Call Directory block still apply to a number that's in Contacts or recently called?
- Is a blocked call rejected so the carrier forwards it to Shield, where it's ended?
- Where does iOS show the label?

## 4. Alert the person and caregivers

**Status (October 11):** the backend is built and tested, not deployed. It needs an APNs auth key before anything is sent.
- **Device registration:** `POST /api/devices` stores the token encrypted, keyed by its hash, for the signed-in account. Sign-out and account deletion remove it, and a registration lapses after 60 days without a refresh.
- **Sending:** each event queues a contentless `alerts` job in the same write. The new `sendShieldAlert` function sends fixed wording through APNs over HTTP/2 with a provider token, then deletes the job. Apple's "unregistered" answers delete the registration.
- **Helper alerts:** off until the person turns them on (`/api/helper-alerts`, the person only). Once push is available, onboarding asks on its own screen, after the connected-call protection question, with "Alert my helpers" selected by default. Settings has the same switch.
- **Triggers built:** ended connected call, blocked caller trying again (at most once an hour per number), new voicemail, protection paused, and restoration started. Destroyed voicemail and a failed daily check have wording ready for sections 7 and 5.
- **To turn on:** create an APNs auth key (.p8) in the Apple Developer account and add it to `SHIELD_RUNTIME` as `APNS` (`keyId`, `teamId`, `privateKey`). Then deploy Functions, including the new `sendShieldAlert`. Until then `/public/config` reports `notificationsAvailable: false` and nothing is queued.

**Problem.** There are no push notifications (`notificationsAvailable: false`). Scammers often call back within minutes, and victims often hide it. A caregiver who isn't told can't help.

**Build:**
- **Push setup.** Add APNs (an auth key from the Apple Developer account), an endpoint that registers device tokens for each signed-in user (removed on sign-out), and sending from the backend. The iOS app already has the permission prompt and registration code.
- **Lock-screen content.** Alerts never include caller words or numbers.

| Event | Person | Caregivers with access |
|---|---|---|
| Shield ended a connected call | | Immediately |
| A blocked caller tried again | | Immediately |
| A scam voicemail was destroyed (section 7) | | Immediately |
| New voicemail | Yes | If they have listening access |
| Protection paused, restoration started, or the daily check failed (section 5) | Yes | Immediately |

The person controls sharing. Offer "Alert my helpers" during onboarding, selected by default like connected-call protection. The person, not a helper, saves the choice.

## 5. Check the setup on every launch

**Status (October 11):** the app-side check is built and tested, not installed on the phone.
- **The card:** a Today card for the person shows "Protection is on" or "Protection needs attention". It checks:
  - protection isn't paused or being turned off
  - Shield's number is in Contacts (asks for Contacts access if needed)
  - notifications are allowed, when push is available
  - shared contacts were refreshed in the last 30 days (the server now records `contactsSyncedAt`)
- **Fix buttons:** each problem has one.
- **When it runs:** on every launch and return to the app.
- **Daily check call:** built on branch `pilot-multi-person`, since it only matters with always-on screening. It's off until `SETUP_CHECK_NUMBER` (a second Telnyx number) is set.
  - **When it runs:** `dailySetupChecks` calls each always-on person at 10:30 a.m. Central, and the app asks for one on launch when the last is over 24 hours old.
  - **Results:**
    - back within 15 s: passed
    - back later: `rang_first`
    - answered: she hears the fixed message
    - never back: `not_forwarded`
  - **On failure:** the person and her helpers get an alert, and the Today card names the problem.
  - **Recents:** the Call Directory extension labels the number "Shield check".
  - **Tests:** 9 emulator tests.
  - **Needs real calls:** the 15 s threshold and the call flow.

**Problem.** Shield depends on settings it can't read. A change makes protection fail with no error:
- Screen Unknown Callers set to anything but Silence
- Live Voicemail turned back on
- carrier forwarding removed
- a new phone, an iOS change, or a scammer coaching her to "turn that off"

**Build:**
- **What the app can check itself on launch:**
  - Shield's number is saved in Contacts
  - notifications are allowed
  - contacts have synced recently
  - protection isn't paused

  Show "Protection: all good" or "Needs attention" on Today.
- **What only a real call can prove.** A daily silent check call comes from a second Telnyx number that isn't in her contacts. One number serves everyone, for about $1 a month. Shield reads the result from what happens:

| What Shield sees | Meaning |
|---|---|
| The call arrives back within a few seconds | Silenced and forwarded: all good |
| It arrives after 20 s or more | It rang her phone first, so Silence is off |
| It's answered | Silence is off, or Apple's screening answered. Shield plays "This is a Shield check. Unknown callers are ringing your phone. Open Shield to fix it." |
| It never arrives | Forwarding or Live Voicemail is broken |

- **Timing.** Run the check once a day outside quiet hours. Also run it on app launch when the last result is over 24 hours old, so opening the app often doesn't place more calls.
- **Recents.** Each check leaves a missed call in Recents. The Call Directory extension (section 3) labels it "Shield check".
- **Alerts.** A failed check alerts the person and caregivers (section 4).
- **Overlap.** This is the same check as [Carriers](CARRIERS.md) recommendation 4. Build it once.

## 6. Accepted limitation: calls that never reach Shield

Calls from numbers she has saved and calls she places never pass through Shield. Conditional forwarding gives no control over them, so a spoofed bank or relative with a cloned voice rings her directly, without monitoring.

Partial help:
- **Contacts during setup:** staff remove bank and agency numbers from Contacts, so calls claiming to be them get screened.
- **Phone-level blocking:** the Call Directory extension (section 3).
- **Caregiver alerts:** section 4.

Revisit only if Shield gains more control of the line.

## 7. Keep or destroy voicemails

**Status (October 11):** built and tested, not deployed, and off behind `VOICEMAIL_SCREENING_ENABLED`.
- **Flow:** with the flag on, ingestion leaves a stored message `pending` and queues `voicemailChecks/{callId}`. The new `checkForwardingVoicemail` function does the rest:
  - **Transcribes** the message with `gpt-transcribe`.
  - **Asks** the Decisions API one choice: `keep`, `scam` or `junk`.
  - **Removes** the message only when scam plus junk is at least 0.9.
- **Safeguards:**
  - Saved contacts are always kept, and any failure keeps.
  - An empty transcript counts as junk only for recordings of 15 s or less.
  - A message still pending an hour after it was stored is kept by the daily cleanup.
- **Removal:** the call moves to Held as "Scam/Junk voicemail removed" and can't be played. The audio expires in 7 days. Anyone who can listen can restore it until then (`POST /api/voicemails/:id/restore`, and a Restore button in the app).
- **Alerts:** a removed scam alerts helpers. A kept message sends the usual new-voicemail alert.
- **Transcript:** used only for the decision. It's not stored or logged, which is stricter than "seal it" below.
- **Blocker:** the production OpenAI key is restricted and lacks the `api.decisions.write` permission (403 on October 11). Transcription is permitted. Until the owner adds that permission, every message would be kept.
- **Not run yet:** `scripts/check-voicemail-policy.mjs` (22 cases) and `scripts/fixtures/holdout/voicemail.mjs` (10 cases) are written, but haven't run because of the same permission.

**Problem.** A held "sheriff" or "bank security" caller goes to voicemail, and the message ("call me back at…") plays inside Shield's own app, labeled "Not enough information".

**Decision (owner, October 10).** Use OpenAI's Decisions API to decide whether to keep or destroy each voicemail. Organizing kept messages into folders can come later; start with keep or destroy.

**Build:** after `ingestForwardingVoicemail` stores the encrypted audio, queue a processing job.
1. **Transcribe** with `gpt-transcribe` ($0.0045 a minute; messages are at most 60 s). The Decisions API takes text or images, not audio.
2. **Decide** with `POST /v1/decisions`, model `gpt-6-luna` (the only supported model). Send the transcript as untrusted text, stripped with `callerText()`, and one `choice` question:
   - **keep:** a message from a real person or an organization she deals with, or anything uncertain.
   - **destroy:** a scam, an automated sales or robocall message, or a recording with no message (silence, noise, a hang-up).

   The answer includes a probability for each option.
   - **Price:** Decisions bills only input tokens ($0.10 per 1M), so a decision costs a tiny fraction of a cent.
   - **Speed and settings:** it's about 10× faster than the Responses API. There's no reasoning-effort or Flex setting.
3. **Safeguards.** Destroying a real message can't be undone, and losing a real caller counts as much as stopping a scam.
   - **Threshold:** destroy only when the probability of `destroy` is at least 0.9; otherwise keep. Tune that number on synthetic voicemails only.
   - **Contacts:** never destroy a voicemail from a saved contact.
   - **Failures keep:** any failure, refusal or timeout keeps the message. The API is in public beta.
   - **Hide, then purge (owner decision, October 10):** "destroy" removes the message from her inbox at once and purges the audio and transcript after 7 days. Until then the person or a caregiver can restore it from "Removed by Shield".
4. **Caregivers:** a destroyed scam voicemail sends a caregiver alert (section 4), because the scammer may try again.
5. **Privacy:** seal the transcript like the audio, and delete both with the voicemail. Decisions supports Zero Data Retention for eligible customers; confirm the account's retention before launch. Make sure `/privacy` mentions voicemail transcription.
6. **Optional phone alert (nice to have, low priority).** Someone the person chooses gets an alert at a phone number of their own when a voicemail is destroyed. Notes for building it:
   - **Texts need registration:** US texting from a Telnyx number requires A2P 10DLC brand and campaign registration, which has fees and vetting.
   - **A call is simpler:** an automated call with a prerecorded generic message needs no registration.
   - **Content:** the alert never includes the caller's words or number.

**Check:**
- Write about 20 synthetic voicemail transcripts, real messages and junk, never real voicemails.
- Report real messages kept and junk destroyed separately.
- Keep a held-out set.

**Later:** organize kept messages into sections. Possible sections are "Messages", "Appointments and health" and "Businesses". The same `choice` question would do this, with more choices.

## 8. Cut the caller's wait

**Problem.** On October 10's real calls, callers waited 40–43 s before talking to the person, and the owner found it long in testing. A busy clinic scheduler may hang up, while a paid scammer will wait.

| Seconds | What the caller hears | Why |
|---|---|---|
| 0–5 | Greeting (4.6 s) | Prerecorded `<Play>` |
| 5–15 | They answer; Shield decides | Bridge connects only after the greeting; then caller speech, an 800 ms pause and the decision |
| 15–22 | Hold message (7.3 s with the transcription notice, 2.3 s without) | `<Dial>` to her phone starts only after the message ends |
| 22–30 | Ringing | Her phone rings until she answers |
| 30–42 | Ringing | She hears the 8–9 s private summary; "Press 1" comes last |

**Deployed October 11: wake the bridge on arrival.**
- **When:** as soon as a signed forwarded call arrives with live screening on, `shieldApi` sends `/ready` to the bridge without waiting for an answer.
- **Why:** the bridge scales to zero and connects only after the greeting. On a cold start, that startup used to land after the greeting, while the caller was already talking. Now it overlaps the greeting.
- **Effect on tests:** none. Today's tests used a warm bridge.
- **Expected effect:** on real always-on calls, which mostly arrive cold, it should save a cold start of roughly 1–4 s. That hasn't been measured.

**With the owner's TTS rework (wording is the owner's):**
- **Shorter hold message.** Or move the transcription notice into the greeting. Saves up to 5 s ("Shorter disclosures" below).
- **"Press 1" earlier in the private summary.** Saves up to about 5 s, but only if Telnyx lets a key press cut playback short. Test this on the next real call by pressing 1 during the summary.
- **Split the greeting into two recordings:** the AI sentence, then the question. The stream can then start between them, so the bridge and OpenAI connect while the question plays, and the disclosure is still heard before any speech is processed. Saves about 1–2 s.

**Only if the wait is still too long after that: ring her during the hold message.**
- **Today:** `<Dial>` waits for the hold message to finish.
- **Change:** start the call to her by REST at the decision, while the caller waits in a per-call `<Enqueue>` or conference. Her leg joins only after she presses 1.
- **Cost:** this rewrites the offer, accept and intervention paths. It must keep these rules:
  - only digit 1 on her exact leg connects
  - the recipient's number is fixed
  - timers stay bounded
  - a failure never connects
- **Saving:** only the remaining hold-message length.

**Measure:** report how often callers hang up before connecting (`abandoned`), along with the wait timings `check-live-calls.mjs` already shows.

## Shorter disclosures

Both disclosures stay:
- **"AI":** OpenAI's terms require a clear disclosure that the voice is AI-generated.
- **Transcription notice:** callers in all-party-consent states, such as California, need to be told.

They can be shorter, though. Today the greeting is 4.6 s, and the transcription notice adds 5.0 s to the hold message (7.3 s instead of 2.3 s). Pick one:
- **Shorter hold:** "Please hold. This call may be transcribed for fraud protection." That saves about 2 s.
- **One disclosure in the greeting:** "I'm Shield, an AI assistant. Calls may be transcribed. Who's calling, and what's it about?" The hold message goes back to 2.3 s. That saves about 3 s overall, and it also covers the screening phase.

This needs new Soniox Grace recordings, manifest hashes, a Hosting and `shieldApi` deploy, and a real-call listening check. Record them together with section 2's new warnings.

## Suggested build order

1. **Section 3, server side:** the blocklist and the 24-hour flag.
2. **Section 1:** the delay measurement. Fast mode is already in code.
3. **Section 4:** push alerts. Sections 3, 5 and 7 send through it.
4. **Section 7:** voicemail keep-or-destroy with the Decisions API.
5. **Section 5 and the Call Directory extension:** the extension also serves section 3.
6. **Section 2's new warnings and the shorter disclosures:** one recording session.

Deploys, real test calls and any change to the owner's phone need the owner's approval.
