# Status

Updated October 10, 2026. Shield is a supervised single-recipient pilot. It screens calls only during test windows the owner opens, and it isn't cleared for anyone else's phone.

## Deployed now

Read back from production on October 10:

| Piece | State |
|---|---|
| Live bridge `shield-live` | Revision `shield-live-00005`, policy `2026-10-09-general-v14`, `gpt-live-1` + `gpt-6-luna`, OpenAI key version 2 |
| Firebase Functions (codebase `shield`) | `shieldApi`, `screenCall`, `cleanupShield`, `ingestForwardingVoicemail`, `monitorConnectedCall` |
| Runtime config | `SHIELD_RUNTIME` v4: Telnyx forwarding, live screening on, connected-call protection on at the server |
| Voicemail fallback | Live: held, failed or timed-out screenings go to voicemail instead of hanging up |
| Carrier forwarding | Off. It was removed after the September 24 demo. |
| Last real call | September 29, 2026 (a voicemail) |

## Verified on real calls

- **September 24 (older screening policy):**
  - A bank-code request was blocked and the call ended.
  - A silent call timed out and ended.
  - Two ordinary calls reached the private summary, were accepted with 1, and connected. The audio quality of those connections wasn't separately confirmed.
  - The automatic sound-check probe passed on the owner's phone.
  - Tello conditional forwarding was set up and then removed. Both directions were confirmed by the carrier.
- **September 21 (Twilio era, historical):** a hosted call was screened and appeared in the iPhone app's history after email sign-in.

## Verified only in software or with synthetic callers

- Policy v14:
  - voice benchmark 24/24
  - held-out text: 36/36 legitimate, 35/36 harmful
  - red-team text: 107/108 legitimate, 181/183 harmful
  - see [Screening](SCREENING.md)
- Connected-call protection checks in text: 36/36 real conversations kept, 36/36 scams stopped.
- Unit tests: 153 passed (79 need the Firestore emulator). Emulator integration tests are run separately with `npm run test:firebase`.

## Not yet verified

- **Policy v14 on a real phone line**, with a real voice and carrier audio.
- **The voicemail fallback on a real call.**
- **Connected-call protection end to end:**
  - whether Telnyx transcription continues after `<Dial>` bridges the call
  - whether speaker tracks are labelled
  - whether redirecting the recipient's leg plays the warning and ends the caller's leg
- **A normal call and voicemail after forwarding was restored** in September.
- **Two-way audio quality** on connected calls.

## Open work, in priority order

1. **Supervised test calls.** Install a new iOS build on the enrolled iPhone, turn on connected-call protection in the app, and open a test window. Then cover:
   - an ordinary caller
   - a scam
   - the voicemail fallback
   - a monitored call

   Call the Telnyx number directly, or set up forwarding again ([Operations](OPERATIONS.md#phone-forwarding-tello-pilot)).
2. **Legal review of connected-call protection** before anyone besides the owner uses it. This covers all-party-consent rules and recent AI-transcription wiretap cases, and confirming the caller disclosure and privacy text. The server switch is already on; `node scripts/enable-call-monitoring.mjs --off` withdraws it.
3. **Better voice.** Fixed prompts use Telnyx's default voice. Audition a third-party TTS option against GPT Live's `marin` over a real phone line, then run a short listening session with seniors ([Architecture → Voice and speech](ARCHITECTURE.md#voice-and-speech)).
4. **Real voices and more held-out cases.** Every result so far is synthetic. Add held-out text probes (cheap) rather than growing the main benchmark past 25 cases.
5. **Decide whether the scam-guidance lookup earns its delay.** It's built and limited to official sites, but nobody has measured whether it changes decisions.
6. **Senior rehearsal, then a 5–10 person pilot,** with consent, known windows and immediate rollback.
7. **Housekeeping:**
   - update `collaborator:setup` and `collaborator:check`, which still target OpenRouter and Twilio
   - decide whether to retire the legacy Twilio, Gemini and PostgreSQL code paths

The full pilot plan and its gates are in the [screening and voice plan](SENIOR-PILOT-SCREENING-AND-VOICE-PLAN.md).
