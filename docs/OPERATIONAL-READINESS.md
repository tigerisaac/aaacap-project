# Operational readiness — October 17, 2026

**R5 remains open.** The initial read-only checks at **20:21–20:33 America/Chicago** found missing monitoring and spending alerts. After the owner selected an email and budget, **four service policies, one email channel, one readiness check and a Shield-only USD $50 monthly budget were configured and read back at 21:18 Central**. Actual notification receipt, overdue-job/freshness coverage, historical failure resolution and incident acceptance remain open. [Applied settings and evidence](OPERATIONAL-ALERT-SETUP.md). The earlier [retention/pagination deployment](RETENTION-PAGINATION-ROLLOUT.md) was separate.

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

The API's error boundaries previously returned a generic failure without recording its category. A scoped [diagnostics update](API-DIAGNOSTICS-ROLLOUT.md) is prepared, but is **not deployed**. It records only a fixed event, stage, HTTP status, severity and allowlisted category; it neither restores request logging nor changes failure responses. Cloud Run can parse this single-line JSON as structured application logs. [Cloud Run logging](https://docs.cloud.google.com/run/docs/logging).

At least **28 API 503 responses remain unexplained**, with the other nine API responses correlated to known incidents rather than individually proved. Historical worker recovery and the known-incident correlations remain acceptance work. A short post-retention-rollout metric window (20:34:52–20:50:06 Central) contained zero 5xx responses; this is only that bounded observation. [Sanitized follow-up evidence](../.impeccable/review/release-2026-10-17/operations/failure-followup.json).

## Work required before closing R5

1. Record the response rota and escalation when the selected recipient is unavailable. The owner has now explicitly selected `isaac.cw.zhang@gmail.com` and a USD $50 monthly Google Cloud alert budget; those settings are applied.
2. Validate the configured native-metric, Scheduler and readiness alerts in operation. Preserve the privacy boundary of request-log exclusions. Read-back confirms the settings, not detection or email receipt.
3. Cover scheduled-work freshness, overdue jobs and provider-erasure retries. A zero-backlog snapshot or HTTP 200 is insufficient. Verify the actual descriptors and failure paths before choosing alerts; the guessed Scheduler `job/attempt_count` metric returned 404 and must not be used.
4. Validate alert routing and escalation with an explicitly authorized test recipient. Record detection, notification receipt and operator response separately. Do not send owner-phone calls/texts as an implicit monitoring test.
5. Verify receipt of the configured Google Cloud spending alerts and separately review Telnyx/OpenAI/Soniox/provider limits. A Google Cloud budget does not account for separate vendor bills. No automatic service shutdown or forwarding change is configured.
6. Finish the historical failure investigation and verify worker recovery. Keep raw identifiers/content private and report aggregate evidence. Resolve or explicitly accept each remaining failure before public release; the expanded classification does not close this gate.
7. Complete the release's incident/support rota, assisted expiry/restoration process, rollback rehearsal, provider-deletion verification and retention exceptions. Broader [release gates](APP-STORE-RELEASE.md) remain independent.

## Evidence and query corrections

[Sanitized verification](../.impeccable/review/release-2026-10-17/operations/verification.json) links the observations to source `bf60a60` and hashes the private read-only helpers. The evidence folder also retains initial failed queries: corrected repeated Firestore mask parameters and literal metric resource paths succeeded; the guessed Scheduler descriptor did not. The successful Cloud Run request-count and Cloud Tasks queue-depth descriptors are recorded without implying that queue alarms are configured.

Public evidence contains configuration/count summaries and timestamps. The unrelated budget screenshot, linked account details and helper sources remain in ignored `artifacts/private/operations-readiness-oct17/`. External vendor monitoring, organization-level/manual controls, actual notification delivery and a completed production failure/recovery exercise were not verified. The initial audit was read-only; the subsequent [alert setup](OPERATIONAL-ALERT-SETUP.md) changed monitoring and budget configuration. It did not change customer data, phone settings or provider routing.

API references: [Cloud Monitoring](https://docs.cloud.google.com/monitoring/api/ref_v3/rest), [alert policies](https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies), [uptime-check listing](https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.uptimeCheckConfigs/list).
