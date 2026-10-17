# Browser call lab

## Warning recovery follow-up — October 17, 17:46–17:48 Central

The owner approved two more isolated 60-second calls. Replacing parking with hold disconnected the recipient before playback; moving the already-bound recipient into a private conference accepted playback but still produced no measured warning speech. Both attempts are exhausted. The cleanup audit passed, including conference completion and unchanged production settings. Rounded balance moved by 1¢. No AI requests, owner-phone calls or production changes occurred. The `--warning-audio-recovery` ledger cannot be reused. Its helper only acts on the existing reserved recipient, fences room creation/playback, limits the room to one minute and includes watchdog cleanup. [Measurements and the local ordering correction](INCIDENT-2026-10-17-CALL-AUDIO.md#recovery-checks-prepared--october-17-1745-central).

## Warning audio investigation — October 17, 17:29–17:36 Central

Two owner-approved pairs of isolated browser/SIP calls reproduced missing warning speech after the caller was removed. The baseline hangup → playback sequence left the recipient on hold and never completed its warning. Waiting until 750 ms after the hold callback produced unhold and completion, but the captured recipient audio remained quiet. A separately approved follow-up tested uncached playback targeting only the recipient with the audio queue cleared, then Joanna backup speech targeting only the recipient. Both completed at the provider while recipient audio still lacked the warning. The stronger follow-up capture used a stable Web Audio destination, followed track replacements and measured received WebRTC audio energy; no replacement occurred. Acceptance prompts and bridged tones were present before disconnect. **No verified audible-warning fix or production deployment resulted.** [Detailed measurements, limits and screening results](INCIDENT-2026-10-17-CALL-AUDIO.md).

Both cleanup audits passed: production resources and number assignments unchanged, all eight test legs ended, temporary credentials revoked, lab resources disabled and provider recordings deleted. The displayed balance moved $6.76 → $6.73 across both pairs; rounded account balance is not itemized billing. The four paid attempts are exhausted. Private ledgers and synthetic captures remain in `warning-audio-2026-10-17/` and `warning-audio-followup-2026-10-17/` under the existing private lab directory.

The harness adds `--warning-audio` and `--warning-audio-followup`, each requiring `--authorized-two-calls`. Both use sequential 60-second reservations and never rebind the public number. Their completed ledgers reject reuse; these flags are not fresh authorization. Warning playback is a deliberate reproduction of the current command sequence over the hash-locked earlier call-control transport, with a fixed screening decision and no real AI monitoring. It is not an end-to-end production monitor test. The dedicated warning emulator uses ports 8298/9358 because the earlier lab emulator was occupied. Final checks passed 339 unit tests, typecheck/build and 252 Firestore tests.

## Capacity overflow — passed October 17, 2026, 09:14–09:16 Central

The owner approved five real browser-originated calls through **+1 507 473 1802**, the temporary public-number routing window, and restoration afterward. **Four accepted conversations stayed connected together for 36.972 seconds; the fifth caller reached voicemail.** Telnyx rejected the fifth recipient dial with HTTP 403 / provider code `90043`, explicitly identified as a channel-limit rejection. The gateway did not fabricate that failure. The fifth call never bridged, its voicemail prompt completed, and more than six seconds of message capture followed. At the final readback, all eight accepted call legs and the overflow caller were still alive.

All four accepted recipients sent digit 1, recording stopped before bridging, and distinct expected tones were measured in both directions. Each pair passed the report's minimum five matching samples. The overflow recording's provider identity matched the caller and test application; its 28.9-second MP3 downloaded and decoded successfully, with nonzero audio in its final four seconds. These are synthetic-tone measurements, not a human speech-quality evaluation. The accepted sessions lasted 62.551–66.809 seconds and the overflow session 30.342 seconds. Exactly five attempts were used; no retry, number purchase, SMS, owner-phone call, AI request or production deployment occurred.

The report and independent provider audit passed at 09:16 Central. Normal public-number routing was restored; every pre-existing application, connection, profile and number assignment matched the original snapshot. All controlled call legs ended, all ten temporary credentials were revoked, the three test resources were disabled with their original limits restored, and all five provider recordings were deleted. The browser endpoints were then disconnected. Private evidence remains under `artifacts/private/call-lab/capacity-overflow/`, including the ledger, report, audit, synthetic voicemail and itemized billing.

Itemized usage retrieved at 09:17 Central totaled **$0.098 (9.8¢)**: SIP transport $0.0356, Call Control $0.0246, WebRTC $0.0248, recording $0.0100 and media streaming $0.0030. The displayed balance moved **$7.06 → $6.96 (10¢)** after posting; the earlier cleanup audit had still shown $7.06. The four incoming calls exceeded 60 seconds and were billed for 120 seconds each. The overlapping call-cost callback subtotal of $0.0634 is not added to the itemized total. This stayed within the 6–10¢ estimate and 15¢ planning allowance.

This verifies provider-enforced overflow with the **isolated recipient limit deliberately set to four** and the frozen deployed call-control package (`2933563`, `shieldapi-00025-wec`) against a local database. It does not establish the account's maximum concurrency or ten-plus-one behavior. Both callers and recipients were on Telnyx; outside-carrier forwarding, actual AI screening, voicemail filtering/iPhone delivery and human speech remain separate qualification work. The completed ledger blocks reuse; another paid run needs fresh owner approval.

### Run design and preparation

The experiment used **five incoming browser callers: four accepted conversations and one voicemail overflow**. It temporarily set only the isolated receiver's outbound limit to four, while allowing five inbound calls and a ten-channel test profile. Production limits remained unchanged.

The conservative channel model counts one browser-originated call plus one recipient dial per conversation. Four pairs use eight outbound channels; the fifth caller can still arrive on the ninth. A fifth accepted pair could use all ten and prevent a sixth browser caller from reaching Shield, testing caller origination failure instead of Shield voicemail. Same-account on-net accounting has not been measured at saturation, so four is the defensible experiment size, **not a measured account maximum**. Full ten-plus-one qualification needs a caller source confirmed independent of the account's outbound pool. External SIP ingress is a possible separate experiment but would not prove the public DID path and has not been built or verified. No new provider, deposit, number or support contact is required for this reduced test.

The fifth reservation is blocked until all four distinct recipients have provider bridge evidence. The run then requires: a provider channel-limit rejection (explicit HTTP response or exact recipient-leg SIP detail record with D1/D2/D3/D10/D22), voicemail prompt completion, at least six seconds of message capture, at least ten seconds of four-way overlap, all eight accepted legs plus the overflow caller alive at final readback, and expected distinct two-way tones on the four accepted conversations. Unrelated dial errors, bare 403/busy responses, swapped calls, early hangups and unexpected overflow acceptance cannot pass. Provider recording identity is checked before privately saving the synthetic voicemail; the report must decode its final audio and find nonzero signal. All provider copies are deleted afterward.

Expected usage **6–10¢**, with a **15¢ planning allowance**, based on the previous itemized 2.44¢ two-call run and additional overflow time. This is not a hard billing cap. Five attempts maximum, including failures; 90-second session deadlines; a 120-second local public-routing watchdog deadline; existing 25¢ outbound threshold retained. Local deadlines cannot guarantee hangup or restoration during complete host/network failure. Ordinary callers may fail during the public-number routing window. Cleanup restores the DID, disables the three isolated resources, resets their prior limits, revokes ten ephemeral credentials, and removes synthetic provider recordings. No AI, SMS or owner-phone calls are used.

Read-only preflight: `node scripts/call-lab/public-plan.mjs --capacity-overflow`. After specific owner approval for the calls and temporary routing window, the operator command is:

```sh
node scripts/call-lab/live.mjs --capacity-overflow --authorized-five-calls --authorized-public-number-window
```

Open five operator tabs with fragments `#person-01` through `#person-05`, register all pairs, then start the first four. Start the fifth only when its page reports that four conversations are connected. The gateway does not force a failure locally: Telnyx must enforce the configured recipient limit. The previous completed ledgers remain separate and immutable; this run uses `artifacts/private/call-lab/capacity-overflow/`. After execution, run `live-report.mjs --capacity-overflow` and `live-audit.mjs --capacity-overflow`. The flags are not authorization by themselves.

Preparation checks: 33 focused lab tests passed, including persistent five-attempt bounds, overflow admission gating, four distinct bridged recipients, unrelated-error rejection, exact-leg asynchronous rejection matching, recording identity/origin/size limits, and the fifth browser's start gate. `npm run check` passed typecheck, 314 unit tests and build before the two final additional regression tests; focused checks and syntax checks passed after those additions. The full required Firestore suite ran on a dedicated port because another agent owned the default: 228/229 passed, with the previously observed stopped-history-total invalid/closed transaction. The complete 16-test cloud file passed on isolated rerun. The CLI also refused to start without explicit five-call authorization. Desktop and narrow-layout previews used a local server with all actions rejected and no provider credentials. The design detector reported no regex findings in degraded mode; parser-based/computed contrast verification was unavailable. The live report and audit described above passed after execution; this evidence update changes documentation only and does not claim a new full test-suite run.

## Public-number overlap test — passed October 16, 2026, 23:55 Central

The owner approved the temporary public-number routing window and two real calls. Both browser callers dialed **+1 507 473 1802** and reached different synthetic recipients. Both recipients sent digit 1, recording stopped before bridging, and Telnyx reported both bridges. After **10.779 seconds of simultaneous connection**, provider readback confirmed all four controlled call legs were still alive. The gateway then ended both sessions (37.742 and 36.894 seconds total) and restored the public number to its original production application.

Both directions received the expected distinct audio tones: first pair 440/660 Hz, second pair 880/1100 Hz. The browser captured 10 and 12 samples respectively; the report passed its requirement of at least five matching two-way samples per pair. These measurements verify the expected dominant tones, not exhaustive speech-quality or crosstalk testing. Public-number webhook matching, digit-1 acceptance, recording-stop ordering, overlap duration and inactive call readback all passed.

The independent post-run audit passed: every pre-existing production application/connection/profile and number assignment matched the original snapshot; the lab connections and profile were disabled with their original limits restored; all four temporary credentials were revoked, all controlled legs ended and both synthetic provider recordings were deleted. Both browser endpoints were disconnected after the run. No number was purchased and no owner's phone was called.

Observed account balance: **$7.09 → $7.06 (3¢)**. Subsequent read-only itemized billing retrieval at 23:59 Central found **$0.0244 (2.44¢)** for this run: SIP transport $0.0080, Call Control $0.0056, WebRTC $0.0056, recording $0.0040 and media streaming $0.0012. The 35-second incoming legs and their recording entries were billed for 60 seconds; recipient entries were billed for 24 seconds. The Voice API callback subtotal of $0.016 is overlapping, incomplete billing evidence and must not be added to the itemized total. The 3¢ balance movement uses two-decimal balances and is not an exact itemized charge. All evidence is retained privately in `artifacts/private/call-lab/public-overlap/` (`live-ledger.json`, `live-report.json`, `live-audit.json`, `billing-reconciliation.json` and product detail records). The report and audit were checked at 23:56 Central. This proves two simultaneous accepted calls through the actual DID using Telnyx-originated browser calls and the frozen deployed call-control package. It does not establish outside-carrier forwarding, real AI screening, human speech quality or 25 concurrent calls.

### Run design and preparation

The owner requested two people on the actual public number, connected together for about ten seconds. The run used two different fictional recipients and four browser endpoints. The gateway waits for provider bridge evidence for both calls, then waits ten seconds and verifies all four controlled legs are still alive before ending them. Different synthetic tones in each conversation let the browser measurements detect an incorrect dominant recipient tone. A pass requires at least five samples of the expected tone in both directions for each pair.

This requires a separately approved brief **live number-assignment change** from production application `3069380298086024954` to test application `3072448854122038294`. Ordinary calls to the public number may fail during that window. The plan refuses an unexpected number binding or any active production calls, persists the original assignment before submitting a change, and restores it after the test. An independent watchdog attempts restoration after a stale heartbeat or a 90-second routing deadline; these local safeguards cannot guarantee restoration while the entire host/network is unavailable. A concurrent third-party routing change is never overwritten. Test application/browser limits temporarily become 2/2, and the test profile gets four outbound channels; cleanup returns them to 1/1 and two channels, disabled.

No number purchase is needed. Expect a few cents; retain the existing conservative 13¢ planning allowance and 25¢ **outbound-only** threshold. Each of two attempts has a 60-second deadline; failed attempts consume the run. The public-number run uses a separate persisted directory (`artifacts/private/call-lab/public-overlap/`) and cannot reset or reuse the earlier completed run. The test does not call the owner's phone. Since both ends originate within Telnyx, dialing the actual DID does not prove ingress or forwarding from an outside mobile carrier. Screening remains a fixed test decision.

`node scripts/call-lab/public-plan.mjs` is read-only. Starting the prepared gateway requires both the owner's test approval and public-number-window approval:

```sh
node scripts/call-lab/live.mjs --public-overlap --authorized-two-calls --authorized-public-number-window
```

The flags alone do not grant permission. Register both browser pairs before starting either call; open the second page with `#person-02`. The first reservation begins the routing window. Afterward use `live-report.mjs --public-overlap` and `live-audit.mjs --public-overlap` for provider evidence and restored-state verification. Read-only preflight confirmed the current number binding, disabled lab resources and no active production calls. This run is complete; its persisted ledger blocks reuse. Any additional paid run requires new owner approval.

Preparation validation: typecheck, 306 unit tests and build passed; all 23 focused lab tests passed after the final changes. The usual Firestore port was occupied, so the required suite ran on a separate emulator: 228/229 passed, with one unrelated stopped-history-total transaction closed by the emulator. Its complete 16-test file passed on isolated rerun. Added tests cover explicit overlap mode, distinct-recipient limits, call/ticket correlation, delayed overlap timing, active-production-call refusal, verified restoration, and refusing to overwrite someone else's routing change. The separate real-call evidence is recorded above.

## Isolated real-call run — October 16, 2026, 23:20–23:23 Central

The owner authorized building the isolated gateway and running the scoped tests. **Both real browser/SIP calls passed.** No physical phones, number purchases, production deployments or customer data were involved. The gateway executed the hash-locked deployed API package (`2933563`, `shieldapi-00025-wec`) against `demo-shield-call-live` on a separate local Firestore emulator, with synthetic tones and a deliberately fixed screening decision. It did not run Soniox or an AI model.

| Real test | Observed evidence |
|---|---|
| Press 1 / connect | Signed browser recipient tag arrived intact; real inbound audio streamed; both browser endpoints received audio; Telnyx reported digit 1 and bridging. Recording stopped successfully before bridge. Session ended after 30.2 seconds; every known leg was confirmed inactive. |
| Press 2 / voicemail | Telnyx reported digit 2; recipient ended, caller heard the voicemail prompt; no bridge command occurred. Session ended after 36.5 seconds. Recording readback/download succeeded: 34.6-second valid MP3, nonzero audio verified with ffmpeg. Every known leg was confirmed inactive. |
| Run limit | A third reservation was rejected as `attempt_budget_exhausted`; it did not place a third call. |
| Cleanup | Both test connections and their profile disabled; placeholder webhook restored; both temporary telephony credentials revoked; both synthetic provider recordings removed. Readback matched every pre-existing application/connection/profile and phone-number assignment against the original snapshot. |

The displayed account balance changed from **$7.10 to $7.09**. The four Voice API call-cost callbacks sum to **$0.0072**. These are observed interim amounts, not a final itemized invoice; other usage can post later. No number rental, PSTN call, SMS, AI or paid cloud compute was added. The earlier 13¢ estimate was conservative.

Implemented operator files: `scripts/call-lab/live.mjs`, `live-guard.mjs`, `live-watchdog.mjs`, `live-provider.mjs`, `live-report.mjs`, `live-audit.mjs`, `live-firebase.json`, and `web/live.html` / `live.js`. The rehearsal CLI stays separate. The gateway exposes only signed Telnyx events, authenticated media and minimal health through a temporary Cloudflare tunnel; browser credentials and controls remain on a separate loopback listener. Dependencies used: verified Cloudflare `cloudflared` 2026.10.1 binary and locally served `@telnyx/webrtc` 2.27.10. Their downloads and all runtime state stay in ignored `artifacts/private/call-lab/`.

The two-attempt reservation is written before dialing and survives restart. Recipient dialing is restricted to the single software recipient, with `time_limit_secs` bounded to the remaining session budget. Browser-originated incoming legs do **not** have that provider-side duration control; server deadlines, a separate watchdog and browser cleanup enforce the 60-second target. A complete host/network failure can defeat those local controls. The 25¢ profile threshold prevents new outbound calls after its threshold; it cannot guarantee an all-services cap or terminate existing calls. Do not describe this as a provider-enforced hard billing cap.

The completed ledger deliberately prevents silently restarting this run. Any new paid run needs owner approval and an operator-reviewed fresh ledger, fresh short-lived credentials and fresh gateway/tunnel. Do not delete the ledger to bypass approval. No number purchase is authorized. The start command requires an explicit `--authorized-two-calls` flag; that flag records operator intent, it is not permission by itself.

Private evidence: `live-ledger.json`, `live-report.json`, `live-audit.json`, and the two synthetic MP3 files. The report verifies provider identity before fetching recording media. API keys, JWTs, provider call IDs and private URLs are never written into tracked reports. Synthetic recordings are not real-user content.

Validation: `npm run check` passed typecheck, **298 unit tests**, and build. The required Firestore suite passed **229 tests**. An initial sandboxed check could not bind the APNs test server; its permitted rerun passed. One initial 25-client emulator transaction failed as invalid/closed; the isolated 58-test suite and subsequent full 229-test run passed. Gateway ingress returned 403 for unsigned webhooks and 404 for public credential access. New guard tests cover persistent budgets, expired sessions, immutable recipients, uncertain-dial retry prevention, and cross-origin controls. After the final browser fixes, all **18 focused lab tests** and typecheck passed, including three new checks for stop after local cleanup failure, initial status recovery and removal of stale audio counters. No additional real call was used for those UI fixes. The independent UI reviewer scored those three fixes resolved; the detector ran in degraded regex mode, so it did not verify computed contrast.

Remaining pilot evidence: real AI speech decisions, human speech quality, mobile-carrier forwarding/restoration, voicemail filtering and iPhone delivery, provider-failure recovery, long accepted calls, and a separately planned 10-plus-1 capacity overflow run. These two calls verify transport/control behavior, not all pilot readiness. The browser counters originally kept a maximum across calls; that display bug was corrected after this run. The first call's audio evidence and provider recording readback remain valid; do not use the old combined counter to claim independent second-recipient audio measurements.

The sections below retain the earlier local-delivery and staging history; statements that live testing had not yet happened apply to those earlier milestones.

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

A numberless test route is plausible using a separate [Voice API application's inbound SIP subdomain](https://support.telnyx.com/en/articles/4374050-configuring-call-control-texml-applications-voice-api), restricted to our connections. The separate resources were created in a disabled state on October 16, as recorded below. Header propagation and audio are not yet verified on this account. No numbers were purchased or assigned.

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

The owner approved the separate Telnyx connection on October 16; its disabled staging is complete. Before placing any calls, finish and verify the isolated test gateway, software recipient endpoints, restricted credentials, live media adapter and provider-side duration limits; persist the two-attempt budget across restarts; add server-side cleanup of every leg and a stop control. Never rely on an open browser or a JavaScript timer to cap billing. Uncertain dial responses must consume their reservation and stop retries. Keep the test database, routes, bridge and endpoints separate from production. Never redirect an owner's real number through the test adapter.

Then ask for explicit approval of the exact two-call run and its cost estimate. First verify same-account header transport with one of the two reserved sessions. If that fails, stop; do not buy a number, add PSTN calls, silently switch providers, or expand the workload.

After the small live run, pilot qualification still needs actual voicemail audio/playback, two-way audio/DTMF and recording-stop confirmation, live AI behavior, provider-failure recovery, 10-plus-1 outbound-capacity overflow, a long connected call, carrier forwarding/restoration and iPhone delivery. Browser/SIP calls can cover much of the provider/media path, but cannot certify a mobile carrier's forwarding configuration. Software call legs may themselves consume the account's 10-outbound limit; plan the overflow test separately instead of assuming 11 browser calls equal 11 available forwarded calls.

## Verification record

October 16, 2026: the CLI completed all eight local scenarios; browser controls completed the suite and an individually selected 25th recipient; signed-routing preview worked; mobile (390px) and desktop (1280px) showed no horizontal overflow. Foreign-origin mutation, arbitrary-recipient preview and a nonexistent live-call route were rejected. The 11 new security/budget tests passed. `npm run check` passed typecheck, 293 unit tests and build before the final additional budget test; the targeted suite then passed all 11 tests. Required Firestore checks passed 229 tests against `demo-shield`. These shared-tree checks include another agent's uncommitted work and do not assert it was deployed. The call lab itself uses the separately hash-locked deployed package. No real-call or real-audio verification occurred.


## Telnyx test connection staging — October 16, 2026

With explicit owner approval, the following new resources were created and read back at 23:07 Central. They remain disabled; no call execution is authorized by this setup approval.

| Resource | Name | ID | Verified state |
|---|---|---|---|
| Browser SIP credential connection | Shield call lab browser | `3072448855816537112` | Inactive; SIP URI receive restricted to this account; 1 inbound / 1 outbound channel |
| Voice API receiver | Shield call lab receiver | `3072448854122038294` | Inactive; SIP subdomain restricted to this account; 1 inbound / 1 outbound channel |
| Separate outbound profile | Shield call lab outbound | `3072448852872135701` | Disabled; 2 outbound channels; $0.25 daily outbound spend limit enabled |

The receiver's SIP subdomain is `shield-call-lab-20261016`. Both connections use only the new lab outbound profile. The profile uses metered rate-deck billing, a US destination allowlist, a $0.01 maximum destination rate and no automatic profile-level recording. This does not authorize PSTN tests. The receiver requests cost webhooks, uses RFC 2833 DTMF, redacts DTMF debug logs and has a 10-second first-command timeout. That timeout is not a maximum call-duration limit.

The receiver's webhook is a non-routable `.invalid` placeholder, not Shield's production handler. A real isolated gateway has not been deployed. SIP credentials were generated randomly and retained only in ignored owner-readable private files; none were inserted into browser code, chat, tracked files or the production runtime. No browser login token was issued.

Readback verified the intended settings, compared every pre-existing listed application/connection/profile against the pre-change snapshot, and confirmed that all phone-number assignments and the available balance were unchanged. The three creation requests did not assign or buy numbers, place calls, change recharge settings or deploy anything. Private snapshots, credentials and the sanitized status report are under `artifacts/private/call-lab/telnyx/`. The initial readback comparison was adjusted to accept Telnyx's extra default recording fields; a subsequent read-only verification passed against the original pre-change snapshot.

The [profile daily limit](https://developers.telnyx.com/api-reference/outbound-voice-profiles/create-an-outbound-voice-profile) disallows new outbound calls once the profile threshold is reached. It is not a guaranteed all-services 25¢ cap and does not replace duration/attempt controls. The prior 13¢ planning estimate remains an estimate, not a measured invoice. This step only verified configuration; no authentication, audio, routing-header propagation or real-call behavior was tested. Local/backend test suites were not rerun for this documentation-only repository change.
