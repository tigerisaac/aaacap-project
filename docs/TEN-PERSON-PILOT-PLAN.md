# Ten-person pilot plan

Drafted October 10, 2026. Today Shield serves exactly one person, the owner. This plan covers what has to change so 10 seniors can use it at the same time, each with their own Shield number, without weakening the call-control invariants.

**Status (October 11):** phase 1 and most of phase 2 are built on the branch `pilot-multi-person`. They are not merged into `main` and not deployed. They live on a branch because deploying them requires a data migration first, and `main` should stay deployable for the single-person protection work. See [Built on the branch](#built-on-the-branch-october-11).

**Owner decisions (October 10):**
- **Screening:** around the clock.
- **Where participants live:** the Texas area AAACAP serves.
- **Setup:** guided by phone.
- **Carriers:** decided once real participants are known.

PRODUCT.md says AAACAP sponsorship and branding aren't authorized, so keep the name out of anything a participant sees.

## One number per person

- **The number is how Shield knows whose call it is.** A forwarded call arrives on a Shield number. Each person's carrier forwarding codes point at their number, so it stays theirs for as long as they're enrolled. A rotating pool would send one person's calls to someone else's screening.
- **Numbers aren't scarce.** Telnyx sells local numbers on demand through its API, about $1/month each. Keep two spare so enrolling never waits on an order.
- **Use one area code for everyone.** Buy 512 numbers, Austin's area code; 737 is its overlay if 512 runs short. That assumes the area AAACAP serves is the region around Austin. Each person saves their number as a contact, so a shared area code doesn't affect how Shield works.
- **One number isn't one line.** A number can carry several calls at once. Capacity is set on the Telnyx account, not per number.
- **It's also the person's "Shield" contact.** Shield rings the person from their own Shield number when it offers a call. They save it in Contacts, so *Silence Unknown Callers* lets the offer ring instead of forwarding it straight back into Shield. Each person has one number to save, and it never changes.

## What assumes one person today

| Where | Today | Change |
|---|---|---|
| `backend/src/cloud/config.ts` | `TELNYX_NUMBER`, `TRIAL_VERIFIED_CALLER` (the person's phone) and `TRIAL_PARTICIPANT_ID` are single values in `SHIELD_RUNTIME` | Move each person's number and phone into Firestore. Keep only account-level Telnyx settings in the secret. |
| `forwarding-store.ts` | `forwarding/control` is one shared document. It holds setup readiness, the restoration guide, the test window, the 10-call count, `activeCallId` and the probe. The 50-a-day cap is shared too. | One control document per person, and per-person plus Shield-wide daily caps. |
| `forwarding-voice.ts` | Accepts a call only if `To` is the one number. Dials `TRIAL_VERIFIED_CALLER` with that number as caller ID. The loop guard compares `From` with the one number. | Route by `To` through a number registry. Dial the person's verified phone from their own Shield number. The loop guard rejects calls from any Shield number. |
| `forwarding-live.ts` | Offering a call requires the shared `activeCallId` and the shared test window. | Check the person's own state. |
| `forwarding-probes.ts` | Ring and forwarding tests use the shared control document and the one recipient. | Per person. |
| `forwarding-api.ts` | `requireOwner` admits only `TRIAL_PARTICIPANT_ID`. The carrier is fixed to Tello. Codes are built from the one number. | Any enrolled participant. Carrier and codes per person. |
| `backend/src/live/server.ts`, `scripts/deploy-live-bridge.mjs` | An `active` flag allows one screening at a time, and Cloud Run allows one instance. | A session counter (4 per instance) and up to 3 instances. |
| `scripts/manage-forwarding-test.mjs` | Works on `TRIAL_PARTICIPANT_ID` only. | Takes `--participant`. |
| iOS forwarding setup | Already reads the Shield number and the codes from the API. "Tello" is written into the step titles and copy. | Show the carrier the API returns. |

## Design

### Number registry

A new Firestore collection, `shieldNumbers/{e164}`. Each document holds:
- `participantId` (or none)
- `state`: `available`, `assigned` or `quarantine`
- `assignedAt` and `releasedAt`
- the Telnyx number ID

The rules:
- **Incoming calls:** the inbound webhook looks up `To` inside the admission transaction. An unknown or `available` number hangs up without screening, voicemail or dialing anyone.
- **Assignment:** a number is assigned once, at enrollment, in a transaction. It's never reassigned while it's `assigned` or in `quarantine`.
- **Loop guard:** a call whose `From` is any Shield number is never screened. This generalizes today's single-number check.

### Per-person state

- **Moved fields:** the readiness flags, restoration guide, window or schedule, counters, `activeCallId` and probe move from `forwarding/control` to `participants/{id}/forwarding/control`.
- **On the participant:** `shieldNumber` and `carrier` are stored on the participant document.
- **Who gets dialed:** always the participant's verified phone (`phoneVerifiedAt`), never anything from a request or a webhook.
- **Daily caps:** 30 screened calls per person and 200 across Shield. The Shield-wide cap bounds worst-case model spend at about $8 a day.
- **Over the cap:** calls go to voicemail instead of being turned away. Today, past 50 calls a day Shield hangs up, which would lose real callers during a robocall flood.
- **Days run on Central time.** Today the counter resets at midnight UTC, which is 6 or 7 p.m. in Texas.

### Screening around the clock

The single 30-minute owner window becomes **always-on screening** for each person, once their setup has passed. Each person also gets a pause, and the global `LIVE_SCREENING_ENABLED` switch stays. Supervised test windows are still how a new person starts: always-on is switched on for them only after those calls pass.

What screening around the clock adds:
- **Nobody is watching overnight.** Any failure must fall back to voicemail, which the current fallback already does. Add alerts for bridge and function errors, plus a morning check of the night's outcomes.
- **Quiet hours (owner decision, October 10).** At night, a caller Shield would offer goes straight to voicemail instead of ringing the person.
  - **Who's affected:** contacts still ring as normal, because they never reach Shield. Anyone urgent who is family isn't affected.
  - **Default:** quiet hours are on, 9 p.m. to 8 a.m. Central.
  - **Setting:** each person can change the hours or turn them off in the app's Settings. They're stored on the participant as `quietHours`.
  - **How it works:** the check runs when screening approves a call. The caller hears the existing "Shield couldn't put your call through right now" voicemail prompt. Call history shows the call was screened and sent to voicemail overnight.
- **A cold bridge adds a delay.** The bridge scales to zero, so the first call after a quiet stretch starts a fresh instance. The prerecorded greeting probably covers that. If real calls show a gap, keep one instance warm for a small monthly cost.
- **Cost doesn't change.** Cost follows the number of screened calls, not the hours. The estimate below already counts every unknown call.

### Concurrency

| Layer | Today | Target |
|---|---|---|
| Telnyx number | Several calls at once | No change. Check the account's concurrent-call limit covers at least 12. |
| Shield admission | One screening or offered call across all of Shield | One per person. A second caller for the same person at the same moment goes to voicemail. |
| Live bridge | One session, one instance | 4 sessions per instance, up to 3 instances. Each session only relays 8 kHz audio. |
| OpenAI | Not tested above one session | Confirm the organization's GPT Live concurrent-session and rate limits cover at least 12. |

**Why it matters:** today's shared `activeCallId` is held for the whole call, including up to 5 connected minutes. At 10 people, one person's conversation would send everyone else's unknown callers to voicemail. That's roughly a few percent of all calls, and more at busy times.

### Carriers

See [Carriers](CARRIERS.md) for the researched matrix, risks and recommendations.

- **Three network families cover almost everyone.**
  - **T-Mobile and AT&T networks:** `**61`, `**67` and `**62`.
  - **Verizon network:** `*71` covers busy and no answer in one code, and `*73` turns it off. That includes Visible, Spectrum, Xfinity, Total and Lively.
  - **Not supported:** Google Fi and Boost, which have no conditional forwarding.
- **Restoration differs by family.** On T-Mobile it's `##004#`. AT&T needs the original voicemail targets recorded first. Verizon uses `*73`.
- **Implementation:** store the carrier per person, and generate codes and restoration steps from a carrier table.
- **Deferred:** which carriers to support is decided once participants are known. Build the table with the GSM codes first. Add a carrier only after one supervised test on a real line from that carrier.

### Phone-guided setup

Staff guide each person through the app over the phone. Two things make that harder than it sounds:
- **Some steps need the line free.** While the person is on the call with staff:
  - Dialing carrier codes may not work.
  - Shield's ring and forwarding tests would hit "busy" and be forwarded straight back to Shield.

  So split setup into a call and a callback:
  1. **On the call:** consent, the Shield contact, and the iPhone settings.
  2. **After hanging up:** the person dials the codes and runs the tests.
  3. **Callback:** staff call back to confirm.

  Check this split during the senior rehearsal.
- **Staff need a status view.** Add a read-only view so staff don't have to ask a senior to read their screen. It shows each person's setup stage, which carrier codes were accepted, and which tests passed. It shows no call history, transcripts or voicemail.
- **Consent stays with the senior.** The person records consent in the app themselves. Staff can't accept it for them.

### Connected-call protection in the pilot

The owner decided on October 10 that it will be offered in the pilot. It stays opt-in for each person:
- **The senior** turns it on in the app.
- **The caller** hears "If it connects, an AI assistant will transcribe the call to help protect against fraud" before the call connects.
- **Privacy text:** check that `/privacy` and `/service-info` still describe exactly what happens.

It adds about $4.50 a month for 10 people.

### Leaving the pilot

1. The person restores forwarding with the existing restore flow. Confirm it with a real call.
2. Their number moves to `quarantine` for 90 days. A call that still arrives means forwarding is still on: Shield plays a short message, hangs up and alerts the operator so someone can contact the person.
3. After 90 days, and 30 days with no calls, release the number to Telnyx or give it to a new person.

**Never release a number while forwarding may still point at it.** Telnyx can resell it, and a stranger would receive that person's missed calls (see [Operations](OPERATIONS.md#phone-forwarding-tello-pilot)).

## Invariants and new tests

These must hold for every person:
- **Recipient fixed:** a call on A's number only ever dials A's verified phone, from A's Shield number. Nothing can make it ring B.
- **Pressing 1 connects:** only digit 1 on that exact call leg connects.
- **Bounded timers:** unchanged. That's 75 s of screening, 20 s of ringing and 5 connected minutes.
- **A failure never connects a call.**

New emulator and unit tests:
- **Two people with overlapping calls:** each call dials only its own person. A's trusted numbers don't skip screening for B's callers. Pausing A doesn't affect B. Caps count separately.
- **Unknown or quarantined numbers:** a call arriving on one never screens or dials anyone.
- **Loop guard:** a call from any Shield number never screens.
- **Bridge limits:** 4 sessions run at once, and a 5th is refused and sent to the voicemail fallback.

## Cost

Assumes 10 people averaging 2 unknown calls a day, with a quarter of them offered and lasting about 3.5 minutes.

| Item | Per month |
|---|---|
| Screening: 600 calls × about $0.04 | about $24 |
| Offered calls: 150 × about $0.043 | about $6.50 |
| Telnyx numbers (10 plus 2 spare) | $12 |
| Apple Developer Program | about $8 |
| Firebase and Cloud Run | $0–2 |
| **Total** | **about $50–55** |

Connected-call protection, which is in the pilot, adds about $4.50 at $0.01 per connected minute, bringing the total to about $55–60.

- **What drives it:** GPT-Live-1, at $0.05 a minute, is about three-quarters of each screened call. gpt-6-luna decisions cost about $0.002 a call.
- **Spend guards:** set an OpenAI monthly budget and a Telnyx low-balance alert before the first wave.

## Phases

0. **Finish the single-person checks first** (from [Status](STATUS.md)):
   - supervised real calls on the owner's line: an ordinary caller, a scam, the voicemail fallback and a monitored call
   - the voice listening check
1. **Build the multi-person backend,** without deploying it: the number registry, per-person state and routing, concurrency, and the tests above. Migrate the owner's record so they keep +1 507 473 1802.
2. **Tooling:**
   - `scripts/manage-numbers.mjs` to buy, assign, quarantine and release numbers. It changes production, so the owner runs it.
   - `--participant` for `manage-forwarding-test.mjs`.
3. **Deploy,** with the owner's approval. Re-verify the owner's line end to end before adding anyone.
4. **Add person 2,** a friendly tester. Run the full phone-guided setup and supervised test calls, then turn on always-on screening.
5. **Add the other 8 in waves** of 2 or 3 a week. Each gets phone-guided setup and a supervised test window, then always-on screening.

**Rollback at every phase:**
- **One person:** pause them, then restore their forwarding.
- **Everyone:** turning `LIVE_SCREENING_ENABLED` off sends everyone's calls to voicemail.

## Built on the branch (October 11)

**Backend:**
- **Number registry:** `shieldNumbers/{e164}` (`backend/src/cloud/numbers.ts`).
  - **Admission:** reads the registry inside the transaction. Unknown and available numbers get nothing, and so do quarantined ones, which also log `quarantined_number_called` and record `lastCalledAt`.
  - **Loop guard:** any registered number is a Shield number.
- **Per person:** control documents at `participants/{id}/forwarding/control`, with `shieldNumber`, `carrier`, `alwaysOn` and `quietHours` on the participant. Probes are per person, with a `forwardingProbes/{id}` index.
- **Fixed ends:** every dial, binding and probe uses `ForwardingStore.endpoints()`, the person's own Shield number and verified phone.
- **Daily caps:** per Central-time day, 30 screened calls per person and 200 across Shield, then voicemail (`limit_reached`). At 500 forwarded calls in a day Shield stops answering.
- **History reasons:** `busy_guard` and `known_missed` now show in history.
- **Always-on screening and quiet hours:** default 9 p.m. to 8 a.m. Central, and only for always-on calls. A supervised window still rings. Approved calls in quiet hours go to voicemail as `quiet_hours`.
- **Carrier table:** `carriers.ts`. Tello is verified; T-Mobile and AT&T aren't, so the app shows no codes for them.
- **Bridge:** up to 4 sessions per instance and 3 instances. A session the bridge has no room for goes straight to voicemail.
- **Config:** `TRIAL_PARTICIPANT_ID`, `TRIAL_VERIFIED_CALLER` and `TELNYX_NUMBER` are gone from the runtime schema.

**Tests:** all existing emulator tests pass on the new layout, plus 13 new ones (`backend/tests/pilot.test.ts`, 99 in total):
- two people's overlapping calls each dial only their own phone
- B's phone can't bind or accept A's call
- contacts, pause and busy state stay per person
- unknown, available and quarantined numbers get nothing
- the loop guard
- a number registered to someone else
- caps and the Central-time day
- always-on
- quiet hours
- capacity refusal
- per-person probes
- carrier codes

Removing two of the checks made the matching tests fail.

**Scripts** (all production-changing writes need `--confirm` and the owner's approval):
- `migrate-to-registry.mjs`: a copy-only, idempotent move of the owner's record. It checks the participant's phone matches the runtime file.
- `manage-numbers.mjs`: `list`, `buy`, `assign`, `quarantine` and `release`. Release refuses before 90 days of quarantine and 30 days without a call.
- `manage-forwarding-test.mjs --participant <id>`: adds `always-on`, which needs both phone tests and `--supervised-calls-passed`, and `always-off`.
- `pilot-status.mjs`: a read-only staff view with no names, phones or call content.
- `telnyx-provider.mjs`: pilot channel limits of 12 inbound and 10 outbound, and a $3 daily outbound spend cap.

**App:** setup and restoration copy uses the carrier the API returns, and Settings → Quiet hours is new. All 13 forwarding UI tests and the new quiet-hours test pass.

**Deploy order, all with owner approval:**
1. Run `migrate-to-registry.mjs --confirm`.
2. Merge the branch.
3. Deploy Functions, Firestore indexes and the bridge.
4. Run `telnyx-provider` provisioning for the new limits.
5. Re-verify the owner's line with a real call before adding anyone.

**Not built:** alerts for bridge and function errors, the morning check of the night's outcomes, and the phone-guided setup split.

## Decisions for the owner

1. **Carriers:** once participants are known.
2. **Quiet hours:** confirm the default of 9 p.m. to 8 a.m.

## Not now

- **One shared number for everyone.** This would identify the person from the forwarding information their carrier attaches. It isn't known whether Tello and the other carriers pass it, or whether Telnyx exposes it on TeXML webhooks. One supervised call would show. It only matters at hundreds of users.
- **Caller-name registration** so the offer shows "Shield" before it's saved as a contact.
