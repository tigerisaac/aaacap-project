# Firebase deployment revision

The user declined the always-on Cloud Run + Cloud SQL proposal. Its roughly $55 monthly baseline came from that architecture, not from a Blaze subscription fee. That proposal remains archived and must not be deployed.

On September 21, 2026, the user authorized the revised Firebase setup. `shield-calls-isaac` was linked to the user's existing billing account, its default Firestore Standard database was created in `us-central1` (PITR disabled), and Firebase Authentication was initialized. Firestore indexes and deny-all client rules were deployed successfully. Other projects were unchanged. Firebase plans apply per project.

## Revised resource choice

| Responsibility | Firebase service | Idle-cost approach |
| --- | --- | --- |
| Identity | Firebase Authentication, email links | Included non-phone authentication allowances |
| Call history, participant settings, caregiver grants | Firestore Standard, one default database in a supported low-cost US region | Pay by document operations/storage; no database VM |
| Twilio webhooks and authenticated app API | Cloud Functions / Cloud Run functions | `minInstances=0`, bounded maximum instances, request-based execution |
| Screening and cleanup jobs | Event/task-triggered functions | Await work within each invocation; no process-wide polling timer or detached work after HTTP completion |
| Fixed Soniox prompts | Firebase Hosting immutable media | Generate once; playback does not invoke Soniox or the model |
| Server credentials | Secret Manager + attached service identity | No keys in the app or downloadable service-account key |

Firestore's included Standard allowance is 1 GiB storage, 50,000 reads/day, 20,000 writes/day and 20,000 deletes/day. Firebase lists included Functions invocation/compute allowances as well. A small private demo should fit mostly within these, but model/telephone usage is separate and artifacts, network transfer, secrets, TTL operations or shared billing-account allowance consumption can still produce small charges. This is **not** an unconditional $0 guarantee or a hard spending cap. See [Firebase pricing](https://firebase.google.com/pricing), [project billing](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), and [Firestore quotas](https://firebase.google.com/docs/firestore/quotas).

## Implementation and verification

`backend/src/cloud` implements a separate Firebase runtime. `shieldApi` handles Twilio and the authenticated iOS APIs, `screenCall` handles a created encrypted screening job, and `cleanupShield` runs once daily. Each has `minInstances: 0`; API/model functions have a maximum of two instances, cleanup one. There is no SQL database or polling loop. The legacy PostgreSQL runtime remains available locally for its future transfer/voicemail path.

Firestore transactions enforce one introduction/model attempt per call and a shared ten-call, sixty-minute trial window that does not reset on instance restart or redeployment. A window is opened explicitly with `scripts/activate-cloud-trial.mjs`; expiration never opens another automatically. Only the existing verified phone can reach the trial. Provider-side call lookup and the approved secret URL authenticate every trial step. Transfers and recordings remain disabled.

The introduction is encrypted while queued and removed on claim before the paid request. The event function awaits Gemini and persists only the fixed decision. Duplicate events do not retry the model; a crashed or late job fails closed. Expired calls are hidden immediately after thirty days and removed by daily cleanup. Unclaimed encrypted jobs expire after two minutes and are removed by daily cleanup; the private trial has at most ten jobs per session.

The app contract includes call history, overview, saved contacts, independent numbers, manual checks, one-use caregiver sharing and revocation, pause and trial data deletion. Firestore denies all direct client access. Firebase identity is verified on the backend; owner-only settings and participant-scoped reads remain enforced. The iOS trial screen clearly distinguishes this private test from carrier forwarding and does not claim transfers or voicemail are active.

Verified locally: 95 backend tests and 10 Firestore emulator integration tests passed, TypeScript compiled, the iOS simulator build succeeded, and the isolated deployment dependency audit reported zero vulnerabilities. The deployed email-link exchange, token refresh/revocation, owner-data isolation and encrypted history API passed a live synthetic-account test. The private event function processed an appointment introduction through Gemini in 4,644 ms. The hosted Soniox greeting passed a hash check, and a nonexistent Twilio call was rejected with 403 in 1,199 ms. These are hosted integration checks, not a completed phone call or a general cold-start guarantee.

`scripts/package-firebase.mjs` copies an explicit module allowlist and verified fixed Soniox MP3s into the deployment package. It excludes .env files, private artifacts and iOS configuration. Runtime secrets are supplied only from Secret Manager. No Soniox key is needed in the cloud because the prompts are generated once. No downloadable service-account key is needed.

Deployment sequence: `npm run firebase:package`, install the isolated package dependencies, run `scripts/provision-firebase.mjs` with approval, then `firebase deploy --only functions,firestore,hosting --project shield-calls-isaac` and `node scripts/finalize-firebase.mjs`. The latter gives only the custom Eventarc identity permission to invoke the private screening function; Firebase did not grant that automatically. The isolated package pins npm 11.4.2 to match its lockfile. Configure one-day generated-image cleanup with `firebase functions:artifacts:setpolicy --location us-central1 --days 1 --project shield-calls-isaac`. Check `/public/health` and `/public/ready` (Google reserves `/healthz`). Verify endpoints/authentication before opening one trial window and changing Twilio's custom webhook.

The user explicitly approved the credential/IAM/owner-enrollment prompt. Those changes were applied, including Secret Manager and a restricted runtime service identity. All three functions are ACTIVE and have zero minimum instances; Hosting is live at https://shield-calls-isaac.web.app. The Wheema-signed Firebase-connected build was installed on the user’s iPhone. No Soniox key or downloadable service-account key was uploaded. Automatic request access logs are excluded in this dedicated project so private webhook URLs are not retained there.

On September 21, Twilio confirmed “Test scenario saved” for the Firebase custom POST webhook. One bounded trial window opened at 18:31:34 America/Chicago and expires at 19:31:34; it does not reopen automatically. The old Mac listener and Cloudflare tunnel were stopped, and Firebase health/readiness still returned 200.

The first real hosted call began at 18:32:18. Its Firestore events show the introduction received, screening completed 4,288 ms later with `routine/appointment`, and a result response returned to Twilio. The encrypted screening job was removed, and the shared budget recorded one call. The user confirmed hearing the result and seeing the real caller number and “Appointment reminder” in Shield. Firebase also confirms the owner’s verified-email sign-in at 18:33:17. This verifies the hosted call → screening → authenticated iPhone history path. No transfer occurred; the trial records an unconnected routine call as `missed`, which the user confirmed seeing.
