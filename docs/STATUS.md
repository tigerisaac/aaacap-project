# Status

Updated October 10, 2026, after Twilio and Gemini were retired. Shield is a supervised single-recipient pilot. It screens calls only during test windows the owner opens, and it isn't cleared for anyone else's phone.

## Deployed now

Read back from production on October 10:

| Piece | State |
|---|---|
| Live bridge `shield-live` | Revision `shield-live-00006`, policy `2026-10-09-general-v14`, `gpt-live-1` + `gpt-6-luna`, OpenAI key version 2 |
| Firebase Functions (codebase `shield`) | `shieldApi`, `cleanupShield`, `ingestForwardingVoicemail`, `monitorConnectedCall` |
| Runtime config | `SHIELD_RUNTIME` v5: Telnyx only, live screening on, connected-call protection on at the server. Twilio and OpenRouter keys removed. |
| Announcement audio | Prerecorded Soniox Grace: 25 generic 24 kHz WAV files on Hosting, with Functions backup. `shieldApi` revision `shieldapi-00012-heq`, updated October 10 at 15:52 UTC. All 50 primary/backup URLs verified HTTP 200, `audio/wav`, matching original SHA-256; public health ready. |
| Protection onboarding | Default-selected choice after email sign-in; Continue saves consent or opt-out. `shieldApi` revision `shieldapi-00013-seb`, deployed October 10 at 22:11 UTC; ACTIVE and public health ready. Signed app installed on enrolled iPhone. |
| Withheld callers, faster monitoring, bridge wake-up | Deployed with owner approval October 11 at 00:19 UTC (Functions only; bridge unchanged): `shieldApi` revision `shieldapi-00015-jij` serving 100%, `monitorConnectedCall` `monitorconnectedcall-00003-yed`, `ingestForwardingVoicemail` `-00005-nen`. Background-function invokers unchanged: Shield runtime identity only, not public. After deploy: public health, ready and `/privacy` HTTP 200; unsigned webhook 403; unauthenticated API 401; bridge `/ready` on v14; no function warnings or errors and no pending monitor checks. Not yet exercised by a real call. |
| Connected-call transcription | Soniox `soniox/stt-rt-v4` through Telnyx, deployed with owner approval October 10. `shieldApi` revision `shieldapi-00014-nos` ACTIVE at 22:45:53 UTC; runtime v5 has no engine override and the new schema default resolves to Soniox. Public health HTTP 200/ready. Soniox real-call quality remains unverified. |
| Voicemail fallback | Live: held, failed or timed-out screenings go to voicemail instead of hanging up |
| Check tab | `gpt-6-luna` through `shieldApi` (October 10). Synthetic checks: a routine reminder passed, and bank-code and grandparent-bail texts were flagged. |
| Carrier forwarding | Enabled October 10 with owner approval: Tello confirmed registration for unanswered, busy and unreachable conditions to Shield. Carrier routing has not been independently rechecked after the owner’s restoration/setup activity. Latest October 10 readback: backend stage checks and screening window active until 22:11 UTC; no active call. The owner started that session through setup. |
| Last real call | October 10: accepted call with a monitoring intervention at 22:46:14 UTC |

## Verified on real calls

- **October 10 (policy v14, Parakeet monitoring):** the owner reported connection and a successful in-call intervention. Production events show acceptance at 22:40:24 UTC, code/password intervention at 22:40:48 UTC, then call ended. The transcript was deleted; no pending checks or service errors in the prior hour. This verifies the intervention path on one real call, not comparative transcription accuracy, speaker labels, or time from the suspicious request.
  - **Second intervention:** production events show a second monitored call: accepted at 22:45:52 and intervention at 22:46:14 UTC. Its transcription started at 22:45:24, before the Soniox revision was active at 22:45:53, so it most likely ran on Parakeet. Soniox still has no real-call evidence.
  - **Routine call:** an earlier routine call was offered, accepted at 22:35:04 and connected, without monitoring.
  - **Caller wait:** across all three calls, the caller reached the person 40–43 s after the call started. Interventions came 22–24 s after acceptance.

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
- Soniox connected-call transcription switch (October 10): schema default changed from Parakeet to Soniox with explicit TeXML model `soniox/stt-rt-v4`, both audio tracks and the existing signed callback. Typecheck/build, 94 unit tests and 48 Firebase emulator tests passed. No new Soniox key is needed. Soniox real-call quality remains unverified.
- Connected-call protection checks in text: 36/36 real conversations kept, 36/36 scams stopped.
- Soniox announcement integration (local, October 10): `npm run check` passed (94 unit tests, typecheck and build); `npm run test:firebase` passed all 47 emulator tests. All 25 Hosting audio assets and 25 packaged backup assets match the approved recordings. Deployed October 10; not verified on a real phone call.

- iOS onboarding (October 10): the owner-authorized native card action was blocked by iOS 27.2 with **Call Forwarding Link Blocked**. The failed card path was removed in favor of the physically verified clipboard/keypad method. All three real Tello codes returned carrier-registration success; no incoming call or probe was placed. The two Phone-settings instructions share one visit with separate confirmations. Temporary carrier-test launch arguments were removed from the app. The normal signed build was installed and launched on the enrolled phone, and its copy flow was visually inspected. Final validation passed eight simulator UI tests, 94 unit tests with typecheck/build, and 47 Firebase emulator tests.

- iOS Phone launcher (October 10): the integrated native StoreKit banner launched Phone on the enrolled iPhone. The full synthetic code pasted with stars and final hash intact; no call was placed. Returning retained the unconfirmed setup step and dismissed the banner; Show Phone again reopened Phone. Two final targeted simulator tests passed for copy/next-code reset and no automatic dial/carrier confirmation. The signed Debug build was installed. The initial version used a two-tap handoff plus manual paste; automatic preparation below removes the Copy tap. No installed Shortcut is used. Carrier forwarding and the closed test window were unchanged.

- iOS automatic handoff preparation (October 10): the first and second synthetic forwarding steps copied the correct code and showed Phone’s Open banner on arrival. Open launched Phone with one tap. A normal tap above the keypad displayed Paste; the second code replaced the first intact. No code was dialed. The restoration fixture also showed its automatically prepared reset/banner; three separate reset confirmations passed in simulator. Eight setup/safety UI tests and three targeted setup/restoration/safety tests passed. Direct no-number URL experiments rejected all four additional forms. The temporary launch experiment was removed before normal installation and launch. Repository typecheck/build, 94 unit tests and all 47 Firebase emulator tests passed again. Carrier forwarding and the closed live test window were unchanged.

- iOS compact handoff and return guide (October 10): forwarding and restoration now show three short instructions, then “Check Tello’s result” after returning. Retry recopies the same code and restores the guide; returning never advances or verifies a connection. These transitions and Phone opening were physically inspected with synthetic fixtures, without dialing. Ten of eleven initial UI tests passed; after correcting the largest-text test’s scrolling target, all four final targeted tests passed. Typecheck/build, 94 unit tests, and 47 Firebase emulator tests passed. The signed normal build was reinstalled and launched. Carrier forwarding and the closed test window were unchanged.

- iOS guided restoration (October 10): replaced the final static Settings instructions with two explicit setting confirmations, then ordinary-call and normal-voicemail checks and a Done state. Already-completed settings can be confirmed directly. Progress persists per participant through app relaunch; returning from Settings never advances it. Three targeted restoration tests passed before and after the layout refinement, including largest accessibility text in dark mode. Synthetic Settings/call-check screens were inspected on the enrolled phone. Typecheck/build, 94 unit tests and 47 Firebase emulator tests passed. The signed normal app was installed and launched. No real calls, carrier resets or phone-setting changes were performed in this pass. The owner’s screenshot showed the old final restoration screen; current carrier routing has not been read back or independently verified.

- iOS setup completion (October 10): Done dismisses setup and leaves forwarding/session state untouched. Restoration is a separate Setup options action with explicit confirmation. The completion screen retains call-check results and reports the timed session’s current state. The consent instructions no longer require restoration at setup completion. Backend always-on and multi-user behavior remain unchanged.


October 10 completion validation: the end-to-end guided setup and Done/later-restoration UI tests both passed. The synthetic completion screenshot was inspected in simulator. Typecheck/build, 94 unit tests and 47 Firebase emulator tests passed. The signed normal build was installed and launched on the enrolled iPhone without changing its saved progress or session. No carrier setting or live backend deployment changed in this pass.

- Connected-call protection onboarding (October 10): main onboarding after email sign-in selects protection by default, with an optional off toggle and explicit Continue to save current consent. Existing opt-outs are preserved, stale enabled consent prompts again, and helpers cannot choose for someone else. Typecheck/build, 94 unit tests, 48 Firebase emulator tests and all five final targeted UI tests passed. Default and largest-text/dark screens were inspected in simulator; the signed normal app was installed and launched on the enrolled iPhone. No owner monitoring preference or carrier setting was changed. With owner approval, only `shieldApi` was deployed successfully: revision `shieldapi-00013-seb`, ACTIVE at 22:11:03 UTC, public health HTTP 200/ready. Connected-call protection end to end remains unverified.

- **Withheld and international caller IDs (code October 10, deployed October 11).** Forwarded callers whose number is withheld (`anonymous`, `restricted`, empty) or outside the US are now screened like any other caller, instead of being hung up.
  - **Binding:** the webhook caller must still match Telnyx's own record of the call.
  - **Never trusted:** a withheld caller never matches a saved contact or a single-caller test scope.
  - **Not stored:** the raw value isn't kept, and history shows "No caller ID".
  - **Tests:** `npm run check` passed (94 unit tests) and `npm run test:firebase` passed 54 emulator tests, 6 of them new.
  - **Unknown:** what Telnyx actually sends for a withheld number needs one real call.

- **Faster monitoring and bridge wake-up (code October 10, deployed October 11):**
  - **Fast mode:** connected-call checks send `service_tier: 'priority'`. GPT Live screening stays on the standard tier, by owner decision. In a 12-request comparison, the median model time was 1.1 s against 2.3 s, with every decision correct.
  - **Wake-up:** `shieldApi` sends `/ready` to the live bridge as soon as a signed forwarded call arrives, so a cold start overlaps the greeting.
  - **Tests:** `npm run check` (94 unit tests) and `npm run test:firebase` (54 tests) passed. GPT Live's session settings are unchanged from production.

- **Blocklist and recent-scam caution (code October 11, not deployed):** protection plan section 3, server side.
  - **Blocklist:** after a scam block or an intervention, the caller's number is ended on sight for 180 days, with no screening or voicemail. Withheld numbers can't be blocked. The person can list and unblock numbers through the API.
  - **Caution:** for 24 hours, screening runs policy v15's caution paragraph. Callers who refer to an earlier or dropped call are held. With caution off, the prompt is identical to v14.
  - **Tests:** `npm run check` (95 unit tests) and `npm run test:firebase` (66 tests, 12 of them new) passed.
  - **Text checks** with `--provider go`, 3 runs each, caution on:
    - callbacks: 21/21 held (5/21 with caution off)
    - main benchmark: 33/33 legitimate, 36/36 harmful
    - held-out: 36/36 legitimate, 35/36 harmful
  - **Not run:** a voice benchmark for v15.
  - **To deploy:** Functions, the bridge, and Firestore indexes (a collection-group index for cleanup).

- **Monitoring timing and parallel checks (code October 11, not deployed):** protection plan section 1.
  - **Timing:** a monitored call records when the quoted request arrived and when the warning redirect started. Logs carry queue delay, check time and model time, without content.
  - **Parallel checks:** up to 2 checks run at once, so a check on small talk doesn't delay the one with the request.
  - **Version:** `MONITOR_POLICY_VERSION` is stored on each monitored call.
  - **Prompt:** the monitoring prompt is unchanged.
  - **Tests:** `npm run check` (96 unit tests) and `npm run test:firebase` (70 tests) passed.

- **Push alerts backend (code October 11, not deployed):** protection plan section 4.
  - **What's built:** device registration, APNs sending, helper-alert choice, and alerts for the events in the plan.
  - **Needs:** an APNs auth key from the Apple Developer account before it can send.
  - **Tests:** `npm run check` (104 unit tests, including APNs against a local HTTP/2 server) and `npm run test:firebase` (77 tests) passed.

## Not yet verified

- **Automatic keypad prefill:** direct URL forms failed and the native contact-card carrier action was blocked. Each step now copies its code and shows the Phone banner automatically; one Open tap launches Phone. Manual paste remains necessary. This was verified with synthetic codes on the enrolled phone.
- **Broader policy v14 real-call coverage**, including ordinary calls and scams.
- **The voicemail fallback on a real call.**
- **Connected-call protection coverage:** ordinary monitored calls, speaker-track labels, and Soniox transcription after deployment. One Parakeet code/password intervention succeeded October 10.
- **A normal call and voicemail after forwarding was restored** in September.
- **Two-way audio quality** on connected calls.

## Open work, in priority order

1. **Supervised test calls.** Install a new iOS build on the enrolled iPhone, turn on connected-call protection in the app, and open a test window. Then cover:
   - an ordinary caller
   - a scam
   - the voicemail fallback
   - a monitored call

   Call the Telnyx number directly, or set up forwarding again ([Operations](OPERATIONS.md#phone-forwarding-tello-pilot)).
2. **Voice listening check.** Deployed October 10: 25 prerecorded Soniox Grace announcements with Hosting playback, a packaged Functions audio backup, and unchanged GPT Live `marin`. All primary and backup URLs verified. Audition the transition to `marin` over a real phone line, including a playback failure, then run a short listening session with seniors ([Architecture → Voice and speech](ARCHITECTURE.md#voice-and-speech)).
3. **Real voices and more held-out cases.** Every result so far is synthetic. Add held-out text probes (cheap) rather than growing the main benchmark past 25 cases.
4. **Decide whether the scam-guidance lookup earns its delay.** It's built and limited to official sites, but nobody has measured whether it changes decisions.
5. **Protection plan.** Agreed October 10, not built: faster and broader monitoring, blocking repeat scammers, caregiver alerts, daily setup checks, voicemail keep-or-destroy and shorter disclosures. See the [protection plan](PROTECTION-PLAN.md).
6. **Senior rehearsal, then the ten-person pilot.** See the [ten-person pilot plan](TEN-PERSON-PILOT-PLAN.md).
7. **Housekeeping:**
   - release the Twilio number and close the Twilio account
   - delete the OpenRouter key

   The code that used them was retired on October 10.

The full pilot plan and its gates are in the [screening and voice plan](SENIOR-PILOT-SCREENING-AND-VOICE-PLAN.md).

The existing end-to-end guided setup regression also passed after adding the shared scroll-to-heading container (October 10).
