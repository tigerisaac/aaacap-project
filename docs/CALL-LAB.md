# Automated call rehearsal and proposed live run

## Delivered locally — October 16, 2026

The call lab runs the deployed API package from commit `2933563` (`shieldapi-00025-wec`) against a dedicated Firestore emulator. The package's complete file set and SHA-256 hashes are checked before execution. It does not compile the working tree, which another agent is changing.

```sh
node scripts/call-lab.mjs plan
node scripts/call-lab.mjs run
node scripts/call-lab.mjs serve
```

`serve` prints a localhost URL for the browser panel. Choose any of 25 fictional recipients, run a scenario, preview the signed browser routing tag, or run all eight cases. No microphone or provider credentials are used. CLI and browser reports are saved to ignored `artifacts/private/call-lab/latest.json`.

Prerequisites: installed repository dependencies, Java/Firestore emulator, and the retained deployment package at `artifacts/private/backend-reliability-release/api`. This ignored package is deliberately required; a missing or modified package stops the lab. A fresh checkout needs that exact retained release artifact. Do not silently substitute a build of current main.

The lab uses `demo-shield-call-lab`, loopback port 8097, a separate Firestore namespace, fake keys and reserved fictional identities. It resets only that emulator namespace before each run. Provider methods are replaced with local command collectors. The browser accepts only same-origin JSON mutations and never receives keys or signed tokens. No production backend, iPhone app, Telnyx setting or deployment was changed.

## What the checks prove

Eight scenarios cover accepted calls, decline to voicemail, no-answer to voicemail, caller hangup, a scripted harmful decision, silence, and two overlapping calls to different recipients. The runner checks fixed-recipient routing, no bridge before pressing 1, recording-stop ordering before bridge, voicemail control-flow progression, retained connected status after eight simulated minutes, and capacity release at hangup.

Screening decisions and provider events are injected. The harmful scenario is **not a screening-quality benchmark**, and no audio, recording or real AI decision is evaluated. No-answer is a simulated child-leg hangup; voicemail checks control flow, not a playable saved message. The eight-minute check advances the DTO clock; it is not an eight-minute live conversation. Twenty-five seeded routes are not 25 concurrent real calls.

The additional security/budget tests cover all 25 signed aliases, signature/connection gating, expiry, tampering, replay, duplicate metadata, fixed destinations, two-session concurrency, eight-attempt rehearsal reservations, the smaller two-attempt live proposal, stop and stale-run behavior. These reservations are local test logic, **not a live Telnyx spending control**.

## Calling from the browser

Telnyx WebRTC supports `destinationNumber`, `customHeaders` and a supplied audio `localStream`. A browser can therefore represent a synthetic caller and play prerecorded synthetic speech rather than use a physical phone. See the [WebRTC call options](https://team-telnyx.github.io/webrtc/interfaces/ICallOptions.html).

The lab prepares an `X-Shield-Lab-Ticket` header containing a signed, short-lived alias. Its isolated adapter checks the provider signature result, connection, alias, expiry and call binding before mapping it to a fixed fictional recipient. Production does not accept this shortcut. The preview deliberately uses a non-routable `.invalid` destination and does not invoke the SDK.

[Telnyx documents custom X-header propagation](https://support-v2.telnyx.com/en/articles/16666680-custom-sip-x-header-propagation-on-telnyx) for same-account SIP to Programmable Voice, including webhook `custom_headers`. PSTN/cross-account transport is not guaranteed. Custom metadata is not a forged carrier `Diversion` header and cannot qualify a mobile forwarding route.

A numberless test route is plausible using a separate [Voice API application's inbound SIP subdomain](https://support.telnyx.com/en/articles/4374050-configuring-call-control-texml-applications-voice-api), restricted to our connections. It is not configured or verified on this account. No numbers are purchased or planned at this stage.

## Proposed paid run — not enabled

| Limit | Proposal |
|---|---:|
| Sessions, including failed attempts | 2 |
| Concurrent sessions | 1 |
| Maximum session duration | 60 seconds |
| Maximum billable legs per session | 4 |
| Worst-case session / leg minutes | 2 / 8 |
| Planning estimate | $0.133 |
| Suggested budget including contingency | $0.25 |
| Number purchases | 0 |

Start with browser metadata/acceptance on the first call and decline-to-voicemail on the second. Keep the other six scenarios local for now. The original $1.80 estimate covered eight two-minute sessions and $1.30 of unmeasured AI/hosting allowances; it was a padded test budget, not the expected price of a few checks.

The calculation conservatively applies API, SIP-interface and browser charges to all four possible legs for the entire duration. It does not assume one forwarded conversation is one billable leg.

| Item | Allowance |
|---|---:|
| Voice API, 8 minutes × $0.002 | $0.016 |
| SIP interface, 8 minutes × $0.002 | $0.016 |
| Browser endpoints, 8 minutes × $0.002 | $0.016 |
| WebSocket streaming, 2 minutes × $0.0035 | $0.007 |
| Recording, 2 minutes × $0.002 | $0.004 |
| Soniox typical equivalent, 2 minutes × $0.002 | $0.004 |
| Language-model planning allowance | $0.050 |
| Cloud infrastructure planning allowance | $0.020 |
| Total | **$0.133** |

Rates checked October 16: [Telnyx Voice API pricing](https://telnyx.com/pricing/voice-api), [Soniox pricing](https://soniox.com/pricing). Soniox uses token billing; the per-minute figure is a typical equivalent. Model and hosting amounts are chosen allowances, not provider quotes. Excludes number rental, PSTN destinations, taxes and unquoted surcharges. Confirm the actual account's rates before live execution. The 25¢ figure is a proposed budget, **not a provider-wide guaranteed hard dollar cap**.

## Approval boundary and remaining implementation

This release is the local rehearsal setup. It has no live executor or public webhook endpoint. A paid run is not one switch away and has not been attempted.

Before placing any calls, obtain approval for an isolated Telnyx connection and test gateway configuration. Build/verify its separate software recipient endpoints, restricted credentials, live media adapter and provider-side duration limits; persist the two-attempt budget across restarts; add server-side cleanup of every leg and a stop control. Never rely on an open browser or a JavaScript timer to cap billing. Uncertain dial responses must consume their reservation and stop retries. Keep the test database, routes, bridge and endpoints separate from production. Never redirect an owner's real number through the test adapter.

Then ask for explicit approval of the exact two-call run and its cost estimate. First verify same-account header transport with one of the two reserved sessions. If that fails, stop; do not buy a number, add PSTN calls, silently switch providers, or expand the workload.

After the small live run, pilot qualification still needs actual voicemail audio/playback, two-way audio/DTMF and recording-stop confirmation, live AI behavior, provider-failure recovery, 10-plus-1 outbound-capacity overflow, a long connected call, carrier forwarding/restoration and iPhone delivery. Browser/SIP calls can cover much of the provider/media path, but cannot certify a mobile carrier's forwarding configuration. Software call legs may themselves consume the account's 10-outbound limit; plan the overflow test separately instead of assuming 11 browser calls equal 11 available forwarded calls.

## Verification record

October 16, 2026: the CLI completed all eight local scenarios; browser controls completed the suite and an individually selected 25th recipient; signed-routing preview worked; mobile (390px) and desktop (1280px) showed no horizontal overflow. Foreign-origin mutation, arbitrary-recipient preview and a nonexistent live-call route were rejected. The 11 new security/budget tests passed. `npm run check` passed typecheck, 293 unit tests and build before the final additional budget test; the targeted suite then passed all 11 tests. Required Firestore checks passed 229 tests against `demo-shield`. These shared-tree checks include another agent's uncommitted work and do not assert it was deployed. The call lab itself uses the separately hash-locked deployed package. No real-call or real-audio verification occurred.
