# Background-job health — deployed October 17, 2026

**Owner-approved source/configuration deployed and verified. Two new policies are staged disabled; natural-completion and activation acceptance remain pending. R5 remains open.** The live email route has owner-confirmed delivery. This update addresses a different gap: a successful scheduled HTTP request could conceal incomplete account deletion or subscription review, and an empty queue could conceal a stopped schedule.

At **22:05 Central**, a read-only snapshot found zero pending account deletions, overdue audio manifests/chunks, pending/overdue provider-recording erasures, overdue call deadlines and overdue monitoring checks. All six schedules were enabled. The saved subscription review had checked zero accounts and failed zero. These observations do not prove historical completion or provider erasure. [Dated evidence and package hashes](../.impeccable/review/release-2026-10-17/operations/background-health.json).

## Exact approved scope

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

## Second review — October 17

**Second-review recommendation accepted by the owner; deployment approved with the safeguards below.** The second review found no additional blocking defect in the runtime changes. Runtime source, all five candidate archives and the monitoring configuration are unchanged; the manifest above remains the deployment candidate. This recommendation does not establish production acceptance or app-release readiness.

- Added four checks against the actual observer export: it observes healthy state without running customer work or starting a write transaction; completion-read failures, aggregate-read failures and invalid aggregate values all reject with a fixed, private-data-free unavailable result. These checks passed both in source and on the exact observer package. The distinct exact-package total is now **48** (the earlier 44 plus four new checks).
- Final required typecheck/build and **376 unit tests** passed. The full Firestore suite passed **284/284** again. The unchanged runtime also passed [CI on `79d2024`](https://github.com/tigerisaac/aaacap-project/actions/runs/39093806614), including Firebase Auth/account lifecycle. No test rerun was needed to overcome a failure in this review. Exact-package source-map warnings and local SDK metadata-discovery warnings remain in the private logs; neither caused a failed assertion.
- Independently rehashed each ZIP, inspected every archive entry, matched each selected handler to freshly compiled source, and proved that reverting the selected handler/import leaves the entire previous entry module unchanged. All rollback archives match their saved hashes.
- At **22:37 Central**, read-only checks found all fourteen function settings/source references and all six schedule configurations unchanged. The five relevant serving revisions retained their IAM bindings and 100% traffic. Four existing policies remain; no deployment, worker invocation or message occurred.
- Tightened the procedure below: require completions from the new revisions, bound the wait after each expected natural run, require a fresh healthy observation, and require a positive metric point originating after policy activation. Documented resource-deletion, delayed-metric and automatic-closure limits. These are acceptance clarifications, not new cloud resources or configuration changes.

The [dated evidence](../.impeccable/review/release-2026-10-17/operations/background-health.json) records the review and final test hashes. The deployment section below adds cloud creation and initial scheduled-execution evidence; alert activation and condition acceptance remain separate.

## Deployment and initial observation — October 17

The owner explicitly replied **“Approve reviewed rollout.”** Source and configuration read-back passed at **23:24 Central**. The candidate manifest and all five ZIP hashes are unchanged. All serving source archives were downloaded and rehashed, every worker retained its settings/IAM and full traffic, and the observer is private with only the scheduled runtime identity in its direct invoker binding. An unauthenticated request returned 403.

| Function | New serving revision |
|---|---|
| `cleanupShield` | `cleanupshield-00016-nag` |
| `finishAccountDeletions` | `finishaccountdeletions-00002-raw` |
| `reviewServiceAccess` | `reviewserviceaccess-00002-jof` |
| `expireMessageDeliveries` | `expiremessagedeliveries-00003-yab` |
| `checkBackgroundHealth` | `checkbackgroundhealth-00001-not` |

The single new index is READY. The authenticated five-minute observer schedule is enabled with no retry; its first natural **23:25** attempt succeeded. Its real log observation reports three fresh workers, zero for all six overdue counts and a missing cleanup completion. That missing result is expected until the next daily run and is **not** full acceptance. Initial positive counter data was observed at 23:27; it predates policy activation and cannot satisfy the later absence-policy acceptance gate. The two exact policies exist **disabled**. Four existing policies, the email channel, readiness check, $50 budget, all six prior schedules, the other ten functions, bridge, Hosting and public configuration remain unchanged; API readiness returned 200.

Natural deletion, subscription-review and audio-expiry completions have been observed after their new revisions became active. The read-only check found no failed/partial result logs from those deployed revisions. Cleanup is expected at **04:00:02 Central on October 18**, with its agreed **04:20:02** completion deadline. Alert activation waits for that natural result and a subsequent fresh, zero-backlog observation. No worker was invoked manually and no calls, texts or synthetic test email were sent.

The exact second-review commit `a0619b2` passed [independent CI](https://github.com/tigerisaac/aaacap-project/actions/runs/39094590443), including build/unit, Firestore and Auth/account-lifecycle checks. [Deployment receipts and pending gates](../.impeccable/review/release-2026-10-17/operations/background-health.json) separate deployed configuration from operational acceptance.

Verification-tool corrections are retained: Eventarc filter arrays were compared independent of order; the existing Budgets API needed Shield's quota project rather than the CLI OAuth project; and Scheduler canonicalized its target URI by appending `/` while preserving the exact OIDC audience. The initial schedule read-back assertion was too strict. A fresh read reconciled the same existing job; it was not submitted twice. These corrections changed verification code, not the approved runtime archives or scope.

## Approved-rollout procedure and acceptance

The owner approved the following scope and safeguards. Approval includes the specified source updates, new observer/index/schedule, two policies and one metric, and restoring these exact baselines if rollout checks fail. It does not authorize manual cleanup, test records in customer collections, phone calls, texts or another synthetic email test.

1. Recheck the four worker baselines, API source used for the new package, all package hashes, fleet/schedule configuration and existing policy/channel/budget state. Stop and rebuild the review if scope has changed.
2. Create only the new deletion-age index and wait for `READY`. Patch only the four workers' source archives, once each. Verify serving source, settings/IAM and full traffic independently for each revision. Preserve the other ten functions, bridge and all six existing schedules.
3. Create the private read-only observer, its authenticated five-minute schedule and the log counter. Verify settings, invocation identity, source and natural scheduled execution. Early observations may correctly report missing completion records.
4. Wait for **all four workers to complete naturally**, including the next daily cleanup. Each successful run must start after its new revision became active; an older record cannot satisfy acceptance. Require a subsequent observer result with all four states fresh and every overdue count zero. Do not invoke cleanup or insert synthetic success records to shorten this wait. Capture only their fixed health records and aggregate observations. Record the next scheduled run time at deployment: stop acceptance if no completion arrives within 10 minutes for deletion, 20 minutes for audio or daily cleanup, or 30 minutes for subscription review after that expected run. A failed/partial result also stops acceptance for investigation; waiting indefinitely is not a passing result.
5. Enable the two policies after that initial coverage is established. A metric-absence condition requires at least one point **after policy creation or modification** before it can fire. Require a positive counter point from an actual observation made after policy activation, and verify the aggregated series. A zero point or an older event ingested late is insufficient. If no qualifying point appears within 20 minutes of the first scheduled observation after activation, leave acceptance incomplete and investigate. [Google's metric-absence requirements](https://docs.cloud.google.com/monitoring/alerts/metric-absence).
6. Read back the final policy/index/schedule/function state and compare every preserved resource. Record deployment and operational acceptance separately. Actual alert-condition failure/recovery tests require their own reviewed authorization when they would change live state or send a test notification.

If acceptance fails, disable/pause only the new policies and observer schedule, restore the four original source archives if needed, and verify source/settings/traffic. Keep the fixed completion records and evidence for diagnosis. An unused new index/metric may be retained until deliberate cleanup; do not remove unrelated resources.

## Limits that remain open

This covers four maintenance schedules and six aggregate backlog types. It does not prove completion of every task, Eventarc delivery, successful voice-model assessment, caretaker delivery, vendor erasure, or historical worker recovery. Legacy daily setup checks are disabled by the shared-number path and retain their existing behavior; enabling that path would need its own completion/failure review. A public billing page that repeatedly fails remains visible and retryable, but an operator still needs to resolve the underlying issue.

Missing-field/corrupt legacy jobs, full incident escalation, spending-alert receipt, actual native/log alert-condition acceptance and the unexplained historical API failures remain R5 work. Apple setup, real-phone calls and accessibility/device acceptance remain separate release gates. The earlier owner-confirmed email test proves the selected log-alert delivery route only.

The absence policy observes silence from an established metric stream; Google excludes resources it recognizes as terminated/deleted from metric-absence evaluation, so this is not a resource-deletion alarm. Log counters can have zero points adjacent to nonzero points and ingestion can lag. Neither an automatically closed alert nor a resumed heartbeat proves that the underlying maintenance work recovered: recovery requires a fresh healthy observation and the relevant worker result. The one-hour auto-close setting on the metric-absence policy can close a continuing missing-data incident after a further 24 hours; incident closure must not be used as the recovery signal. [Resource-state limitation](https://docs.cloud.google.com/monitoring/alerts/metric-absence), [log-counter gaps](https://docs.cloud.google.com/logging/docs/logs-based-metrics), [metric-absence closure](https://docs.cloud.google.com/monitoring/alerts/incidents-events).

API references: [log counter schema](https://docs.cloud.google.com/logging/docs/reference/v2/rest/v2/projects.metrics), [alert policy conditions](https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies).
