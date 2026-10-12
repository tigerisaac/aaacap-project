# Test shared forwarding on one Telnyx number

Built October 12, 2026. **Local diagnostic, not deployed or verified on real calls.** This answers two questions: does one Telnyx number receive usable recipient information from both carriers, and can correctly identified calls overlap? It does not test AI screening, recipient ownership verification, outbound offers, press-1 bridging, voicemail or production reliability.

The test reads forwarding metadata before asking anything. A caller then presses **1 for test line A**, **2 for T-Mobile test line B**, or **0 for a direct call to the test number**. This keypad response is independent test ground truth. It never supplies a missing routing identity, chooses an outbound destination or connects anyone. If a tester presses the wrong key, discard that attempt explicitly and repeat it; don't silently change a failed result.

## What you need

- Two consenting mobile test lines. The owner selected **Tello for A and T-Mobile for B** on October 12. Verizon remains untested until a Verizon line is supplied. Use spare/test lines where possible.
- An external caller phone for sequential checks. For the overlap check, use **two independent calling lines**, in addition to A and B. Each caller must know which test line they dialed. Don't merge the calls into a conference.
- One separate, voice-capable Telnyx test number, and a separate Call Control / Voice API application. Reuse suitable unused test inventory if available. The ordinary runner refuses Shield's production destination. An owner-authorized, supervised maintenance window can temporarily reuse it through the procedure below.
- A funded Telnyx account, an API key, the account's Ed25519 public key, Node 22.14+ and installed repository dependencies. Keep credentials and phone numbers in the local private files below.
- A public HTTPS tunnel to this computer, such as an installed/configured ngrok agent. Keep the computer awake and both terminals running. Disable HTTP body inspection/capture in the tunnel service, including any separately enabled cloud traffic capture. Forwarded webhooks contain phone numbers even though this tool discards them.

This is a supervised test: forwarded test calls hear a diagnostic prompt instead of reaching voicemail. Record the original forwarding destinations, voicemail and phone settings first. Restore forwarding before stopping the test. Normal carrier/Telnyx voice and speech charges can apply.

## Reusing the existing Shield number temporarily

The owner authorized this alternative on October 12. No purchase is needed. **While the number is assigned to the diagnostic, all incoming calls reach the test instead of normal Shield screening or voicemail.** Neither carrier forwarding nor the production application is changed by the maintenance tool. The user configures the phones and makes all test calls. Do not text test B or place automated calls to either line.

`scripts/shared-number-maintenance.mjs run --owner-authorized` saves the original number/application settings privately before any change, checks both applications have no active calls, starts an independent restoration watchdog, starts the signed diagnostic listener, checks public readiness and rejection of unsigned requests, then changes only the number's `connection_id`. The original production application remains intact. The test permits two concurrent calls, 40 admitted calls and a maximum 30-minute window. It stops admitting calls at the deadline.

Operator prerequisites: build/check the code; retain the private `credentials.json`, `application.json` and A/B config created during staging; restart the temporary HTTPS tunnel to port 8789 and update `SHARED_TEST_WEBHOOK_BASE_URL` in `.env.shared-number-test`. The supervisor updates the diagnostic application's callback. Run:

```sh
node --env-file=.env.shared-number-test scripts/shared-number-maintenance.mjs run --owner-authorized
```

Wait for `testReady: true` and note the printed deadline. Do not run the ordinary `serve` command alongside the supervisor. Keep this computer awake, the tunnel running and Internet connected. First dial the public Shield number directly and press 0; then call A and B's normal numbers and press 1 and 2 respectively. Sequential and simultaneous attempts can share the supervised report; privately label the actual condition and attempt time. This run's `caseId: overlap` does not establish which phone condition was exercised.

The supervisor restores the number when the window expires, the endpoint fails, the diagnostic exits or the operator stops it. A separate process attempts restoration if the supervisor exits unexpectedly or the deadline arrives. **This is local recovery, not a Telnyx-hosted expiry:** loss of this computer or Internet can delay restoration. No automatic restoration is claimed until provider readback succeeds. Stop immediately on any unexpected call behavior. To restore early from another terminal:

```sh
node scripts/shared-number-maintenance.mjs restore
```

Restoration changes only an assignment still pointing to this diagnostic; it refuses to overwrite another operator's reassignment. It verifies the original connection before marking restoration complete and disabling the diagnostic. On a network/provider failure it retries every 15 seconds. The private `maintenance.json` snapshot also contains the original assignment for manual restoration in Telnyx: **Numbers → the Shield number → Connection**, select the original application. Do not delete this snapshot while the window is open.

After Telnyx restoration, return **each phone** to its own recorded original forwarding settings and verify normal calls and voicemail. For the existing Shield user's Tello line, restoring the original setup may mean keeping forwarding to Shield; do not blindly reset it to carrier voicemail. The temporary T-Mobile test line must not remain forwarded into the single-recipient production setup. Shut down the tunnel after restoration is verified. These are operator/user steps; the tool does not alter phones.

[Telnyx documents reassignment through `connection_id`](https://github.com/team-telnyx/ai/blob/main/guides/phone-numbers.md). A [Cloudflare Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) is temporary and has no uptime guarantee; every restart changes its hostname.

## 1. Prepare the local tool

From the canonical checkout:

```sh
cd '/Users/isaaczhang/Developer/aaacap project'
npm run build
node scripts/shared-number-test.mjs init
```

`init` creates these ignored, private templates without overwriting existing files:

| File | Fill in locally |
|---|---|
| `artifacts/private/shared-number-test/config.json` | Test `applicationId`; test `destination`; `lineA` (currently Tello) and `lineB` (T-Mobile), all numbers in +1 plus ten-digit format. Start with `caseId: "direct"`. |
| `.env.shared-number-test` | `SHARED_TEST_TELNYX_API_KEY`, `SHARED_TEST_TELNYX_PUBLIC_KEY`, and `SHARED_TEST_WEBHOOK_BASE_URL` (HTTPS origin only). |

Keep the defaults of 120 seconds per call, 40 admitted calls per run and two simultaneous calls. Do not put real numbers, keys or raw webhooks into committed files, screenshots or chat. Public reports use A/B labels and random test IDs.

In a second terminal, start the tunnel:

```sh
ngrok http 127.0.0.1:8789 --inspect=false
```

Put its HTTPS origin in `SHARED_TEST_WEBHOOK_BASE_URL`. A new tunnel URL requires updating both this value and the test application's webhook. Ngrok documents the inspection flag in its [CLI reference](https://ngrok.com/docs/gateway/agent/cli).

## 2. Configure the separate Telnyx test application

Use the Telnyx portal's Voice API / Call Control application configuration. Set these values on the **new test application only**; the equivalent API field names help identify advanced settings. Use the Telnyx API/support if a field isn't exposed in your portal view.

| Setting | Value |
|---|---|
| Application name (`application_name`) | Exactly `Shield shared-number diagnostic` |
| Active | On |
| Webhook API version | `2` |
| Webhook event URL | Your tunnel HTTPS origin followed by `/webhooks/telnyx` |
| Webhook failover URL | Empty for this isolated test; don't send diagnostic calls to Shield's production fallback |
| Inbound channel limit | `2` for the first experiment |
| First command timeout | Enabled, `30` seconds; unanswered calls must close if the test tool is unavailable |
| SIP subdomain receive settings | `only_my_connections` |
| Recording / transcription / AI assistant | Do not enable any automatic recording, transcription or assistant features |
| Phone number connection | Assign only the separate test destination to this application |

The tool never dials outbound calls, so it does not need a larger outbound allowance. Leave production application/profile limits unchanged. Fill the test application's ID into the private config. Get the account public key from Telnyx's Keys & Credentials settings; it is distinct from the API key.

Run the read-only preflight, then start the server:

```sh
node --env-file=.env.shared-number-test scripts/shared-number-test.mjs check
node --env-file=.env.shared-number-test scripts/shared-number-test.mjs serve
```

Every printed preflight field must be `true`. The preflight reads the application and number assignment; it does not create, purchase or modify anything. It checks the test name, active state, exact webhook/version, inbound capacity, unanswered-call timeout, SIP ingress setting and assigned number. It **does not** attest to all account-level billing/recording settings or webhook authenticity until a signed event arrives.

The server listens only on localhost port 8789. `GET /health` returns readiness; the report is never served publicly. It accepts signed Telnyx JSON only. If needed, check the tunnel's `/health` in a browser without opening body inspection. A ready health response alone does not prove Telnyx webhook delivery.

## 3. Prove the setup before changing forwarding

Call the **test Telnyx number directly** from the external caller phone. Hear the diagnostic prompt, press **0**, and stay on the line. The tool requests hangup 120 seconds after receiving the initiation event. In the local terminal/report, expect `DIRECT_OK` and a populated `endedAt` after the hangup webhook arrives.

If there is no prompt, no report row, a command failure, or unexpected diversion, resolve that before enabling forwarding. If a call is still connected **150 seconds after the prompt**, the caller must hang up manually. Local timers and Ctrl-C send hangup commands, but a process/network failure can prevent delivery. The provider's first-command timeout protects unanswered calls; it is **not** a maximum duration for an already answered call. Do not run this as an unattended service.

## 4. Forward both test lines to the same destination

Let `N` mean the test Telnyx number's **ten digits**, without punctuation. `1N` is country code 1 followed by those digits. Do not dial the letters or a literal plus sign. Use the correct SIM and press Call after each code.

| Test line | Enable conditional forwarding | Restore ordinary carrier defaults after testing |
|---|---|---|
| Alternate A — Verizon mobile | `*71N` (busy/no answer) | `*73` |
| A — Tello mobile | Separately: `**61*1N#` (no answer), `**67*1N#` (busy), `**62*1N#` (unreachable) | Restore recorded original destinations; for ordinary defaults, separately `##61#`, `##67#`, `##62#` |
| B — T-Mobile mobile | Separately: `**61*1N#` (no answer), `**67*1N#` (busy), `**62*1N#` (unreachable) | `##004#` |

Wait for carrier confirmation after every operation. If either line had custom forwarding before the test, restore those recorded destinations instead of assuming the default reset recreates them. Verizon's documented busy/no-answer operation does not establish powered-off coverage. [Tello codes](https://tello.com/help_center/device-settings/how-can-i-set-up-call-forwarding), [Verizon activation](https://www.verizon.com/support/knowledge-base-181139/), [Verizon cancellation](https://www.verizon.com/support/call-forwarding-faqs/), [T-Mobile codes](https://www.t-mobile.com/support/plans-features/self-service-short-codes).

Start with ordinary no-answer forwarding. Leave iPhone unknown-call silence changes until their dedicated test. Do not use unconditional forwarding as a substitute: it may travel a different network path from Shield's intended conditions.

## 5. Run the tests and keep an attempt count

For each group below, set `caseId` in the private config and restart the server **between calls**, while keeping the tunnel running. Restore forwarding before any prolonged break. Each run writes a separate timestamped report. Restarting loses in-memory deduplication/state, so wait for all calls to end first.

For every attempted call, privately record the case, intended A/B label, caller label, attempt time and whether it reached the prompt. Count calls that never reach the server as failures too: the webhook report cannot see those. For each forwarded call, dial **A's or B's normal mobile number**, not the Telnyx number. Press 1 or 2 according to the number you actually dialed, not the terminal's observation.

| `caseId` | What to do | Initial evidence target |
|---|---|---|
| `no-answer` | Call A; let it ring out; press 1 at the prompt. Repeat for B with 2. | Three attempts per line; all `MATCH` |
| `overlap` | Caller X calls A while caller Y calls B. Let both forward, press 1/2, then keep both connected until automatic hangup. If needed, have the slower-diverting line called first. | Three overlapping pairs; both `MATCH`, and `confirmedMatchedOverlapAB: true` |
| `decline` | Decline the call on A or B instead of waiting. | Three per line; document actual forwarding behavior |
| `busy` | With the recipient already on another ordinary call, make a second call using normal call-waiting settings. | Three per line; record if busy forwarding actually triggers |
| `unreachable` | Power off the recipient phone; call it; power it back on afterward. | Three per line; distinguish carrier voicemail from Shield |
| `silence` | With iPhone unknown-call silence enabled, call from an unsaved number. | Three per applicable line |
| `wifi` | Repeat no-answer/decline in the line's normal Wi-Fi Calling configuration. | Three per applicable condition and line |
| `private` | Use a caller's supported caller-ID blocking setting; call A and B. | Correct match without caller identity |
| `chain` | Optional, deliberately configured extra forwarding hop on test lines. | Record which identity survives; ambiguous chains must not be guessed |

Also have the **same external caller call A and B sequentially**, and repeat from a second originating network where available. Testing the same caller identity concurrently requires two independent call legs from an appropriately configured originating service; don't spoof a caller ID just to simulate this. That advanced test remains outstanding if the hardware/service isn't available.

The stated repetition counts are a feasibility sample, not a statistical reliability guarantee or permission to enroll seniors. Provider limits can be raised and the local `maxConcurrent` increased up to ten for a later controlled test, but adding callers on two lines does not validate ten distinct users.

### Three-phone overlap procedure

Use C to originate both calls while A and B remain idle. C calls A, waits for the diagnostic and presses 1, then uses **Add Call / Add People** to call B without ending the first call. Let B forward and press 2. Leave the first call on hold; do not merge. This demonstrates overlapping call legs with independent recipient identities, not simultaneous two-way audio. It depends on C's carrier allowing a second outgoing call. Both calls now have a 120-second timer, with a repeated generic holding announcement after keypad collection. The caller must hang up manually if still connected after 150 seconds.

October 12 real-call evidence before this adjustment: direct call passed, and individual forwarded calls matched Tello A and T-Mobile B. In the latest Add Call attempt, A ended at 22:04:54 UTC under the diagnostic's former 40-second timer and B answered at 22:05:10 UTC, so they did not overlap. Earlier forwarded calls ended about 30 seconds after keypad collection with caller-side normal clearing and no provider command failure; the cause of those endings is unconfirmed. These results establish individual metadata matches only, not a concurrency or reliability pass. The longer hold and added audio require a new real-call check.

## 6. Read the result

Reports live under `artifacts/private/shared-number-test/report-*.json`; they contain random test IDs, A/B labels, status, timestamps and bounded error codes. They omit phone numbers, raw SIP headers, caller identity, provider call IDs and audio. Preserve local reports alongside your private attempt counts; don't publish the private config.

| Result | Meaning / next step |
|---|---|
| `MATCH` | Carrier metadata candidate matched the independent tester response. Check `errors` is empty and `endedAt` is present. |
| `MISMATCH` | Carrier metadata pointed to the other configured line. Stop expansion and investigate; never reinterpret this as a pass. |
| `MISSING` | No Diversion header arrived. Ask Telnyx whether it can preserve/expose redirecting identity on this exact route. |
| `UNSUPPORTED` | A header existed but the conservative parser could not interpret its format. This is not proof the network omitted the identity. Investigate privately with Telnyx; never enable unrestricted raw logging. |
| `AMBIGUOUS` | More than one distinct forwarding number appeared; chain semantics need investigation. |
| `UNREGISTERED` | A parsed number matched neither test line. It could be another forwarding hop or a configuration issue. |
| `DIRECT_OK` | A tester dialing the pool directly supplied 0 and no diversion identity appeared. |
| `UNEXPECTED_DIVERSION` | A direct-call test carried forwarding information; investigate the originating route. |
| `NO_TESTER_INPUT` / `AWAITING_TESTER` | Incomplete test, not a routing pass. |
| `commandFailures > 0`, any row `errors`, or no `endedAt` | Provider-control/termination evidence is incomplete, even if identity matched. Resolve before concluding success. |

`confirmedMatchedOverlapAB: true` requires correctly matched A and B calls with overlapping **provider answer-to-hangup timestamps**, and no command errors on those calls. It cannot turn true just because two HTTP requests arrived together. It describes at least one pair in that run; your attempt log must establish the required number of successful pairs.

**Feasibility passes** when both carriers' intended conditions consistently match, direct calls don't select a participant, overlap is demonstrated, every attempted call is accounted for, and there are no mismatches or command/termination failures. If only a subset works, document that subset. Success supports implementing shared ingress; it does not establish trusted provenance of upstream SIP fields. A signed Telnyx webhook proves delivery by Telnyx, not that a caller could never inject a redirecting header. Obtain provider confirmation and complete spoof/multi-hop testing before production routing.

## 7. Restore and stop

Restore each line's original forwarding and phone settings, then verify direct ringing and original carrier voicemail with an external test call. Confirm no test calls remain connected. Stop the server and tunnel with Ctrl-C. The server also stops after 30 minutes; restore promptly if that happens. Keep the test number allocated until restoration is verified; don't release a number that might still receive forwarded calls.

## Concurrency: Telnyx versus Shield

Telnyx supports concurrent calls through application inbound/outbound channel limits and account/profile limits. One phone number does not imply one simultaneous call. For ten connected Shield calls, plan for ten inbound caller legs **plus** ten outbound recipient legs, along with appropriate call-start/API limits. Inspect actual account limits rather than assuming the defaults. [Call Control application schema](https://github.com/team-telnyx/telnyx-node/blob/master/src/resources/call-control-applications.ts), [outbound profiles](https://support.telnyx.com/en/articles/4320411-more-about-outbound-voice-profiles).

Shield is a separate constraint: `backend/src/live/server.ts` currently has a process-wide single-call gate, and `scripts/telnyx-provider.mjs` provisions one outbound application/profile channel. Those are code findings, not a fresh readback of live settings. Multi-user screening needs the isolation and distributed admission work in the [scale plan](TEN-PERSON-PILOT-PLAN.md). This standalone test bypasses that single-call screening path and measures only shared ingress, diagnostic prompts and identification.

The implementation uses the official [Call Control webhook schema](https://github.com/team-telnyx/telnyx-node/blob/master/src/resources/webhooks.ts) and [answer/gather/hangup command definitions](https://github.com/team-telnyx/telnyx-node/blob/master/src/resources/calls/actions.ts). Software tests exercise signature validation, wrong app/destination/leg rejection, replay handling, concurrent isolation, independent ground truth, conservative parsing, timeouts and redaction. No real-call result is implied by those tests.
