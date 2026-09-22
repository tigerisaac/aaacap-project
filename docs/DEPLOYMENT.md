# Deployment

This is a pilot implementation, not a verified carrier service. Local tests, physical app installation and trial telephony setup have been performed; current provider evidence is in [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md) and [TWILIO-TRIAL.md](TWILIO-TRIAL.md). Firebase Hosting, Firestore and three scale-to-zero functions are deployed. Twilio remains on its current trial.

## Infrastructure

The selected platform is Firebase in the dedicated project `shield-calls-isaac`. The user declined the [always-on Cloud Run/PostgreSQL proposal](../deploy/google-cloud/README.md), which produced the approximately $55/month baseline. **Do not deploy that manifest.** The project is linked to the existing billing account; Firestore and Firebase Auth are initialized. The [serverless implementation and deployment status](FIREBASE-SERVERLESS-PLAN.md) uses Firestore plus request/event-driven functions that scale to zero. The runtime is deployed with approved Secret Manager credentials, scoped IAM and owner enrollment. Live synthetic auth/history and model-job checks passed; the signed Firebase-connected app is installed on the iPhone. Twilio now points at Firebase, and the old Mac listener/tunnel are stopped. The user confirmed hearing a real hosted screening result and seeing the call in Shield; Firebase confirms the owner’s verified-email sign-in.

## Legacy PostgreSQL runtime (not the selected deployment)

For the separate legacy runtime only, use one always-on Node process initially, HTTPS ingress, and a private PostgreSQL database. The worker runs every five seconds in the API process; a host that sleeps or suspends execution is unsuitable. Embedded PGlite is only for local demos and tests. The production `pg` driver and container have not been exercised against a live database/container on this Mac.

1. Create a private database with encrypted storage/backups, a restricted database user, and certificate-verified TLS to the backend. Use a separate database or private schema; never expose Shield tables through a public database API. Startup installs versioned additive schema changes under a PostgreSQL advisory lock.
2. Copy `.env.example` to a secret store or gitignored `.env.production`. Set `NODE_ENV=production`, `SHIELD_MODE=live`, `HOST=0.0.0.0`, a bare HTTPS `PUBLIC_BASE_URL`, and `DATABASE_URL`. Set a random 32-byte hex `DATA_ENCRYPTION_KEY` using a secret manager. Losing this key loses access to encrypted data; do not replace it without a migration. Back up the key separately from the database.
3. Configure Twilio and Firebase authentication as below. Keep `LIVE_OFFERING_ENABLED=false` and `SMS_CLASSIFICATION_ENABLED=false` during setup. Configure a monitored `SUPPORT_EMAIL` before enrollment.
4. Build with `npm ci && npm run check`, then `npm start`, or build the supplied Dockerfile. `deploy/compose.yaml` publishes only to host loopback and expects `.env.production`, a separately managed database and a TLS reverse proxy. Docker is not installed here, so the container recipe has not been run.
5. Route requests without rewriting the webhook path, query, or form fields. `PUBLIC_BASE_URL` must exactly match Twilio’s external origin. Trust forwarded IP headers only for a known proxy chain: set `TRUSTED_PROXY_HOPS` accordingly and prevent clients from connecting directly to the backend port. Default is zero.
6. Check `/healthz` and `/readyz`; inspect `operator doctor` and unresolved jobs. Suppress request bodies, authorization headers, message text, recordings, and query strings in proxy/APM logs. Application logs deliberately omit payloads and provider errors. Set provider spend alerts and usage limits outside the app as a second budget control.

Pin and scan production container images in your release process; the supplied Node image tags are starter configuration. Use an encrypted backup with a documented expiry and test restoring it. A database restore also requires the matching encryption key and a review of deletion requests since that backup.

## Twilio

For a no-deposit connectivity demo, use the isolated [Twilio trial test](TWILIO-TRIAL.md). The current trial blocks the number-dialing and recording verbs needed by the full service below; a successful introduction test does not establish live transfer or voicemail behavior.

Set `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` in the server secret store. Use an account/subaccount dedicated to the pilot, with constrained outbound geographic permissions and spend alerts. Do not enable call recording globally.

For each **already-owned, voice-capable** dedicated DID, configure:

| Setting | Value |
| --- | --- |
| Incoming voice | `POST https://YOUR_HOST/voice/inbound` |
| Call status callback | `POST https://YOUR_HOST/voice/status` |
| Independent fallback | Separately hosted static Hangup TwiML from `deploy/fallback.xml` |

The backend emits child-leg status callbacks, private `<Number url>` prompts, Gather actions and recording callbacks. All dynamic voice endpoints validate the Twilio signature against the configured public origin and all form parameters, plus the account SID. Enrollment checks ownership of the DID and the voice/status webhook URLs and methods. It does not purchase or release numbers.

Test Twilio’s actual behavior when private-leg TwiML cannot be fetched. A signed `/voice/fallback` endpoint alone is not an independent outage fallback. Follow the private-leg failure cases in the [phone matrix](PHONE-VALIDATION.md); an empty response is allowed only after valid private acceptance has been stored. This provider behavior cannot be established by local XML tests.

Useful source: [Twilio webhook security](https://www.twilio.com/docs/usage/webhooks/webhooks-security), [Number noun and private TwiML](https://www.twilio.com/docs/voice/twiml/number), [Dial](https://www.twilio.com/docs/voice/twiml/dial).

## Firebase authentication

Select `AUTH_PROVIDER=firebase`, `FIREBASE_PROJECT_ID` and `FIREBASE_WEB_API_KEY`. The backend sends email sign-in links and exchanges one-use codes through Google's fixed REST endpoints. The official Admin SDK validates tokens for the configured project with revocation checking enabled; unverified emails are rejected. Cloud Run uses its attached identity, with `firebaseauth.users.get` and `firebaseauth.users.update` for verification and logout revocation. No service-account key or model credential goes into the iOS app. Live mode refuses the Firebase auth emulator.

Initialize Firebase Authentication and enable email-link sign-in. Use the current Firebase Hosting mobile-link domain, `shield-calls-isaac.firebaseapp.com`, not retired Dynamic Links. The app handles that domain through its Associated Domains entitlement and validates the action mode, host and opaque code before exchanging it through Shield. The email is entered by the user, never taken from the URL; a cold launch asks for it again. The prepared AASA file identifies the Wheema team and Shield bundle. The server's existing hashed-email, IP and global request quotas still apply.

The native app's tokens remain in device-only Keychain storage. Sign-out revokes the Firebase user's refresh sessions; another device may need to sign in again. A newly authenticated user receives no participant data until verified enrollment or an accepted caregiver invitation. Email-link generation/exchange, real token issuance, refresh, revocation and data isolation passed against the deployed backend with a disposable synthetic account and no email sent. The signed Firebase-connected build is installed. The owner completed verified-email sign-in on September 21 and confirmed real call history on the iPhone; broader email-provider deliverability and cold-launch link QA remain untested.

References: [Firebase REST authentication](https://firebase.google.com/docs/reference/rest/auth), [email-link exchange](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/signInWithEmailLink), [ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [Hosting link migration](https://firebase.google.com/docs/auth/ios/email-link-migration).

## Legacy Supabase authentication

This optional adapter remains available only with `AUTH_PROVIDER=supabase`; it is not the selected deployment. Set `SUPABASE_URL` and the project’s publishable key. No service-role key goes into the backend or app for normal sign-in. Shield asks the configured Supabase project to validate access tokens server-side; it does not trust a locally decoded JWT.

Enable email OTP, allow email signup for caregivers, and configure a production mail sender through Supabase. Change both relevant signup and magic-link templates to show `{{ .Token }}` so users receive a code they can enter in the app. Confirm the configured code length matches the app/API’s six-to-eight digits. New authenticated accounts can join an invitation; they receive no participant data merely by signing up. Participant ownership is assigned only by the operator’s verified enrollment.

The server has per-IP, hashed-email and global OTP request quotas. Configure Supabase’s own rate limits and email-abuse protections as well. Provider integration and deliverability have not been tested here. See [Supabase email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless) and [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).

## Model screening

Choose `SCREENING_PROVIDER=openrouter` with `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`, or the existing `openai` adapter with `OPENAI_API_KEY` and `OPENAI_MODEL`. Follow [MODEL-SETUP.md](MODEL-SETUP.md) for the current Gemini configuration, credit check, data controls, and verification status. There is no implicit production model. Requests use bounded timeouts, no automatic retries, and an extraction schema; deterministic server rules decide whether an introduction may be offered. A schema-valid answer can still be wrong.

```sh
npm run eval:model
```

This optional command makes **16 billable requests** using synthetic fixtures and writes a local report under gitignored `artifacts/evaluations/`. It does not change live switches. Passing this small suite is insufficient: extend the held-out corpus, measure inappropriate offers and legitimate-call disruption, include speech transcription errors and evasive introductions, and review real latency. Version the evaluated model and policy together. `store: false` does not promise zero provider retention; review your account’s actual data controls. See [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs) and [OpenAI data controls](https://platform.openai.com/docs/guides/your-data).

## Apple integration

Configure `APPLE_TEAM_ID`, `IOS_BUNDLE_ID`, app/extension bundle IDs, Associated Domains, and signing as described in [ios/README.md](../ios/README.md). The server serves `/.well-known/apple-app-site-association` with the containing app’s `messagefilter` identifier. The extension’s network URL must use the same public domain.

Message filtering remains off until the target OS/region/carrier, network deferral, consent copy, and false-positive behavior have been tested. Apple’s current Messages guide describes SMS/MMS/RCS filtering; Shield does not claim tested RCS coverage. It cannot access iMessage or import the user’s inbox. Apple’s OS performs deferral; there is no authenticated participant identity in those requests, and the endpoint stores no message archive. Since it is public, it has a shared classification budget and rate limit.

For notifications set APNs team ID, key ID, the `.p8` private key (server only), topic/bundle ID, and environment. `APNS_PRODUCTION=false` is for development-signed device builds; TestFlight/release uses production. Alerts are generic with no caller/message content. APNs and real-device delivery remain untested.

Review the shipped privacy manifest, service disclosures, App Store privacy answers, regional consent requirements, support contact and provider retention with the actual deployment configuration. The current `/privacy` is an explicit pilot draft, not a completed legal policy.

## Rollout gates

Configure providers → verify infrastructure → evaluate the model → perform supervised routing tests → record evidence → activate a small pilot → monitor outcomes and costs. The [operator runbook](OPERATIONS.md) contains the concrete commands. Keep unsupported combinations in message-only mode. No phone is marked physically tested by this build.
