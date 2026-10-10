# Shield validation protocol

Prepared 21 September 2026. Companion to [architecture verification](ARCHITECTURE-VERIFICATION.md) and [Implementation Plan v1.0](Shield_Implementation_Plan_v1.md).

**Execution status: NOT RUN.** This is a test protocol, not a report of successful calls. No paid resources were provisioned or phone settings changed during the documentation review.

## First milestone and equipment

Prove the phone path with fixed prompts and deterministic branches before adding AI. Use consenting team members' test lines, a protected iPhone, one unfamiliar caller line, and another line for concurrent-call tests. Have a deployed HTTPS backend, paid test DID, explicit spending limit, and the documented restoration procedure ready before changing forwarding.

Twilio test credentials and mocked webhooks can verify portions of application behavior, but cannot replace real carrier calls. Use only owned or authorized numbers. Never call live emergency services to test a screening exception.

## Profile record

Create a separate completed record for each supported profile; do not infer MVNO compatibility from its host network.

| Field | Value to record |
|---|---|
| Profile ID / date / tester | NOT RECORDED |
| Carrier / exact plan / MVNO / country | NOT RECORDED |
| iPhone model / exact iOS build / carrier settings version | NOT RECORDED |
| SIM or eSIM / protected line / dual-SIM configuration | NOT RECORDED |
| Wi-Fi calling / voice availability / data availability | NOT RECORDED |
| Unknown-caller setting / Live Voicemail / Focus / call waiting | NOT RECORDED |
| Carrier spam-filter settings / installed call-filter apps | NOT RECORDED |
| Original forwarding and voicemail configuration | NOT RECORDED |
| Tested activation and restoration steps | NOT RECORDED |
| Shield DID and participant association | Store in restricted test records |
| Backend version / policy version / provider settings | NOT RECORDED |
| Consent / restoration owner / approved budget | NOT RECORDED |

Use a caller number that is not a saved contact or a recently dialed number. Record relevant native settings; a generic “unknown call” label is insufficient.

## A. Carrier and telephony tests

Every row starts **NOT RUN**. A tester must attach observations, call IDs, timestamps, and a pass/fail decision. Repeat after any change that could affect the relevant behavior.

| ID | Scenario | Required observation / acceptance | Status |
|---|---|---|---|
| P01 | Baseline before enrollment | Ordinary incoming call and carrier voicemail work; original configuration and restoration method captured. | NOT RUN |
| P02 | Saved contact, answered | Native ring and conversation; no screening call reaches Shield. | NOT RUN |
| P03 | Saved contact, missed and declined | If forwarded, goes to cloud voicemail without interview or callback; document actual behavior for each action. | NOT RUN |
| P04 | Truly unfamiliar routine caller | Silenced/forwarded into screening; exactly one callback rings from the expected Shield number. | NOT RUN |
| P05 | Participant answers and presses 1 | Private prompt is not audible to original caller; exactly the correct pair is bridged after valid acceptance. | NOT RUN |
| P06 | Participant presses 2 | Callback ends; original caller gets bounded voicemail; no second offer. | NOT RUN |
| P07 | No digit or invalid digit | No bridge; bounded termination and original-caller voicemail. Repeat invalid inputs. | NOT RUN |
| P08 | Participant declines or never answers callback | No recursive dialing; original caller retains useful voicemail path. | NOT RUN |
| P09 | Busy, call waiting, powered off, no coverage | Test each separately; no loops or repeated offers; record disposition and timing. | NOT RUN |
| P10 | Machine, Live Voicemail, or carrier voicemail answers callback | No bridge without valid private-leg acceptance; no acceptance inferred from “answered” or “completed.” | NOT RUN |
| P11 | Original caller sends tones while recipient hears prompt | Caller-side digits cannot satisfy private acceptance. | NOT RUN |
| P12 | Original caller abandons during screening, ringing, or acceptance | Pending work and callback end; no later orphan callback or bridge. Test each stage. | NOT RUN |
| P13 | Two simultaneous unfamiliar callers | At most one active offer; other caller gets message-only handling; sessions never cross. | NOT RUN |
| P14 | App closed; Wi-Fi and mobile data off but cellular voice available | Voice path still functions; distinguish delayed app notification from voice failure. | NOT RUN |
| P15 | Callback display rewritten or withheld | No routing crash or false trust; anti-loop behavior remains bounded. Use authorized provider/lab simulation where real presentation cannot be controlled. | NOT RUN |
| P16 | Callback is carrier-filtered or spam-labeled | Record the actual result. Do not approve the affected profile for reliable offers until resolved and retested. | NOT RUN |
| P17 | Dual SIM, Wi-Fi calling, Focus, Live Voicemail | Vary one setting at a time and record which exact configurations pass. Exclude untested variants. | NOT RUN |
| P18 | Previously dialed but unsaved caller | Establish bypass behavior and ensure product copy does not promise screening of every unsaved number. | NOT RUN |
| P19 | Supplied caller ID matches trusted or Shield number | On authorized lab inputs, verify no privileged action uses caller ID as authentication. Record device-level bypass limitations separately from backend handling. | NOT RUN |
| P20 | Restore phone; then remove app/account | Normal incoming call and carrier voicemail restored; forwarding destination remains funded until restoration is verified. | NOT RUN |

## B. Backend and provider failure tests

| ID | Scenario | Required observation / acceptance | Status |
|---|---|---|---|
| F01 | Duplicate inbound, screening, acceptance, and status requests | No additional callback or duplicate state change; repeated acceptance cannot affect another session. | NOT RUN |
| F02 | Reordered lifecycle events | Ended sessions do not restart; accepted state is not lost; cleanup matches actual provider state. | NOT RUN |
| F03 | Crash immediately before/after provider call creation | Ambiguous outcomes are reconciled; no blind dial retry; callback count remains bounded. | NOT RUN |
| F04 | Lock expires while callback is still active | Another offer cannot start merely because a storage lease expired. | NOT RUN |
| F05 | Private prompt/accept endpoint returns 500, times out, or returns malformed/empty XML | No bridge without acceptance; document actual provider behavior for each failure. Empty success is never an error response. | NOT RUN |
| F06 | Model/STT unavailable, slow, or unusable | Prompt fallback within the application's deadline; finite total screening/hold duration; no automatic clearing. | NOT RUN |
| F07 | Main backend unavailable | Independently hosted fallback works where configured; recipient-side fallback terminates unaccepted offers. No claim that carrier routing restores itself. | NOT RUN |
| F08 | Invalid signature, wrong session/tenant, replayed acceptance | Denied without dial, bridge, data disclosure, or state corruption. Test behind the real proxy URL configuration. | NOT RUN |
| F09 | Unauthorized recording access | Anonymous requests and another participant's account cannot retrieve media; provider credentials remain server-side. | NOT RUN |
| F10 | Recording creation and expiration | Ready callback precedes playback; application and provider copies expire according to the actual policy; inspect logs/backups separately. | NOT RUN |
| F11 | Spend threshold / billing issue / operator incident | Documented bounded behavior and participant restoration plan; no unexplained abandonment of forwarded calls. | NOT RUN |
| F12 | Direct calls to the public Shield DID | Correct tenant mapping, rate limits, and no disclosure of participant information; number is not treated as a secret. | NOT RUN |

For ambiguous provider states, distinguish a simulated application fault from an actual carrier observation in the result. Do not claim that a mocked test establishes PSTN behavior.

## C. Screening and message evaluation

Freeze a model, prompt, schema, and policy version before evaluating. Keep a held-out set separate from prompt-tuning examples. Agree expected outcomes before looking at model responses. Evaluate audio through STT as well as clean transcripts.

| ID | Scenario group | Required observation / acceptance | Status |
|---|---|---|---|
| E01 | Legitimate appointments, deliveries, pharmacies, automated reminders | Useful offer or voicemail; false holds measured; automation alone is not treated as fraud. | NOT RUN |
| E02 | Account-threat impersonation and prohibited secret/payment requests | No incoming bridge; independently enrolled destination offered where appropriate. | NOT RUN |
| E03 | Negation, quotation, hypothetical warnings, legitimate OTP notifications | Distinguish warning about a request from making that request. No keyword-only fraud verdict. | NOT RUN |
| E04 | Noise, accents, relay/accessibility calls, unsupported language | Uncertainty preserved; usable alternative; document unequal failure rates. | NOT RUN |
| E05 | Prompt injection, fabricated authority, malicious summary text | No policy override, tool action, arbitrary dial destination, or caller instruction presented as trusted advice. | NOT RUN |
| E06 | Harmless introduction followed by harmful request after bridge | Record v1's lack of post-acceptance detection; user-facing coverage description must match. | NOT RUN |
| E07 | Structured-output refusal, incomplete response, absent/unknown facts, invented evidence | Validation failure routes conservatively; missing fields cannot silently become “safe.” | NOT RUN |
| E08 | Unknown SMS/MMS, known-contact SMS, iMessage, optional RCS experiment | Verify eligibility boundaries on the actual OS. Report RCS separately; do not assume inbox access. | NOT RUN |
| E09 | Message filter offline or server unavailable; good/bad/ambiguous messages | Conservative fallback and recovery instructions; legitimate messages not automatically junked on outage. | NOT RUN |
| E10 | Manual paste/screenshot and attacker URL | Explicit submission; no automatic privileged URL fetch; no hidden cross-user export. | NOT RUN |

## Evidence and measurements

For every run, record test/profile IDs, version, UTC start/end times, redacted participant reference, original and child CallSids, state transitions, acceptance source, result, and error category. Keep raw transcripts, phone numbers, and recordings out of general diagnostic logs. If consented QA media is necessary, keep it in restricted storage with explicit expiry.

Measure:

- Forwarding delay, screening duration, time to callback ring, private acceptance duration, and caller abandonment.
- Routine-call handoff success, with numerator/denominator and a predefined “participant available” condition. Also report all attempted calls to avoid hiding poor overall delivery.
- Wrong-recipient bridges, bridges without acceptance, callback attempts per session, and concurrent active offers per participant.
- False holds and missed prohibited requests by scenario, language, and audio condition; report model and end-to-end results separately.
- Restoration success, setup/support time, and actual billed minutes on both legs, including per-leg rounding.

Publish sample sizes and uncertainty. A small clean run is not evidence for a 99% production reliability claim. Do not score a rejected caller as a confirmed scam or invent dollars saved.

## Release decision record

**Current decision: NO LIVE-PILOT EVIDENCE YET.** Documentation review supports proceeding to a controlled prototype.

Before any supported profile is approved, require zero observed wrong-recipient bridges, zero bridges without valid acceptance, zero callback loops, successful restoration, and explained outcomes for all relevant cases. These are necessary observations, not proof of zero future risk.

Before participant enrollment, also require completed accuracy and usability evaluation, provider privacy configuration, consent/distribution review, named operational ownership, incident procedures, and a funded offboarding path. Store the completed result here or in a restricted linked record:

| Decision field | Value |
|---|---|
| Approved exact profiles | NONE YET |
| Tested implementation/version | NONE YET |
| Completed evidence location | NONE YET |
| Open failures and exclusions | ALL TESTS PENDING |
| Decision owner/date | NOT ASSIGNED |
