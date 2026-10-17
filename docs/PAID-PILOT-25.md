# 25-user paid pilot — deployed, provider capacity restricted

October 16, 2026. Scope: 25 enrolled people sharing Shield's existing Telnyx number, with one active incoming call per person. The owner approved the scoped release and voice/billing settings, then requested smaller recharge and deferred higher account verification. Additional messaging fees and real phone calls still require approval. No real call or SMS was made.

## Deployed changes

`backend/src/cloud/pilot-limits.json` is the common source for capacity, enrollment, provider recommendations and abuse limits. API readiness reports its limits version, capacity and whether phone sign-in and contact texts are configured. Configuration presence is not delivery evidence.

| Setting | Target value | Reason |
|---|---:|---|
| Enrolled people / active incoming calls | 25 / 25 | One reservation per person; immutable recipient and press-1 acceptance remain |
| Telnyx inbound / outbound application channels | 30 / 30 | Five channels of setup/callback headroom |
| Telnyx profile and account outbound capacity | At least 30 each | Application settings cannot bypass either ceiling |
| First-command timeout | 30 seconds | Accommodates bounded startup and 20-second recovery before Telnyx's timeout |
| Bridge sessions per instance / maximum instances | 10 / 4 | Room for 25 screenings plus preparation requests; zero minimum instances |
| Screened calls per person / total per Central day | 30 / 750 | Existing personal allowance scaled to 25; further eligible calls go to voicemail |
| Incoming calls per person / total per Central day | 100 / 2,500 | One person cannot consume the shared daily budget; exhausted calls are refused |
| Phone-code requests per address / total per day | 125 / 250 | Supports 25 people behind one proxy; five sends per number and cooldown remain |
| Phone-code checks per address per day | 625 | Supports the cohort; individual challenge attempt limits remain |
| Contact requests / alert texts total per day | 250 / 500 | Personal, recipient, consent and STOP controls remain |

Admission queues briefly within each API process to avoid competing transactions on shared capacity and daily-usage documents. Firestore transactions still enforce capacity across processes. Existing calls do not wait for this queue. Ending a call deletes only its own reservation without reading and replacing everyone else's reservations.

## Applied billing — October 16

- **Outbound profile ceiling: $15/day**, enabled and read back. US-only destinations, the $0.05/minute destination-rate restriction, and no blanket call recording are preserved.
- **Auto recharge: threshold $5, amount $10**, targeting a $15 balance under Telnyx's threshold-plus-amount behavior. The balance remained **$7.10** immediately after saving, so this change did not trigger an immediate recharge.
- The profile ceiling is **not an overall spending cap**: inbound calls, Voice API features, messaging/Verify, other vendors and cloud hosting have separate costs. Auto recharge is not a spending cap either; repeated recharges can exceed $10/day.
- Billing alerts remain to be confirmed. No recurring monitoring schedule was created.

On metered calling, more concurrent calls produce more billable minutes without inherently increasing the per-minute rate. [Telnyx concurrency limits](https://support.telnyx.com/en/articles/1130717-limits-on-concurrent-outbound-calls), [profile controls](https://support.telnyx.com/en/articles/4320411-more-about-outbound-voice-profiles), [Voice API pricing](https://telnyx.com/pricing/voice-api).

## Live evidence and remaining gates

The approved live readback confirmed **30 inbound / 30 outbound application channels**, **30-second first-command timeout**, **$15/day outbound profile ceiling**, and **$5/$10 auto recharge**. Other application/profile fields were preserved. The profile remains **10 simultaneous outbound calls**: requests for both 30 and 11 were rejected with Telnyx's account-level verification error. Raising application limits does not bypass this restriction. The owner deferred verification/support outreach; no support message was sent.

After the approved reliability follow-up, bridge **`shield-live-00017-qrw`** and API **`shieldapi-00025-wec`** are live, with workers **`runsharedcalljob-00003-nog`**, **`expiresharedcalls-00005-rug`**, **`cleanupshield-00013-guj`**, and unchanged **`sendshieldalert-00004-vef`**. Source hashes, IAM, existing secret versions, unrelated function revisions and policies were preserved. All affected services retain zero minimum instances and request-based CPU. The bridge has four maximum instances and ten sessions per instance. API readiness reports capacity 25 and `paid-pilot-25-v1`.

Phone sign-in and contact texts remain unconfigured: the runtime lacks `TELNYX_VERIFY_PROFILE_ID` and `SMS_ALERTS`, and the number has no messaging profile. Their deployed code does not establish provider activation or SMS delivery.

### Overflow at ten outbound calls

The ten-call Telnyx limit applies to outbound recipient legs, including ringing and private offers. An additional admitted inbound call can still be screened. If its recipient dial is rejected immediately, the existing call-control handler transitions it to voicemail and plays the existing message prompt; if Telnyx creates a recipient leg and then reports its hangup before acceptance, that path also offers voicemail. The inbound record-from-answer capture continues without opening another outbound channel. Existing connected calls are unaffected. Duplicate offers do not redial, and late press-1 callbacks cannot connect a call already sent to voicemail.

This behavior is already present in deployed API `shieldapi-00024-lin`; the call-control, provider and forwarding-store modules match the verified deployment artifact. The October 16 follow-up adds explicit simulated ten-connected-plus-one-overflow coverage for immediate HTTP rejection and asynchronous recipient hangup, including capture ownership, reservation cleanup, and a subsequent normal offer after one existing call ends. This does not establish actual Telnyx saturation behavior. It also does not bypass inbound capacity, routing, daily quotas or the existing one-active-call-per-person admission rule: a call rejected before admission cannot use Shield's voicemail fallback.

Follow-up validation passed `npm run check` (typecheck, 276 unit tests, build) and the complete Firestore suite (215/215, including both new overflow cases). Only tests and documentation changed; no deployment, live settings, calls or messages were needed.

### Backend reliability follow-up — deployed October 16

The owner approved deployment of all three fixes from `2933563`; the scoped rollout was verified at 22:40 Central:

- Moving an offered call to voicemail now commits a dedicated recovery job in the same transaction. If the first announcement command fails, the private worker retries it independently of the original offer webhook. This covers dial rejection, recipient hangup and decline. Command receipts prevent another dial or duplicate successful playback; a completed voicemail prompt or ended call makes a late job harmless.
- Daily expiry cleanup drains each configured collection in pages of 400, including blocked numbers. A fixed cutoff and document cursor let it advance past retained legacy accepted contacts. Deletion preconditions protect concurrent updates, and historical stopped-call totals are preserved before call records are deleted. The deployed function allows 120 seconds and its scheduler allows three retries; committed pages remain deleted if a later page fails.
- Accepted conversations retain their connected history status beyond 7½ minutes. Abandoned calls that were never accepted still receive the existing missed-call fallback.

Validation passed `npm run check` (typecheck, 283 unit tests, build) and the full Firestore emulator suite (226/226 across 11 files). Twelve new regression cases cover the three fixes, including retries from a fresh worker, duplicate callbacks, delayed jobs after prompt completion/hangup, and 805 expired rows in each of four cleanup collections. The first check needed local-server permission, and the first emulator run exposed a missing routing field in the synthetic hangup fixture; both final runs passed after those corrections.

The exact release package passed another **70/70** focused tests plus API and both bridge-mode startup checks. Only five API modules and two bridge modules changed from the verified live packages. The other agent's account-deletion/privacy work and unreleased screening/message policies were excluded. The private worker was upgraded and verified before enabling new `voicemail` job producers; the bridge was checked at zero traffic before promotion. Cloud Build `798057e1-1e56-4dbc-87f7-5259ee0bbfc5` verified the bridge's source hashes inside the built image.

Live verification confirmed source hashes, preserved IAM/configuration, private-worker rejection of unauthenticated requests, public readiness, all five contentless job phases (including voicemail), zero active reservations, and the expiry queries' production indexes. One concurrent synthetic job logged `call_busy`; its retry completed and all five jobs finished. The final log review found no unexpected errors. Cleanup's normal schedule is unchanged; no manual customer-data cleanup was invoked. No real call, SMS, Telnyx setting, billing setting, secret or policy changed. This is infrastructure/synthetic evidence, not real-call qualification. Private snapshots, manifests and results are in `artifacts/private/backend-reliability-release/`.

Before accepting the full paid cohort:

1. **Get account outbound capacity approved for 30**, independently of application/profile settings. No support message has been sent. The read-only planner deliberately reports account capacity as unverified because resource GET responses do not establish it.
2. **Completed: apply approved voice and billing settings and read them back.** Preserve number assignment, webhook URLs, DTMF, destination restrictions, press-1 and the recording lifecycle. Leave built-in forwarding, blanket recording and network rejection off. Shared voice capacity requires no replacement number purchase.
3. **Activate phone sign-in and contact texts** with an approved Verify profile and provider-approved messaging sender/profile. Obtain required business/sender approval and disclose fees before spending. Configure signed STOP/START webhooks and narrowly scoped custom-token signing permission per [Operations](OPERATIONS.md). Verify actual SMS delivery and consent with approved test recipients. APNs is a separate optional channel.
4. **Completed: deploy and verify the scoped release**, including affected workers/cleanup. Provider/model quota qualification and real cold-start measurements remain outstanding.
5. **Qualify every forwarding route and the purchase-to-activation journey.** Phone sign-in creates an account, not an enrolled or carrier-qualified route. Enrollment remains an operator step. Do not sell unattended activation until purchase, enrollment, setup and restoration match the supported flow.
6. **Run approved real-call checks** for overlap, press-1, decline, voicemail/audio delivery, hangup/retry, cold starts and routing isolation. Never call the owner's phones without explicit authorization. Expand from a few people after evidence; these changes cannot guarantee error-free carrier service.

## Validation

- `npm run check`: typecheck, **276 unit tests**, and build passed.
- `METADATA_SERVER_DETECTION=none GCLOUD_PROJECT=demo-shield npm run test:firebase`: **213/213 passed** across all ten emulator files.
- Coverage includes 25 concurrent admissions through two independent Firestore clients; 25 offers, distinct recipient legs, rejected cross-call acceptance, press-1 bridges and hangup cleanup; personal quotas; 25 sign-ins behind one address; and 25 synthetic streaming sessions with isolated disconnects.
- The first complete emulator run exposed a transaction-lock failure (**212 passed, one failed**). After the admission queue fix, the focused suite passed **56/56** and its 25-call lifecycle took about **1.6 seconds**, versus about 15 seconds in the failed attempt. The complete final suite passed, including the two-client test. An earlier exploratory run was interrupted and is not counted as a pass.
- All provider actions, phone codes and model results are mocked. Audio uses synthetic frames and an injected recognizer. These establish isolation/control flow, **not 25 real phone/audio sessions or production latency**.

## Scoped release

`node scripts/paid-pilot-plan.mjs` reads the latest runtime/provider settings and returns a sanitized proposed plan. It has no mutation mode, prints no keys/phone numbers/webhook URLs, and keeps unknown readiness, billing and real-call evidence as explicit gates.

```sh
npm run build
node scripts/package-firebase.mjs
node scripts/deploy-live-bridge.mjs package
node scripts/stage-paid-pilot-release.mjs
```

`package` performs local checks only. The existing `build`, `deploy` and `publish` commands contact cloud services and require approval.

The release in ignored `artifacts/private/paid-pilot-25-release/` has a changed-module/hash manifest. It preserves the frozen API's post-call **v4** and other decision modules, and the bridge's screening **v158**. The bridge overlays only server, admission/shared-routing modules and limit JSON. The API includes already-written phone-auth/contact modules, configuration/cleanup and existing recording-origin hardening. Do not deploy generic full-main output: it includes an unreleased post-call policy. The stage script requires the retained October 16 deployment snapshots and fails if policy baselines are missing or wrong.

The assembled API and both bridge modes passed synthetic startup checks. The owner-approved cloud build and scoped deployments completed October 16 Central. Four contentless production jobs (start, greet, outcome and scheduled deadline) completed through the private worker without phone/provider IDs. Production readiness, private-worker rejection of unauthenticated requests, empty active reservations, source hashes and preserved IAM/configuration passed. The complete scoped log query at 21:53:57 Central found zero errors since 21:49:29. This is synthetic infrastructure evidence, not real-call or carrier evidence. Private deployment evidence is retained under `artifacts/private/paid-pilot-25-release/live/`.
