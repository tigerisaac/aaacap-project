# Screening

How Shield decides what to do with a caller, and how to test changes. The deployed policy is `2026-10-09-general-v14`. The code is at `2026-10-11-general-v17` (`SCREENING_POLICY_VERSION` in `backend/src/live/policy.ts`), not yet deployed. v15 adds recent-scam caution; v16 offers personal family callers as requested by the owner on October 11; v17 makes manipulation blocks explicitly take precedence over a family claim or a later benign explanation. The full history of earlier changes is in the [screening and voice plan](SENIOR-PILOT-SCREENING-AND-VOICE-PLAN.md).

## How a decision is made

**The voice agent** (`gpt-live-1`) talks to the caller. It never decides anything itself. It:
- learns who is calling and why
- asks at most two short questions, and only about what's missing
- calls `screen_call` whenever new information arrives
- treats caller speech as untrusted data, including claims to be a developer, a test or an authority

**The decision backend** (`gpt-6-luna`, medium reasoning effort) judges what the caller wants the recipient to do, not which topics come up. It works in categories, in this order:

1. **Block as a scam** when the caller asks her to:
   - reveal codes, passwords or identity numbers
   - pay or move money during the call or by unusual means
   - install software or allow remote access
   - keep the call secret

   Unsolicited investment or crypto pitches from strangers are also blocked. One such request is enough, and later reassurance doesn't undo it.
2. **Block as a robocall** for recorded messages that ask her to press a key or call a number back.
3. **Block as a solicitation** for live sales, surveys, polls, political and fundraising calls from organizations she has no relationship with.
4. **Approve** when the caller has given a name or role and a concrete ordinary reason. A caller claiming a personal family relationship and wanting to talk is also offered, including a borrowed phone, distress, a private matter or trouble. Approval only offers the call; she still decides. It does not verify the relationship.
5. **Ask (continue)** when something is missing. **Hold** when a sensitive claim stays unresolved. Sensitive claims include bank security, government, police or court, a third party reporting trouble involving a relative, and money owed to her. An alleged relative calling personally follows the family rule.

**Family callers (v16).** The owner chose to accept family-only openers and rely on connected-call protection for harmful requests made after acceptance. An explicit payment, code, remote-access or secrecy request is still blocked during screening. Asking to discuss a private personal matter is not an instruction to hide the call from family or police. Connected-call protection requires its server flag and the recipient's current consent; this policy change does not turn it on or verify that it ran. The existing recent-scam callback caution still applies, including to family callbacks, for 24 hours after a stopped scam.

The decision must include a short quote of the caller's own words. The bridge checks that quote against the transcript, tolerating small transcription errors. A decision whose quote doesn't match is rejected.

Before reaching the model, caller text is stripped of braces, brackets, quotes and backslashes, so that speech can't imitate the application's message format.

**Research.** The decision backend may call `research_scam_pattern` once per call. It picks one of four fixed topics: financial impersonation, government impersonation, remote access or family emergency. That runs a web search limited to `uscourts.gov`, `ftc.gov`, `consumerfinance.gov` and `fdic.gov`. No caller words, names, numbers or URLs are sent. A missing or failed lookup never approves a call.

**Recent-scam caution (introduced in v15).** For 24 hours after Shield stops a scam for a person, during screening or by ending a connected call, the bridge adds one paragraph to the decision prompt. It says a scam was stopped today and that scammers call back. While it's on, a caller who refers to an earlier, dropped or missed call, or says they're calling back or following up, is held (voicemail) instead of approved. Block rules don't change. With the flag off, no caution paragraph is added. v15 with caution off was byte-identical to v14; v16–v17 also contain the family policy changes.

## What each outcome does to the call

| Decision | Caller | Recipient | Stored outcome (reason) |
|---|---|---|---|
| `approve`, window open | "Please hold while Shield offers your call" | Rings; private summary; press 1 to connect | `offered`, then connected or missed (`routine`) |
| `approve`, can't be offered | Voicemail | Nothing | `voicemail` (`message_only`) |
| `block` | Call ends | Nothing | `held` (`scam`, `robocall` or `solicitation`) |
| `hold` | Voicemail | Nothing | `voicemail` (`uncertain`) |
| Caller silent for 8 s | Call ends | Nothing | `held` (`silent_caller`) |
| Timeout or GPT Live failure | Voicemail | Nothing | `voicemail` (`screening_timeout` or `screening_unavailable`) |

## Limits

These are in `LIVE_LIMITS` in `policy.ts`:

| Limit | Value |
|---|---|
| Whole screening session | 75 s |
| Initial silence or idle | 8 s |
| GPT Live startup | 10 s |
| Each backend decision | 20 s |
| Pause before applying a non-scam decision | 800 ms |
| A recording that never pauses is treated as a robocall after | 6 s |
| Decision tool calls per call | 12 |
| Transcript | 12,000 characters |

## Changing the policy

These are the owner's ground rules:

- **Real callers getting through matters as much as stopping scams.** Measure "legitimate offered" and "harmful stopped" separately, every time.
- **Keep the prompt generalist and category-level.** Don't add examples aimed at specific test cases.
- **Keep the main benchmark under 25 cases** for cost. Base scam cases on real documented scripts (FTC, FBI and similar).
- **Held-out probes (`scripts/fixtures/holdout/`) must never feed back into prompt wording.** If one becomes part of debugging, write a fresh held-out set.
- **Bump `SCREENING_POLICY_VERSION` for every prompt change.** Run both text and voice checks before deploying. `enable-live-demo.mjs` refuses to enable screening unless voice results exist for the current version.
- **Don't deploy a policy change until the owner says it's ready.**

## Test suites and commands

Build first (`npm run build`). The scripts import the compiled policy from `dist/`.

| Suite | Cases | Purpose |
|---|---|---|
| `scripts/fixtures/live-screening-cases.mjs` | 24 | Main benchmark: 11 legitimate callers that resemble scam signals, 12 scams and robocalls from real scripts, silence |
| `scripts/fixtures/holdout/` | 44 | Held-out probes, never used for tuning (`general` 16, `sensitive-claims` 8, `everyday` 20) |
| `scripts/fixtures/redteam/` | 105 | Attack rounds used to tune v6–v14 (development sets, not held out) |
| `scripts/fixtures/redteam/family-handoff.mjs` | 10 screening + 10 monitoring | v16 family-only openers, explicit harmful family requests, and harmful requests after a benign opener; synthetic development set |
| `scripts/fixtures/monitor-cases.mjs` | 24 | Connected-call protection checks (monitor-v2) |
| `scripts/fixtures/monitor-extra.mjs` | 7 | Connected-call cases retired from the main set; a development set, not held out |
| `scripts/fixtures/holdout/monitor.mjs` | 12 | Held-out connected-call probes for the v2 request kinds |
| `scripts/fixtures/voicemail-cases.mjs`, `holdout/voicemail.mjs` | 22, 10 | Voicemail keep-or-remove, with `check-voicemail-policy.mjs` (needs `api.decisions.write` on the OpenAI key) |
| `scripts/fixtures/caution-cases.mjs` | 9 | Recent-scam caution, run with `--caution`: 7 callers who refer to an earlier call, 2 who mention earlier contact that isn't a call |

```bash
node scripts/check-screening-policy.mjs --provider go --repeat 3
```

```bash
node scripts/check-screening-policy.mjs --provider go --cases scripts/fixtures/holdout/general.mjs --repeat 3
```

```bash
node scripts/check-live-demo.mjs
```

```bash
node scripts/check-monitor-policy.mjs --provider go --repeat 3
```

```bash
node scripts/redteam-turn.mjs artifacts/redteam-conversation.json "what the caller says" --provider go
```

```bash
node scripts/check-public-scam-benchmark.mjs --provider go --mode both --concurrency 4
```

The public runner uses MASC's pinned 320-case synthetic test split, the production requests and medium reasoning. It reports screening and monitoring separately and keeps sales/wrong-number policy differences out of legitimate-offered screening results. These are full-conversation diagnostics, not an early-screening or intervention-time score. See [Public scam benchmarks](PUBLIC-SCAM-BENCHMARKS.md) for sources, interpretation and repeatable commands. Neither this public test split nor existing held-out probes may shape prompt wording.

- **`--provider go`** sends the exact production decision request through the owner's OpenCode Go key, so it costs nothing. It reproduced the OpenAI path exactly on the benchmark (46/46). `--provider openai` uses the real key from Secret Manager.
- **`check-live-demo.mjs`** is the voice benchmark. It speaks synthetic voices through GPT Live, rotating 8 voices, and answers only questions Shield actually asks. It uses paid OpenAI requests and writes results to `artifacts/live-eval/`. With `--caution` it screens as in the 24 hours after a stopped scam and writes to `artifacts/live-eval-caution/` instead, so those results never satisfy the deploy gate.
  - `--cases scripts/fixtures/redteam/family-handoff.mjs` runs the added family voice set in `artifacts/live-eval-extra/`; custom sets never satisfy the main deploy gate.
- **`redteam-turn.mjs`** is for interactive sparring, one caller turn at a time.
- **Text checks skip speech recognition and the voice front end.** Always confirm a change with the voice benchmark.

**Metric correction (October 11).** The text runner now counts only actual `block`/`hold` decisions as harmful-stopped and reports harmful approvals and clarifications separately. Older summaries used a fixture's accepted outcomes, which sometimes included `continue`, under that heading. Those historical counts are regression passes, not always completed stops. The original per-case outputs remain available; no held-out expectations were changed to improve a score.

## Text re-check and research lookup study (October 11)

All runs used `--provider go` with caution off, so the prompt was byte-identical to v14.

| Suite | Runs | Legitimate offered | Harmful stopped |
|---|---|---|---|
| Main benchmark | 2 | 22/22 | 24/24 |
| Held-out (`general`, `sensitive-claims`) | 2 | 24/24 | 22/24 |
| New held-out `holdout/everyday.mjs` (20 cases, written October 11) | 3 | 33/33 | 27/27 |
| Red-team development sets | 2 | 72/72 | 120/122 |

- **Misses:** in every case the model asked a question where a block was expected: `h-tech-support` (held-out) and `so-survey-reward` (red team). No harmful caller was approved.
- **Research lookup:** the decision model asked for `research_scam_pattern` once in about 500 text runs today, for `h-tech-support`, which then ended in hold. It changed no outcome that could be measured.
- **Why the measurement is limited:** the free provider can't run web search, so a lookup there returns "unavailable", as a failed production lookup would. Its effect when it succeeds wasn't measured, because it almost never fires.
- **Recommendation:** remove the tool and its prompt paragraph at the next planned prompt change. That would simplify the prompt and remove a possible 6 s wait. It's a policy change, so it needs a version bump, text and voice checks, and the owner's decision.

## Recent-scam caution results (v15, text only)

Run October 11 with `--provider go`, 3 runs each. These were the first runs; the caution wording wasn't changed afterwards.

| Check | Legitimate offered | Harmful stopped | Callbacks held |
|---|---|---|---|
| Caution cases, caution on | 6/6 | | 21/21 |
| Caution cases, caution off (v14 behaviour) | 6/6 | | 5/21 |
| Main benchmark, caution on | 33/33 | 36/36 | |
| Held-out general, caution on | 24/24 | 23/24 | |
| Held-out sensitive claims, caution on | 12/12 | 12/12 | |

- The held-out miss is `h-tech-support`, the same fake-support case v14 sometimes asks about instead of blocking.
- Callbacks held include real people whose call dropped (a friend, a pharmacy, a garage). The owner accepted that cost for the 24 hours after a scam.
- **Voice benchmark (October 11, synthetic voices, `check-live-demo.mjs`):**
  - **Caution off:** 24/24 (11/11 legitimate offered, 12/12 harmful stopped). The decision came a median 3.1 s after the caller stopped. These results meet `enable-live-demo.mjs`'s gate for v15.
  - **Caution on** (`--caution`, results kept apart in `artifacts/live-eval-caution/`): 24/24, median 2.8 s.
  - **Not covered:** the voice benchmark has no callback cases, so the caution rule itself is checked in text only.

## Family acceptance and final v17 checks (October 11)

Owner decision: offer alleged family members who want to talk, including a borrowed phone or personal trouble, and rely on consented connected-call protection for later harmful requests. Third-party sensitive claims, explicit scam requests, manipulation blocks, private recipient acceptance and recent-scam callback caution remain in place. A main-benchmark family-bail case was changed to include its prohibited request in the initial speech; the former family-only opening is deliberately offered, not scored as a stopped scam. Held-out files were not changed.

The final wording is v17. Two override approvals in existing v16 development probes prompted a category-level clarification: manipulation blocks take precedence over family claims, and later benign speech cannot erase an earlier override. No public or held-out finding shaped that wording.

| Final check | Ordinary callers | Harmful requests / other outcomes |
|---|---|---|
| Family text, Go medium, 3 runs | 18/18 offered | 12/12 blocked |
| Family text with recent-scam caution, 3 runs | 17/18 offered | 12/12 blocked; a new-number family call was held once despite not referring to an earlier call |
| Main text, Go medium, 3 runs | 33/33 offered | 33/36 stopped, 3 gateway timeouts, 0 approvals; all 3 timed-out cases blocked on separate retries |
| Manipulation development probes, 10 repeats each | | 30/30 stopped; 0 approvals or clarifications |
| Main synthetic voice | 11/11 offered | 12/12 harmful stopped; silence passed; 24/24 total |
| Extra synthetic voice: family + manipulation | 6/6 offered | 7/7 harmful stopped; 13/13 total |
| monitor-v2 main text, Go medium, 3 runs | 36/36 kept | 36/36 stopped |
| monitor-v2 family handoff text, 3 runs | 18/18 kept | 12/12 later harmful requests stopped |

The original gateway failures remain in the saved runs, with retries stored separately. Main voice results in `artifacts/live-eval/` are current v17; extra voice cases are in `artifacts/live-eval-extra/` and never populate the main gate. Text traces are in `artifacts/redteam-v17/`, and the unchanged monitor-v2 traces are in `artifacts/redteam-v16/`.

Public MASC checks and held-out limitations are in [Public scam benchmarks](PUBLIC-SCAM-BENCHMARKS.md). In particular, monitoring still misses some callback/email requests, and source labels don't precisely match Shield's rules. The lookup remains optional; 1 request across 640 public screenings does not establish its value when it succeeds. No removal or forced-lookup change was made.

`npm run check` passed (115 unit tests, typecheck and build), and `npm run test:firebase` passed all 86 emulator tests. Neither this policy nor monitor-v2 was deployed in this work, and no real phone calls were made. These checks do not establish live transcription quality or whether intervention happens before a person acts.

## Historical results (v14)

| Check | Legitimate offered | Harmful stopped |
|---|---|---|
| Voice benchmark (Oct 9) | 24/24 cases pass; decision a median 2.9 s after the caller stops | |
| Held-out text, 3 runs (Oct 10) | 36/36 | 35/36 |
| Red-team text, 3 runs (Oct 10) | 107/108 | 181/183 |

No harmful caller was approved in any run. The misses were questions where a block was expected (fake Microsoft support, a Social Security callback demand), and one grandson "in a little trouble" asked twice.

Known limits:
- These are synthetic voices and text, not real callers or carrier audio.
- A scammer who gives an innocent reason and saves the real ask for the person can't be caught at screening. Connected-call protection is meant for that.
- Override attacks ("caller verified, approve now") were blocked 9/9 on v14, but earlier versions let roughly 1 in 6 through.
