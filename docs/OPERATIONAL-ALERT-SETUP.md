# Shield service and spending alerts — October 17, 2026

The owner selected **isaac.cw.zhang@gmail.com** for service alerts and a **USD $50 monthly Google Cloud budget**. The settings are **applied and verified by read-back at 21:18 Central, October 17**: one email notification channel, four enabled service policies, one HTTPS readiness check and one project-filtered budget for `shield-calls-isaac`. The owner confirmed receipt of the separately authorized synthetic test at **21:54 Central**; its temporary policy was removed and the permanent settings were reverified. [Configuration receipt](../.impeccable/review/release-2026-10-17/operations/alert-configuration.json).

| Condition | Window and threshold |
|---|---|
| API server errors | At least 5 HTTP 5xx responses in 5 minutes |
| Background-worker server errors | At least 20 HTTP 5xx responses in 15 minutes; excludes the API and screening bridge |
| Scheduled job failure | A Cloud Scheduler ERROR entry; notifications limited to once per hour |
| Readiness | HTTPS `/public/ready` returns HTTP 200 and JSON `status: ready`; check every 15 minutes from three US locations, alert when at least two locations fail |
| Monthly Google Cloud spending | Actual net spending reaches $25, $45 or $50; forecast reaches $50 |

Metric alerts remind the selected recipient hourly while an incident remains open. The budget uses the linked account's verified USD currency, includes credits and filters to Shield's project. It enables the Budgets API and uses the selected email channel, without adding billing-role recipients. There is no spend cap, automatic shutdown, carrier change or backend deployment in this configuration. Budget alerts are not a real-time spending limit. [Google budget fields](https://docs.cloud.google.com/billing/docs/reference/budget/rest/v1/billingAccounts.budgets).

The service policies use native Cloud Run request metrics and Scheduler error logs. Existing request-log privacy exclusions are preserved. Some worker 5xx responses represent deliberate retries; alerts initiate investigation rather than treating every retry as lost work. An HTTP-successful worker can still retain failed individual jobs, so overdue-job and execution-freshness coverage remains required. Separate Telnyx, OpenAI and Soniox charges are outside this Google Cloud budget.

## Verification

Read-only preflight at **21:04 Central** validated the two request-metric queries, the Scheduler log filter, the email channel descriptor, three distinct US checker locations and USD billing currency. There were no project policies, channels or uptime checks. The Budgets API was disabled. No configuration had changed at that point.

Resource read-back, observed uptime executions, actual email receipt and operator response are recorded separately below. A channel's platform verification status does not prove inbox delivery. Both synthetic test attempts had explicit owner authorization. No phone was contacted.

Read-back verified all four enabled policies and their exact conditions/channel, the readiness URL/body matcher/interval, and the Shield-only budget, currency and four thresholds. The unrelated existing account budget was preserved. The email channel was enabled with platform status `VERIFICATION_STATUS_UNSPECIFIED`; that initial read-back did not establish delivery. At **21:20 Central**, the first metric query succeeded but contained no check samples yet, only about three minutes after check creation.

At **21:41 Central**, the matching uptime metric contained **24 passing samples across all three configured locations** (`usa-oregon`, `usa-iowa`, `usa-virginia`), with zero failed samples. Earlier observations contained only Oregon, then Oregon/Iowa. Samples are not counts of separate HTTP executions. This establishes observed successful checks in the bounded window; failure-trigger behavior remains untested. [Bounded uptime observation](../.impeccable/review/release-2026-10-17/operations/uptime-observation.json).

Two API corrections are retained in the evidence. The first readiness create returned 400 because an exact JSON-path match requires a JSON-encoded string; the rejected attempt created nothing, and the corrected check matches `"ready"` as a JSON string value. The first budget lookup after enabling Shield's API still used the CLI's OAuth consumer project and returned `SERVICE_DISABLED`; setting Shield as the explicit quota project made the lookup succeed. Neither failure was treated as a successful creation or blindly retried. [Corrections and initial observation](../.impeccable/review/release-2026-10-17/operations/configuration-corrections.json).

The owner explicitly approved the labeled **Shield notification delivery test**. Its temporary policy used the existing email channel, matched only the synthetic test identifier and requested only an opening notification. The first event was accepted at **21:40:59 Central** and read back once, with an ingestion timestamp of 21:41:00. At 21:44, the notification-channel log query contained no error entries, but that did not prove delivery. No alert was observed before the final retry, and the owner reported no receipt. The separate retry and completed acceptance are below. [Test evidence and limits](../.impeccable/review/release-2026-10-17/operations/notification-test.json).

The test helper initially reused a mutable POST options object for a GET, causing a local request TypeError during read-back. Fresh options corrected verification; the policy and first event were each submitted only once. That helper correction did not resubmit either the policy or event; the later retry had separate owner approval.

The independent [API diagnostics change](API-DIAGNOSTICS-ROLLOUT.md) received separate owner approval and was deployed and verified at **21:49 Central**, on `shieldapi-00034-yaw`. It records fixed failure categories without request URLs, credentials, caller data, transcripts or error stacks. Its rollout preserved monitoring and budget settings.

Broader operational gaps and historical failures remain tracked in [operational readiness](OPERATIONAL-READINESS.md).

## Final delivery retry — received and cleaned up

After the first attempt, read-back confirmed the policy was enabled and valid, its exact filter/channel was intact, no timestamp label was extracted and no snooze applied. The owner separately approved **one final test attempt**. Its event was accepted at **21:52:31 Central**, and Cloud Monitoring opened **one matching alert at 21:52:52**. Read-back accounts for exactly two authorized synthetic events. The same policy retained its one-hour notification rate limit and opening-only setting.

At **21:54 Central**, the owner replied **“Received the test email.”** This is owner-confirmed inbox receipt and acknowledgement of the test, not an independent mailbox inspection or a full incident-response rehearsal. The temporary policy was deleted at **21:54:11**. Final read-back at **21:54:46** confirmed exactly four permanent service policies, the original email channel/readiness check and the USD $50 monthly budget were unchanged.

The first event's missing alert remains unexplained; policy propagation is a possible cause, not an established diagnosis. The successful retry proves the configured email route worked for this synthetic log alert. It does not verify every service condition, spending threshold, backlog/freshness alert or escalation response. No further attempt, phone call or SMS was made. [Complete sanitized receipt](../.impeccable/review/release-2026-10-17/operations/notification-test.json).
