# GPT Live 1 screening demo

Status: the user funded OpenAI with $5 and auto-reload is off. The protected public bridge is approved and reachable at `https://shield-live-kzcw2rbfhq-uc.a.run.app`. The live-enabled Firebase route uses runtime secret version 3. The final transfer fix is deployed (image digest `sha256:61e710df27ef0b847f826844c39b01698dfaac730682d380bfe25c3de43cec1f`); carrier routing is not yet physically verified. The owner started the physical demo on September 24. A 30-minute test window was opened. Direct calls from the owner’s available test phone verified a model-classified scam block and automatic silent-call hang-up. The eight-second revision is being deployed before further tests. The OpenAI key is stored directly in Google Secret Manager (`SHIELD_OPENAI_API_KEY`). Version 1 expired October 1, 2026. Version 2 was added October 9 and passes the live access check; `scripts/deploy-live-bridge.mjs` now pins version 2, but the running `shield-live` service still references version 1 until it is redeployed. Do not print or copy the key into a local file.

Software verification: 120 unit tests passed; 58 emulator-dependent tests skipped in the unit run. The dedicated Firestore integration run passed 52 with six provider-inapplicable cases skipped. Synthetic live-model checks cover code theft, sales robocalls, ordinary callers, benign scam warnings, a two-turn clarification, and silence. One session stalled before emitting any audio; the app now distinguishes that service failure from caller silence and ends the call. Passing these generated examples does not establish real-world scam detection accuracy.


## Contact-routing demo checkpoint — September 24 evening

The owner reports successful live tests. Server records confirm two ordinary calls reached the private summary, received explicit keypad acceptance, and finished with the connected outcome; later scam calls finished held. These events do not by themselves prove two-way audio quality. Both the sound-check and forwarding-probe timestamps are present in live control state. The live bridge and database-backed API readiness checks return HTTP 200.

The requested next demonstration uses one caller and the owner's normal mobile number in both cases: an unsaved caller is silenced by iPhone and conditionally forwarded to Shield; saving the caller in Apple Contacts lets the next call ring the owner normally. The named demo caller currently has no matching Shield trusted-number entry. Do not add one for this test: it would make forwarded calls message-only. Known contacts who are not answered can still reach conditional forwarding.

Phone preparation: Screen Unknown Callers = Silence, Live Voicemail = Off, Focus off, Shield's callback number saved in Contacts, and Tello conditional forwarding directed to +1 507 473 1802. If replacing old routing, dial each reset separately (##61#, ##67#, ##62#), then each activation separately (**61*15074731802#, **67*15074731802#, **62*15074731802#), checking the carrier response after each. Unconditional forwarding must be off for saved contacts to ring normally. The agent has not changed or inspected the current physical phone settings.

Rehearse the unknown case first, then restore/save the caller's number and rehearse the known case. Preserve the contact details before temporarily removing only its phone-number field; check for duplicate cards. Recent outgoing calls and Siri recognition can make an unsaved number behave as known, so removal alone is not proof. Do not erase call history or claim an unknown-caller pass based on manually declining the call. The actual unsolicited ring/silence and corresponding service events are the evidence. The caller should call the owner's mobile, not the Telnyx number, for both demonstrations.

Open a fresh supervised window when ready: 30 minutes, ten screenings, one active call. The server window expiring does not undo carrier forwarding. Restore contact details and the saved carrier/Phone settings after testing.

References: [Apple unknown-caller settings](https://support.apple.com/en-us/111106), [Apple recognition exceptions](https://support.apple.com/en-my/guide/iphone/-iphe4b3f7823/ios), [Tello forwarding codes](https://tello.com/help_center/service-issues-troubleshooting/how-can-i-set-up-call-forwarding).

### Physical phone setup completed — 9:56 PM Central

Using the owner-authorized iPhone Mirroring session, reset no-answer, busy and unreachable forwarding individually. The iPhone displayed Setting Erasure Succeeded for all three. Registered each condition to +1 507 473 1802; the carrier displayed Setting Registration Succeeded for all three. One mistyped busy code returned an error; the corrected code then succeeded. All-calls forwarding was visibly off. Live Voicemail was already off and Screen Unknown Callers already selected Silence. Sleep Focus was on and was turned off for the rehearsal. Shield Screened call is saved with the correct Telnyx number.

Temporarily removed only the named demo caller's mobile phone field, preserving the contact name and email. A fresh exact-number search then showed call history and voicemail but no saved-contact match. Do not erase the history. The original number and label are in the ignored private contact restoration note; restore the mobile field for the known-contact leg and after the demo. This change does not prove iOS will classify the next call as unknown. The owner still needs to have the caller make a regular cellular call to the owner's mobile, confirm automatic forwarding and callback audio, then repeat with the contact restored. No external person was called or messaged by the agent.

The existing server window was read back as active with zero screenings used and expires September 24 at 10:09 PM Central. Carrier forwarding persists beyond that expiry; restore it after testing.

## Call path

The existing Telnyx number receives calls forwarded by the enrolled Tello phone. The signed inbound webhook reserves one screening call in Firestore and returns a bidirectional PCMU/8kHz stream to the Cloud Run `shield-live` service. A per-call HMAC capability expires in 60 seconds; Firestore allows only one stream claim. No destination or credentials are accepted from caller speech.

Telnyx plays a fixed AI-assistant disclosure and asks who is calling and why before opening the stream. GPT Live 1 listens and asks brief follow-up questions. This avoids relying on generated speech to initiate a greeting, which was inconsistent when a caller spoke early. Its Responses delegate, GPT-5.6 Luna, invokes a constrained screening tool. A block clears all queued audio and sends Telnyx a call-completion command immediately, without a blocked announcement or goodbye. Ordinary, coherent callers with a name and a concrete benign purpose may be offered to the fixed enrolled phone. The owner hears the existing private summary and presses 1 to connect. The AI does not hear or record the subsequent human conversation.

At the owner’s request, initial silence and later inactivity now have an eight-second limit. The timer resets on caller speech or audible assistant playback; continuous silence frames do not extend it. A model that produces no audio remains a service failure, distinct from caller silence. Screening has a 75-second hard limit, a 10-second startup limit, and at most twelve decision-tool calls (re-checks after a caller keeps talking count toward this). Telnyx also has an independent 85-second Pause/Hangup deadline, so a bridge crash cannot hold the caller forever. Recognized scam decisions do not wait for these timers. Intentional stream shutdown during approval does not end the parent call. A concurrent carrier completion callback cannot erase an already-issued block outcome. No speech/transcript is persisted by the bridge, and OpenAI session storage is disabled. Only fixed outcome categories and event timestamps enter call history.

The existing supervised pilot remains: ten screenings per 30-minute test window, one active call, five-minute human connection limit, fixed recipient only. Calls outside the window retain the earlier message-only behavior. This demo is not an always-on deployment. Caller ID is not authentication. A fluent or friendly introduction is not verified identity, and fraud arising only after connection is outside this screening stage.

## Deployment and validation

1. `npm run check` and `npm run test:firebase` validate software controls. These do not prove carrier audio or scam-recognition accuracy.
2. `node scripts/check-live-access.mjs` reads the API key into process memory from Secret Manager and attempts a four-second GPT Live 1 session. It never makes a phone call.
3. `node scripts/check-live-demo.mjs` runs generated actor audio for the 24-case benchmark in `scripts/fixtures/live-screening-cases.mjs`: 11 legitimate callers chosen to resemble scam signals, 12 scams and robocalls paraphrased from documented real scripts, and silence. Voices rotate across accents and ages, and a scripted answer is spoken only after Shield asks a question. `node scripts/check-screening-policy.mjs --repeat N` runs the same cases as text; `--cases <file>` runs a held-out set that must never feed back into prompt wording. Test transcripts are synthetic and saved under ignored `artifacts/live-eval/`. Real customer recordings must not be fed to this script.
4. Build with `npm run build`, then `node scripts/deploy-live-bridge.mjs build`. Check `status`, then run `deploy`, check `status`, and `publish`. The package contains only compiled modules and a dependency manifest. Neither API keys nor runtime JSON are uploaded in the image. Cloud Run loads secrets using the existing Shield runtime identity, scales to zero, and is capped at one instance. Public WebSocket upgrades still require the short-lived per-call capability and atomic call reservation.
5. Keep `LIVE_SCREENING_ENABLED` false until live-model checks pass. Run `node scripts/enable-live-demo.mjs` to verify actor results and the current deployed bridge, set `LIVE_BRIDGE_URL`, and enable the flag in the existing runtime secret; rebuild/package/deploy `functions:shield:shieldApi`. Do not change `SCREENING_PROVIDER`: the separate legacy direct-call test may retain its existing provider.
6. Open a fresh supervised window only when the user is ready to call. Warm `/ready` before the recorded demo. Use `node scripts/check-live-calls.mjs` for outcome-only inspection. Never claim the health response proves model access or carrier routing.

## Physical demo

Verified direct-to-Shield tests: the bank-code request produced `scam` / `held` and the owner confirmed the hang-up; a silent call produced `silent_caller` / `held` and the owner confirmed automatic hang-up. No real transcript or audio was stored. The initial silence test used the prior 14-second limit. Eight-second timing, accepted callback audio, Tello forwarding and restoration remain to be checked.

The user will roleplay the caller from their available test phone. Do not automatically call or message that phone. Begin by checking the Telnyx number directly, then test calling the enrolled mobile through Tello conditional forwarding. Record the actual carrier response to forwarding changes. Existing ordinary voicemail and phone settings were saved: Live Voicemail on, Screen Unknown Callers never, no custom forwarding.

For the recording, demonstrate a scam request causing an abrupt end, a completely silent call timing out, and a benign caller reaching the recipient's private acceptance step and two-way conversation after pressing 1. A contact removed from the address book can still be considered known by iOS if it was recently called. Use actual incoming-call evidence rather than assuming contact removal guarantees unknown-caller routing.

Restore forwarding and original Phone settings after the test. Ending a server test window or deleting Shield does not restore Tello forwarding. Do not release the Telnyx number while the carrier points to it. Full forwarding, callback audio, voicemail ingestion, and restoration remain separate physical checks.

## Sources

- [GPT Live WebSockets](https://developers.openai.com/api/docs/guides/voice-websockets?api=live)
- [Live delegation and tools](https://developers.openai.com/api/docs/guides/live-delegation)
- [Telnyx Stream](https://developers.telnyx.com/docs/voice/programmable-voice/texml-verbs/stream)
- [Telnyx media streaming](https://developers.telnyx.com/docs/voice/programmable-voice/media-streaming)
- [Cloud Run WebSockets](https://docs.cloud.google.com/run/docs/triggering/websockets)

### Contact and window follow-up — 10:06 PM Central

The owner reported the demo caller still rang normally and requested temporarily removing the email as well. The email was preserved with its original label in the ignored private restoration note, removed through iPhone Mirroring, and the saved contact visibly has neither phone nor email. The name is preserved. Restore both original fields after the unknown-caller rehearsal. No call history was deleted. Recent recognition remains a possible reason calls ring; the owner must use a regular cellular call, not FaceTime.

The existing window expiry was extended by exactly 15 minutes to September 24 at 10:24:51 PM Central with a conditional database update. No quotas or counters were reset; readback showed zero screenings used and no active call.

### Contacts-only Focus rehearsal — 10:21 PM Central

The user confirmed unattended calls reach Shield but requested silent, faster routing for the video. Created and enabled a separate Shield Demo Focus through iPhone Mirroring. Verified Allow Calls From = Contacts Only, Allow Repeated Calls = Off, Silence Notifications = Always, Show On Lock Screen = Off. No explicitly allowed people were added. Existing Share Across Devices is on, so Focus may also apply to the owner's other devices. This is a temporary iOS Focus-based contact rule; do not present it as Shield automatically detecting Apple Contacts. The phone's unknown-caller Silence and conditional forwarding remain in place. Actual ring suppression and forwarding timing await a fresh incoming call. The latest earlier forwarded session reached the bridge but ended screening_unavailable; do not count it as a completed successful screen.

Extended the existing supervised expiry another 15 minutes to 2026-09-25T03:39:51.332Z without resetting usage or quotas. Turn off Shield Demo Focus after the demo, and restore both saved contact fields.

### Demo stopped and phone restored — 10:41 PM Central

At the owner's request to stop everything, closed the supervised window and read back active=false, activeCall=false. Paused restore-demo-contact, ending scheduled follow-ups. Through iPhone Mirroring, turned Shield Demo Focus off and verified both original contact fields and labels after saving. Carrier responses confirmed Voice Call Forwarding Setting Erasure Succeeded for unanswered (##61#), busy (##67#), and unreachable (##62#). Restored the backed-up Phone settings: Live Voicemail on, Screen Unknown Callers Never; both visually verified. No call history or Telnyx resources deleted. The deployment remains available with screening disabled by the closed window. Fresh normal-call and voicemail delivery tests were not performed after restoration.
