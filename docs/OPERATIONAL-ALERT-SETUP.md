# Shield service and spending alerts — October 17, 2026

The owner selected **isaac.cw.zhang@gmail.com** for service alerts and a **USD $50 monthly Google Cloud budget**. The settings are **applied and verified by read-back at 21:18 Central, October 17**: one email notification channel, four enabled service policies, one HTTPS readiness check and one project-filtered budget for `shield-calls-isaac`. Actual email receipt remains unverified. [Configuration receipt](../.impeccable/review/release-2026-10-17/operations/alert-configuration.json).

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

After applying, record resource read-back separately from observed uptime executions, actual email receipt and an operator response. A channel's platform verification status does not prove inbox delivery. Do not trigger a synthetic alert email or contact the owner's phone without the corresponding authorization.

Read-back verified all four enabled policies and their exact conditions/channel, the readiness URL/body matcher/interval, and the Shield-only budget, currency and four thresholds. The unrelated existing account budget was preserved. The email channel is enabled with platform status `VERIFICATION_STATUS_UNSPECIFIED`; no claim of delivered mail is made. At **21:20 Central**, the first metric query succeeded but contained no check samples yet, only about three minutes after check creation.

At **21:27 Central**, the matching uptime metric contained six passing samples from `usa-oregon`, with no failed samples. These are metric samples, not a claim of six separate HTTP executions. The other two configured US locations and failure-trigger/notification behavior were not yet observed. [Bounded uptime observation](../.impeccable/review/release-2026-10-17/operations/uptime-observation.json).

Two API corrections are retained in the evidence. The first readiness create returned 400 because an exact JSON-path match requires a JSON-encoded string; the rejected attempt created nothing, and the corrected check matches `"ready"` as a JSON string value. The first budget lookup after enabling Shield's API still used the CLI's OAuth consumer project and returned `SERVICE_DISABLED`; setting Shield as the explicit quota project made the lookup succeed. Neither failure was treated as a successful creation or blindly retried. [Corrections and initial observation](../.impeccable/review/release-2026-10-17/operations/configuration-corrections.json).

The independent [API diagnostics change](API-DIAGNOSTICS-ROLLOUT.md) requires a separate scoped deployment approval. It records fixed failure categories without request URLs, credentials, caller data, transcripts or error stacks. It has not been deployed as part of these settings.

Broader operational gaps and historical failures remain tracked in [operational readiness](OPERATIONAL-READINESS.md).
