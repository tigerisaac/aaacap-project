# Supervised Tello forwarding pilot

The native setup follows Calm with a guided, resumable flow: consent, one-tap contact save, automatic sound check, one phone setting per screen, three individual Tello codes, automatic forwarding check, conversation checks and restoration. **Today → Phone setup and call tests** opens this flow directly. Email sign-in remains in place for the existing enrolled owner; directory matching alone is not authentication.

The Firebase implementation adds `/api/forwarding` and signed `/forwarding/…` webhooks. It is a single-recipient supervised pilot, not a validated always-on service. The sound-check probe has passed on the owner’s phone. Full forwarding, screened callback audio, voicemail and restoration checks remain pending.

## Guided setup — 2026-09-24

The owner can start the bounded window inside Shield; an operator handoff is no longer required. The main action stays at the bottom, Previous step is in the navigation bar, progress is saved remotely, and contacts are reused on retries. Instruction text has opaque high-contrast colors. The final signed guided-flow build is installed on the connected iPhone. After the owner unlocked the phone, remote launch succeeded. The installed guided flow is running on the physical iPhone.

- `POST /api/forwarding/test-window` requires the enrolled owner, provider-specific consent, the verified fixed recipient, provisioned routing, data plan, saved restoration guide and an explicit any-caller scope. Repeated taps cannot extend an active window or reset its consumed calls. At most three new windows per UTC day.
- `POST /api/forwarding/probe` starts a sound or forwarding check. It accepts no destination. Each call uses the configured enrolled number, a 40-second ringing timeout, a 30-second connected limit, and no recording. Six checks per UTC day; concurrent/retried requests reuse the waiting reservation. Ambiguous provider failures do not auto-redial.
- A sound check passes only after the signed, bound outbound call supplies digit 1. A forwarding check plays a per-attempt eight-digit challenge across the outbound call; the separately bound inbound call must receive that challenge before Shield reports that a forwarded call reached it. Merely answering, receiving a status event or confirming a carrier code never passes this check. Pending evidence expires after 90 seconds and restoration blocks it immediately.
- The checks do **not** set `lastTestAt`, promote the participant out of setup, or certify busy/unreachable routing, saved callers, screening quality, two-way conversation audio or voicemail playback. The app names those remaining checks.
- iOS public APIs cannot directly change Phone settings or dial supplementary-service codes containing `*` or `#`. The app explains those protected steps, offers code copying, saves progress, and confirms the resulting call automatically. The installed Debug pilot now tries a Phone-settings URL verified on the physical iPhone. Release builds exclude that undocumented URL and use Apple’s CallKit settings opener, then the app-settings opener as fallback. Returning from Settings or acknowledging a choice never proves routing.

Validation for this change: 102 unit tests and 48 Firestore integration tests pass (two provider-inapplicable cases skipped); four guided UI tests pass. The final appearance pass also passed actual dark mode and the largest Dynamic Type size; the exported screenshots were visually reviewed. The live `shieldApi` update is deployed; health/readiness return 200, unauthenticated test requests 401 and unsigned probe instructions 403. Real carrier validation remains pending until the owner's in-app tests supply evidence.

References: [Apple telephone URL restrictions](https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/PhoneLinks/PhoneLinks.html), [Telnyx DTMF playback](https://developers.telnyx.com/docs/voice/programmable-voice/texml-verbs/play), [official Telnyx call API definitions](https://github.com/team-telnyx/telnyx-node/blob/master/src/resources/texml/accounts/calls/calls.ts).

### Step 3 Settings shortcut

Both Phone-setting screens now begin with **Open Phone settings**. In the installed development build, `App-prefs:com.apple.mobilephone` opens the Phone page directly; a physical-device UI test confirmed the Phone navigation title and automatic return handling without changing a switch. The app persists the pending step across interruption, refreshes service state on return, and requires the owner to confirm the desired value. It cannot read Screen Unknown Callers or Live Voicemail through public iOS APIs. The later call probe remains the routing check, and does not certify the individual switch values.

Public fallback: `CXCallDirectoryManager.openSettings()` opens Call Blocking & Identification inside Phone; instructions explain going back one level. `UIApplication.openSettingsURLString` is the final fallback. A visible recovery path covers accepted URLs that land on an unexpected page. The undocumented shortcut is compiled only in Debug. Source: [developer’s first-hand Phone URL report](https://developer.apple.com/forums/thread/759900), [Apple CallKit opener](https://developer.apple.com/documentation/callkit/cxcalldirectorymanager/opensettings(completionhandler:)).

Validation: six simulator UI tests passed, including return/fallback behavior and guided progression; screenshots reviewed. One actual iPhone UI test passed the real Settings round trip. The update is installed and the normal app was relaunched; the temporary UI-test runner was removed. The live sound-check probe reports `passed`, while the forwarding probe has not passed.


### Phone app shortcut

Each activation and reset code now starts with **Copy code and open Phone**. It copies only to this device with a 30-minute expiry, then runs the installed **Shield Open Phone** Apple Shortcut. The shortcut contains exactly one action, **Open App → Phone**. No number, carrier code or clipboard input is passed to Shortcuts. The owner’s shortcut was created through Apple Shortcuts, synced to the iPhone and exported as an [Apple-validated installation file](shortcuts/Shield%20Open%20Phone.shortcut). A new phone/account must install that shortcut first; deleting or renaming it breaks the automatic handoff. See [shortcut details](shortcuts/README.md).

Phone opens to its existing page; the screen explains choosing Keypad, pasting and tapping Call. A repeat action refreshes the code and reopens Phone. Copying or returning never advances a step or verifies a Tello change. The owner still confirms each carrier response, then the real forwarding probe supplies routing evidence. Moving between steps clears copied state, and missing/expired activation codes must restart the test window before advancing.

Validation: seven simulator UI tests passed for guided progression, failure recovery, appearance and accessibility. The final physical iPhone test passed two complete Phone handoffs and returns, asserted no active call, preserved the current code step and kept forwarding unverified. The Debug UI preview now stays awake during tests; the normal app retains ordinary screen-lock behavior. Direct Phone navigation schemes did not provide a usable app-only handoff on this iPhone; an empty telephone link produced a blank Call prompt and was not used in the final app. The Shortcut route avoids that prompt. Reference: [Apple Shortcuts URL support](https://support.apple.com/guide/shortcuts/apda283236d7/ios), [Apple telephone URL restrictions](https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/PhoneLinks/PhoneLinks.html).

## Provider change — 2026-09-24

The user chose **Telnyx** instead of funding Twilio after the checkout showed a $20 minimum. The prior Twilio funding approval is superseded; no payment was submitted by the agent. The live forwarding adapter now uses Telnyx; the supervised callback window remains closed pending native consent and real call tests. Do not run the Twilio provisioning instructions below as the next step.

Telnyx is now **Paid**, with $10 funded by the user and auto-recharge disabled. The user approved the quoted $2 number order ($1 setup + first month) and $1/month rental. **+1 507 473 1802** is purchased and Active. The account menu later showed $8.77 available. A `shield-forwarding-pilot` API key was created with explicit approval; its private-file handoff is complete. The account UUID, verification key, DID and application settings are validated and saved privately. The TeXML adapter, dynamic iPhone provider disclosure and operator setup utility are implemented locally; 101 unit and 36 database-backed tests passed. Telnyx routing and all four Firebase functions are deployed with private runtime version 2; health and authentication checks passed. No real Telnyx call has passed. See the detailed checkpoint in [TELNYX-REALTIME.md](TELNYX-REALTIME.md).

The user also asked whether OpenAI Realtime can replace the Gemini screening pipeline. See [Telnyx and Realtime evaluation](TELNYX-REALTIME.md) for the proposed architecture, costs, integration gaps and activation requirements. This is an evaluation recommendation, not a deployed Realtime implementation.

## Existing implementation blocker

The connected provider account is an active **Twilio Trial** using Try out Voice. The configured trial number is not an owned `IncomingPhoneNumber`. This trial blocks `<Dial><Number>` and `<Record>` and restricts callers to verified numbers. It cannot perform this forwarding pilot. A paid account and regular voice-capable US number are required before carrier changes. Do not point Tello at the existing trial number.

The user confirmed Tello, one active line, and a plan that includes mobile data. Their connected iPhone is an iPhone 12 Pro Max running iOS 27. They authorized any caller during the supervised test; no friend-number allowlist is required.

## Deployment checkpoint

The signed Telnyx-disclosure app update is installed on the connected iPhone. Launch after installation was blocked by the phone being locked; unlock and open Shield manually. The earlier onboarding build passed both simulator UI tests; the provider-label update also passed a signed device build.

The user explicitly approved the hosted update. The API, screening, cleanup, hosting and audio index setting are deployed, and the new voicemail worker grants invocation only to the existing private Shield runtime. The live composite index definitions were normalized to omit their implicit document-ID ordering; this preserves both existing indexes and avoids the CLI's duplicate-index error. No indexes were deleted.

Post-deployment checks passed: public health/readiness, unauthenticated setup/restore rejection, unsigned forwarding-hook rejection, private worker permissions, and encrypted audio indexing disabled. The isolated synthetic-account test also passed email-link exchange, owner-data isolation, encrypted history and native UUID handling, token refresh and revocation; the fixture was removed. No email or telephone call was sent by these checks.

The operator control is provisioned, records the confirmed Tello data plan and restoration guide, and has no provider blocker. Callbacks remain disabled pending the new Telnyx consent and supervised test. No physical forwarding, callback or voicemail test has run.

The Twilio upgrade reached the payment step, but the user rejected its $20 minimum and selected Telnyx. Telnyx credential handoff, routing configuration and deployment are complete. Native consent and real call testing are next. The earlier Twilio payment approval must not be used.

## Previous Twilio setup procedure — reference only

1. Assign an owned voice number to the existing paid account. Update `TRIAL_TWILIO_NUMBER` in the private runtime and deployed `SHIELD_RUNTIME` secret consistently, preserving the account, recipient, participant ID and encryption key. Do not print credentials or private webhook URLs. Deploy the named API, screening and voicemail functions against the updated secret.
2. Record the owner's original forwarding, Screen Unknown Callers and Live Voicemail settings. Check that carrier voicemail works before changing routing. Save the restoration instructions in ignored `artifacts/private/tello-restoration.json`: `{ "originalSettingsRecorded": true, "steps": ["…", "…", "…"] }`. Use the actual previous settings; do not invent a voicemail destination.
3. Run `node scripts/manage-forwarding-test.mjs prepare`. It requires an active Full account and exact owned voice number, backs up the number's webhooks in a private file, configures signed hooks and reads them back. It leaves callbacks disabled.
4. The owner reviews consent and saves the assigned Shield contact in the app. Open one window using `node scripts/manage-forwarding-test.mjs open --allow-any-caller`. No deployment or restart opens a window automatically.
5. Owner sets **Settings → Apps → Phone → Screen Unknown Callers → Silence**, and **Live Voicemail → Off**. Do not turn voicemail off in the Tello account. Owner enters the three in-app conditional codes, one at a time, confirming each carrier reply. Do not use unconditional forwarding.

## Physical checks — all NOT RUN

| Check | Required evidence |
| --- | --- |
| Unknown incoming caller | Friend calls owner's mobile; carrier forwards it; friend hears Shield's introduction prompt; matching service events appear |
| Saved caller | Saved contact rings normally; no screening callback is required |
| Explicit acceptance | Shield callback rings; owner hears private summary; pressing 1 enables two-way audio |
| Decline | Press 2; caller leaves a message; encrypted message becomes playable in the owner's app |
| Missed / rejected / unavailable recipient | No acceptance means no bridge; original caller reaches voicemail; no repeated callback loop |
| Held introduction | Sensitive-account / unsafe request is held without offering a callback |
| Restore | Original routing and iPhone settings restored; ordinary incoming call and Tello voicemail both confirmed |

A removed contact may still be treated as known if the owner has recently called the number. Prefer a number the iPhone has never called. Do not delete contacts or call history automatically. Server events alone do not establish what the users heard or whether audio worked.

Run `node scripts/manage-forwarding-test.mjs close` to stop callbacks and show restoration. Ending the window or deleting the app does **not** undo carrier forwarding. Tello documents `##61#`, `##67#`, and `##62#` to deactivate the respective conditions; restore any previously customized settings from the saved guide. Verify actual carrier voicemail afterward. Never delete/release the Shield number while carrier forwarding still targets it.

## Boundaries and validation

The window admits at most ten screenings in thirty minutes, one active callback, with five-minute connected calls. Non-eligible calls go to up-to-sixty-second voicemail. A fifty-inbound-call daily cap bounds pilot recording exposure; this is not suitable for leaving a normal line forwarded unattended. Callback loops from the Shield number are rejected. REST verification binds the whisper to the correct outbound child, parent call and fixed recipient. Only that child pressing 1 bridges. All hooks require provider signatures; the restricted trial compatibility route remains separate.

Introductions use the existing encrypted transient screening job. Connected conversations are not recorded. Voicemail downloads from the fixed authenticated Twilio origin or from an explicitly allowed Telnyx storage host after provider ownership verification, is size bounded and encrypted before storage, and the provider copy is deleted after ingestion. Owner/shared-listening permissions protect playback; deletion and retention are enforced. Firestore denies direct client access. Account deletion remains blocked until an operator has restored and verified the phone; the pilot deliberately has no automatic validation endpoint.

Validation: the Telnyx update passed 101 unit tests and 36 Firestore integration tests across both providers (two provider-inapplicable cases skipped). Native setup progression and the largest Dynamic Type size passed in two simulator UI tests. A signed physical-device build succeeded and was installed. These are software checks, not carrier validation.

Sources: [Tello forwarding](https://tello.com/help_center/device-settings/how-can-i-set-up-call-forwarding), [Tello voicemail](https://tello.com/help_center/device-settings/how-do-i-set-up-access-my-voicemail), [Twilio trial restrictions](https://www.twilio.com/docs/usage/trials/try-out-voice).
