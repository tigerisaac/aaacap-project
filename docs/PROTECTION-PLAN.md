# Protection plan

Agreed with the owner on October 10, 2026. **None of this is built yet.** It comes from a critique of Shield after two real monitored calls were ended by an intervention that day (see [Status](STATUS.md)). Each section says what to build, where in the code, and how to check it.

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
- **Fast mode.** Use Fast mode in `monitorRequest()` (`backend/src/cloud/monitoring.ts`):
  - **Request:** keep `gpt-6-luna` with `reasoning: { effort: 'medium' }`, and add `service_tier: 'priority'`.
  - **Name:** `'fast'` has been an alias since July 30, 2026, but some routes reject it.
  - **Price:** Fast costs twice the standard rate ($0.20 in and $1.00 out per 1M tokens), about $0.002 per check.
  - **Logging:** log when a response comes back with `service_tier: 'default'`, which means it was downgraded.
- **Measure first.**
  - Keep each transcript segment's arrival time, but not its text, next to the encrypted transcript.
  - On intervention, find the segment that holds the evidence quote, and record the milliseconds from its arrival to the redirect as an event, with no content.
  - Also log each model call's latency.
  - **Target:** the warning starts under 3 s after the request is spoken.
- **No head-of-line blocking.** Start a check for each new segment even while one is running, with at most 2 at once. `intervene()` is already idempotent through `monitorIntervenedAt`.
- **Cold starts.** If measurements show cold starts matter, keep one `monitorConnectedCall` instance warm, or run the check in `shieldApi`, which stays warm during a call.
- **Interim transcripts.** Find out whether Telnyx and Soniox send them. If they do, check before the final segment.

**Check:**
- `node scripts/check-monitor-policy.mjs --provider go --repeat 3` still keeps real conversations and stops scams.
- One supervised real call records the new delay.

## 2. Watch for more kinds of requests

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
- Add a `MONITOR_POLICY_VERSION` constant so monitoring results can be traced to a prompt version, as screening already is.

## 3. Make sure scammers can't call back

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

**Problem.** There are no push notifications (`notificationsAvailable: false`). Scammers often call back within minutes, and victims often hide it. A caregiver who isn't told can't help.

**Build:**
- **Push setup.** Add APNs (an auth key from the Apple Developer account), an endpoint that registers device tokens for each signed-in user (removed on sign-out), and sending from the backend. The iOS app already has the permission prompt and registration code.
- **Lock-screen content.** Alerts never include caller words or numbers.

| Event | Person | Caregivers with access |
|---|---|---|
| Shield ended a connected call | | Immediately |
| A blocked caller tried again | | Immediately |
| Suspected-scam voicemail (section 7) | | Immediately |
| New voicemail | Yes | If they have listening access |
| Protection paused, restoration started, or the daily check failed (section 5) | Yes | Immediately |

The person controls sharing. Offer "Alert my helpers" during onboarding, selected by default like connected-call protection. The person, not a helper, saves the choice.

## 5. Check the setup on every launch

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

## 7. Process and organize voicemails

**Problem.** A held "sheriff" or "bank security" caller goes to voicemail, and the message ("call me back at…") plays inside Shield's own app, labeled "Not enough information".

**Build:** after `ingestForwardingVoicemail` stores the encrypted audio, queue a processing job.
1. **Transcribe** with `gpt-transcribe` ($0.0045 a minute; messages are at most 60 s).
2. **Classify** with `gpt-6-luna`, `reasoning: { effort: 'medium' }`, `service_tier: 'flex'` ($0.05 in and $0.25 out per 1M tokens, half the standard rate).
   - **Unavailable:** Flex can return 429 Resource Unavailable, which isn't charged. Retry with backoff for up to about 10 minutes, then retry once without `service_tier` so no message waits long.
   - **Timeout:** use a long timeout, since Flex is slower.

   The result uses a strict schema:
   - **Category:** personal, health or appointment, delivery, a business she uses, suspected scam, robocall or sales, or empty.
   - **Summary:** one neutral line.
   - **Flags:** asks her to call a number; claims to be a bank, government, police or a relative in trouble; urgency or pressure.
3. **Organize in the app:**
   - **Sections:** sort into "Messages" and "Probably scams", which starts collapsed. Hide empty recordings and hang-ups.
   - **Warning before playing:** a suspected scam shows a warning first, such as "This message asks you to call a number. Use the number on your card or statement instead."
   - **Numbers:** mask phone numbers in suspected-scam transcripts.
   - **While processing:** show "Checking this message…".
4. **Caregivers:** a suspected-scam voicemail sends a caregiver alert (section 4).
5. **Privacy:** seal transcripts like the audio, delete them with the voicemail (30 days), and send with `store: false`. Make sure `/privacy` mentions voicemail transcription.

**Cost:** under half a cent per voicemail.

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
2. **Section 1:** Fast mode and the delay measurement. It's a small change.
3. **Section 4:** push alerts. Sections 3, 5 and 7 send through it.
4. **Section 7:** voicemail processing.
5. **Section 5 and the Call Directory extension:** the extension also serves section 3.
6. **Section 2's new warnings and the shorter disclosures:** one recording session.

Deploys, real test calls and any change to the owner's phone need the owner's approval.
