# Shield Firebase / Google Cloud deployment

Prepared September 21, 2026. **The user declined this always-on server/PostgreSQL cost proposal. Do not deploy it.** No paid resources have been provisioned and no permanent backend has been deployed. The revised direction is Firebase Authentication, Firestore and functions that scale to zero, using Blaze's included allowances. This document retains the original configuration only to explain the rejected $55 estimate.

## Account and current state

- Firebase project: `shield-calls-isaac` (number `562628621854`, display name Shield).
- iOS app: `1:562628621854:ios:0647c247b1ca320f02600f`.
- Bundle: `org.isaaczhang.Shield`, Wheema team `6R6HMW3DWN`.
- Existing Firebase CLI login works. Project billing is confirmed **disabled**.
- Firebase Authentication has not been initialized. No users, database, server, or service-account credentials were created.
- Firebase SDK configuration was downloaded to gitignored `artifacts/private/GoogleService-Info.plist`; the native app uses Shield's API for token exchange, so this file is not bundled.

## Declined initial deployment

| Resource | Configuration | Reason |
| --- | --- | --- |
| Cloud Run `shield-api` | `us-central1`, 1 vCPU, 512 MiB, min/max 1 instance, instance-based CPU, concurrency 10 | Existing five-second background worker must keep running between HTTP requests |
| Cloud SQL `shield-postgres` | PostgreSQL 17, Enterprise, `db-f1-micro`, zonal, 10 GiB SSD, backups; cap automatic storage growth at 20 GiB | Preserve transaction locks, job leases and the existing PostgreSQL schema |
| Firebase Authentication | Email-link sign-in, current Hosting links, no anonymous access | Participant and caregiver identity; verified email required |
| Firebase Hosting | Existing project site, routes in root `firebase.json` | Stable HTTPS API origin and iOS Universal Links |
| Secret Manager | Individually scoped runtime access, pinned secret versions | Keep keys and the database connection out of the app and image |
| Artifact Registry | `us-central1/shield` | Container images pinned by digest |

The small database is suitable for a supervised pilot, has no shared-core SLA, and needs load/restore testing before expansion. The service instance cap is a capacity control, not a hard account spending cap. Budget alerts are notifications, not automatic shutdowns.

### Estimated monthly baseline

For a 30-day month in `us-central1`, one continuously running vCPU and 0.5 GiB memory cost approximately **$44** after an otherwise-unused Cloud Run free allowance: `(2,592,000 - 240,000) × $0.000018 + (1,296,000 - 450,000) × $0.000002`. If the allowance is consumed by another project, the same compute is about $49. A `db-f1-micro` database at $0.0105/hour is about $7.56; SSD and backup storage bring this to roughly **$10–12**. Plan around **$55/month**, or more with shared allowance consumption, backup growth, build/image storage, network traffic or additional services. Telephony and AI are separate usage charges.

Sources checked September 21, 2026: [Cloud Run pricing](https://cloud.google.com/run/pricing), [Cloud SQL pricing](https://cloud.google.com/sql/pricing?authuser=8), [Firebase pricing](https://firebase.google.com/pricing). This is an estimate, not a provider quote. No commitment discount or new free-trial credit is assumed.

Cloudflare Workers/D1 could reduce idle infrastructure charges. It would require replacing the PostgreSQL-specific store and worker coordination, then repeating the routing/concurrency tests. A later Cloud Tasks design could also allow Cloud Run to scale to zero; setting min instances to zero on the current timer-based worker is not a valid shortcut.

## Archived provisioning sequence (not approved)

1. Link the **Shield project only** to the user's chosen billing account (Firebase Blaze). Set a project-filtered budget, initially $60 with actual/forecast alerts. Confirm the recipient in the billing UI. Do not alter other projects or Twilio billing.
2. Install/use Google's official `gcloud` CLI or Cloud Shell, selecting `shield-calls-isaac` explicitly. Enable Cloud Run, Cloud SQL Admin, Artifact Registry, Secret Manager, IAM and Cloud Build APIs.
3. Create the resources in the table. Cloud SQL must have **no authorized public networks**. Connect Cloud Run through its authenticated Cloud SQL Unix socket; that proxy uses encrypted transport. Do not disable certificate verification or open the database to `0.0.0.0/0`. Use a restricted application database user with ownership of the dedicated Shield schema, not a general database administrator.
4. Create `shield-runtime@shield-calls-isaac.iam.gserviceaccount.com`. Give it Cloud SQL Client in this isolated project, the custom role in `runtime-auth-role.yaml`, and Secret Accessor **on the six named secrets only**. Do not create a downloadable service-account key. The Firebase Admin SDK uses the Cloud Run identity.
5. Initialize Firebase Authentication, enable email-link sign-in, restrict authorized domains to the two Shield Hosting domains, set mobile links to `shield-calls-isaac.firebaseapp.com`, and register the Wheema team on the iOS app. Keep SMS/anonymous sign-in disabled. The runtime identity has no permission to change project authentication settings.
6. Populate `shield-database-url`, `shield-data-encryption-key`, `shield-twilio-account-sid`, `shield-twilio-auth-token`, `shield-openrouter-api-key` and `shield-firebase-web-api-key`. Read local keys privately and upload with a file/stdin; never put secret values in command arguments or logs. Use a **new cloud data-encryption key**, backed up separately. The connection string uses the Cloud SQL socket (`host=/cloudsql/shield-calls-isaac:us-central1:shield-postgres`, URL-encoded in its query). Pin the created versions in the manifest; do not assume version 1 when updating existing secrets.
7. Run `npm ci && npm run check`, build the root Dockerfile using a controlled Cloud Build context, and place its actual image digest in `service.yaml`. `.dockerignore` includes only the manifest/lockfile and backend source; exclude `.env*`, artifacts, iOS configs and all private files from the Cloud Build upload too. Supply a monitored support address before participant enrollment.
8. Apply `service.yaml` in `us-central1`. Enable public invocation only for this service's protected HTTP endpoints so Firebase Hosting/Twilio can reach it. API routes require Firebase identity; voice routes require Twilio signatures. Configure cloud ingress/access logging to avoid webhook bodies, caller identifiers, query strings and credentials. Verify real PostgreSQL schema migration and both health endpoints before Hosting deployment.
9. Deploy the root Firebase Hosting configuration to this one project. Test the stable URL, AASA file, actual email delivery, Universal Links, token refresh/revocation, caregiver isolation and a backup restoration. Update the app's release API/message-filter host to `shield-calls-isaac.web.app` only once these pass; then sign and install the updated app.

## Trial and full service are distinct

The working **Soniox + Gemini trial** is still the local, 60-minute, verified-caller receiver through the existing Cloudflare quick tunnel. It intentionally holds no app database or history. The Cloud Run manifest deploys the full API, **not** that temporary secret-webhook receiver. Hosting the API alone will not move the trial or make trial calls appear on the iPhone.

Before a hosted trial: persist its call state/budget and decisions under an explicitly enrolled Firebase identity, keep the verified-caller restriction, and move the approved webhook only after a hosted smoke test. The current shared Twilio trial number cannot pass the full service's dedicated-number enrollment check. Do not weaken that check. Full transfer and voicemail still require later Twilio capability/upgrade decisions, and are disabled in this manifest.

Soniox is currently wired into the isolated trial. Its 11 cached MP3s contain only fixed product prompts; they are served from `/speech/<digest>.mp3` without secrets. The full transfer/voicemail TwiML still uses its existing speech path until those separately deferred capabilities are tested. No Soniox key is needed by cached playback.
