# Operational readiness — October 17, 2026

**R5 remains open.** Read-only checks of `shield-calls-isaac` at **20:21–20:33 America/Chicago** found no configured project alert policies, notification channels, uptime checks or log-based metrics, and no Shield budget in its linked billing account. The approved [retention/pagination deployment](RETENTION-PAGINATION-ROLLOUT.md) is a separate change; it did not configure operational monitoring or budgets.

## Observed configuration

| Check | Observation | Evidence limit |
|---|---|---|
| Cloud Monitoring alert policies | 0 | No project policy exists to route a service condition through Cloud Monitoring. External/manual monitoring was not inspected. |
| Notification channels | 0 | No routing or actual notification delivery was tested. |
| Uptime checks | 0 | A one-time successful readiness request does not provide continuous checking. |
| Log-based metrics | 0 | Native Cloud Run request metrics are available independently. |
| Metric scopes | Only the project's own scope was listed | No additional monitoring-project scope was returned. |
| Billing | Enabled; linked account identified | This is not a spending cap. |
| Shield budget/spend cap | None listed in the matching account's unfiltered Budgets & caps table | The table contained one budget targeting another project. Its identity, amount and screenshot are private. |

The Budgets API initially appeared as a wrapper-level 500. A direct request returned **403 `SERVICE_DISABLED`**, confirmed by Service Usage. That error alone does not show that no budget exists. The subsequent authenticated console inspection established the table observation, after matching its account to the API's linked billing account. No API was enabled and no budget or cap was created. See [Google's budget-list API](https://docs.cloud.google.com/billing/docs/reference/budget/rest/v1/billingAccounts.budgets/list) and [project billing fields](https://docs.cloud.google.com/billing/docs/reference/rest/v1/ProjectBillingInfo).

## Health observations and limits

At **20:30 Central**, aggregate counts were zero for pending account deletions, expired audio manifests/chunks, pending provider-erasure jobs, provider jobs overdue by more than 24 hours, and assisted-access reviews needing attention. At **20:31 Central**, the latest saved access-review result was about ten minutes old, with zero checked and zero failed. These are bounded observations, not proof of historical completion, failure recovery or vendor erasure. No cleanup/deletion worker was invoked.

Cloud Run's native `run.googleapis.com/request_count` reported the following **5xx responses** over the preceding 24 hours:

| Service | 24-hour count | Last observed hour |
|---|---:|---:|
| `shieldapi` | 37 | 0 |
| `ingestforwardingvoicemail` | 23 | 0 |
| `runsharedcalljob` | 3 | 0 |
| **Total** | **63** | **0** |

The last nonzero five-minute bucket ended at **17:06 Central**, before the approved deployment's 20:24 preflight. Bucket endpoints are not exact request timestamps; metrics may arrive late. The audit does **not** attribute these errors to a root cause or waive them. Other 4xx metrics include expected authentication probes, so they are not all classified as defects.

A bounded ERROR-log query for these services returned seven entries: three for the call worker and four for recording ingestion. None matched the audit's fixed allowlist of known error names. No raw log payload, customer identifier, recording or transcript was printed or saved. No matching API ERROR entry was returned; this does not disprove its 37 HTTP failures.

The existing `_Default` exclusion removes **all Cloud Run request logs regardless of status**, as recorded in the [data inventory](DATA-INVENTORY.md). Thus an empty request-log query cannot establish healthy traffic. Native request metrics, application logs and business-state checks have different coverage. A successful worker HTTP response can also conceal caught per-item failures: the account-deletion worker retains failed jobs for retry. Monitor completion/backlog and freshness as well as HTTP status.

## Work required before closing R5

1. Confirm the operational alert recipient, response owner and monthly Google Cloud alert budget. The customer-support address is not treated as authorization to send operational notifications. Prepare a scoped configuration review before changing live monitoring or billing settings.
2. Configure service-health and error alerts using verified native metrics, plus readiness checks. Define meaningful windows and thresholds for this low-volume service. Preserve the privacy boundary of log exclusions unless a separate reviewed change supplies an appropriately restricted alternative.
3. Cover scheduled-work freshness, overdue jobs and provider-erasure retries. A zero-backlog snapshot or HTTP 200 is insufficient. Verify the actual descriptors and failure paths before choosing alerts; the guessed Scheduler `job/attempt_count` metric returned 404 and must not be used.
4. Validate alert routing and escalation with an explicitly authorized test recipient. Record detection, notification receipt and operator response separately. Do not send owner-phone calls/texts as an implicit monitoring test.
5. Configure the agreed Google Cloud spending alerts and separately review Telnyx/OpenAI/Soniox/provider limits. A Google Cloud budget does not account for separate vendor bills. Do not introduce an automatic service shutdown or forwarding change through a budget action without explicit approval.
6. Investigate the 63 historical server errors and reconcile causes with exact deployed revisions and known incidents. Keep raw identifiers/content private and report aggregate evidence. Resolve or explicitly accept each remaining failure before public release.
7. Complete the release's incident/support rota, assisted expiry/restoration process, rollback rehearsal, provider-deletion verification and retention exceptions. Broader [release gates](APP-STORE-RELEASE.md) remain independent.

## Evidence and query corrections

[Sanitized verification](../.impeccable/review/release-2026-10-17/operations/verification.json) links the observations to source `bf60a60` and hashes the private read-only helpers. The evidence folder also retains initial failed queries: corrected repeated Firestore mask parameters and literal metric resource paths succeeded; the guessed Scheduler descriptor did not. The successful Cloud Run request-count and Cloud Tasks queue-depth descriptors are recorded without implying that queue alarms are configured.

Public evidence contains configuration/count summaries and timestamps. The unrelated budget screenshot, linked account details and helper sources remain in ignored `artifacts/private/operations-readiness-oct17/`. External vendor monitoring, organization-level/manual controls, actual notification delivery and a completed production failure/recovery exercise were not verified. No operational configuration, customer data, phone setting or provider routing changed in this audit.

API references: [Cloud Monitoring](https://docs.cloud.google.com/monitoring/api/ref_v3/rest), [alert policies](https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies), [uptime-check listing](https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.uptimeCheckConfigs/list).
