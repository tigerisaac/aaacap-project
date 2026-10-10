# Shield

Shield screens unfamiliar phone calls for an older adult. Unanswered calls forward from their own mobile number to Shield's Telnyx number. A GPT Live voice agent asks who's calling and why. If the call looks ordinary, Shield rings the person and tells them privately what it's about, and they press 1 to take it. Scams, robocalls and sales calls are ended; anything uncertain goes to voicemail. A native iPhone app shows call history and voicemail, and lets family members see shared activity.

**Stack:** Telnyx (number and call control) · OpenAI `gpt-live-1` (voice screening) and `gpt-6-luna` (decisions) · Firebase Functions, Firestore, Auth and Hosting · a Cloud Run WebSocket bridge for GPT Live · SwiftUI iPhone app. We may add a third-party TTS provider for Shield's fixed prompts.

**Status:** this is a supervised single-recipient pilot, screening only during test windows the owner opens. Screening never verifies who's calling and doesn't catch every scam. See [Status](docs/STATUS.md).

## Docs

- [Architecture](docs/ARCHITECTURE.md): components, call flow, voice, data
- [Status](docs/STATUS.md): what's deployed and verified, and what's next
- [Screening](docs/SCREENING.md): how decisions are made and tested
- [Operations](docs/OPERATIONS.md): deploying, feature switches, test windows, phone forwarding
- [iOS app](ios/README.md)
- [All docs](docs/README.md), including the September [archive](docs/archive/README.md)

## Develop

Requires Node 22.14+.

```bash
npm ci
```

```bash
npm run check
```

`npm run check` runs the typecheck, the unit tests and the build. `npm run test:firebase` adds the Firestore emulator integration tests.

For app work without any live services, `npm run demo:setup` and then `npm run dev` start a local backend with synthetic history. `npm run ios:generate` generates the Xcode project; open `ios/Shield.xcodeproj` and run the **Shield** scheme. The app's **Explore the demo** mode works offline. Demo mode never places calls or contacts OpenAI.

Live checks and deployment use the shared Google Cloud project `shield-calls-isaac`. Read [Operations](docs/OPERATIONS.md) before running anything that touches it.
