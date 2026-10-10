# Implementation and verification status

Recorded 2026-09-21. This distinguishes implemented behavior from evidence that it works with real providers and phones.

The deployed Firebase runtime is the private trial. Transfer, voicemail, and carrier-acceptance rows below refer to the separate legacy PostgreSQL runtime, which is not deployed.

## Completed software

| Component | Status |
| --- | --- |
| Twilio voice backend | Implemented, signed webhook and lifecycle tests pass with synthetic provider fixtures |
| Trial phone demo | User confirmed Soniox greeting and final Gemini result; real speech callback and 3,357 ms screening observed through the approved private trial route |
| Hosted trial connection | Twilio custom POST webhook saved to Firebase; Mac listener/tunnel stopped; first hosted call persisted owner-scoped history and completed `routine/appointment` screening in 4,288 ms; user confirmed the audio result and real call in Shield |
| Screening providers | Direct OpenAI and OpenRouter adapters implemented; funded Gemini 3.7 Flash matched 16/16 synthetic cases at a five-second deadline |
| Speech | Active trial uses Twilio TTS/STT; Soniox disabled at the user's request. Its optional cached fixed-prompt implementation remains available locally |
| Private acceptance | Server requires the original caller to remain active, verified child-parent/destination relationship, eligible participant, current offer, and private digit 1 |
| Concurrency and failures | Durable one-off offer attempt, single active participant offer, anti-loop guard, deadlines, global/person quotas and child reconciliation |
| Storage and jobs | Encrypted fields/audio, durable job retries and provider purge, expiry; local PostgreSQL-compatible PGlite exercised |
| Authentication and sharing | Firebase email-link/Admin SDK adapter implemented, Supabase retained as an explicit legacy option; sharing boundaries tested locally; Firebase Auth initialized; live email-link exchange, token refresh/revocation and owner-data isolation passed with a disposable synthetic account |
| Operations | CLI and unvalidated templates for profiles, enrollment, supervised tests, activation, pause, restoration and requested local data purge |
| iOS source | 53 Swift app files, native controls, Firebase email-link handling, app/extension/UI-test targets, generated project and semantic light/dark assets |
| Message extension / APNs | Implemented and configured, disabled or unavailable without deployment credentials; no physical integration evidence |
| Deployment | Shield linked to existing Blaze billing; Firestore Standard database, indexes and deny-all rules deployed; Firebase Auth initialized. Three serverless functions and Hosting deployed; every minimum instance count is zero; runtime secrets/permissions and trial owner configured |

## Checks actually run

- Latest `npm run check`: TypeScript typecheck, **95 tests across 9 files**, plus **12 Firestore emulator integration tests**, and server build passed. Model, trial-flow and Firebase adapter contracts use controlled fixtures. The follow-up call-flow change uses Twilio speech, faster early polls and per-call worker preparation; see [latency measurements](CALL-LATENCY.md).
- After adding Firebase Admin SDK 14.4.0, a scoped `gaxios@6` → `uuid@11.1.1` override addressed its optional storage dependency's UUID advisory. That HTTP client uses the unchanged UUID v4 API. The current root dependency audit reports zero vulnerabilities for 486 packages; the isolated Firebase package audit reports zero for 340 packages.
- `npm run demo:setup` and `operator doctor`: local encrypted demo database initialized; no live providers configured.
- Real local HTTP smoke: health/readiness, authentication rejection, populated synthetic overview, held filter and caregiver owner-action denial passed. The first smoke invocation omitted the required participant-selection header for a caregiver; the corrected request passed. This was a harness correction, not a provider test.
- Xcode project generation, property-list validation, and the iOS simulator build passed with Xcode 27. Two source concurrency warnings were fixed. Xcode opened the project, selected iPhone 17, and launched Shield; simulator installation and the running application process were verified. Build log: `artifacts/xcode/build.log` (local, gitignored).
- Development signing under Wheema, Inc. (`6R6HMW3DWN`), bundle `org.isaaczhang.Shield`, physical-device build, app/extension signature validation, and installation/launch on the user's iPhone were verified. The user confirmed real hosted call-history sync. APNs and App Store distribution remain unverified.
- The Twilio Trial account authenticated. The trial proxy omitted the normal signature; an explicitly approved secret route plus provider call lookup restored connectivity. After separate approval for OpenRouter/Google screening, the user confirmed the Soniox greeting and final result; logs record a speech callback and `message/uncertain` decision in 3,357 ms. Earlier hung-up calls were rejected correctly. See [TWILIO-TRIAL.md](TWILIO-TRIAL.md).
- After the user funded OpenRouter, Gemini matched all 16 synthetic cases at five seconds with zero unavailable results or inappropriate offers. An earlier 3.5-second run had two timeouts. Report: `artifacts/evaluations/model-1790028019118.json`. These checks do not measure real-world fraud accuracy.
- Soniox REST generation succeeded for all 11 static prompts. The greeting was verified as an MP3 and fetched over the public tunnel with HTTP 200. Public media URLs contain no webhook secret; no caller text is sent to Soniox.
- Firebase CLI authentication was already available. Project `shield-calls-isaac` and its iOS registration were created. The revised serverless setup is linked to the existing billing account; Firestore and its rules/indexes are deployed, and Firebase Authentication is initialized. No always-on SQL or compute was created.
- The Firebase iOS source passed an Xcode simulator build. The standalone email-link checks passed two valid links and rejected ten invalid/cross-domain cases. The Firebase-connected build was signed under Wheema and installed on the physical iPhone. Firebase records the owner’s verified-email sign-in at 18:33:17 America/Chicago on September 21; the user confirmed the real hosted call in Shield.
- A fresh substitute source reviewer resolved six material findings: invalid Section initializers, authentication-session races, stale person navigation, stale filter/access responses, light-mode teal contrast and UI-test selectors. Final verdict is **source-only**; no visual approval.
- App icon is original geometric vector artwork rasterized by a local generator. No external raster imagery or third-party Swift frameworks were added.

## Not verified or not provisioned

| Remaining item | Why |
| --- | --- |
| UI-test execution, screenshots, accessibility/device QA | Compilation and simulator launch passed; the Device Hub window-inspection tool timed out, and full UI/device QA remains unperformed |
| Full Twilio number/media/fallback behavior | Trial greeting, speech callback and screening result verified; full private acceptance, recording, and dedicated pilot number remain unverified or unavailable on the trial |
| Actual carrier forwarding and callback acceptance | Physical phone matrix remains **NOT RUN** |
| Model accuracy at pilot scale | Provider schema compatibility and one real-call model duration are verified; only a small synthetic suite has passed, with no broad speech/fraud evaluation |
| Broader authentication device QA | Owner verified-email sign-in and real iPhone history succeeded; synthetic token refresh/revocation passed. Other email providers, cold-launch link variations and multi-device behavior remain untested |
| APNs and IdentityLookup network deferral | Device signing works; push and message-filter provider configuration are still pending |
| Deployment privacy/consent/App Store review | Service owner, operating region and vendor controls still need final configuration/review |

The user made real inbound trial calls and funded OpenRouter. The agent verified live synthetic Gemini inference, generated fixed Soniox audio, enabled the explicitly approved trial, and created the Firebase project/iOS registration. After the revised setup authorization, Shield was linked to the existing billing account and its Firestore database/rules/indexes and Firebase Auth were initialized. No agent-initiated deposit, paid Twilio upgrade, outbound call, authentication email, push notification, number purchase, or App Store submission was performed. The Firebase app API is deployed and its signed iPhone build installed. Twilio now points to Firebase; the Mac listener and tunnel are stopped. The user confirmed both the first hosted screening result and its call-history entry in Shield, titled “Appointment reminder” with the real caller number and “Missed” status.

## Practical boundaries

This implementation screens selected forwarded calls; it cannot intercept every native iPhone call. It does not authenticate identity, guarantee scam detection, monitor an accepted conversation, or provide emergency response. Family access is consent-based and cannot control another person’s carrier settings through the app.

Restoration and provider-account cleanup are assisted operations. Local account purge queues provider recording deletion but does not itself delete a managed-auth user, erase every vendor log, or release a phone number. Secret rotation and backup restoration require controlled operational procedures. The current documentation and tests support a build handoff and a controlled pilot-validation phase, not a claim of production readiness.

The hosted runtime is deployed from `backend/src/cloud`. Live tests verified email-link exchange, token refresh/revocation, owner isolation, encrypted history DTOs including Swift UUID casing, a fixed Soniox MP3 hash, and nonexistent-call rejection. A genuine Firestore-created event completed a synthetic Gemini appointment classification in 4,644 ms. Its trigger requires `scripts/finalize-firebase.mjs` to grant the existing runtime identity private invocation. The temporary test account and fixture records were removed. The user approved the previously blocked provisioning step and it completed successfully. After Twilio’s webhook switch, the first real hosted call began at 18:32:18 America/Chicago on September 21. Screening completed 4,288 ms after the introduction was received, and the result callback was returned to Twilio. Its encrypted job was removed. The trial window expires at 19:31:34 that day and does not renew automatically. The user confirmed hosted audio and the real call in Shield; Firebase confirms verified-email owner sign-in.


### Guided forwarding setup — 2026-09-24

Shield now opens forwarding setup directly from Today and guides the enrolled Tello owner through contact saving, a real sound check, phone settings, individual carrier codes and an automatic forwarding check. Large persistent actions, high-contrast instructions, saved progress and retry states replace the helper handoffs. The deployed API starts bounded test windows and fixed-recipient probes with authenticated evidence and concurrency/usage limits. See [FORWARDING-PILOT.md](FORWARDING-PILOT.md) for verified software checks and the remaining physical carrier checks. No always-on validation is claimed.
