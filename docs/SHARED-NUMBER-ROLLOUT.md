# Ten seniors on one shared Shield number

Implementation date: October 12, 2026. This document separates source capability, provider configuration, and real-call evidence.

## Implementation

`SharedCallControl` handles the shared line entirely through Telnyx Call Control. Existing TeXML routes remain for migration and rollback; a single call never mixes the two APIs. The screening policy is unchanged. Shared Call Control announcements currently use Telnyx’s Joanna text-to-speech; the legacy TeXML path retains the approved Soniox recordings.

An inbound call must carry one unambiguous, normalized US `Diversion` identity. The lookup is `(shared destination, keyed hash of the diverted mobile number)`. It resolves a verified participant and an enabled, qualified route. Caller ID is never the recipient lookup key. Missing, malformed, conflicting, unregistered or disabled identities are hung up without putting a message in anyone's mailbox. Diversion is routing evidence, not authentication of the caller.

The call snapshots its recipient encrypted, shared number, route version, and inbound leg. Phone changes or route revocation prevent a pending acceptance. An outbound child is bound to that call; only its signed, correlated gather result containing `1` can bridge it. A replay or digit on the caller's leg cannot connect a call. Rejection, timeout and an uncertain outbound attempt go to that participant's voicemail. A possibly successful Dial is never blindly repeated.

Firestore transactions isolate per-person consent, setup checks, contacts, blocks, call admission and usage. A shared reservation document admits at most ten incoming calls, with at most one per person, including voicemail. Reservations are released only after call termination is confirmed; elapsed time or an unsuccessful cleanup attempt cannot free a slot. Each bridge instance accepts up to ten independent screening sockets; Firestore claims stop duplicate streaming sessions across instances. The bridge deployment supports two instances, but the shared pool still caps admitted calls at ten. This is configured capacity, not a claim of measured ten-call audio performance.

Signed webhooks are checked against the exact bytes, timestamp and application ID. Short per-call locks, durable event receipts, command receipts and terminal tombstones handle retries and reordering. Telnyx's `command_id` deduplication lasts only 60 seconds, so Shield retains its own receipts and refuses uncertain commands outside that window.

A durable scheduled sweep ends overdue calls after API or bridge crashes. Phase deadlines are 90 seconds for initial screening, 45 seconds for an offer, 80 seconds for the voicemail prompt, 65 seconds for recording, and 300 seconds after acceptance. The minute sweep can add up to approximately one minute under healthy cloud/provider operation. Outbound legs also have a Telnyx 300-second limit; recordings have a 60-second limit. Network outages can delay command delivery and must be monitored. Inbound Call Control does not have the previous TeXML carrier-side pause/hangup sequence.

Voicemail is fetched through Telnyx's recording API, checking recording ID, application and parent call before downloading from an approved host. Existing encryption, retention and per-person access rules remain. Connected-call monitoring retains the existing policy and consent; intervention disconnects the caller and speaks the warning to the parked recipient leg.

Setup probes use separate per-person reservations and signed probe IDs. A forwarding check matches an eight-digit nonce sent down the owner's outbound leg to the distinct forwarded inbound leg. A matching check enables that participant's pending route only if its enrollment version is unchanged and an operator has not disabled it. One passing route is evidence for the condition actually tested, not blanket qualification of every carrier condition.

Quiet hours are per person and default **off** until chosen in Settings. The iPhone setup instructions use the returned carrier name. Tello and T-Mobile use the existing guided GSM setup; Verizon stays staff-guided and unverified, and is never shown GSM reset codes.

## Local validation

October 12: `npm run check` passed typecheck, 167 unit tests and build; `npm run test:firebase` passed 128 emulator tests. The iPhone simulator build passed. Tests cover ten simultaneous admissions, wrong-recipient and duplicate-event isolation, signed JSON, press-1 acceptance, independent verification, revocation during verification, uncertain provider commands, and durable cleanup. These are software checks, not ten live GPT audio sessions.

## Telnyx configuration and evidence

On October 12, the application **Shield shared-number pilot** was created, inactive, pointing to the stable `/voice/shared` endpoint. Its inbound and outbound channel limits are both 10. Its existing US-only outbound profile was raised to 10 concurrent calls; its existing daily spending cap, destination restrictions and recording-off setting were preserved. No number was purchased. The portal separately displayed **account level outbound concurrent call limit: 10**.

Ten connected screened calls use ten inbound caller legs plus ten outbound recipient legs. Additional verification calls cannot exceed the shared outbound ceiling. Per-person reservations prevent a check and a screened callback competing for the same person. Telnyx documents a default 30 dials per second, separate from concurrency; this pilot does not require increasing it. Account credit, spending limits and model-service limits can still constrain traffic.

The prior Tello/T-Mobile diagnostic confirmed two correctly identified forwarded calls on the same DID overlapping for **72.434 seconds**, with two provider-active legs. One was on hold. That did not test two simultaneous GPT conversations, outbound offers, acceptance, voicemail or ten live audio sessions. Verizon has not been verified on a real call.

## Operator steps

Run from the canonical checkout. All files under `artifacts/private` are ignored, mode 0600, and must never be pasted into chat. All operator mutations below default to a dry run until `--confirm`/`--apply` is supplied. Do not place owner calls automatically.

1. Finish the diagnostic window and verify its supervisor restored the original number assignment. Have B restore conditional forwarding with T-Mobile's `##004#`; confirm the phone's success message. The old one-person service must not receive B's forwarding.
2. Run `npm run check` and `npm run test:firebase`.
3. Stage Telnyx with `node scripts/prepare-shared-telnyx.mjs artifacts/private/firebase-runtime.json --apply`. This is already done; the command preserves spending restrictions and never assigns or buys a number.
4. Run `node scripts/manage-shared-pilot.mjs prepare`, review, then add `--confirm` after deployment approval. It copies the legacy control into the original person's subcollection and prepares the registry atomically. The old control stays intact. The original dedicated route remains valid during deployment.
5. For each already enrolled, phone-verified person, run `node scripts/manage-shared-pilot.mjs enroll --participant <UUID> --carrier tello|tmobile|verizon`. Review and confirm. This creates a **pending** route, never fabricates consent or phone ownership. Record that person's original forwarding settings and prepare their own control as usual. Enrollment caps at ten. Retired route identities are not handed to another person.
6. Add `TELNYX_SHARED_APPLICATION_ID` from the private staging report and `SHARED_NUMBER_ENABLED: true` to the prepared runtime. Preserve all other runtime settings. Publish a new Secret Manager version, then deploy the checked Firebase code (including `expireSharedCalls` and Hosting's `/voice/**` rewrite) and bridge image. The existing public number stays on TeXML while deployment completes. Follow repository approval rules before production deployment.
7. Verify `/public/shared-ready` reports `shared-v1`, the expected application, and enabled true; verify bridge `/ready` reports `sharedTransport: call-control-v1` and `maxSessions: 10`; check the scheduled sweep exists and the deployed image's source policy matches the intended production policy. Run `manage-shared-pilot.mjs cutover` for the preflight. It refuses active calls, an unexpected number assignment, an unprepared registry or an undeployed shared backend.
8. After the owner authorizes the production switch, run `node scripts/manage-shared-pilot.mjs cutover --confirm`. It snapshots the assignment/registry privately, enables the shared application, changes registry mode and assigns the existing DID, then reads the assignment back. No calls or texts are made.
9. Open each person's supervised setup window. The owner runs the ring and forwarding checks in the app and makes the test calls below. Pending routes accept only their correlated verification; ordinary calls fail closed until qualification passes. Enable always-on mode only after the complete supervised flow passes. The legacy daily setup-check feature is disabled in shared mode; use the independent, owner-requested ring and forwarding checks.

`node scripts/manage-shared-pilot.mjs disable --participant <UUID> --confirm` disables an individual's route without affecting others. Keep their route entry to prevent reassignment. Staff confirm carrier restoration separately. `pilot-status.mjs` reports per-person progress without printing private phone numbers.

Rollback: drain active shared calls, run `node scripts/manage-shared-pilot.mjs rollback` and then `--confirm`. This restores the DID to the original TeXML application and dedicated registry mode, and disables the shared app. **Restore forwarding on every additional person's phone first**; the old service supports only the original recipient. New per-person code can read the dedicated registry, so code rollback is a separate step. Private switch snapshots retain the previous assignment.

## Real-call acceptance gate

Start with two enrolled phones, then five, then ten. No model-generated test is counted as a real call.

- Each phone: ring check; successful forwarding nonce; unanswered, decline/busy, unreachable and Wi-Fi calling routes; unknown-caller screening and Live Voicemail configurations. Observe the actual Diversion identity for each condition, privately. Verizon requires its own supervised validation.
- A routine caller: correct person alone receives the private prompt; `2`, no digit and voicemail answer never connect; only `1` connects; both parties hear each other; either hanging up ends the conversation and frees capacity.
- Unknown/ambiguous metadata and direct calls to Shield: nobody is dialed and no participant receives a voicemail.
- Failed screening or declined offer: voicemail appears only in the intended participant's app; another participant/helper without access cannot retrieve it. Check provider recording deletion.
- Simultaneous test with three phones: C calls A, reaches screening/hold, then uses Add Call to call B while holding A. Check provider and application timestamps overlap and both route correctly. Complete each offer separately; this still does not prove two people speaking to GPT simultaneously.
- Load gate: use additional consenting callers or a controlled provider harness to exercise ten concurrent media sessions and recipient legs. Measure startup delay, wrong-route count (must be zero), missing offers, disconnect cleanup, model/provider errors and spend. Keep the pilot at two until the full shared flow is verified.

## Telnyx references

- [TeXML and Call Control compatibility](https://support.telnyx.com/en/articles/8118086-texml-and-telnyx-voice-api-compatibility): use separate applications, never mix commands on one call.
- [Receiving webhooks](https://developers.telnyx.com/docs/voice/programmable-voice/receiving-webhooks): duplicate, simultaneous and out-of-order delivery; 60-second command deduplication; distinct call identifiers.
- [Official webhook types](https://github.com/team-telnyx/telnyx-node/blob/master/src/resources/webhooks.ts): optional inbound `sip_headers` and Diversion. Optional metadata is not a promise that every carrier sends it, or a cryptographic authenticity guarantee.
- [Official call commands](https://github.com/team-telnyx/telnyx-node/blob/master/src/resources/calls/actions.ts) and [Dial](https://github.com/team-telnyx/telnyx-node/blob/master/src/resources/calls/calls.ts): streaming, gather, bridge, deadlines, recording, transcription and command IDs.
- [Outbound profiles](https://support.telnyx.com/en/articles/4320411-more-about-outbound-voice-profiles) and [concurrent outbound calls](https://support.telnyx.com/en/articles/1130717-limits-on-concurrent-outbound-calls): profile and account limits are separate.
- [Dials per second](https://developers.telnyx.com/docs/voice/programmable-voice/dials-per-second-limit): default 30 DPS; separate from active-call capacity.

SIP reception is restricted to the account's own connections. This reduces exposure to arbitrary SIP calls but is not a documented guarantee that all upstream PSTN Diversion data is unspoofable. Do not describe shared routing as caller authentication. Provider/carrier qualification and wrong-recipient monitoring remain required.
