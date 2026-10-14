# Monitoring across an hour

October 13, 2026. The owner requested protection throughout the newly allowed 60-minute connection without increasing the 240-check budget. The cadence was deployed and verified at 23:11 Central; exact revisions are in [Status](STATUS.md). This changes scheduling, not screening v158, monitoring policy v2, warning scripts, consent or press-1 acceptance. Implementation, synthetic checks and cloud smoke tests are not real-call evidence.

## Budget and timing

The old producer reserved one check for each final transcript update, up to two in flight. A talkative conversation could spend all 240 long before the connected-call deadline. The new producer coalesces updates and reserves one possible assessment per time window, measured from recipient acceptance:

| Connected time | Minimum spacing within the phase | Available windows |
| --- | --- | --- |
| First 5 minutes | 5 seconds | 60 |
| Minutes 5–20 | 15 seconds | 60 |
| Minutes 20–60 | 20 seconds | 120 |

The first new speech can be checked immediately. Silence and already-reviewed speech do not create periodic model requests. Unused windows expire; they cannot be spent in a later burst. Each paid attempt claims its current window atomically, including an attempt whose provider later fails. At most two assessments can run concurrently. A delayed worker checks current text and skips missed windows. Duplicate deliveries cannot make another paid request for the same claim.

Pending speech has a durable contentless Cloud Task, so it is checked even if the caller becomes quiet. The queue waits without keeping a function asleep. A transactional Firestore outbox and deterministic task IDs cover dispatcher crashes and redelivery. Failed/unsupported assessments leave the speech unreviewed and schedule another reserved window. A crashed worker's lease expires; recovery uses another window rather than silently refunding an attempt that might already have been billed. Ended calls and overdue jobs do not invoke the model. Transcripts stay encrypted, bounded to 6,000 characters and deleted on call end, with the existing two-hour retention bound.

The 240 windows include the final minute. In the saturated simulation the last assessment starts at 59:40; speech arriving after it can remain unreviewed until the carrier/deadline ends the call. This is periodic monitoring, not continuous inference. During healthy operation later speech can wait up to 20 seconds for its next assessment, **plus** ASR finalization, queue/cold-start and model latency. The model timeout is still 25 seconds. Neither the cadence nor the 240-check ceiling guarantees intervention before someone reads out a code or acts. We no longer claim a three-second warning target for this mode.

The same check ceiling is not a fixed dollar price: input length, reasoning output, caching and provider errors vary. The maximum output allowance remains 3,000 tokens per attempt. Coalescing removes redundant requests, and quiet calls use fewer checks, but whole-call transcription, both connected phone legs and infrastructure still cost money. Scheduled tasks also have small queue/dispatch charges; see [Firebase's task-queue documentation](https://firebase.google.com/docs/functions/task-functions). This release measures check counts, not an invoice or population savings rate.

## Validation

- Unit simulation: millisecond arrivals over a full hour cannot spend future windows; phase boundaries, clock rollback and delayed workers cannot create catch-up bursts.
- Firestore integration: a busy hour makes exactly 240 paid-assessment stubs, split 60/60/120. A late code request is checked and intervened on after the caller goes quiet. Concurrent duplicate deliveries call the assessor once. Provider failures, worker crashes, ending a call and cold-worker recovery are covered.
- Rollout compatibility: the existing Firestore handler still processes old API jobs during deployment or rollback. Once the producer writes the new cadence, subsequent jobs use the scheduler. Compatibility attempts already reserved by an old producer remain charged; old calls do not receive a fresh budget.
- `npm run check`: 232 unit tests, typecheck and build pass. `npm run test:firebase`: final 159/159 pass after the queue initialization repair. One preceding run retains two emulator transaction failures in the unrelated concurrent-admission and historical-count tests. The full rerun disables cloud-metadata detection only in the local emulator process.
- Unchanged monitor-v2 through OpenCode Go, GPT-6 Luna medium: existing 24-case set keeps **12/12 ordinary conversations** and stops **12/12 harmful conversations**. The new synthetic set keeps **12/12 harmless openings** and **6/6 ordinary continuations**, and stops **6/6 harmful continuations**. These are text assessments of supplied prefixes, not timed ASR/carrier trials. The timing tests use an assessor stub and do not prove model accuracy.

Artifacts: ignored `artifacts/monitor-hour/` contains the frozen pre-inference source/fixture hashes, both model runs and check logs. `artifacts/monitor-hour-emulator.log` contains the earlier 158-test pass before compatibility was added. No model prompt was tuned on these results, and no real caller audio/transcript or owner phone was used.

## What the screening misses mean

| Finding | Severity and whether monitoring helps |
| --- | --- |
| Hospital update asked an unnecessary question, then went to voicemail in the single-utterance voice fixture | A meaningful missed live offer, especially for urgent care news. Monitoring cannot recover a call that never connected. A real caller might answer, but that was not tested. |
| Genuine bank unexpected-charge alarm blocked | An intentional owner policy tradeoff that can still suppress useful legitimate information. Monitoring cannot recover it. |
| Automated ordinary receipt offered instead of saved after an ASR error | An unnecessary ring/offer; recipient acceptance is still required. No demonstrated fraud exposure in that case, and monitoring cannot repair the routing error. |
| Social Security scam recording held for voicemail | No live connection, but not a completed scam stop. Monitoring does not review saved voicemail. Production post-call v4 is separate and must not be assumed to remove every harmful message. |
| Public MASC ordinary callers: six saved, three blocked and two questioned instead of 69/80 offered | Real service-quality misses under the original labels. Questions may help, but this static test supplied no follow-up. Monitoring cannot undo a false block/save. |
| Public FTC: 146 saved unverified, 47 questioned, one timeout, alongside 530/724 stops | Zero approvals is reassuring about live offers, not proof of harmless outcomes: scam voicemail can still mislead someone. No in-call-monitoring rescue applies to those saved messages. |
| A concealed-intent caller gives a harmless family/social opening and later asks for codes, money, remote access or secrecy | This is the important second-layer use case. The fresh harmful continuations were caught, but intervention timing still matters. Earlier repeated public monitoring tests flagged 436/480 scam trials and kept 232/240 ordinary trials; callback/email and evidence-validation misses remain documented. These were repeats of the same conversations, not independent callers. |

The latest screening voice benchmark offered no harmful caller (11 blocks, one voicemail hold). That does not justify treating monitoring as guaranteed rescue. Protecting ordinary callers requires improving screening questions and recording/turn-taking evidence; preventing later harm also requires measuring recognition-to-intervention delay on consented real calls. Neither is solved merely by spreading the budget across an hour.

## Narrow release

`scripts/deploy-monitor-hour.mjs` snapshots actual production packages and overlays only two API modules and four dispatcher/worker modules. It asserts exact equality of the monitoring request and every warning. The new private `monitorScheduledCall` task function is deployed first; queue permissions are scoped to its queue and the runtime's own identity. The compatible dispatcher follows, then the API producer. Existing function IAM and configuration are preserved apart from enabling dispatcher retries. Production screening bridge, post-call policy and six other functions stay unchanged.

Preparation and each existing-service mutation refuse active call reservations. The delayed smoke job has no call document or transcript and cannot invoke the model or phone provider. Verification checks source archive hashes, private invocation, unrelated revisions, API readiness and consumption of that job. Rollback packages and configuration are retained under ignored `artifacts/private/monitor-hour-release/`: restore the API's original source first, then the dispatcher's source/retry policy. The compatible dispatcher continues handling old jobs during rollback; leave the task queue/worker available until pending cadence jobs drain.

The first cloud smoke exposed a named-app initialization defect: `getStore()` reused Firebase's existing named app while the queue helper requested a nonexistent default app. The producer had not yet been switched, and legacy monitoring remained available. The helper now uses the same initialized app, with a unit regression for a named app and no default app. Original smoke errors and deployment attempts remain in private artifacts. Firebase CLI also reported an IAM setup error on the fresh task queue; the script verifies and supplies the intended private runtime grants explicitly.

Final cloud verification (`2026-10-14T04:11:58.436Z`) confirms API `shieldapi-00020-mox`, dispatcher `monitorconnectedcall-00007-yek` and worker `monitorscheduledcall-00002-wuv`. Both subsequent delayed canaries were consumed; the final one used the repaired worker revision. Every source archive matches its reviewed package, and the new worker's 73 files and resource limits are verified. No real carrier call or paid-model smoke call ran. Screening bridge `shield-live-00014-pz9` and six unrelated functions remain unchanged. The worker pins runtime secret version 6 and OpenAI version 2.
