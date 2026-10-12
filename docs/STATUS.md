# Status

## October 12 — shared-number implementation

Source implementation and operator rollout steps are in [SHARED-NUMBER-ROLLOUT.md](SHARED-NUMBER-ROLLOUT.md). Per-person backend foundations were integrated from `pilot-multi-person`, preserving the newer Home total and live timing changes. The shared Call Control path is behind `SHARED_NUMBER_ENABLED` (default false). Telnyx's shared application is staged inactive at 10 inbound/10 outbound channels, the existing outbound profile is set to 10 with its spending cap preserved, and the portal confirms the account outbound limit is 10. No new number, call or message was purchased/placed. Production deployment and shared-number assignment are not yet recorded as complete. Validation passed: `npm run check` (167 unit tests, typecheck and build), `npm run test:firebase` (128 emulator tests), and an unsigned iPhone simulator build. The diagnostic supervisor restored the original Telnyx assignment after its October 12 window; Phone B’s carrier reset still needs the owner’s confirmation. Real-call evidence remains the Tello/T-Mobile diagnostic's 72.434-second overlap; Verizon and the complete shared screening/offer/voicemail path still need supervised calls.

Updated October 10, 2026, after Twilio and Gemini were retired. Shield is a supervised single-recipient pilot. It screens calls only during test windows the owner opens, and it isn't cleared for anyone else's phone.

## Deployed now

Read back from production on October 10:

| Piece | State |
|---|---|
| Persistent stopped-call total | Deployed with owner approval October 12 at 22:51 UTC: `shieldApi` revision `shieldapi-00016-tuv` and `cleanupShield` `cleanupshield-00008-nuc`. Counter-only changes were applied to the prior production source package; runtime configuration and other function revisions were preserved. Isolated synthetic account verified the authenticated `counts.stoppedTotal` response for a call older than seven days and persistence after its history was removed. Health HTTP 200; unauthenticated overview 401; cleanup remains private. No real-call verification. |
| Live bridge `shield-live` | Revision `shield-live-00009-799`, policy `2026-10-11-general-v30`, `gpt-live-1` + `gpt-6-luna`, OpenAI key version 2. Clarification duplicate-check fix deployed with owner approval October 11 at 22:56 Central; ready and serving 100%. V30, timing logs, the local wait acknowledgement and all runtime settings were preserved. |
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

- **October 11, 22:23 Central (v30):** the owner's test call used `shield-live-00008-hnc` and reached voicemail. Content-free logs show a warm bridge process, 0.778 s from bridge claim to model ready, 1.1–2.3 s backend requests, and a 0.397 s persistence/redirect handoff. A duplicate automatic decision check started on unchanged caller evidence while Live was preparing its clarification; the terminal hold cut question playback. The acknowledgement played once. This identifies a coordination defect, not comparative screening accuracy or verified audio quality. See [timing investigation](OPERATIONS.md#v30-real-call-latency-investigation-october-11-2223-central).

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
  - **Voice benchmark (synthetic voices):** 24/24 with caution off and 24/24 with it on.
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

- **Voicemail keep-or-remove (code October 11, not deployed, off by default):** protection plan section 7.
  - **Tests:** `npm run check` (112 unit tests) and `npm run test:firebase` (86 tests) passed.
  - **Blocked on the owner:** the production OpenAI key lacks the `api.decisions.write` permission. Until it's added, the Decisions API returns 403, every message would be kept, and the 32 written evaluation cases can't run.

- **App changes (code October 11, not installed on the phone):** Blocked numbers screen, "Alert my helpers" switch, removed-voicemail state with Restore, the Today setup check card, and the APNs environment sent with the push token.
  - **Tests:** six new simulator UI tests passed, and the screenshots were inspected, including the largest text size.
  - **Full suite:** 27 UI tests: 25 passed, 1 skipped, and `ContactSyncUITests` failed. It fails the same way on the code before these changes, since it needs the simulator's Contacts permission.

- **Monitoring policy monitor-v2 (code October 11, not deployed):** protection plan section 2.
  - **Requests it now catches:**
    - calling or texting a number the caller gives
    - saving a claimed bank's or agency's number
    - opening a link or scanning a code
    - security answers
  - **Text checks** (`--provider go`, 3 runs):
    - main set: 36/36 kept, 36/36 stopped
    - held-out: 12/12 kept, 21/24 stopped (v1 stopped 5/24)

- **Call Directory extension (code October 11, not installed):** blocks the blocklist at the phone level, including numbers she saved or called back.
  - **Simulator:** it builds and embeds with the App Group entitlement, and 27 app and forwarding UI tests pass.
  - **Phone:** it needs the App Groups capability registered through Xcode's automatic signing before the next install.
  - **Not checked:** whether blocking works on a real device.

## Not yet verified

- **Clarification coordination fix (October 11, deployed at 22:56 Central, not yet verified on a real call):** a fresh clarification now marks its caller turn assessed, preventing the periodic fallback from checking unchanged words while the question is being spoken. Regression and exact production-package comparisons preserve fresh-evidence checks and immediate scam stops. Typecheck/build, 143 unit tests and 86 emulator tests passed. Four focused synthetic voice outcomes passed, but one still held before the scripted answer; a fifth diagnostic answered and blocked, with an independent Live delegation during questioning. V30 is unchanged. Further model-initiated overlap and real-call latency remain unverified. Revision `shield-live-00009-799` is ready at 100% traffic, with no startup ERROR or missing-acknowledgement entries at verification. The prior test window expired at 22:35:58 Central and was not renewed by this deployment. See [analysis and limits](OPERATIONS.md#v30-real-call-latency-investigation-october-11-2223-central).

- **Financial-notice screening v30 (October 11, not deployed):** addresses the automated-charge reproducer with a category-level sensitive-claim rule: 14/18 approvals on v26 versus 0/18 on v30, which asked for clarification each time. Final focused tests passed 192/192: 84/84 ordinary offers, 60/60 harmful stops and appropriate clarification/hold for all ambiguous notices. v29 was rejected for excessive questioning of hospital welfare news under caution; v30 narrows the financial exception. Final paired Go checks: FTC 722/724 identified, 691/724 stopped, 2 approvals; MASC 160/160 scams identified and 79/80 ordinary calls offered. Prompt remains 7.6% shorter than v20. Typecheck, build, 137 unit tests and 86 emulator tests passed. Voice validation remains outstanding; nothing deployed. [Evidence and limits](SCREENING.md#financial-notice-follow-up-v30-october-11-text-only), [public comparison](PUBLIC-SCAM-BENCHMARKS.md#financial-notice-fix-v30-october-11).

- **Lean screening v26 (October 11, not deployed):** adopts the fully tested v24 wording unchanged, 11.4% shorter by characters. The owner explicitly accepted one fewer identified robocall trial: 2,168/2,172 versus 2,169, with 2,134 completed stops versus 2,107 and call-weighted identification 4,130/4,134 versus 4,126. MASC identification matched at 479/480; ordinary offers increased from 217/240 to 219/240, while completed stops decreased from 460 to 453. Both full public comparisons used GPT-6 Luna medium through the authorized subscription fallback after Go limits; no provider failures. Go main and fresh red-team cases passed 69/69 and 72/72; broader and held-out limitations remain documented. The more aggressive v23 cut was rejected, and v25 was superseded by the owner’s selection. Typecheck, build, 133 unit tests and 86 emulator tests passed. No voice test or deployment ran; both voice validation and owner approval remain required before deployment. See [compression evidence](SCREENING.md#conservative-lean-candidate-v24-october-11-text-only) and [public results](PUBLIC-SCAM-BENCHMARKS.md#conservative-v24-comparison-october-11).


- **Family acceptance and continued red teaming (code October 11, not deployed):** screening v18 retains offers to claimed family callers, including borrowed phones and personal trouble. Explicit scam requests and manipulation still block; the existing 24-hour callback caution and recipient's press-1 acceptance remain. Fresh development probes found a clinic demographic false block; v18 clarifies that ordinary healthcare boundary while retaining every secret/payment/remote-access block.
  - **Final synthetic checks:** 26 new development cases over three text runs: 36/36 ordinary offered, 42/42 harmful stopped. Main text: 33/33 ordinary offered, 36/36 scams/robocalls stopped. Main + development voice: 50/50 passed. No main benchmark cases were added. Historical v17 caution coverage remains 17/18 ordinary family calls offered, including one false hold of a new-number caller; v18 caution was not retested.
  - **Public benchmark:** pinned MASC 320-case synthetic test split, Go, GPT-6 Luna, medium reasoning. Frozen v18 results rescore to 160/160 scams correctly identified under the owner's requested clarification-credit rule: 155 blocks/holds plus 5 clarifying questions, 0 harmful approvals. Ordinary calls: 80/80 offered; insurance ads: 40/40 blocked separately. Sales are excluded from scam and ordinary-call scores; wrong numbers stay separate too. Raw outcomes and the original 155/160 completed-stop score are preserved; no policy or model requests changed for rescoring.
  - **Monitoring limit:** unchanged monitor-v2, three public passes: 436/480 scam trials flagged (142–148/160 per pass), 232/240 ordinary trials kept (76–78/80 per pass), 3 rejected evidence quotes, 0 provider failures. These repeat the same conversations and are end-of-call diagnostics, not real-call or early-intervention scores. Existing held-out monitoring still missed the email-address request 3/3; public and held-out findings did not tune either prompt.
  - **Lookup and metrics:** 0/320 lookup requests in the v18 public pass, 1/960 across v16–v18. Go cannot run the web search, so successful lookup value is unmeasured. Completed stops and clarifications remain separate, and failed checks receive no credit.
  - **Validation:** `npm run check` passed (116 unit tests, typecheck/build); `npm run test:firebase` passed 86 emulator tests. Request/source hashes were frozen before public validation and verified unchanged after all passes. No deployment, phone installation, forwarding change or real call was performed. See [continued red teaming](SCREENING.md#continued-development-red-teaming-v18-october-11) and [public benchmark results](PUBLIC-SCAM-BENCHMARKS.md#continued-red-teaming-and-frozen-v18-validation).
  - **Separate MASC classifier (benchmark-only, not Shield's policy):** frozen v3 (unanimous v1+v2 vote) scored 958/960 on three test passes, F1 99.79% on original labels. On the 1,280-row training split, never used for development, it scored 1,275/1,280, F1 99.61%. An owner adjudication of SSN-collecting "non-scam" rows is reported beside these, never instead: 959/960 test, 1,274/1,280 training. See [the classifier section](PUBLIC-SCAM-BENCHMARKS.md#separate-masc-binary-classifier).
  - **Real FTC robocalls (public domain, owner-approved, Go only):** 724 distinct English robocall transcripts from the [NC State dataset](PUBLIC-SCAM-BENCHMARKS.md#ftc-robocall-benchmark), three passes. v18 approved 12 checks, 8 of them existing-provider offers. Code v20 closes that gap: 2,165/2,172 identified, 2,086 blocked, 7 approved. Per original call it identifies 99.1% (94.8% blocked), against published recall of 46.6–82.2% on the same 1,378 calls (RoboKA, 2026). v19 regressed MASC ordinary calls to 69/80; v20 restores 79/80 with 160/160 scams identified. Remaining gaps: an automated "your card was charged" notice is approved occasionally (pre-existing since v18), and family-only openers are approved by design. Text only; v20 voice checks have not run, and nothing is deployed ([details](SCREENING.md#existing-provider-offers-v19v20-october-11)).

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
3. **Real voices and more held-out cases.** Every result so far is synthetic.
   - **Added October 11:** a 20-case held-out set, which passed 33/33 legitimate and 27/27 harmful over 3 text runs.
   - **Still needed:** voice runs of the new cases, and real voices.
4. **Decide whether the scam-guidance lookup earns its delay.** Measured October 11: the model asked for it once in about 500 text runs, and it changed no outcome that could be measured. The recommendation is to remove it at the next planned prompt change. That's the owner's decision ([Screening](SCREENING.md#text-re-check-and-research-lookup-study-october-11)).
5. **Protection plan.** Agreed October 10, not built: faster and broader monitoring, blocking repeat scammers, caregiver alerts, daily setup checks, voicemail keep-or-destroy and shorter disclosures. See the [protection plan](PROTECTION-PLAN.md).
6. **Senior rehearsal, then the ten-person pilot.** See the [ten-person pilot plan](TEN-PERSON-PILOT-PLAN.md). Phase 1 (multi-person backend) and most of phase 2 (scripts) are built on branch `pilot-multi-person`, not merged or deployed (October 11).
7. **Housekeeping:**
   - release the Twilio number and close the Twilio account
   - delete the OpenRouter key

   The code that used them was retired on October 10.

The full pilot plan and its gates are in the [screening and voice plan](SENIOR-PILOT-SCREENING-AND-VOICE-PLAN.md).

The existing end-to-end guided setup regression also passed after adding the shared scroll-to-heading container (October 10).
