# Twilio free-trial connection test

The current Twilio trial provides 75 voice minutes and permits speech gathering and spoken responses. It blocks `<Dial><Number>` and `<Record>`, which Shield's full private-acceptance and voicemail flows require. The hosted trial can verify an inbound caller introduction, screening result and app history, but cannot validate call transfer, voicemail protection or general scam-screening quality. See [Twilio's current Voice trial reference](https://www.twilio.com/docs/usage/trials/try-out-voice).

`backend/src/trial.ts` is a separate, bounded demo endpoint. By default it tests connectivity only; optional screening uses the configured model and the same deterministic decision rules as the full backend. It does not change `SHIELD_MODE`, load the participant database, register the app's authenticated API, place outbound calls, record audio, or change carrier forwarding.

## Hosted Firebase trial

The serverless replacement is deployed at `shield-calls-isaac.web.app`; see [the Firebase runbook](FIREBASE-SERVERLESS-PLAN.md). It keeps the same private verified-caller restriction but stores call state, budgets and iOS history in Firestore. Gemini runs in an awaited event function, and Soniox prompts are static Hosting assets. Live auth/history tests passed and a synthetic event completed in 4,644 ms. The Firebase-connected app is installed on the iPhone.

Twilio’s Inbound → Custom POST webhook now points at Firebase; the console confirmed “Test scenario saved.” The Mac listener and tunnel are stopped. One ten-call window opened on September 21 at 18:31:34 America/Chicago and expires at 19:31:34. Firestore recorded the first real call, its `routine/appointment` result after 4,288 ms, and the result callback; the encrypted job was removed. The user confirmed hearing the result and seeing “Appointment reminder,” “Missed,” and the real caller number in Shield. Firebase confirms the owner’s verified-email sign-in. “Missed” reflects that the trial never connected the call to the participant. Do not print the private webhook URL or reset the window during troubleshooting. A later supervised window requires an explicit `node scripts/activate-cloud-trial.mjs` operation; expiry never reopens access automatically.

## Legacy local trial with an HTTPS tunnel

1. Copy `.env.twilio-trial.example` to `.env.twilio-trial` and restrict it to the current macOS account (`chmod 600 .env.twilio-trial`). Use the existing Twilio account SID and auth token, the trial number shown under **Inbound**, and your already-verified caller number. Never paste the token into chat, commit it, or add it to the iPhone app.
2. Start a temporary HTTPS tunnel to the separate loopback listener on port 3001. For the official Cloudflare client:

   ```sh
   cloudflared tunnel --no-autoupdate --url http://127.0.0.1:3001
   ```

   A verified copy may also be available at `artifacts/tools/cloudflared`. This public tunnel is for the isolated test listener only, not port 3000 or the participant API. Cloudflare transports the requests; use synthetic spoken details. [Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/) are temporary development endpoints, not production hosting.
3. Set `TRIAL_PUBLIC_BASE_URL` to the resulting bare HTTPS origin, without a path. Start the receiver:

   ```sh
   npm run trial:voice
   ```

4. Confirm `GET /healthz` returns `{"status":"ready","mode":"voice-trial"}`. An unsigned `POST /voice/inbound` must return 403. This standard endpoint accepts only Twilio-signed requests for the configured account, trial number, and verified caller. Every field is covered by the Twilio signature.
5. In Twilio **Try out Voice → Inbound → Custom**, select that verified caller and save `POST https://YOUR-TEMPORARY-HOST/voice/inbound` as the webhook.
6. Call the trial number directly from the verified phone. The demo says **“Hello, what's your reason for calling?”** Use a made-up introduction, such as “I'm Alex from the delivery company, calling about a package.” Stay on the call to hear the result. This private synthetic demo omits the full service's longer disclosure; do not forward your personal number or enroll other callers into this test.
7. Listen for confirmation that the introduction reached Shield. The local receiver logs `call_received` followed by `introduction_received`; silence produces `no_speech_received`. Those events contain no transcript, caller number, CallSid, or credential. Twilio's own transcription and logging policies still apply. Inspect Twilio's trial Logs for the real call result before claiming the provider test passed.

The default run accepts at most 10 calls and expires after 60 minutes. Each introduction callback must match a prior call and arrive within two minutes; duplicate or late callbacks end without accepting another introduction. The call budget is per receiver process and resets when that process restarts. Twilio separately enforces its account trial limits. No payment or upgrade is needed for this connection test.

## Trial interceptor compatibility

During the 2026-09-21 provider test, a call reached the endpoint without `X-Twilio-Signature`. The receiver correctly returned 403, and the caller heard Twilio's “could not reach your server” message. This is an observed behavior of this account's trial path, not a reason to disable signature validation in the production backend. Twilio's general [webhook security documentation](https://www.twilio.com/docs/usage/webhooks/webhooks-security) describes signed requests; the [trial documentation](https://www.twilio.com/docs/usage/trials/try-out-voice) describes an intermediary that fetches and sanitizes custom TwiML.

An optional compatibility route is available for this isolated, synthetic test:

- Generate a fresh 32-byte random secret and save its 64-character lowercase hex representation as `TRIAL_PROXY_SECRET` in the private trial environment file. Treat the resulting URL as a credential. Leave the field empty to disable these routes entirely.
- Save `POST https://YOUR-TEMPORARY-HOST/trial/SECRET/inbound` in the trial console. The generated speech callback includes the same secret. Share this URL only with Twilio through the approved HTTPS tunnel; do not put it in documentation, chat, screenshots, or logs.
- The receiver checks the secret in constant time, validates the configured account and numbers, then fetches the referenced call through the authenticated Twilio REST API. The provider's record must independently match the account, caller, destination, direction, and CallSid. The call must be ringing/in-progress and no more than two minutes old. Lookup failures and timeouts reject the request.
- Both the greeting and speech callback require this verification. The existing call budget, session expiry, callback ordering, and replay controls still apply. `/voice/*` still requires a valid Twilio signature even when compatibility is enabled.

This authenticates access with a temporary bearer URL plus provider call verification; it does **not** recreate a signature over the transcript. Keep this mode limited to synthetic testing. It does not expose the app API, save transcripts, or control any transfer. Remove the secret and restore the signed endpoint for normal provider integration. Fixed rejection codes in the local log identify a failure without logging payloads, secrets, or caller data. A callback that arrives after hangup is rejected: keep the call open until the final spoken result.

## Optional Gemini screening

Follow [MODEL-SETUP.md](MODEL-SETUP.md), verify provider credits and the model smoke suite, then set `TRIAL_SCREENING_ENABLED=true` in the private trial environment file and restart the receiver. The trial script loads `.env.openrouter` and `.env.speech` if present. No credentials are needed in the iPhone app.

The caller's synthetic speech transcript goes to OpenRouter and the selected Google model endpoint. Only the introduction text is sent: Shield does not attach the caller number, CallSid, account SID, or app data. Personal information spoken inside the introduction would still be part of that text; use made-up details.

The introduction callback immediately returns “One moment” and a bounded TwiML redirect. A single model request runs within the configured deadline; authenticated result callbacks retrieve the fixed verdict. This avoids blocking Twilio's five-second fetch window. The flow stays below the trial's ten-hop limit, performs no model retry, and never transfers the call. An unavailable model is reported as unavailable, never cleared as routine. The server logs only the route, fixed reason code, and elapsed time.

## Soniox playback

`TTS_PROVIDER=soniox` selects cached Soniox audio for every spoken trial prompt. The voice is Adrian (`tts-rt-v2`); the greeting is exactly “Hello, what's your reason for calling?” and lasts about 2.35 seconds. `npm run speech:prepare` generates missing fixed prompts using the backend-only key. Audio is MP3 at 24 kHz/64 kbps. Completed assets are cached by recipe and verified by content hash, so calls do not perform TTS generation or pay for it repeatedly.

Public `/speech/<hash>.mp3` URLs contain only fixed product copy and no webhook secret. Unknown filenames, path traversal, private manifests and arbitrary generation requests are not served. No caller or model text is synthesized. Twilio `<Gather>` continues to provide speech recognition. Switching to Soniox STT would require a different audio integration; it has not been enabled.

## Stop or resume the legacy local trial

Stop the receiver and tunnel with Control-C in their owning terminals. Remove the custom inbound webhook or restore Twilio's predefined Speech Recognition scenario in the console. Restarting a Quick Tunnel normally produces a different hostname; update both `.env.twilio-trial` and Twilio before testing again. The Mac must remain awake while it hosts the endpoint.

This setup does not make the physical iPhone's existing localhost demo connection work across the internet. Use **Explore the demo** for the app's synthetic data. A connected app pilot requires the authenticated HTTPS API and the deployment/enrollment steps in [DEPLOYMENT.md](DEPLOYMENT.md) and [OPERATIONS.md](OPERATIONS.md).

## Verification status

- On 2026-09-21, the existing credential was saved through a one-time localhost password form to a gitignored file with mode `0600`. A read-only Twilio API request authenticated successfully and confirmed an active Trial account. No deposit, upgrade, outbound call, or number purchase was made.
- Automated trial tests cover signature and account/number checks, tampering, callback order/replay, missing speech, expiration and call budgets, HTTPS requirements, and avoiding unsupported TwiML verbs.
- Latest local verification: 95 backend tests across nine files, plus ten Firestore emulator integration tests, type checking and compilation passed, including model, trial, cached audio and Firebase-auth contracts.
- After explicit approval for the test number, call metadata, and synthetic introduction transcript to pass through Cloudflare, the temporary HTTPS tunnel and receiver were started. Public checks returned 200/ready for `/healthz`, 403 for an unsigned `/voice/inbound`, and 404 for `/api/calls`.
- Twilio's Inbound → Custom configuration was saved with the HTTPS `/voice/inbound` endpoint and POST method. Reloading the console and reopening Inbound confirmed that the URL and method persisted. After the first two inbound attempts, the console showed 73 free voice minutes.
- Real inbound calls appeared in the Twilio API, but the trial log panel remained empty. A retry with fixed-code diagnostics reached Shield and was rejected with `missing_signature`. The public health endpoint remained reachable. Twilio's Monitor alerts API was unavailable on this trial; no upgrade was attempted.
- After specific approval for the authentication change, the receiver was restarted with a fresh private secret and Twilio confirmed “Test scenario saved” for the compatibility URL. Public health remained 200/ready and an unsigned standard `/voice/inbound` remained 403.
- An earlier real call reached the greeting, but its speech callback arrived after hangup and was rejected as `call_not_active`. This was superseded by the completed call below.
- The user funded OpenRouter. `google/gemini-3.7-flash` matched all 16 synthetic cases with a five-second deadline (the earlier 3.5-second run timed out on two). There were zero inappropriate offers in this small suite.
- After explicit approval for live trial screening/data sharing, Soniox + Gemini were enabled. On the next real call, the receiver logged `call_received`, `introduction_received`, and `trial_screened` with `route=message`, `reason=uncertain`, `elapsedMs=3357`. The user confirmed hearing both the greeting and screening result. No caller transcript was logged.
- Firebase is deployed with zero minimum instances and its signed iPhone app installed; see [the active Firebase plan](FIREBASE-SERVERLESS-PLAN.md). Twilio’s webhook was switched successfully and the Mac listener/tunnel stopped. The first hosted call completed screening, persisted owner-scoped history, and was confirmed by the user both audibly and in Shield. The owner’s real verified-email sign-in is recorded in Firebase.
