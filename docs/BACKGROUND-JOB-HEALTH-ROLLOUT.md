# Background-job health — prepared October 17, 2026

**Prepared and tested; not approved or deployed. R5 remains open.** The live email route has owner-confirmed delivery. This update addresses a different gap: a successful scheduled HTTP request could conceal incomplete account deletion or subscription review, and an empty queue could conceal a stopped schedule.

At **22:05 Central**, a read-only snapshot found zero pending account deletions, overdue audio manifests/chunks, pending/overdue provider-recording erasures, overdue call deadlines and overdue monitoring checks. All six schedules were enabled. The saved subscription review had checked zero accounts and failed zero. These observations do not prove historical completion or provider erasure. [Dated evidence and package hashes](../.impeccable/review/release-2026-10-17/operations/background-health.json).

## Exact proposed scope

Each existing worker has its own package based on its downloaded, serving source. Only the indicated modules change. No API, bridge, call worker, monitoring worker, phone setting, purchase flag, caretaker delivery flag or Hosting deployment is included.

| Function | Verified serving baseline | Package files | Changes |
|---|---|---:|---|
| `cleanupShield` | `cleanupshield-00015-nek` | 87 | Wrap its existing cleanup and stale-message recovery; add the health helper. |
| `finishAccountDeletions` | `finishaccountdeletions-00001-kif` | 87 | Return completed/failed batch counts; wrap the scheduled handler; add the helper. |
| `reviewServiceAccess` | `reviewserviceaccess-00001-xey` | 87 | Treat a public account missing its billing provider/customer binding as a failed review; wrap the handler; add the helper. |
| `expireMessageDeliveries` | `expiremessagedeliveries-00002-nos` | 76 | Wrap the existing audio/provider-erasure sequence; add the helper. |
| New `checkBackgroundHealth` | New function; source derives from verified `shieldapi-00034-yaw` package | 90 | Add only the read-only observer export and helper. The serving API is not redeployed. |

The candidate-set manifest is **`fe47426ff545c718c49d96e9aefc983352c63de1d109c3669cac0d62b64d17b6`**. Every file outside each package's allowlisted differences is preserved. The combined record lists each archive and source-manifest hash. Private candidate packages, original source archives, deployment metadata and verification logs are under `artifacts/private/background-health-oct17/`.

The accompanying configuration adds:

- One `accountDeletions` collection index: `state ASC, createdAt ASC`. Existing indexes remain intact.
- One private scheduled function, `checkBackgroundHealth`, in `us-central1`, with zero minimum instances, one maximum instance, 512 MiB memory, one CPU, a 60-second timeout and only the existing `SHIELD_RUNTIME` secret. It uses the existing runtime service account.
- One authenticated Scheduler job every five minutes, with no retry, invoking that new function as the runtime service account. Existing schedules and their retry settings are preserved.
- One log counter, `shield_maintenance_heartbeat`, and two policies routed to the existing enabled email channel for `isaac.cw.zhang@gmail.com`. [Exact configuration draft](../deploy/firebase/maintenance-monitoring.json).

The four existing workers retain their settings and IAM. The new function permits only the scheduled runtime identity to invoke it. The four permanent service policies and $50 budget are preserved. The two new policies would bring the policy count to six; the new function and schedule would bring their counts to fifteen and seven.

## Completion and overdue-work contract

Each of the four workers records its latest result in a fixed `backgroundJobHealth` document only after its operation settles. A successful batch records the run's start time, completion time and status. Failed or partial batches retain the last successful start time and reject the scheduled request with a fixed error. Deletion jobs retain their existing leases and retry times. Older overlapping invocations cannot overwrite a newer result.

Only four fixed document IDs, timestamps and status values are stored. Diagnostic logs contain fixed event/job/status/category fields and aggregate counts. Raw exceptions, vendor bodies, customer IDs, phone numbers, transcripts and audio are excluded. A completion-record failure is visible as a failure; it cannot manufacture success.

The observer performs reads and aggregate queries. It never invokes cleanup, deletes customer data, changes routing, dials a phone or calls a billing/recording provider.

| Condition | Attention threshold |
|---|---|
| Last successful daily cleanup | Older than 26 hours, allowing the 25-hour daylight-saving day |
| Last successful account-deletion batch | Older than 10 minutes |
| Last successful subscription-review batch | Older than 90 minutes |
| Last successful audio/provider-erasure batch | Older than 20 minutes |
| Pending account-deletion request | Original request older than 15 minutes, regardless of renewed lease/retry time |
| Expired audio manifest or chunk | Still present 15 minutes after expiry |
| Pending/stored provider recording | Older than its 24-hour delivery window plus 15 minutes |
| Call deadline or monitoring check | More than five minutes overdue |

These are monitoring tolerances, not extensions of data access or retention. Missing/invalid completion records, a latest failed/partial batch, or an unavailable aggregate query cannot report healthy. A successful bounded batch can coexist with an overdue backlog, so both signals are checked.

The first policy matches incomplete/failed batches and unhealthy/unavailable observations, with a one-hour notification limit. The second detects absence of the observer's log counter for 30 minutes after ten-minute aggregation. Aggregating across revisions avoids treating a replaced revision as an independently stopped observer. Metric/log ingestion adds latency; these thresholds are not an emergency paging guarantee.

## Verification performed

- Required typecheck, build and **368 unit tests** passed in an isolated snapshot. Four additional tests exercised the actual exported scheduled handlers and passed.
- Required full Firestore emulator suite: **284/284 passed**. The previous intermittent stopped-history transaction failure did not recur; this does not establish its cause or resolution.
- Exact candidate packages: **44 distinct selected tests passed**, covering completion boundaries, stale/missing/failed records, original deletion age despite retry renewal, audio/chunk/provider backlogs, deletion retry, billing misconfiguration, cleanup pagination and audio/provider recovery.
- The first package run passed 40 tests and failed to load the audio test file because its unrelated account-deletion import is absent from that older deployed worker. Only that unused import in the private test copy was replaced with an explicit throwing stub. The four selected audio tests then passed; their assertions and every candidate byte remained unchanged. The failed first run is retained.
- All five candidate archives and file manifests were rehashed after verification. Their serving baselines had full traffic and were active when downloaded.
- At **22:19 Central**, read-only validation found the selected email channel enabled, four existing policies, unused proposed policy/metric names and no requested new index. Both proposed log filters were accepted by the Logging API. No policy, metric, index, function or schedule was changed by this preparation.
- The implementation commit `7e613fc` passed [independent CI](https://github.com/tigerisaac/aaacap-project/actions/runs/39093478740), including required build/unit, Firestore and Firebase Auth/account-lifecycle checks, on its first run. The candidate file hashes match that source snapshot. The earlier intermittent transaction failure remains unresolved despite this passing run.

The first source-download helper returned a wrapper-level 500 before saving worker source. A follow-up with explicit streaming-response status handling succeeded; the first failure’s cause was not established. An initial package-builder attempt used a compiler API absent from the installed TypeScript distribution; the final builder uses the installed JavaScript parser to replace only the selected export. Neither preparation error changed production.

## Approved-rollout procedure and acceptance

Owner approval is required before the following live changes. Approval of this review includes the specified source updates, new observer/index/schedule, two policies and one metric, and restoring these exact baselines if rollout checks fail. It does not authorize manual cleanup, test records in customer collections, phone calls, texts or another synthetic email test.

1. Recheck the four worker baselines, API source used for the new package, all package hashes, fleet/schedule configuration and existing policy/channel/budget state. Stop and rebuild the review if scope has changed.
2. Create only the new deletion-age index and wait for `READY`. Patch only the four workers' source archives, once each. Verify serving source, settings/IAM and full traffic independently for each revision. Preserve the other ten functions, bridge and all six existing schedules.
3. Create the private read-only observer, its authenticated five-minute schedule and the log counter. Verify settings, invocation identity, source and natural scheduled execution. Early observations may correctly report missing completion records.
4. Wait for **all four workers to complete naturally**, including the next daily cleanup. Do not invoke cleanup or insert synthetic success records to shorten this wait. Capture only their fixed health records and aggregate observations.
5. Enable the two policies after that initial coverage is established. A metric-absence condition requires at least one point **after policy creation or modification** before it can fire. Verify that actual subsequent point and the aggregated series before calling absence monitoring active. [Google's metric-absence requirements](https://docs.cloud.google.com/monitoring/alerts/metric-absence).
6. Read back the final policy/index/schedule/function state and compare every preserved resource. Record deployment and operational acceptance separately. Actual alert-condition failure/recovery tests require their own reviewed authorization when they would change live state or send a test notification.

If acceptance fails, disable/pause only the new policies and observer schedule, restore the four original source archives if needed, and verify source/settings/traffic. Keep the fixed completion records and evidence for diagnosis. An unused new index/metric may be retained until deliberate cleanup; do not remove unrelated resources.

## Limits that remain open

This covers four maintenance schedules and six aggregate backlog types. It does not prove completion of every task, Eventarc delivery, successful voice-model assessment, caretaker delivery, vendor erasure, or historical worker recovery. Legacy daily setup checks are disabled by the shared-number path and retain their existing behavior; enabling that path would need its own completion/failure review. A public billing page that repeatedly fails remains visible and retryable, but an operator still needs to resolve the underlying issue.

Missing-field/corrupt legacy jobs, full incident escalation, spending-alert receipt, actual native/log alert-condition acceptance and the unexplained historical API failures remain R5 work. Apple setup, real-phone calls and accessibility/device acceptance remain separate release gates. The earlier owner-confirmed email test proves the selected log-alert delivery route only.

API references: [log counter schema](https://docs.cloud.google.com/logging/docs/reference/v2/rest/v2/projects.metrics), [alert policy conditions](https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies).
