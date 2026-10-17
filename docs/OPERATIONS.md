# Operations

How to deploy, switch features, run supervised test calls, and inspect what happened. Everything targets the Google Cloud and Firebase project `shield-calls-isaac`. It's the shared live project, not a sandbox.

## Access and secrets

- **Google identity.** Operator scripts reuse your Firebase CLI login through `scripts/firebase-client.mjs`, which loads `firebase-tools` from this repo's dev dependencies. Sign in once with `npx firebase login`. The scripts call Google REST APIs directly; `gcloud` isn't needed.
- **`SHIELD_RUNTIME` (Secret Manager).** One JSON document with all runtime configuration: Telnyx credentials and number, feature flags, the encryption key and the recipient's number. Scripts that change it add a new version and never print values.
- **`SHIELD_OPENAI_API_KEY` (Secret Manager).** Used by the live bridge, `monitorScheduledCall`, legacy jobs in `monitorConnectedCall`, and the Check tab in `shieldApi`. The bridge pins an explicit version in `scripts/deploy-live-bridge.mjs` (currently version 2). A new key isn't live until you update that pin and redeploy the relevant service.
- **Private local files** go in `artifacts/private/` (gitignored), for example `firebase-runtime.json` and `live-deploy.json`.
- **Never print, commit or paste** keys, tokens, phone numbers, transcripts or signed webhook URLs.

## Local checks

```bash
npm run check
```

```bash
npm run test:firebase
```

`npm run check` runs the typecheck, the unit tests and the build. `npm run test:firebase` runs the Firestore emulator integration tests for the API, forwarding and monitoring. `npm run test:accounts` separately checks identity creation/deletion, session rejection and retry recovery with dedicated Firebase Auth/Firestore demo emulators. CI runs all three using Node 24 and Java 21. These checks do not prove production IAM, provider erasure, carrier audio or screening accuracy. See [account verification](ACCOUNT-OFFBOARDING.md#local-validation) and [Screening](SCREENING.md).

## Deployment archive retention — October 17, 2026

The owner authorized cleanup and shorter retention for the two deployment-only Cloud Storage buckets. These archives contain backend source packages, not call recordings. Message audio remains in Firestore under the separate [audio delivery contract](AUDIO-DELIVERY.md).

| Bucket | Applied lifecycle rules |
| --- | --- |
| `gcf-v2-sources-562628621854-us-central1` | Preserve current function-source ZIPs. Delete noncurrent versions after one day or when two newer versions exist. Bridge archives under `shield-live/` become eligible for deletion after seven days; versioning first makes a deleted live archive noncurrent, then the one-day noncurrent rule removes it. |
| `gcf-v2-uploads-562628621854.us-central1.cloudfunctions.appspot.com` | Delete upload archives after one day. |

Soft delete is disabled on both buckets. Source-bucket versioning remains enabled. Current function sources have no age-based deletion rule. Running services use built container images in Artifact Registry; this cleanup does not change image retention, revisions, traffic, IAM, secrets, or service settings. Bridge source archives are temporary build inputs, so their eventual expiry does not remove running or rollback images.

Lifecycle execution is asynchronous and configuration changes can take up to 24 hours to apply. Existing soft-deleted objects retain their original seven-day recovery period even after soft delete is disabled; that backlog cannot be purged early. See Google's [lifecycle behavior](https://docs.cloud.google.com/storage/docs/lifecycle) and [soft-delete disablement](https://docs.cloud.google.com/storage/docs/disable-soft-delete).

Before deleting exact object generations, verify that every function is ACTIVE, Cloud Run services are reconciled, no regional/global Cloud Build is pending or running, and the source references have not changed. Preserve every current function source generation and identify the current bridge archive by matching its deployed image digest to the successful build. Wait at least 30 seconds after disabling soft delete before deleting objects. Use bucket metageneration and object generation preconditions; do not use an unqualified recursive bucket deletion.

At **2026-10-17 14:18:22 UTC / 09:18:22 Central**, verification confirmed 52 obsolete objects permanently deleted (258,375,035 bytes). All 12 deployed function-source generations and the successful build archive matching bridge `shield-live-00017-qrw` remain: 13 objects, 110,985,914 bytes; the upload bucket is empty. Functions, service revisions, images and traffic matched the pre-cleanup snapshot, and bridge `/ready` and API `/public/ready` returned HTTP 200. This is infrastructure verification, not a real-call test.

The pre-change inventory contained 459,798,652 bytes already soft-deleted, with the final expiry at **October 24, 00:14 Central**. After soft delete is disabled, the API rejects soft-deleted-object listing with HTTP 400; those backlog totals/deadlines come from the saved pre-change inventory. They are not reported as space already reclaimed.

Private before/after inventories, the explicit deletion plan, policy readbacks and per-generation deletion receipts are under `artifacts/private/deployment-storage-cleanup/`. No source archive, recording, transcript or secret was opened for this maintenance.

## Deploy Firebase Functions

The functions package is assembled from compiled code into `artifacts/firebase-functions/` (codebase `shield`).

```bash
npm run firebase:package
```

```bash
npx --yes npm@11.4.2 install --prefix artifacts/firebase-functions --ignore-scripts
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
- **`build`** packages compiled modules, the announcement catalog, acknowledgement audio and dependencies, then starts the assembled package locally with synthetic credentials before uploading it. No keys are in the image.
- **`deploy`** updates Cloud Run service `shield-live`: two instances max, up to ten independent sessions per instance, scales to zero, OpenAI key from Secret Manager.
- **`publish`** allows public WebSocket upgrades. Each call still needs its own short-lived signed ticket.

Check the running version with:

```bash
curl -s https://shield-live-kzcw2rbfhq-uc.a.run.app/ready
```

It returns the voice model, decision model and `policyVersion`. It doesn't prove the OpenAI key works; `node scripts/check-live-access.mjs` does that with a 4-second GPT Live session and no phone call.

## Deploying the October 11 work

Everything below is on `main`, tested and **not deployed**. Each step changes production, so each needs the owner's approval. The order matters.

1. **Voice results for v15.** `enable-live-demo.mjs` refuses without them. They were run October 11 on this machine (24/24) and are in `artifacts/live-eval/`. Re-run `node scripts/check-live-demo.mjs` (synthetic voices, paid OpenAI) on any other machine.
2. **Firestore indexes:** `npx firebase deploy --only firestore:indexes --project shield-calls-isaac`. This adds the collection-group index cleanup uses for `blocked-numbers` and exempts encrypted fields.
3. **Functions:** package, install and deploy as above. This adds `sendShieldAlert` and `checkForwardingVoicemail`.
4. **Invokers:** `node scripts/finalize-firebase.mjs`. It now also grants the runtime identity invoke on the two new functions; without it, alerts and voicemail checks never run.
5. **Bridge:** build, deploy, publish. It carries policy v15 (the recent-scam caution) and passes `screeningCaution` to sessions.
6. **Check:** public health and ready, bridge `/ready` showing `2026-10-11-general-v15`, `check-monitoring.mjs`, and `check-live-calls.mjs` for errors.

These features stay off until switched on:
- **Push alerts:** add `APNS` (`keyId`, `teamId`, `privateKey` from a .p8 auth key) to `SHIELD_RUNTIME`, then redeploy Functions.
- **Voicemail keep-or-remove:** add `api.decisions.write` to the OpenAI key, run `check-voicemail-policy.mjs` and its held-out set, then set `VOICEMAIL_SCREENING_ENABLED: true` and redeploy Functions.
- **App:** build once in Xcode with the team account signed in (App Groups and the new Call Directory App ID), then install the new build on the phone.

The ten-person pilot backend is separate, on branch `pilot-multi-person`. It has its own deploy order in the [ten-person pilot plan](TEN-PERSON-PILOT-PLAN.md#built-on-the-branch-october-11).

## Feature switches

| Switch | Turn on | Turn off |
|---|---|---|
| Live GPT screening (`LIVE_SCREENING_ENABLED`, `LIVE_BRIDGE_URL`) | `node scripts/enable-live-demo.mjs`. It refuses unless voice benchmark results for the current policy version and the deployed bridge image match. | Edit `SHIELD_RUNTIME`. With it off, every forwarded caller gets voicemail. |
| Connected-call protection (`CALL_MONITORING_ENABLED`) | `node scripts/enable-call-monitoring.mjs`, then the owner opts in on the app's Connected-call protection screen | `node scripts/enable-call-monitoring.mjs --off` |

Redeploy the functions after either change.

Current production values (`SHIELD_RUNTIME` v5):
- live screening on
- call monitoring on at the server; the owner enabled it in the app and a real code/password intervention succeeded October 10. New-owner onboarding selects protection by default; Continue saves the choice.

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

### Screening latency diagnostics (October 11)

The bridge now has optional `live_timing` logs, correlated by the internal call UUID. They contain phases, elapsed times, booleans and numeric usage counters only. No transcript, audio, model reasoning, tool arguments, caller/recipient numbers, provider IDs or signed URLs are logged. Logging failures cannot change a decision, and routine entries are capped at 240 per call; final usage and handoff entries remain available. Prompts, model settings, screening deadlines and call-control rules are unchanged.

`check-live-calls.mjs` reads the timeline for the latest five calls within the last 24 hours, in chronological order, with pagination and an explicit truncation indicator. It scans the newest 2,000 timing entries at most and reports the time cutoff. Build first to refresh its timing-field definitions.

- **Startup:** `bridge_claimed` reports the process age, whether this is its first accepted call, and Firestore claim time. Follow `provider_started`, `model_socket_open`, `session_start_sent` and `model_ready` to separate the greeting/bridge path from a new OpenAI session. Process age and first-call status are clues, not a direct measurement of infrastructure cold-start time; compare Cloud Run system startup logs too.
- **Caller and response:** compare `caller_speech_paused`, `delegation_created`, `response_started`, `first_tool_output`, `decision_received` and `response_completed`. Response ordinals are local counters, not provider IDs. Speech markers use the existing audio-level threshold and 800 ms pause; background noise can affect them. Transcript timing reports arrival, not when words were spoken.
- **Extra work:** `decision_deferred`, `transcript_changed`, `decision_rejected`, `response_resume_sent`, `screening_check_sent` and research start/end show repeat decisions and lookups.
- **Tokens:** `response_usage` records input, cached-input, cache-write, output and reasoning-token counts, when the API provides them, plus whether it reports the priority tier. Missing usage is unavailable, not zero. Final usage may arrive just after a terminal decision during the existing socket-drain period.
- **Speaking and handoff:** `assistant_audio_received` versus `assistant_audio_sent` separates generated speech from bridge playback; the latter is when audio is sent to Telnyx, not proof the caller heard it. `outcome_saved`, `redirect_finished` and `handoff_finished` separate persistence from carrier API time.

Read-only inspection of the October 11 evening calls found that the bridge started at 21:19 Central and all three calls finishing at 21:21, 21:24 and 21:35 used that same Cloud Run instance. The two held calls do not show a fresh bridge-process startup; their per-session OpenAI initialization, cache use and reasoning delays were not logged. The latest held call reached the audio stream in 5.9 s and voicemail was offered at 43.7 s from admission. These measurements include caller speech and do not isolate the reported silent pause.

Deployed with owner approval October 11 at 22:03 Central (October 12, 03:03 UTC), together with the brief acknowledgement below, as `shield-live-00007-bh7` serving 100% of traffic. `/ready` reports policy `2026-10-09-general-v14`, `timingLogs: true` and `waitAcknowledgement: true`. Not yet verified on a real call. The release uses the prior production v14 source archive, preserving that policy and other production modules; the checkout also contains newer, separately developed screening changes. Future deployments still require owner approval.

Local validation on October 11: `npm run check` passed (137 unit tests, typecheck and build), and `npm run test:firebase` passed all 86 emulator tests. Initial restricted runs could not open localhost sockets; the successful runs used the normal permission mechanism. Four timing tests cover exact model/carrier event equality with logging enabled and failing, late final usage, content filtering and bounded logs. A candidate package was prepared from the source archive of deployed image `shield-live:demo-1791645328955`, verified against revision `shield-live-00006-d9n`. Only `lib/live/server.js`, `session.js` and the new `timing.js` differ; policy, other modules, package manifest and Dockerfile are byte-identical. Eighteen synthetic control-flow comparisons against that production source passed, including approvals, holds, scam blocks, clarifications, stale decisions, rejected evidence and timeouts with both functioning and failing diagnostics. These are software checks, not model benchmarks or real-call evidence.

### Brief acknowledgement during slow screening

Owner-approved October 11: a bundled Soniox Grace recording says “One moment, please.” Its trimmed telephone version is 1.1 s, 8 kHz PCMU, integrity-checked against `backend/src/live/ack-audio/manifest.json`. It requires no generation request, new prompt or secret at call time. The OpenAI key does not permit speech generation; the asset was generated once with the existing local Soniox speech configuration.

The bridge plays it at most once per call, after the backend has been working for at least one second and the caller/model have been quiet for at least one second. It replaces model silence; new caller speech, model speech or completion interrupts it. It never changes the model inputs, verdicts, acceptance, idle/backend deadlines or terminal playback clearing. Missing or invalid audio disables only the acknowledgement, with a content-free warning. The `/ready` response reports `timingLogs` and `waitAcknowledgement`.

`acknowledgement_started`, `acknowledgement_finished` and `acknowledgement_interrupted` are timing phases; they must not be counted as model-generated speech. The playback improves the wait experience, not decision latency, and only starts once a screening session is running. Five new local tests cover timing, silence, interruptions, one-shot behavior, unchanged decisions/deadlines and recording integrity. Full checks passed 142 unit tests and all 86 emulator tests. Seven additional comparisons with the actual v14 production package, with acknowledgement enabled, preserved model inputs/verdicts and terminal clearing. Audio over a real phone line remains to be checked by the owner.

Release evidence: Cloud Build `a4bd378b-b6af-4210-9728-afff125d486e` completed successfully at 03:02:05 UTC; deployed image digest `sha256:8a543bcf172f0cfd7df3c446ee309268c2658da445534e70e951bb9c610de3de`. Only the bridge image and traffic were patched. Service identity, ingress, environment/secret references, resource settings, scaling, concurrency and request timeout were read back unchanged. Firebase Functions/Hosting were not redeployed, and carrier forwarding, phone settings and monitoring consent were untouched. The generic audio files and four live modules are the only source-archive changes; Dockerfile, package dependencies and every other production module remain byte-identical. The private `artifacts/private/live-timing-deploy.json` records the exact image digest, base revision, archive manifest, operation and verification time. After deployment, the new revision had no ERROR logs or missing-acknowledgement warnings.

The existing pilot window was renewed for the owner's next test call until October 11 at 22:35:58 Central (October 12, 03:35:58 UTC), 10 screenings and no active call at readback. Initial automatic review rejected the renewal as a possible caller-scope expansion; readback proved `allowAnyCaller` was already true, and the same command was approved on retry with that evidence and the owner's existing authorization. Carrier routing was not changed. Actual acknowledgement timing and audio quality still need the owner's test call.

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

### V30 prompt-only rollout (October 11)

Owner-requested v30 deployed as `shield-live-00008-hnc` and verified ready at `2026-10-12T03:20:36.999Z` (October 11 at 22:20 Central), serving 100% of traffic. Cloud Build `2fd66bd8-d6c8-480f-a1d9-24e860a4b598` completed at `2026-10-12T03:14:39.986689Z`; image digest `sha256:4481e9cf6af26352f2a604a61058f1c541fd8c8fb5894a7704db58c4db0a6931`. Only `lib/live/policy.js` differs from the prior `shield-live-00007-bh7` source archive. The frozen decision request matches SHA-256 `9256ca33e5dbf4b6c27db5d3c5ae21e1516d9655eca155816ffebf2cf0ec9fb1`; timing logs, the local acknowledgement, all other production modules, dependencies, Dockerfile, environment/secret references, resource/scaling settings, ingress, service identity and call limits were preserved. No runtime secret, Firebase Functions/Hosting or carrier configuration changed.

Validation: 142 unit tests, typecheck/build and 86 Firebase emulator tests passed. Main synthetic voice: 24/24, separately 11/11 ordinary offers and 12/12 harmful stops plus silence. Existing main text checks: 33/33 ordinary offers and 36/36 harmful stops; source/request hashes still matched the frozen v30 validation. The new revision had no ERROR or missing-acknowledgement logs after deployment. V30 is not yet verified on a real call. The existing test window was retained through 22:35:58 Central; it was not renewed or broadened in this rollout.

The private `artifacts/private/live-v30-deploy.json` contains the release manifest, base configuration, operations and readbacks. The canonical `artifacts/private/live-deploy.json` now points to the verified v30 image, with the prior record retained privately as `live-deploy-before-v30.json`.

### V30 real-call latency investigation (October 11, 22:23 Central)

Content-free timing logs for the owner's latest test call confirm revision `shield-live-00008-hnc`. The call was held and routed to voicemail. No recording or transcript was inspected. Times below are measured from call admission; audio-send events mean sent to Telnyx, not confirmed heard by the caller.

| Phase | Time / duration |
| --- | --- |
| Bridge claimed the call | 6.592 s; claim request 0.564 s |
| OpenAI session ready | 7.370 s; 0.778 s after claim |
| Initial partial-turn decision | 1.506 s model time; deferred because the caller added words |
| Deferred decision resumed with updated caller evidence | 2.312 s after deferral |
| Fresh clarification requested | 15.615 s; 1.381 s model time |
| Backend finished wording the question | 17.021 s; 1.127 s model time |
| Automatic check sent without new caller words | 17.040 s |
| Question audio sent | 18.041 s; 2.426 s after clarification requested |
| Hold applied and playback cleared | 19.571 s; 2.314 s model time, assistant audio sent 17 ms earlier, 360 ms still queued |
| Voicemail handoff finished | 19.969 s; persistence 116 ms, redirect 281 ms |

The bridge process was already 213.3 s old, although this was its first call: the logs do not show a fresh process cold start. The first backend request used 3,416 input tokens, with 2,923 cached (85.6%). Token processing and startup therefore do not explain the entire delay. The last caller transcript update preceded the hold by 6.262 s. The local acknowledgement played from 15.119 to 16.250 s.

The immediate coordination bug is that a fresh `continue` decision did not update the periodic fallback's assessed-transcript marker. Once the backend finished wording a question, the fallback rechecked already-assessed words while Live was starting to ask it. A terminal verdict then cleared that unfinished playback. Waiting for changed caller evidence before applying a stale decision remains necessary; this fix only removes the duplicate fallback on the unchanged turn.

**Fix prepared locally and deployed after owner approval below:** `ScreeningSession.apply` marks the current transcript assessed when a fresh clarification is accepted. A regression reproduces the duplicate check on the previous code, suppresses it with the fix, and confirms new caller evidence still triggers assessment and an explicit scam block still stops immediately. An exact production-source candidate changes only `lib/live/session.js`; v30, other modules, dependencies and configuration are unchanged. Packaged before/after checks also passed. Full validation passed typecheck/build, 143 unit tests and 86 Firebase emulator tests.

Four focused synthetic voice cases passed their existing outcome criteria: two ordinary calls offered, one injection blocked, and one bank pretext held. The bank-pretext trial ended before its scripted answer despite a question transcript, so an allowed outcome alone does not establish that coordination is fully solved. An additional timing-instrumented synthetic repeat waited for the answer and blocked the harmful request, but also showed a Live-initiated delegation before the answer, without another fallback check. Removing the duplicate application check cannot guarantee that every model-initiated overlap disappears. These are synthetic diagnostics, not proof of improved real-call latency. No new prompt or production deployment occurred in this investigation.

### Clarification fix rollout (October 11, 22:56 Central)

After the owner's explicit deployment approval, Cloud Build `62debb4b-8415-4624-aa53-b223f2d0bb76` succeeded at `2026-10-12T03:54:37.431981Z`. Image digest `sha256:0b7d0273af2318c777e4d2b78af09d6ab9d44cabc8bf404c52ae7c9347564ead` was deployed as `shield-live-00009-799`, verified ready at `2026-10-12T03:56:17.589Z`, serving 100% of traffic. The packaged source differs from the prior production archive only in `lib/live/session.js`, with the single assessed-transcript marker and its explanatory comment. V30, all other source modules, dependencies and Dockerfile are byte-identical.

Readback confirmed unchanged service identity, ingress, environment/secret references, scaling, resource settings, concurrency and request timeout. `/ready` reports `gpt-live-1`, `gpt-6-luna`, policy `2026-10-11-general-v30`, `timingLogs: true` and `waitAcknowledgement: true`. There were no startup ERROR or missing-acknowledgement entries for the new revision at verification. No Firebase deployment, prompt change, forwarding change or real call was performed. The previous test window had expired at 22:35:58 Central; readback showed no active call, and the window was not renewed by deployment. Real-call improvement and independent Live-initiated overlap remain unverified.

Private release evidence is in `artifacts/private/live-clarification-deploy.json`; the canonical `live-deploy.json` now points to this verified release, with its prior record retained privately as `live-deploy-before-clarification.json`.

## Persistent Home count deployment — October 12

The owner approved deployment of the saved stopped-call total. `shieldApi` became `shieldapi-00016-tuv` at 2026-10-12T22:51:56.878Z; `cleanupShield` became `cleanupshield-00008-nuc` at 22:51:56.466Z. Both were read back ACTIVE. The release began with the exact source archive of `shieldapi-00015-jij`; only `lib/cloud/api.js`, `forwarding-store.js`, `store.js` and the new `stopped-total.js` changed. The dependency manifest, lockfile, function definitions and every other source module were preserved. It deploys the counter on the existing screening path without releasing the repository's other pending features.

Repository validation passed typecheck/build, 164 unit tests and all 88 Firestore emulator tests. A separate emulator check ran the actual production-based package with its locked dependencies: concurrent stops counted once, the total included a call older than seven days, and cleanup preserved the total. An isolated synthetic Firebase account then verified the live authenticated total and its persistence after removal of that account's single test call. The synthetic account, participant, call and statistics document were removed; no authentication email, real call or model request was sent. Owner-data isolation and token refresh/revocation also passed. These are software checks, not real-call evidence.

Runtime service configuration was compared before and after deployment and matched. `ingestForwardingVoicemail` and `monitorConnectedCall` retained their existing revisions. Private deployment/source manifests and the synthetic verification report are saved under `artifacts/private/counter-release/` and `artifacts/private/firebase-live-checks.json`. The counter seeds from recoverable records; previously deleted calls cannot be reconstructed. Future repository-only blocking and voicemail-removal hooks remain subject to their own deployment approval.

## V158 screening release — October 13

The owner approved deploying the tested screening candidate after its online-report check, keeping the prior exception that sets aside voice readiness. Revision `shield-live-00013-zgf` was verified serving 100% of the existing pilot's screening traffic at `2026-10-14T00:58:43.631Z` (October 13, 19:58 Central). `/ready` reports `2026-10-13-general-v158`, `gpt-live-1`, `gpt-6-luna`, timing logs, the local acknowledgement, ten sessions and `call-control-v1`. No revision ERROR or missing-acknowledgement logs appeared at verification.

Cloud Build `1e7a934c-9f85-4859-acfb-6b48f393dc5b` produced image digest `sha256:cec81049b2da373d73c837410dfb8d9c81f76fcdb0d72d3a5367b7afa50762fc` from source `da2c50e85fddb6a0c8fc031daea66105ad7fbd24`. The image inherits the exact prior production image and copies only `lib/live/policy.js`, `lib/live/session.js` and the new `lib/live/decision-progress.js`. Its 45 other packaged files and dependencies are unchanged. These modules include the previously tested clarification limit, unanswered-question guard and reassessment of decisions based on older caller speech. The normal request matches frozen SHA-256 `1f1857285f7864ff9226368cf69b5165259c6efbdffa85ce5345c63ee8e72240`.

The actual image passed all packaged file hashes in Cloud Build. The candidate revision was first checked at zero traffic, then explicitly pinned at 100% and its temporary tag removed. No active call reservations existed at staging or promotion. Readback confirms unchanged service settings, secret references, IAM and all eight Firebase function revisions. Production post-call filtering remains v4; repository v10, other backend changes and iOS changes were not deployed. No forwarding, consent, test-window, phone-setting or participant-capacity changes occurred.

The latest unchanged-source checks passed typecheck/build, 203 unit tests and 154 emulator tests; the reconstructed package also passed local startup. Readiness and image checks do not exercise model speech, live handoff or real calls. No v158 synthetic voice test, paid-model smoke session or real call occurred, under the owner's explicit voice-readiness exception. Known text-evaluation limitations remain in the [candidate report](SCREENING-PRODUCTION-CANDIDATE.md) and [online-report check](SCREENING-ONLINE-REPORTS.md).

Private manifests, before/after configuration, build and verification results are in `artifacts/private/v158-release/`. The canonical `artifacts/private/live-deploy.json` points to the verified v158 digest; its prior record is retained as `artifacts/private/v158-release/previous-live-deploy.json`.

Rollback target: **`shield-live-00012-vrw`**, screening `2026-10-12-general-v31`. If an authorized rollback is needed, `node artifacts/private/v158-release/release.mjs rollback` submits a traffic-only change pinning that revision at 100%. Use the helper's `status` command to confirm completion and traffic, then verify the service `/ready` reports v31. Restore the prior canonical deployment record only after that verification. This is a production change; it was prepared but not executed for this release.


## Hybrid and always-on release — October 13

Owner authorization covered deployment, ongoing screening for the existing owner, and a 60-minute connected-call limit. It did not authorize dialing phones or changing carrier/device forwarding; neither was performed.

- Bridge: `shield-live-00014-pz9`, 100% traffic; source `3107a42`; build `2a4267e9-e7ae-416e-a810-3975053660b5`. Eleven reviewed module overlays inherit the pinned v158 image/dependencies. Policy v158 and post-call v4 are unchanged.
- API: `shieldapi-00019-fav`. Four module overlays (app, call-control, forwarding-store, forwarding-voice) use the exact deployed source archive. The copied Cloud Functions archive matches the uploaded SHA-256. Service config, IAM and seven other functions remain unchanged.
- Environment: `SHIELD_SCREENING_MODE=hybrid`, `SONIOX_API_KEY` from dedicated `SHIELD_SONIOX_API_KEY:1`. Only the existing runtime identity was granted access. Runtime secret remains version 6, OpenAI version 2. Future standard bridge deployments preserve the explicitly configured hybrid environment and secret reference.
- Owner admission: `alwaysOn=true`, expired window `enabled=false`. No participant, recipient, consent or phone-setting changes. Existing monitoring and quiet-hour preferences remain. Readback checks every other participant field, not just the boolean.
- Bounds: 75-second screening; one research request and twelve tools across both stages; 30 daily screenings/person, 200 total screenings, 500 incoming calls; ten distributed active calls; recipient leg capped at 3,600 seconds after answer. The private summary uses a few of those seconds. The accepted-call sweeper uses an hour deadline. Monitoring's existing 240-check budget is unchanged and may finish before an hour.

Private release evidence and helpers are in `artifacts/private/hybrid-release/`: `before.json`, `manifest.json`, `state.json`, `build.json`, `stage-verified.json`, `verified.json`, `api-state.json`, `api-verified.json`, `activation-before.json` and `activation-verified.json`. These include configuration and must not be committed or printed in full. The bridge was tested at zero traffic before promotion, with no active-call reservations at either transition. Public `/ready` and Firebase Hosting health/service/privacy routes passed. No new bridge ERROR or missing-acknowledgement logs appeared at verification.

For owner-approved rollback of the hybrid only, `node artifacts/private/hybrid-release/release.mjs rollback` routes new streams to retained `shield-live-00013-zgf`. This leaves the API's 60-minute limit and owner admission setting in place. Read back traffic and `/ready` afterward. A separate owner-approved `node scripts/manage-forwarding-test.mjs always-off --participant <id>` pauses ongoing screening to voicemail; **do not use `close`**, which also starts carrier-restoration state. Carrier restoration remains manual. The previous API archive and config are retained separately for a targeted source rollback if required.

Use the [hybrid validation report](HYBRID-SCREENING.md), not a broad Firebase deploy, to reproduce this release's scope. The repository's post-call v10 is still unreleased. The new transport and 60-minute path have synthetic/emulator evidence, not a fresh real-phone verification.

## Monitoring cadence release — October 13

The owner requested the existing 240 checks be spread across the 60-minute connection. The [cadence report](MONITORING-CADENCE.md) documents the 5/15/20-second schedule, cost boundaries, screening misses and intervention-delay tradeoff. Verified at `2026-10-14T04:11:58.436Z` (23:11 Central):

- API `shieldapi-00020-mox`: only monitoring and cadence modules overlaid onto the actual `shieldapi-00019-fav` package.
- Dispatcher `monitorconnectedcall-00007-yek`: index, monitoring, cadence and queue modules overlaid onto its production package. Firestore event retries enabled. Old API jobs retain their prior bounded path during deployment/rollback.
- Worker `monitorscheduledcall-00002-wuv`: private task function, 512 MiB, two instances maximum, concurrency eight, 60-second timeout. Queue `monitorScheduledCall` allows 16 concurrent dispatches and ten per second; transient failures retry up to 20 times within five minutes. Runtime secrets remain versions 6 and 2. The runtime has queue-scoped enqueue access, private worker invocation, and act-as on its own identity.
- Bridge `shield-live-00014-pz9`, screening v158, monitoring v2, warning recordings, post-call v4, six unrelated functions, participant settings and carrier/device settings are unchanged.

`scripts/deploy-monitor-hour.mjs prepare` freezes real production sources and compares every monitoring request/warning byte. The new worker was deployed with `firebase deploy --only functions:shield:monitorScheduledCall --config artifacts/private/monitor-hour-release/firebase.json --project shield-calls-isaac --non-interactive`. The helper then verifies permissions, patches only the dispatcher and API source archives, and verifies copied source hashes/config/IAM. Do not replace this with a broad Firebase deployment: unrelated repository post-call changes remain unreleased.

The first CLI attempt reported an empty-policy IAM error; exact private runtime grants were read back and completed through the helper. The first delayed cloud smoke found a named-app/default-app mismatch, before the API producer switched. The fix is covered by a regression and subsequent cloud smoke success. Original deployment attempts and smoke logs remain, and the expired failed canary was removed by its exact synthetic ID. Final source hashes, all 73 worker files, API readiness and private worker access passed. At `04:12:35Z`, there were zero monitoring/API error logs since the repaired dispatcher verification, zero pending checks and zero active reservations. No model or phone call is made by these contentless smoke jobs.

Final code checks: 232 unit tests/typecheck/build and 159 emulator tests. Go monitoring text checks retain 12/12 benchmark ordinary conversations and stop 12/12 harmful ones; fresh follow-ups retain six ordinary and stop six harmful, with all twelve harmless openings retained. No real-call timing claim follows from these checks. Source commits are `1a0c16f` and `48bbbb2`; later commits only document/operator-verify the release.

Private rollback sources and original configurations are under `artifacts/private/monitor-hour-release/`. Restore the API's `api-base.zip` source first, then the dispatcher's `dispatcher-base.zip` source and original retry policy from `before.json`; preserve existing service config and IAM. Keep the task worker/queue running until outstanding new-cadence jobs drain. This is an owner-authorized production operation, not a command to execute during routine checks. The compatible dispatcher handles legacy jobs during the rollback. The separate 60-minute limit and always-on admission should remain unless the owner asks to change them.


## Phone sign-in and trusted-contact activation candidate — October 14, 2026

Repository implementation only; no production secrets, IAM, provider configuration, Hosting or Functions were changed. Existing deployed revisions and the existing pilot owner remain as recorded in Status. Runbook for an owner-approved release:

1. Configure a [Telnyx Verify profile](https://developers.telnyx.com/api-reference/verify/trigger-sms-verification) for provider-generated SMS codes (six digits, five-minute timeout). Add its UUID as `TELNYX_VERIFY_PROFILE_ID` to a new reviewed runtime-secret version. Do not use custom codes or the verification-status bypass.
2. Configure a Telnyx messaging sender approved by the provider for the intended traffic. Add `SMS_ALERTS: { messagingProfileId, from }` to that runtime version. Keep sender numbers in the private runtime, not documentation or build artifacts. Configure signed inbound messaging webhooks at `https://shield-calls-isaac.web.app/public/messaging/webhook`; use the matching Telnyx public key, and verify provider STOP/START handling. The application independently honors signed opt-outs. Provider approval, pricing and deliverability are not established by local tests.
3. Check that Shield's runtime identity can create Firebase Auth phone users and [sign custom tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens). If IAM signing is unavailable, prepare the smallest service-account signBlob permission change for approval. Do not distribute a service-account key to clients. Native Firebase phone sign-in is not the SMS transport used here; Telnyx Verify precedes Firebase custom auth.
4. Preserve the current pilot owner's UID and email sign-in. A new phone UID must not silently inherit a participant by matching its phone number. For the existing owner, use email or explicitly link their verified number to the same Firebase account through a reviewed operator action.
5. Deploy a reviewed API/alert-worker/cleanup source package and Hosting's `trusted-contacts.html`, `.css` and `.js`. Preserve the deployed screening and post-call policies; the entire repository contains unrelated, undeployed screening work and must not be indiscriminately published. No bridge rollout is required. Confirm that `sendShieldAlert` still uses `retry:false`; contact receipts suppress duplicate event delivery.
6. Read back public availability flags and deployed source/runtime versions. With separate explicit permission and consenting test recipients, verify OTP delivery, app registration, request acceptance, text/app alerts, STOP/START, revocation and no history access. Record SMS submission versus actual handset delivery separately. Do not message or call the owner's phones without their explicit instruction.

Quota defaults: five code sends per number/day, twenty per observed IP/day, one hundred globally/day, sixty seconds between sends; five code checks per challenge. Contact requests: ten per owner/day, three per recipient/day, one hundred globally/day; five active contacts per protected person. Contact alerts: twenty texts per recipient/day, two hundred globally/day. Since Fastify does not trust forwarded IP headers, the IP bucket may be shared behind the platform proxy; adjust only with verified ingress handling. These conservative pilot limits are not a general-public rollout configuration.

Rollback: disable the optional runtime settings and restore the previous API/worker/Hosting package; keep the old email sign-in path and participant ownership. Existing contact rows grant no call access. Disabling SMS must stop submission, while already accepted app alerts depend on the retained APNs configuration.


## Phone-only sign-in activation — October 17, 2026 (activated)

The owner approved activation, minimal permissions, existing-account linking and one test SMS. API `shieldapi-00030-haq` now uses runtime version `8`, adding only `TELNYX_VERIFY_PROFILE_ID` to the prior runtime `6` settings. The Verify profile has six-digit generated codes, a 300-second timeout, US/Canada destinations and a $2/day cap. This does not activate trusted-contact text alerts or `SMS_ALERTS`; the separate messaging-sender setup above is for those alerts. The iOS page has no email/sample option and Home has no account control.

The API identity has the custom project role `shieldPhoneUsers` containing only `firebaseauth.users.create`, and `shieldPhoneTokenSigner` containing only `iam.serviceAccounts.signBlob` on its **own service-account resource**. No project-wide token-signing grant or exported key was used. The reviewed pilot owner's enrolled number is linked to the same Firebase UID, preserving the email attribute and participant ownership. Never automatically assign an existing participant to a newly created phone UID by matching the phone number.

Telnyx Verify identifiers can be hex GUIDs without RFC UUID version/variant bits. Both the runtime profile validator and verification-response validator must accept that shape; malformed strings are still rejected. The first runtime-only activation made readiness return 503 because of strict UUID validation. Runtime `6` was restored and checked healthy before the repaired rollout. The final package modifies only `lib/cloud/config.js` and `lib/cloud/phone-auth.js` from the previously verified API source, preserving its consent version and unrelated source. Local verification passed 321 unit tests, typecheck/build and 232 Firestore emulator tests.

Private activation and repair evidence lives under ignored `artifacts/private/phone-sign-in/`: `api-before.json`, `runtime-before.json`, `activation-policies-before.json`, `guid-before.json`, `guid-baseline.zip`, `guid-manifest.json`, `guid-state.json` and `guid-verified.json`. The latter records the verified package hash, revision and availability. The guarded release checks the baseline revision, staged hashes, no active call reservations, all service settings and unrelated function revisions. The app requested the approved SMS and iOS offered its code from Messages. The owner then confirmed successful sign-in; a 12:20 Central server readback showed the latest challenge consumed in one attempt, a subsequent Firebase login, and the same account UID and participant ownership. Two challenges had been requested by that check. Relaunch persistence was not separately exercised. See Status for the handset evidence.

Rollback restores the previous API source from `guid-baseline.zip` and its runtime `6` binding; remove only the two new role bindings if disabling phone auth completely. Preserve the existing owner UID and email attribute. Removing the profile makes phone sign-in unavailable, and the current iOS build does not offer email recovery. Runtime-only rollback is sufficient to restore API health if a future profile-setting error is detected. Never print private runtime, phone numbers, challenge IDs or session tokens.
