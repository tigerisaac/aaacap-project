# On-demand running costs

Checked October 16, 2026 (Central). USD public list prices, not an account invoice. Destination rates, billing increments, taxes, discounts and shared free-tier usage can change the bill.

The bridge and every function use zero minimum instances and request-based CPU. There is **no continuously provisioned compute charge**. The minute recovery sweep and daily scheduled work still consume brief executions; phone numbers, retained files, images and other cloud services have separate charges.

## Cost components

| Component | Rate / basis | When charged |
| --- | --- | --- |
| Local phone number | From **$1/month/number**; SMS/MMS capability adds $0.10/month | Number rental; shared pilot number is not one new rental per caller. [Telnyx numbers](https://telnyx.com/pricing/numbers) |
| Inbound carrier + Voice API | From **$0.0052/minute** ($0.0032 carrier + $0.002 API) | Answered inbound leg. These are starting rates, not a verified account-specific destination quote. [Carrier rates](https://telnyx.com/pricing/elastic-sip), [Voice API](https://telnyx.com/pricing/voice-api) |
| Screening media stream | **$0.0035/minute** | While streaming to the bridge. [Voice API](https://telnyx.com/pricing/voice-api) |
| Capture / voicemail recording | **$0.002/minute** | Recording from answer until capture stops. Telnyx lists recording storage at $0; Shield's own object storage is separate. [Voice API](https://telnyx.com/pricing/voice-api) |
| Soniox screening recognition | Typically **$0.002/minute** ($0.12/hour) | Audio recognition before any conversational escalation. Advanced token-billed use can differ. [Soniox](https://soniox.com/pricing) |
| GPT-6 Luna | Standard short context: **$0.10/M input tokens, $0.50/M output**; Fast: **$0.20/M input, $1/M output**, with lower cached-input rates | Screening decisions and monitoring assessments; post-call work uses its configured tier. [OpenAI pricing](https://developers.openai.com/api/docs/pricing) |
| GPT-Live clarification | **$0.05/minute**, billed per second; backend model/tool charges separate | Only sessions that need conversational clarification. It is not running throughout every call. [OpenAI pricing](https://developers.openai.com/api/docs/pricing) |
| Bridge CPU + memory | **$0.001515 per active instance-minute**, before free tier | One CPU and 512 MiB in us-central1: $0.000024/CPU-second + $0.0000025/GiB-second. Startup, shutdown and preparation also consume billed time. Concurrent calls can share an instance. [Cloud Run](https://cloud.google.com/run/pricing) |
| HTTP / event / task functions | Same resource-based compute model plus request/event charges | Brief webhooks, queue dispatch, recovery and cleanup; no minimum instance charge. |
| Cloud Tasks | First **1 million operations/month free**, then **$0.40/million** | Enqueue and delivery attempts are operations, including retries. No worker is kept open merely to wait for a deadline. [Cloud Tasks](https://cloud.google.com/tasks/pricing) |
| Voicemail transcription | **$0.0045/audio-minute**, plus Luna assessment | Stored unconnected messages checked by GPT-Transcribe. [OpenAI pricing](https://developers.openai.com/api/docs/pricing) |

Cloud Run's request-based allowance includes 180,000 CPU-seconds, 360,000 GiB-seconds and 2 million requests monthly, shared under the applicable billing account. Beyond it, requests are $0.40/million. Low pilot usage may fit the allowance; this is not a guarantee that the complete Google bill is zero. Firestore, Eventarc/Pub/Sub, Scheduler, Secret Manager, object storage, logs, networking and retained build images also contribute. This release retains the three newest bridge images so a one-day cleanup policy cannot remove all deployable bridge versions.

## Measured synthetic workload and planning example

The unchanged 24-case synthetic voice run estimated **$0.0574057 total AI cost**, or **$0.002392 (0.239¢) per screening**. Average local session duration was **25.42 seconds**. Two sessions escalated to GPT-Live. The estimate uses reported Luna tokens and provider socket durations; it excludes carrier/cloud charges and is not provider billing evidence. The synthetic case mix is not a forecast of real callers.

For **1,000 screenings with that same duration and AI mix**, assuming the published starting inbound rate and streaming/recording for the entire session:

| Item | Illustrative monthly amount |
| --- | ---: |
| AI (Soniox + Luna + occasional GPT-Live) | $2.39 |
| Inbound carrier/API + stream + recording | $4.53 |
| Bridge active CPU/memory, before free tier | $0.64 |
| One local number, before optional capabilities | $1.00 |
| **Subtotal** | **$8.57** |

This subtotal excludes worker/startup time, other cloud services, taxes, carrier billing rounding, voicemail after screening and connected conversation time. Allowing a planning range of roughly **1–2¢ per short screening**, plus number rental and additional usage, is more sensible than treating $8.57 as a quote.

An accepted call adds an outbound leg starting at $0.007/minute (carrier + API), while the inbound leg continues. Connected-call Soniox recognition through Telnyx is $0.002/minute. That gives a starting subtotal of **$0.0142 per connected minute**, plus Luna monitoring assessments, brief private-summary speech and backend work. Streaming to the screening bridge and message capture stop before connection. Recipient destination rates can raise this subtotal. Long conversations and frequent GPT-Live clarification can therefore cost more than short rejected calls.

Evidence: `artifacts/hybrid-live-ondemand-startup/summary.json`, `scripts/lib/hybrid-cost.mjs`, frozen deployed release package and `artifacts/private/on-demand-call-release/`. All operational evidence is private; no caller content is needed for this estimate.
