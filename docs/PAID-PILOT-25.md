# 25-user paid pilot — prepared, not deployed

October 16, 2026. Scope: 25 enrolled people sharing Shield's existing Telnyx number, with one active incoming call per person. The owner authorized local fixes and tests, but requires approval before live settings, deployments or spending. This task has made no production write or real call.

## Prepared changes

`backend/src/cloud/pilot-limits.json` is the common source for capacity, enrollment, provider recommendations and abuse limits. API readiness reports its limits version, capacity and whether phone sign-in and contact texts are configured. Configuration presence is not delivery evidence.

| Setting | Prepared value | Reason |
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

## Proposed billing — approval required

- **Outbound profile ceiling: $15/day**, enabled. The current $1/day ceiling can block recipient callbacks. Keep US-only destinations, the $0.05/minute destination-rate restriction, and no blanket call recording.
- **Auto recharge: threshold $20, amount $30**, targeting a $50 balance under the portal's stated behavior. With the observed $7.10 balance, enabling it may immediately collect approximately **$42.90**, before applicable adjustments. Confirm the displayed charge before saving.
- The profile ceiling is **not an overall spending cap**: inbound calls, Voice API features, messaging/Verify, other vendors and cloud hosting have separate costs. Auto recharge is not a spending cap either. The portal allows up to ten recharges per 24 hours, so replenishment can substantially exceed $30/day.
- Confirm billing alerts and review initial usage before increasing limits. No recurring monitoring schedule was created.

On metered calling, more concurrent calls produce more billable minutes without inherently increasing the per-minute rate. [Telnyx concurrency limits](https://support.telnyx.com/en/articles/1130717-limits-on-concurrent-outbound-calls), [profile controls](https://support.telnyx.com/en/articles/4320411-more-about-outbound-voice-profiles), [Voice API pricing](https://telnyx.com/pricing/voice-api).

## Live evidence and remaining gates

Read-only October 16 inspection found **10 inbound / 10 outbound** application channels, profile capacity **10**, first-command timeout **10 seconds**, outbound ceiling **$1/day**, and credit **$7.10**. The portal showed account outbound capacity **10** and auto recharge disabled. The latest runtime lacks `TELNYX_VERIFY_PROFILE_ID` and `SMS_ALERTS`; the number has no messaging profile. API/bridge readiness does not report the new limits version.

Before accepting the full paid cohort:

1. **Get account outbound capacity approved for 30**, independently of application/profile settings. No support message has been sent. The read-only planner deliberately reports account capacity as unverified because resource GET responses do not establish it.
2. **Apply approved voice and billing settings, then read them back.** Preserve number assignment, webhook URLs, DTMF, destination restrictions, press-1 and the recording lifecycle. Leave built-in forwarding, blanket recording and network rejection off. Shared voice capacity requires no replacement number purchase.
3. **Activate phone sign-in and contact texts** with an approved Verify profile and provider-approved messaging sender/profile. Obtain required business/sender approval and disclose fees before spending. Configure signed STOP/START webhooks and narrowly scoped custom-token signing permission per [Operations](OPERATIONS.md). Verify actual SMS delivery and consent with approved test recipients. APNs is a separate optional channel.
4. **Deploy the reviewed release and scaling configuration**, including affected workers/cleanup, after explicit approval. Confirm deployed versions, API capacity, four-instance bridge ceiling and provider/model quotas. Zero minimum instances retain on-demand costs; real cold starts still require measurement.
5. **Qualify every forwarding route and the purchase-to-activation journey.** Phone sign-in creates an account, not an enrolled or carrier-qualified route. Enrollment remains an operator step. Do not sell unattended activation until purchase, enrollment, setup and restoration match the supported flow.
6. **Run approved real-call checks** for overlap, press-1, decline, voicemail/audio delivery, hangup/retry, cold starts and routing isolation. Never call the owner's phones without explicit authorization. Expand from a few people after evidence; these changes cannot guarantee error-free carrier service.

## Validation

- `npm run check`: typecheck, **276 unit tests**, and build passed.
- `METADATA_SERVER_DETECTION=none GCLOUD_PROJECT=demo-shield npm run test:firebase`: **213/213 passed** across all ten emulator files.
- Coverage includes 25 concurrent admissions through two independent Firestore clients; 25 offers, distinct recipient legs, rejected cross-call acceptance, press-1 bridges and hangup cleanup; personal quotas; 25 sign-ins behind one address; and 25 synthetic streaming sessions with isolated disconnects.
- The first complete emulator run exposed a transaction-lock failure (**212 passed, one failed**). After the admission queue fix, the focused suite passed **56/56** and its 25-call lifecycle took about **1.6 seconds**, versus about 15 seconds in the failed attempt. The complete final suite passed, including the two-client test. An earlier exploratory run was interrupted and is not counted as a pass.
- All provider actions, phone codes and model results are mocked. Audio uses synthetic frames and an injected recognizer. These establish isolation/control flow, **not 25 real phone/audio sessions or production latency**.

## Local release

`node scripts/paid-pilot-plan.mjs` reads the latest runtime/provider settings and returns a sanitized proposed plan. It has no mutation mode, prints no keys/phone numbers/webhook URLs, and keeps unknown readiness, billing and real-call evidence as explicit gates.

```sh
npm run build
node scripts/package-firebase.mjs
node scripts/deploy-live-bridge.mjs package
node scripts/stage-paid-pilot-release.mjs
```

`package` performs local checks only. The existing `build`, `deploy` and `publish` commands contact cloud services and require approval.

The release in ignored `artifacts/private/paid-pilot-25-release/` has a changed-module/hash manifest. It preserves the frozen API's post-call **v4** and other decision modules, and the bridge's screening **v158**. The bridge overlays only server, admission/shared-routing modules and limit JSON. The API includes already-written phone-auth/contact modules, configuration/cleanup and existing recording-origin hardening. Do not deploy generic full-main output: it includes an unreleased post-call policy. The stage script requires the retained October 16 deployment snapshots and fails if policy baselines are missing or wrong.

The assembled API and both bridge modes pass synthetic startup checks. No cloud build, deployment, SMS, purchase, billing change or production write has occurred. Provider activation and deployment are the next approval boundary.
