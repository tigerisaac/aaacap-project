# Operations

How to deploy, switch features, run supervised test calls, and inspect what happened. Everything targets the Google Cloud and Firebase project `shield-calls-isaac`. It's the shared live project, not a sandbox.

## Access and secrets

- **Google identity.** Operator scripts reuse your Firebase CLI login through `scripts/firebase-client.mjs`, which loads `firebase-tools` from this repo's dev dependencies. Sign in once with `npx firebase login`. The scripts call Google REST APIs directly; `gcloud` isn't needed.
- **`SHIELD_RUNTIME` (Secret Manager).** One JSON document with all runtime configuration: Telnyx credentials and number, feature flags, the encryption key and the recipient's number. Scripts that change it add a new version and never print values.
- **`SHIELD_OPENAI_API_KEY` (Secret Manager).** Used by the live bridge, `monitorConnectedCall` and the Check tab in `shieldApi`. The bridge pins an explicit version in `scripts/deploy-live-bridge.mjs` (currently version 2). A new key isn't live until you update that pin and redeploy the bridge.
- **Private local files** go in `artifacts/private/` (gitignored), for example `firebase-runtime.json` and `live-deploy.json`.
- **Never print, commit or paste** keys, tokens, phone numbers, transcripts or signed webhook URLs.

## Local checks

```bash
npm run check
```

```bash
npm run test:firebase
```

`npm run check` runs the typecheck, the unit tests and the build. `npm run test:firebase` runs the Firestore emulator integration tests for the API, forwarding and monitoring. Neither proves carrier audio or screening accuracy. For those, see [Screening](SCREENING.md).

## Deploy Firebase Functions

The functions package is assembled from compiled code into `artifacts/firebase-functions/` (codebase `shield`).

```bash
npm run firebase:package
```

```bash
npm install --prefix artifacts/firebase-functions
```

```bash
npx firebase deploy --only functions:shield --project shield-calls-isaac
```

```bash
node scripts/finalize-firebase.mjs
```

`finalize-firebase.mjs` lets only Shield's runtime identity invoke the background functions. Firebase doesn't set that up automatically.

Functions read secret versions when they're deployed. After changing `SHIELD_RUNTIME` or the OpenAI key, redeploy the functions.

Hosting (`deploy/firebase/public`, rewrites in `firebase.json`) and Firestore rules and indexes deploy separately, with `--only hosting` or `--only firestore`. Only deploy them when they've changed.

## Deploy the live screening bridge

```bash
npm run build
```

```bash
node scripts/deploy-live-bridge.mjs build
```

```bash
node scripts/deploy-live-bridge.mjs deploy
```

```bash
node scripts/deploy-live-bridge.mjs publish
```

Run `node scripts/deploy-live-bridge.mjs status` between steps.
- **`build`** packages only compiled modules and a dependency manifest. No keys are in the image.
- **`deploy`** updates Cloud Run service `shield-live`: one instance max, scales to zero, OpenAI key from Secret Manager.
- **`publish`** allows public WebSocket upgrades. Each call still needs its own short-lived signed ticket.

Check the running version with:

```bash
curl -s https://shield-live-kzcw2rbfhq-uc.a.run.app/ready
```

It returns the voice model, decision model and `policyVersion`. It doesn't prove the OpenAI key works; `node scripts/check-live-access.mjs` does that with a 4-second GPT Live session and no phone call.

## Feature switches

| Switch | Turn on | Turn off |
|---|---|---|
| Live GPT screening (`LIVE_SCREENING_ENABLED`, `LIVE_BRIDGE_URL`) | `node scripts/enable-live-demo.mjs`. It refuses unless voice benchmark results for the current policy version and the deployed bridge image match. | Edit `SHIELD_RUNTIME`. With it off, every forwarded caller gets voicemail. |
| Connected-call protection (`CALL_MONITORING_ENABLED`) | `node scripts/enable-call-monitoring.mjs`, then the owner opts in on the app's Connected-call protection screen | `node scripts/enable-call-monitoring.mjs --off` |

Redeploy the functions after either change.

Current production values (`SHIELD_RUNTIME` v4):
- live screening on
- call monitoring on at the server, but not yet turned on in the app

## Supervised test windows

Shield screens calls only during a test window: 30 minutes, 10 screenings, one call at a time, connected calls capped at 5 minutes. Outside a window, forwarded callers get voicemail. You can open a window two ways:
- **In the app:** Today → Phone setup and call tests. This is the owner's normal route.
- **From a terminal:** `node scripts/manage-forwarding-test.mjs status`, or `open --allow-any-caller`.
  - `close` also moves the person into the restoration stage, so normally you'd let a window expire instead.
  - Neither closing nor expiry undoes carrier forwarding.

Before a test session:
1. Warm the bridge with the `/ready` call above.
2. Confirm which OpenAI key version the bridge uses.
3. Open the window only when the caller is ready.

Don't automatically call or message the owner's test phones.

## Inspect what happened

```bash
node scripts/check-live-calls.mjs --outcomes-only
```

```bash
node scripts/check-monitoring.mjs
```

Both are read-only and print outcomes, reasons, timestamps and event kinds. They never print transcripts, numbers or audio.
- **`check-live-calls.mjs`** without `--outcomes-only` also shows the bridge's decision log from the last 15 minutes.
- **`check-monitoring.mjs`** shows connected-call protection state and the last hour's function errors.

## Phone forwarding (Tello pilot)

To send the owner's unanswered calls to Shield:
1. Save Shield's number in Contacts as "Shield Screened call".
2. Set Screen Unknown Callers to **Silence** and Live Voicemail to **Off**.
3. Dial each conditional-forwarding code separately, checking the carrier's response after each:

```text
**61*15074731802#   no answer
**67*15074731802#   busy
**62*15074731802#   unreachable
```

Unconditional forwarding must stay off so saved contacts still ring. The app's guided setup walks through the same steps and can hand each code to the Phone app through the [Shield Open Phone shortcut](shortcuts/README.md).

To restore normal service:
1. Dial `##61#`, `##67#` and `##62#`, one at a time.
2. Put the phone settings back as they were. The originals are saved privately.
3. Place one normal call to confirm ordinary voicemail works.

Don't release the Telnyx number while the carrier still forwards to it. A contact recently called or removed can still count as "known" to iOS, so judge routing by real incoming calls.

## New contributors

You'll need:
- access to the GitHub repository
- a Google account with access to `shield-calls-isaac`, including read access to `SHIELD_OPENAI_API_KEY` if you'll run paid checks
- for free text checks, an OpenCode Go login (`~/.local/share/opencode/auth.json`)

Clone the repository, then run:

```bash
npm ci
```

```bash
npx firebase login
```

```bash
npm run check
```
