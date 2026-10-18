# Operational readiness — October 17, 2026

**October 18 source follow-up:** the retained transaction failures now have an isolated SDK retry mechanism and a tested correction on both root/live dependencies. Local checks pass 382 unit, 284 Firestore and eight account tests; both original concurrency cases pass ten repetitions. Frozen packages preserve all serving business code and pass their scoped checks. [The proposed rollout](FIRESTORE-RETRY-ROLLOUT.md) passed independent [CI on `bbdc93e`](https://github.com/tigerisaac/aaacap-project/actions/runs/39100717454) and still requires owner approval. It has not changed production or established the cause of historical API incidents. R5 and background-health natural-completion acceptance remain open.

**R5 remains open.** The initial read-only checks at **20:21–20:33 America/Chicago** found missing monitoring and spending alerts. After the owner selected an email and budget, **four service policies, one email channel, one readiness check and a Shield-only USD $50 monthly budget were configured and read back at 21:18 Central**. All three readiness locations have passing samples, and the owner confirmed the authorized synthetic test email at 21:54; its temporary policy was removed. Overdue-job/freshness coverage, historical failure resolution, individual alert-condition acceptance and incident escalation remain open. [Applied settings and evidence](OPERATIONAL-ALERT-SETUP.md). The earlier [retention/pagination deployment](RETENTION-PAGINATION-ROLLOUT.md) was separate.

The owner-approved [background-health rollout](BACKGROUND-JOB-HEALTH-ROLLOUT.md) was deployed and configuration-verified at **23:24 Central**. Three workers have natural post-deployment completions; the private observer's first natural run succeeded at 23:25 and reported zero overdue counts, three fresh workers and the expected missing daily-cleanup completion. Two additional policies are staged disabled. Initial counter data exists, but acceptance still requires the 04:00 Central cleanup on October 18, a subsequent healthy observation, activation and a fresh positive counter signal after activation. Existing operational resources are preserved; no manual worker, phone or synthetic email test occurred.

Independent CI on the later app/evidence commit `80a0e8d` failed one of 284 Firestore tests in two-client simultaneous call admission, with `Transaction is invalid or closed`; account tests were skipped. Backend source/dependencies/workflow were unchanged from the passing `a0619b2` run. This expands the retained concurrency evidence beyond the earlier stopped-history test, without establishing a common cause or production impact. [Failure and bounded SDK investigation](../.impeccable/review/release-2026-10-17/operations/backend-ci-80a0e8d.json). R5 and overall release acceptance remain open.

The later `7e8cec2` CI failed stopped-history backfill with the same error. The unchanged two-client admission test then reproduced it locally on the fourth attempt, with diagnostics retained and the bounded run stopped at that failure. Two SDK-only reductions did not reproduce it in ten rounds each. The cause and production impact remain unresolved; this has not been hidden by retries, changed assertions or replacement CI runs. [Current reproduction evidence](../.impeccable/review/release-2026-10-17/operations/transaction-diagnostics.json).

## Initial observed configuration — 20:21–20:33 Central

| Check | Observation | Evidence limit |
|---|---|---|
| Cloud Monitoring alert policies | 0 | No project policy exists to route a service condition through Cloud Monitoring. External/manual monitoring was not inspected. |
| Notification channels | 0 | No routing or actual notification delivery was tested. |
| Uptime checks | 0 | A one-time successful readiness request does not provide continuous checking. |
| Log-based metrics | 0 | Native Cloud Run request metrics are available independently. |
| Metric scopes | Only the project's own scope was listed | No additional monitoring-project scope was returned. |
| Billing | Enabled; linked account identified | This is not a spending cap. |
| Shield budget/spend cap | None listed in the matching account's unfiltered Budgets & caps table | The table contained one budget targeting another project. Its identity, amount and screenshot are private. |

The initial budget lookup appeared as a wrapper-level 500; a direct request returned **403 `SERVICE_DISABLED`**. Shield's own Budgets API was also disabled in Service Usage. That error alone did not show that no budget existed. Authenticated console inspection established the table observation, after matching its account to the linked billing account. The follow-up found that budget requests also needed an explicit Shield quota project instead of the CLI's OAuth project; after enabling the API on Shield and supplying that header, the API listed the unrelated existing budget. The new Shield budget preserved it. See [Google's budget-list API](https://docs.cloud.google.com/billing/docs/reference/budget/rest/v1/billingAccounts.budgets/list) and [project billing fields](https://docs.cloud.google.com/billing/docs/reference/rest/v1/ProjectBillingInfo).

## Health observations and limits

At **20:30 Central**, aggregate counts were zero for pending account deletions, expired audio manifests/chunks, pending provider-erasure jobs, provider jobs overdue by more than 24 hours, and assisted-access reviews needing attention. At **20:31 Central**, the latest saved access-review result was about ten minutes old, with zero checked and zero failed. These are bounded observations, not proof of historical completion, failure recovery or vendor erasure. No cleanup/deletion worker was invoked.

Cloud Run's native `run.googleapis.com/request_count` reported the following **5xx responses** over the preceding 24 hours:

| Service | 24-hour count | Last observed hour |
|---|---:|---:|
| `shieldapi` | 37 | 0 |
| `ingestforwardingvoicemail` | 23 | 0 |
| `runsharedcalljob` | 3 | 0 |
| **Total** | **63** | **0** |

The last nonzero five-minute bucket ended at **17:06 Central**, before the approved deployment's 20:24 preflight. Bucket endpoints are not exact request timestamps; metrics may arrive late. The initial audit did not classify these errors; the follow-up below adds evidence without waiving unresolved failures. Other 4xx metrics include expected authentication probes, so they are not all classified as defects.

A bounded ERROR-log query for these services returned seven entries: three for the call worker and four for recording ingestion. None matched the audit's fixed allowlist of known error names. No raw log payload, customer identifier, recording or transcript was printed or saved. No matching API ERROR entry was returned; this does not disprove its 37 HTTP failures.

The existing `_Default` exclusion removes **all Cloud Run request logs regardless of status**, as recorded in the [data inventory](DATA-INVENTORY.md). Thus an empty request-log query cannot establish healthy traffic. Native request metrics, application logs and business-state checks have different coverage. A successful worker HTTP response can also conceal caught per-item failures: the account-deletion worker retains failed jobs for retry. Monitor completion/backlog and freshness as well as HTTP status.

## Historical failure follow-up — 20:50–21:20 Central

One-minute metrics preserve the original 24-hour window and all **63** responses. Expanded fixed-category classification uses deployed source error names and known platform failure patterns. It does not save raw logs, call identifiers or customer content.

| Revision | 5xx count | Additional evidence and limit |
|---|---:|---|
| Ingestion `00008-mab` | 6 | Four ERROR entries identify Firestore event-payload parsing; two later application entries identify `unapproved_recording_origin`. Timing matches the six request-error buckets. These are consistent with the documented event replay and recording-host configuration incidents in the [audio rollout](AUDIO-DELIVERY.md). Duplicate platform log lines are not additional failed requests. |
| Ingestion `00009-goz` | 17 | Seventeen `capture_outcome_pending` entries align with the failure window. The source deliberately retries until the final call outcome exists. This identifies the retry reason, not successful eventual delivery or erasure for each job. |
| Call worker `00003-nog` | 3 | Three `call_busy` errors align with the three failures. The source retries around its execution lease. Individual job recovery remains unverified by this classification. |
| API `00027-xaw` | 1 HTTP 504, 1 HTTP 503 | The 504 bucket coincides with the recorded initial readiness timeout after the cancellation deployment; its retry succeeded. The 503 remains unexplained. |
| API `00028-viw` | 8 HTTP 503 | Revision and timing coincide with the documented invalid Verify-profile configuration incident and rollback. Per-request attribution is unavailable. |
| API `00031-cif` | 27 HTTP 503 | No diagnostic entry was found that identifies the cause. Concurrent worker retries do not establish that these API responses were harmless. |

The API's error boundaries previously returned a generic failure without recording its category. A scoped [diagnostics update](API-DIAGNOSTICS-ROLLOUT.md) was separately approved and **deployed at 21:49 Central** on `shieldapi-00034-yaw`. It records only a fixed event, stage, HTTP status, severity and allowlisted category; it neither restores request logging nor changes failure responses. Cloud Run can parse this single-line JSON as structured application logs. [Cloud Run logging](https://docs.cloud.google.com/run/docs/logging).

At least **28 API 503 responses remain unexplained**, with the other nine API responses correlated to known incidents rather than individually proved. Historical worker recovery and the known-incident correlations remain acceptance work. A short post-retention-rollout metric window (20:34:52–20:50:06 Central) contained zero 5xx responses; this is only that bounded observation. [Sanitized follow-up evidence](../.impeccable/review/release-2026-10-17/operations/failure-followup.json).

## Work required before closing R5

The [background-job health update](BACKGROUND-JOB-HEALTH-ROLLOUT.md) is now deployed and configuration-verified. It addresses caught partial failures, four schedules' completion freshness and six overdue-job aggregates. Its two new policies remain **disabled** until natural-completion and activation acceptance; the original four policies retain their earlier scope. The 22:05 Central pre-deployment snapshot and 23:25 natural observer both found zero selected backlogs, without any manual worker invocation. [Preparation and deployment evidence](../.impeccable/review/release-2026-10-17/operations/background-health.json).

1. Record the response rota and escalation when the selected recipient is unavailable. The owner has now explicitly selected `isaac.cw.zhang@gmail.com` and a USD $50 monthly Google Cloud alert budget; those settings are applied.
2. Validate the configured native-metric, Scheduler and readiness alerts in operation. Preserve the privacy boundary of request-log exclusions. Read-back confirms settings. The separately authorized synthetic log alert opened and the owner confirmed email receipt; actual service-failure conditions remain unexercised.
3. Complete natural-run and activation acceptance of the deployed scheduled-work freshness, overdue-job and provider-erasure coverage. A zero-backlog snapshot or HTTP 200 is insufficient. The deployed observer reads actual completion state and aggregates; its own absence monitor needs a fresh positive metric point after policy activation. The guessed Scheduler `job/attempt_count` metric returned 404 and is not used.
4. Complete escalation and actual incident-response acceptance. The synthetic email route was exercised with explicit authorization: the final event opened an alert and the owner confirmed receipt; the temporary policy was removed. The first event produced no observed alert and remains unexplained. Record this bounded success separately from a full outage-response rehearsal. Do not send owner-phone calls/texts as an implicit monitoring test.
5. Verify receipt of the configured Google Cloud spending alerts and separately review Telnyx/OpenAI/Soniox/provider limits. A Google Cloud budget does not account for separate vendor bills. No automatic service shutdown or forwarding change is configured.
6. Finish the historical failure investigation and verify worker recovery. Keep raw identifiers/content private and report aggregate evidence. Resolve or explicitly accept each remaining failure before public release; the expanded classification does not close this gate.
7. Complete the release's incident/support rota, assisted expiry/restoration process, rollback rehearsal, provider-deletion verification and retention exceptions. Broader [release gates](APP-STORE-RELEASE.md) remain independent.

## Evidence and query corrections

[Sanitized verification](../.impeccable/review/release-2026-10-17/operations/verification.json) links the observations to source `bf60a60` and hashes the private read-only helpers. The evidence folder also retains initial failed queries: corrected repeated Firestore mask parameters and literal metric resource paths succeeded; the guessed Scheduler descriptor did not. The successful Cloud Run request-count and Cloud Tasks queue-depth descriptors are recorded without implying that queue alarms are configured.

Public evidence contains configuration/count summaries and timestamps. The unrelated budget screenshot, linked account details and helper sources remain in ignored `artifacts/private/operations-readiness-oct17/`. External vendor monitoring, organization-level/manual controls, each service-failure condition, spending-alert receipt and a completed production failure/recovery exercise remain unverified. The separately authorized synthetic email route now has owner-confirmed receipt. The initial audit was read-only; the subsequent [alert setup](OPERATIONAL-ALERT-SETUP.md) changed monitoring and budget configuration. It did not change customer data, phone settings or provider routing.

API references: [Cloud Monitoring](https://docs.cloud.google.com/monitoring/api/ref_v3/rest), [alert policies](https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies), [uptime-check listing](https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.uptimeCheckConfigs/list).
