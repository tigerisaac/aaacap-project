# Shield

A Twilio call-screening backend and native iPhone companion for participants and the people they choose to share with.

The backend handles forwarded calls, bounded screening, a private **press 1** acceptance step, encrypted voicemail, call history, and revocable family access. The iPhone app provides Today, Calls, Check, and People tabs with short labels, colorful outcomes, and light/dark appearances.

**The private Firebase trial is deployed; the full carrier service is not cleared for participant use.** The signed app is installed on the physical iPhone, and a real hosted call completed its server-side screening flow. Real carrier routing, broad model quality, App Store distribution, and full device behavior still require validation.

## Run the local demo

Requires Node 22.14+ (validated locally with Node 24).

```sh
npm ci
npm run demo:setup
npm run dev
```

The server listens at `http://127.0.0.1:3000`. Setup creates a local PostgreSQL-compatible PGlite database, synthetic call history, random development credentials in `.env`, and a matching gitignored iOS debug configuration. It never places calls or contacts OpenAI. Stop the local server before re-running database setup or operator commands against the embedded database.

```sh
npm run check
npm run operator -- help
npm run ios:generate
open ios/Shield.xcodeproj
```

Select **Shield** and an iPhone simulator, then press **⌘R**. The project is already open in Xcode with the iPhone 17 selected. **Explore the demo** works offline. Debug builds also offer **Local participant** and **Local caregiver**, which use the running backend. Simulator loopback reaches the Mac; a physical iPhone needs an HTTPS backend.

## What is included

| Area | Implementation |
| --- | --- |
| Voice | Signed Twilio webhooks, dedicated DID routing, structured model extraction, deterministic policy, private acceptance, anti-loop/concurrency guards, quotas and durable reconciliation |
| Storage | Firestore for the deployed private trial; PostgreSQL for the separate legacy transfer/voicemail runtime; encrypted sensitive fields, expiring call records and durable jobs |
| Accounts | Firebase email-link adapter and device-only token storage; owner/caregiver authorization; one-use invitations; optional voicemail sharing and revocation |
| iPhone | Native SwiftUI screens, filtered history, protected audio playback, on-device screenshot OCR, manual text checks, contacts, setup/restoration, generic APNs alerts |
| Messages | IdentityLookup network-deferral extension; classification disabled by default; no full-inbox or iMessage access |
| Operations | Carrier profiles, supervised test windows, activation gates, global pause, restoration-first deletion, Docker packaging, operator CLI, CI workflow and model smoke evaluation |

The app’s **Held** list describes calls the service did not connect. It is not a log of every call blocked by iOS, the carrier, or another app. Screening never authenticates the caller, and the subsequent conversation is not monitored.

## Read next

- [Implementation status and verification](docs/IMPLEMENTATION-STATUS.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Enrollment, operations, restoration and deletion](docs/OPERATIONS.md)
- [iOS setup and device checks](ios/README.md)
- [Architecture verification](docs/ARCHITECTURE-VERIFICATION.md)
- [Physical phone validation matrix](docs/PHONE-VALIDATION.md)
- [Original architecture plan](docs/Shield_Implementation_Plan_v1.md)

The dedicated Firebase project is linked to Blaze with Firestore and Firebase Auth initialized. The scale-to-zero backend is deployed and its auth/history and model-job integration checks pass; the Firebase-connected iPhone build is installed. Twilio now uses Firebase, the Mac server/tunnel are stopped, and a real hosted call completed screening and saved history. The user confirmed hearing the result and seeing the call in Shield after verified-email sign-in. See the [serverless deployment status](docs/FIREBASE-SERVERLESS-PLAN.md). The older PostgreSQL transfer/voicemail runtime is not the selected hosting plan. Keep both full live-service switches off until the relevant checks pass. No provider secrets belong in the app.
