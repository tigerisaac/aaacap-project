# Pilot operations

Run the CLI only on a trusted machine with server credentials. It has no public administrative HTTP endpoint. In source checkouts use `npm run operator -- COMMAND`; inside the production image use `node dist/operator-main.js COMMAND`.

The CLI never buys/releases a number, dials carrier codes, sends an invitation, or verifies physical routing on your behalf. Its evidence fields record an operator’s completed work. Do not set template booleans to true until the corresponding test actually passes.

## Assisted enrollment

1. Copy `backend/examples/*.example.json` to gitignored `operator-input/`. Obtain the exact carrier’s instructions and record phone model, iOS build, carrier/plan, region, SIM, Wi-Fi Calling, Focus, unknown-caller handling and Live Voicemail settings. Do not guess universal forwarding codes.
2. Use `carrier-draft operator-input/carrier-profile.json` for an unvalidated combination. Use `carrier-import` only when all required checks have evidence. Validated profiles are immutable: changing routing instructions/settings requires a new profile ID.
3. Verify phone ownership with the person using that phone and record a restricted evidence reference. Have them sign in so their Firebase user UID exists (or Supabase user UUID on a legacy deployment). Configure an owned Twilio DID’s voice/status callbacks, then run `enroll operator-input/enrollment.json`. This creates a **setup** participant, without live-offer eligibility.
4. In the app, have the participant review privacy/service information, record consent, save Shield to Contacts and choose optional sharing. A caregiver cannot accept service consent or change forwarding on their behalf through the app.
5. With the participant and operator present, enable the evaluated live service on the controlled test deployment and run `begin-test operator-input/begin-test.json`. This explicitly opens a **30-minute** test window for that participant, including when the carrier profile is still a draft. Global pause, quotas, signature checks, anti-loop protections and digit-1 acceptance remain enforced. It expires automatically; it does not activate the participant.
6. Apply the carrier instructions manually. Complete [PHONE-VALIDATION.md](PHONE-VALIDATION.md), including native voicemail, denied/missing acceptance, callback failure, abandonment, simultaneous calls, iPhone settings and restoration. A callback that reaches native voicemail must never bridge the original caller. Restore ordinary carrier voicemail during the restoration test, then reapply and recheck the intended screening setup.
7. When all calls are terminal, record `record-test operator-input/routing-test.json`. This closes the test window. For a new carrier combination, validate its unchanged draft with `carrier-import operator-input/carrier-profile.json`, now including actual dated results and evidence. Finally run `activate PARTICIPANT_UUID`.

Activation requires phone verification, participant consent, a validated profile and a routing test within the last 14 days. On normal live service, offers revert to voicemail when the test becomes older than 14 days. Revalidate after carrier, iOS, SIM, forwarding or relevant phone-setting changes, even sooner. Record a new physical test, then resume/activate as appropriate. A fresh timestamp without a real test is not a validation.

For production services, global environment switches must also be on. A 30-minute test window deliberately permits test calls before activation; keep the device and test operator together and use controlled calls. Stop it early with `end-test PARTICIPANT_UUID`, by recording completed results, or by requesting restoration; `pause-all` blocks offers immediately across all participants. There is no software proof that someone is physically present.

## Daily operations and incidents

```sh
npm run operator -- doctor
npm run operator -- participants
npm run operator -- jobs
```

Check database readiness, worker progress, failed recording-ingestion/deletion jobs, call-reconciliation failures, spend alerts and upcoming routing-test expiry. `doctor` reports configuration and DB connectivity, not provider authentication or phone behavior. CLI output omits participant names and numbers.

Use `pause-all` to prevent new live offers. Existing accepted conversations continue; forwarded calls can still leave bounded voicemail. This is not a carrier-restoration command. To resume, run `resume-all` after the incident is resolved and the relevant tests are current.

Jobs use leases, deduplication and up to eight attempts. Inspect provider status through a restricted operational account; fix the underlying outage before `retry-job JOB_UUID`. Do not clear a stuck call lock merely because time passed: the worker keeps it until the provider confirms child calls are terminal. Provider 404s and ambiguous/outage states need manual investigation. Escalate a failed provider-recording deletion promptly; local expiry alone does not remove a vendor copy.

The app does not provide emergency staffing, an identity guarantee, or analysis of a connected conversation. Support should never tell a participant that a screened caller is safe.

## Sharing

The participant creates an invitation in People and shares it themselves through the native share sheet. Codes expire after two days, are stored only as hashes, and can be accepted once by a signed-in account. History-only is the default. Voicemail requires a separate explicit grant. Revocation immediately affects server authorization and removes that caregiver’s registered push devices for the participant. Previously seen/heard content cannot be recalled from a human recipient.

## Restore before deleting

1. The participant requests restoration or deletion in Phone setup. Offers stop; the dedicated DID stays assigned so residual forwarded calls are not sent to someone else.
2. A support operator and the participant restore conditional forwarding and ordinary carrier voicemail using the exact profile instructions. Verify ordinary calls, unknown callers, busy/no-answer behavior and voicemail with real test calls.
3. Wait for all service calls to end, then run `confirm-restoration operator-input/restoration.json`. The record becomes offboarded; sharing and push registrations are revoked. Do not release or reassign the DID while forwarding is uncertain.
4. For a recorded deletion request, run `purge-account PARTICIPANT_UUID`. This removes local call/voicemail/contact/sharing data and replaces identity fields with empty encrypted values. A minimal offboarded DID tombstone remains to prevent accidental reassignment; pending provider recording deletions continue as durable jobs.
5. Verify provider deletion jobs finish. Remove the user’s Firebase identity (or Supabase on a legacy deployment) with the provider’s authenticated administrative workflow when appropriate, checking whether that identity also owns another participant record or holds family access. Handle Twilio call-log/transcription retention and applicable screening-provider retention separately; Shield does not control those providers’ complete records. Follow the documented backup expiry/deletion process. Record completion in the restricted support system.

The CLI does not claim complete provider-account deletion or release DIDs automatically. Those steps require provider administration and confirmed restoration. Keep backup retention within the pilot’s stated policy; ensure restored backups reapply deletion requests before serving data.

## Data and secrets

Call history and encrypted voicemail expire within the configured retention, at most 30 days. The worker purges provider recordings after encrypted ingestion succeeds, and retries deletions. No caller introduction or manual-check transcript is stored in the application database. Twilio speech processing and the configured screening providers have their own retention controls.

Back up the encryption key securely. Rotation needs a controlled decrypt/re-encrypt migration; simply replacing the environment value makes existing data unreadable and changes phone/invitation hashes. Avoid raw phone numbers, personal details or transcripts in evidence references, tickets, metrics and logs.
