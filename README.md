# Shield

Shield screens calls forwarded from a person's mobile number. If a call is offered, the person hears a private summary and must press 1 to connect. The iPhone app shows call history and saved messages, supports explicit one-time contact sharing, and separates optional caretaker alerts from permission to view history or listen to messages. Caretaker alerts are limited to connected-call monitoring interventions.

**Stack:** Telnyx call control · Soniox transcription and prerecorded announcements · OpenAI screening and connected-call assessment · Firebase Functions, Firestore, Auth and Hosting · a Cloud Run WebSocket bridge · SwiftUI iPhone app · RevenueCat purchase integration. See [Architecture](docs/ARCHITECTURE.md) for the deployed hybrid screening path and feature availability.

**Status:** the shared cloud project is a live pilot; the public iOS release is not ready for submission. Repository implementation, scoped deployments and real-phone acceptance are separate. Screening does not verify caller identity or catch every scam. Use the dated [Status](docs/STATUS.md) and current [release checklist](docs/APP-STORE-RELEASE.md); do not deploy all of main as a shortcut.

## Docs

- [Architecture](docs/ARCHITECTURE.md): components, call flow, voice, data
- [Status](docs/STATUS.md): what's deployed and verified, and what's next
- [Screening](docs/SCREENING.md): how decisions are made and tested
- [Operations](docs/OPERATIONS.md): deploying, feature switches, test windows, phone forwarding
- [iOS app](ios/README.md)
- [All docs](docs/README.md), including the September [archive](docs/archive/README.md)

## Develop

Requires Node 22.14+ and npm 11.4.2+. The October 18 tooling checkpoint uses Node 22.23.1 and npm 11.4.2; CI uses Node 24. Candidate validation with npm 10.9.2/10.9.8 lost the existing scoped UUID security override; npm 11.4.2 preserves it. The optional development-only RE2 binding needs a compatible Node 22.22.2+, 24.15.0+ or 26+ runtime.

```bash
npm ci
```

```bash
npm run check
```

`npm run check` runs the typecheck, unit tests and build. `npm run test:firebase` adds the Firestore emulator integration tests; `npm run test:accounts` uses dedicated Auth/Firestore emulators and synthetic phone verification. Both require Java 21. `npm audit --omit=dev --audit-level=moderate` checks the production dependency lock and runs in CI. Remaining development-tooling advisories are tracked in the release checklist.

For app work, `npm run ios:generate` generates the Xcode project; open `ios/Shield.xcodeproj` and run the **Shield** scheme. Use the documented simulator fixtures for synthetic UI checks. Phone sign-in is the production entry point; retired demo/email entry points are not public release features.

Live checks and deployment use the shared Google Cloud project `shield-calls-isaac`. Read [Operations](docs/OPERATIONS.md) before running anything that touches it.
