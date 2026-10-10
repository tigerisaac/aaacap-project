# Shield — Implementation Plan v1.0

**Design baseline:** 21 September 2026  
**Platform:** iOS first; Android follows a separate validation gate.  
**Status:** Implementation specification, not a deployed or carrier-certified service. No live call tests have been performed as part of preparing this document.  
**Branding:** “Shield” is a working name. AAACAP/CAPCOG sponsorship, use of its name, access to clients, and a pilot have not been authorized.

## 1. The decision

Build an iPhone companion app plus a cloud call-screening and replacement-voicemail service. Keep the participant's existing public mobile number, carrier subscription, native Phone app, and Messages app. Use **conditional**, not unconditional, call forwarding. The first release does not carry calls through a VoIP app and does not require a carrier partnership, number port, or second SIM.

On a validated carrier/device configuration, iPhone's unknown-caller **Silence** setting sends unfamiliar calls toward voicemail; conditional forwarding redirects that path to the participant's dedicated Shield number. A routine caller can then be offered to the participant through a new, ordinary cellular call from that saved Shield number. The participant hears a private summary and must press 1 before the original caller is connected.

This decision supersedes the earlier all-calls-forwarded/VoIP design.

### Evidence boundary

Apple documents unknown-caller silencing. A commercial screening service documents conditional forwarding plus this setting. Twilio documents the private called-party prompt and keypad decision. Those are documented building blocks, not proof that our assembled service works on every carrier or current iOS release. The exact combination is an engineering validation gate. [S1–S4]

**Release promise:** Reduce exposure to selected unfamiliar calls, apply conservative routing policies, and make independent verification easier.

**Not a release promise:** Authenticate every caller, intercept every scam, protect all communications, or prevent all financial loss. A caller may lie in the initial screening and become dangerous after connection. v1 does not monitor the subsequent conversation.

## 2. Scope and architecture

```text
CALL TO EXISTING MOBILE NUMBER
              |
      iPhone/carrier routing
       /                 
Normally allowed       Silenced unfamiliar call
and answered call      or any missed/busy/unreachable call
       |                          |
Native cellular          Conditional forwarding
conversation                     |
                         Participant's Shield DID
                                  |
                         Signed inbound webhook
                                  |
                     Existing-call / loop protection
                                  |
                       Trusted-number match?
                         /                
                       Yes                 No
                        |                   |
                 Cloud voicemail      Brief screening
                                            |
                                      Policy engine
                         /------------------|----------------\
                    Offer call       Independent         Message-only /
                        |             verification        refuse connection
                 Native callback
                 FROM Shield DID
                        |
                 Private summary
                 Press 1 to accept
                        |
                 Bridge original caller
```

A DID is simply a cloud telephone number. Allocate one per participant. Use its destination number to select the participant record. Do not depend on `ForwardedFrom`, which Twilio documents as carrier-dependent. A dedicated number is routing infrastructure, not a secret or authentication factor. [S8]

### What stays native

The public number and SIM stay with the existing carrier. Outgoing calls continue through Phone. Native texting stays in Messages. Forwarding is a voice setting, not an SMS-forwarding mechanism. [S14]

### What changes

Unfamiliar callers may have to state their purpose and wait for a callback handoff. Shield becomes the replacement voicemail destination for the configured conditional-forwarding modes. Cloud voicemail requires its own app or authenticated phone playback; do not promise integration into carrier Visual Voicemail.

**Unknown-only screening is not unknown-only transport.** A missed call from a saved contact can reach Shield too. To avoid screening those missed calls, maintain a consented trusted-number list and send matches directly to voicemail, without another callback. Incomplete or stale synchronization means perfect agreement with the iPhone's contact list cannot be promised.

## 3. Product rules

Use “screened call” or “identity not verified,” never “verified caller,” “safe person,” or a green check that implies authentication.

The participant's saved contact should read **Shield — screened call**. Do not label it as an official AAACAP service without approval. That contact helps the callback ring; it is not proof that an incoming call actually came from Shield.

| Component | Included in v1 | Explicitly outside v1 |
|---|---|---|
| Voice | Brief screening, policy routing, native callback, private acceptance, voicemail | Continuous monitoring; conversational agent; voice-clone detection |
| Verification | User-initiated call to an independently enrolled institution number | Calling a number supplied by the suspicious caller or invented by a model |
| iPhone | Enrollment, contacts consent, history, voicemail, manual checking, restore-phone flow | Replacement dialer or VoIP calling app |
| Messaging | Eligible unknown SMS/MMS classification, separately enabled | Reading iMessage or the entire inbox; automatic caregiver copies |
| Support | Opt-in trusted contact; clearly labeled recovery information | Implying that AAACAP or a caregiver monitors alerts continuously |
| Future | Android after its own tests | Carrier integration, number porting, second eSIM, regional surveillance dashboard |

## 4. Exact call behavior

### A. Saved person calls and is answered

The normal phone rings and the conversation remains outside Shield. Do not upload or process the audio. Device Focus, blocking, reachability, and other native settings still apply.

### B. Saved person calls but is not answered

Conditional forwarding can send the call to Shield. A match in the synchronized trusted-number list sends it straight to voicemail. No AI interview and no immediate callback. This avoids re-ringing a call the participant just missed or declined.

Contacts permission must be explained. For the pilot, store only necessary normalized telephone numbers, not contact notes or the entire address book. Clearly distinguish complete, selected, and stale lists. A selected-list mode is acceptable only if the participant understands that other missed callers may be screened.

### C. An unfamiliar caller arrives

After the loop checks, play a fixed introduction such as:

> “This is an automated call-screening service. Your response will be transcribed and analyzed. Please state your name, who you represent, and why you are calling. Do not provide passwords, security codes, or account numbers.”

The exact consent language requires review before deployment. Give a message-only alternative. Do not demand financial or medical identifiers to prove legitimacy.

Use Twilio `<Gather input="speech">` for the response and `<Say>` or approved prerecorded prompts for speech output. The backend receives the transcript, extracts a bounded JSON object, and applies code-based policy. Permit at most one scripted clarification. Twilio's speech-confidence field may be missing and is not an identity or fraud-confidence score. [S5]

### D. A routine call is offered

The original caller remains on the line. The service creates a second call to the participant's existing mobile number using the participant's Shield DID as caller ID. Conditional forwarding does not redirect every incoming call, so a recognized callback can ring normally on a validated profile.

After the participant answers, a private prompt says:

> “An unfamiliar caller says they are from Oak Hill Pharmacy about a prescription. Their identity has not been independently verified. Press 1 to speak with them, or 2 to take a message.”

Twilio's `<Number url>` runs instructions on the called leg before connection; `<Gather>` and `<Hangup>` support acceptance or refusal. [S4]

Acceptance must be tied to the particular callback leg and current session. Silence, an answering machine, an invalid digit, a timeout, or a failed state check must not connect the original caller. Original-caller tones must not satisfy the private acceptance gate.

After acceptance, Shield stops AI analysis. The call still traverses the telephony provider, but no conversational recording or media stream is intentionally enabled by this application.

### E. Sensitive institution claim

A caller claiming a bank-account problem is not authenticated by answering screening questions. End the incoming conversation without connecting it. Present an independently verified contact option in the companion app.

The first release should use a native phone-call action to a number enrolled from the participant's card, statement, or another independently checked source. Do not route the bank conversation through the language model. Do not ask for account or card numbers to populate the directory. This implements the FTC's independent-contact guidance rather than attempting to verify an incoming story. [S15]

A claimed bank or government affiliation alone is not evidence of fraud. The label is “independent verification required,” not “confirmed scam.”

### F. Suspected fraud, uncertainty, or technical failure

Never offer a live connection when the extraction contains a relevant prohibited request, when the result cannot be validated, or when the model misses its deadline. Preserve a minimal event and, where appropriate, offer bounded voicemail. Keep ambiguous legitimate callers distinguishable from high-risk requests. Do not silently erase everything the model dislikes.

## 5. Screening policy and model contract

### Extract observations, not a verdict

Use a single structured-output-capable model behind an internal interface. Select the particular model after a held-out evaluation and vendor/privacy review; its name is configuration, not part of the telephony architecture. Pin the approved model, prompt, and policy versions for each release.

Example contract:

```json
{
  "claimed_person": "Taylor",
  "claimed_organization": "Example Bank",
  "purpose": "unexpected account-security issue",
  "requested_actions": [
    {"type": "share_authentication_code", "evidence": "read back the code"}
  ],
  "institution_account_or_money_issue": true,
  "family_emergency_with_money_request": false,
  "uncertainty": [],
  "identity_status": "unverified"
}
```

Each detected behavior needs supporting transcript text. `false`, absent, and unknown are different. Schema errors are failures, not a reason to infer a safe default. The model has no tools, dial privileges, trusted-contact write access, or authority to change policy.

### Initial deterministic policy

| Observed context | Routing decision |
|---|---|
| Routine appointment, delivery, or prescription notification, without sensitive requests | Eligible for private acceptance, identity unverified |
| Bank/government/utility claim involving account access, an urgent financial issue, or payment | Independent verification; no incoming bridge |
| Request for a secret login code, password, PIN, remote device control, moving money to “protect” it, or a coercive gift-card/cryptocurrency/cash-courier payment demand | No incoming bridge; risk explanation and help option |
| Family emergency involving money or secrecy | Independently contact the enrolled relative/trusted person |
| Unclear audio, unsupported language, contradictory story, model error, or timeout | Message-only, not “safe” and not automatically “confirmed scam” |
| Matched trusted-number missed call | Voicemail without AI screening |

Rules operate on meaning and context, not isolated keywords. A doctor saying “never share your code” is not asking for a code. A legitimate appointment reminder is not a fraud attempt merely because it is automated. The perception layer remains fallible even when the final routing rules are deterministic.

### Optional expected-call window

If included after baseline testing, it only changes prioritization and wording. It never overrides prohibitions on sensitive requests or proves identity. Expire it automatically. Do not instruct a participant to disable all protection for an afternoon by default.

## 6. Backend implementation

### Suggested stack

Use one TypeScript backend with the maintained Twilio server SDK, one PostgreSQL database, a small job worker, managed identity, encrypted voicemail storage, and a minimal staff console. Use SwiftUI for the iOS companion. Keep business logic independent of the provider through a small internal adapter, but do not build multiple telephony integrations before the first works.

Choose an always-available managed HTTPS deployment for the pilot. Do not rely on a student laptop or temporary development tunnel after enrolling participants. Provider accounts, the domain, billing, secrets, backups, and support access need a named accountable owner.

### Minimum entities

| Entity | Required purpose |
|---|---|
| Participant | Public number, DID, enrollment state, validated profile, consent references |
| TrustedNumber | Normalized number, scope, consent, source, last synchronization |
| VerifiedDestination | Institution/relative, independently confirmed number, provenance, confirmation date |
| CallSession | Participant, original call ID, callback call ID, parent relationship, state, acceptance, deadlines |
| ScreeningResult | Structured observations, rule IDs, model/policy versions, short retention deadline |
| Voicemail | Participant, protected recording reference, duration, retention, access events |
| TrustedContactGrant | Explicit recipient, permissions, consent and revocation timestamps |
| CarrierProfile | Carrier/plan, OS/device, settings, activation and restoration steps, test evidence |
| HealthCheck | Type of end-to-end test, device/profile, pass/fail, timestamp, failure detail |
| AuditEvent | Minimal configuration, access, and incident event; no secrets or full message bodies |

### Endpoint responsibilities

| Route | Responsibility |
|---|---|
| `POST /voice/inbound` | Validate provider request; map DID; create/reuse session; guard loops; choose voicemail or screening |
| `POST /voice/screening-result` | Receive speech result; validate session; run bounded extraction/policy; return next instructions |
| `POST /voice/whisper` | Bind the outbound leg; return private prompt and keypad collection |
| `POST /voice/accept` | Verify exact callback/session; explicitly mark accept or decline; prevent fall-through |
| `POST /voice/dial-complete` | Resolve child outcome; send original caller to voicemail unless a real accepted conversation occurred |
| `POST /voice/status` | Idempotent handling of original/child lifecycle and cleanup |
| `POST /voice/voicemail` | Consent-reviewed prompt, bounded recording and explicit recording action |
| `POST /voice/recording-ready` | Register a protected recording, retention deadline, and notification |
| `POST /sms/classify` | Stateless Apple network-deferral classification, with separate abuse/privacy controls |
| Authenticated app API | Enrollment, grants, directory, voicemail access, manual checks, health checks, restoration workflow |

Do not put trusted dial destinations or raw transcripts into externally supplied URL parameters. Generate opaque session identifiers server-side and validate every association.

### State machine

```text
RECEIVED
  -> KNOWN_MISSED -> VOICEMAIL -> ENDED
  -> LOOP_GUARD -> VOICEMAIL_OR_END -> ENDED
  -> SCREENING -> EVALUATING
       -> VERIFY_INDEPENDENTLY -> ENDED
       -> MESSAGE_ONLY -> VOICEMAIL -> ENDED
       -> REFUSE_CONNECTION -> ENDED
       -> OFFERING -> PRIVATE_ACCEPTANCE
            -> ACCEPTED -> BRIDGED -> ENDED
            -> DECLINED/TIMEOUT/FAILED -> VOICEMAIL -> ENDED
```

A session can have only one callback attempt. Persist decisions before performing dependent actions. Duplicate requests must not launch another outbound call. Events can arrive out of order; final cleanup must not overwrite a recorded acceptance or resurrect an ended call. [S4]

### Timing

Twilio imposes a 15-second hard limit on call-related HTTP requests. [S7] Give the model a shorter application deadline, initially 3–4 seconds after receiving the transcript, and return message-only behavior on failure. If work needs to be asynchronous, return valid hold instructions promptly and let a bounded worker select the next state.

Set a screening watchdog, initially a 45-second target and 60-second maximum before an offer or message-only outcome. These are proposed targets, not measured results. The overall inbound hold period also needs a finite budget. `<Gather timeout>` is not a substitute for a wall-clock session deadline.

## 7. Acceptance, loop, and abuse controls

**Callback recursion is a release-blocking risk.** A declined/unanswered callback may itself be conditionally forwarded back to Shield.

Required safeguards:

1. One attempted callback per original session; one pending callback per participant.
2. Re-entering calls displaying a Shield-origin number end immediately, rather than starting another callback or recording our own whisper. This is an anti-loop rule, not caller authentication.
3. While a callback is pending, any other new forwarded arrival for that participant is message-only. Hold a short, tested guard window after the attempt. This may send a simultaneous legitimate call to voicemail; prefer that to a loop.
4. Expiring locks and a watchdog prevent permanent suppression after a crash.
5. Track original and child call IDs. Never identify an accepted call using only the string `completed`.
6. Require a valid digit 1 from the bound private callback leg. Explicitly hang up that leg on every other outcome.
7. If the original caller leaves, cancel a ringing/pending callback and clean up.
8. After a failed callback, the original caller—not a recursively dialed replacement—gets voicemail.
9. Only server-stored enrolled numbers can be outbound destinations. Disable international/premium destinations initially and enforce per-session/per-user/account spending controls.

The private acceptance response must be designed carefully: successful completion of called-party instructions allows the parent dial operation to continue. Therefore an empty/no-op response must **never** be the default error path. Use an explicit `<Hangup>` for rejection, timeout, invalid state, and exceptions. Test accepted-only continuation on the live provider before release. [S4–S6]

Use Twilio's SDK to validate `X-Twilio-Signature` against the actual externally visible URL and request parameters. A signed webhook proves the request reached the application through the provider; it does not prove the human caller's identity. [S9]

Public telephone caller ID, including a saved family number or Shield's own display number, is not an authentication mechanism. Shield never asks an inbound recipient for a password, verification code, payment, or transfer. Sensitive actions are initiated from the participant's enrolled app or by a fresh call to a trusted saved number. If phone voicemail playback is added, require authentication; matching the participant's caller ID is insufficient.

## 8. iPhone onboarding and removal

### Enrollment sequence

First check a tested carrier/plan/OS/device profile. Unsupported profiles are not offered automatic voice interception. Their user can still use manual checking without changing forwarding.

A staff member or caregiver assists the first installation, with the participant's informed agreement. Establish account ownership and an authenticated device session. Allocate the DID. Save the Shield contact. Explain conditional forwarding, replacement voicemail, known-call exceptions, uncertainty, and how to undo the service.

Collect only the trusted phone numbers the participant consents to supply. Add an optional trusted person with limited permissions. Add independently verified institution numbers without collecting account or card details.

Set **Screen Unknown Callers → Silence**, not “Ask Reason for Calling.” For the initial test profile, disable Live Voicemail to avoid it answering instead of forwarding. The published vendor instruction supporting this conflict is for iOS 17; the exact current pilot version still needs direct validation. [S1, S2, S3]

Display the exact profile-specific conditional-forwarding instructions in large text. Do not embed another company's forwarding destination or use one universal code across carriers. Apple does not permit ordinary `tel:` links to dial strings containing `*` or `#`, so an app cannot silently perform this setup using such a link. [S10]

Run an end-to-end test from an unfamiliar number, a trusted-number test, a missed-call voicemail test, and a callback-decline test. Have the participant practice the private acceptance prompt. A successful setup is a measured result, not merely a tapped checkbox.

### Permissions and interface

The native-cellular voice path does not require the app's microphone, VoIP SDK, or foreground execution. Request notifications for useful status/history, contacts only for the explained trust-list feature, and photo access only when the user chooses a relevant manual-check path. A caregiver's permissions do not override the participant's choices by default.

Main actions:

- Check something: paste text or submit a selected screenshot/link.
- Saved institutions: initiate a native call to a previously verified destination.
- Voicemail and recent screening outcomes.
- I think I was scammed: reviewed instructions and human-support options.
- Setup status / Restore my phone.

Show separate voice and SMS states. Prefer **“Last call-routing test passed at [time]”** over a permanent **“Protection ON.”** The app cannot be assumed to observe every carrier change or external system setting.

### Removal is part of the product

Deleting the app is not enough to undo network forwarding. A commercial implementation expressly requires separate deactivation. [S13]

During onboarding, record the original voicemail/forwarding configuration and a validated restoration procedure. To leave the pilot, restore the carrier configuration and native screening preferences as agreed, verify an ordinary incoming call and carrier voicemail, then remove Shield-specific access and data according to policy. Do not release the DID while the user's calls still forward to it. Budget a funded restoration/grace period and operator help for incomplete removals. Do not assume a generic reset code restores every carrier's voicemail provisioning.

Changing carrier, SIM, or plan triggers revalidation. A remote “message-only” switch is not the same as restoring normal carrier routing. [S17]

## 9. Messaging and manual cross-channel checking

Add an IdentityLookup Message Filter extension as a separately tested module. Apple supports classification of eligible unknown SMS/MMS messages, not iMessage inspection or a complete inbox feed. Classification can defer to a server through the system's approved network-deferral mechanism; the extension is not a general background networking/export tool. [S11, S12]

For v1, make server classification stateless: sender/body in, classification out, minimal or no retained content. Do not assume the recipient's phone number, a containing-app session cookie, or a custom per-user identity is present. Do not build caregiver transcript export or a full synchronized inbox on top of this extension.

Use conservative classification. A legitimate login code or bank notification is not automatically phishing. Model failure should not become an automatic Junk verdict. Test the actual iOS behavior and provide instructions for recovering misclassified messages.

Do not advertise RCS coverage until the specific current API/OS behavior is confirmed in tests. Exclude iMessage from automatic coverage. For unsupported channels, offer explicit copy/paste, or screenshot sharing from a place where the host provides Share. Do not promise every Messages bubble or email app exposes the same extension action.

Manual checks should produce an explanation, uncertainty, and an independently safe next action. Do not automatically fetch attacker-provided URLs from privileged infrastructure; URL retrieval needs isolation, private-address blocking, limits, and a separate security review. v1 can assess the provided text/domain without visiting the link.

## 10. Privacy, consent, and operational responsibility

Before real participants, name the service operator, technical incident owner, support owner, billing owner, and privacy/legal reviewer. A student demo is not a staffed public safety service. AAACAP has not agreed to provide any of these roles.

Obtain legal review for transcription/recording consent across relevant jurisdictions, automated/artificial-voice callbacks, caregiver calls/notifications, consent withdrawal, public-agency contracting and records, and potentially sensitive health-related voicemail. Twilio warns that recording obligations depend on jurisdiction; FCC treatment of artificial voices also makes callback consent a real requirement to review, not an optional afterthought. [S16, S20]

Proposed data rules, subject to that review:

| Data | Proposed handling |
|---|---|
| Connected human conversation | No application recording, media streaming, or model analysis in v1 |
| Screening audio | Do not intentionally retain an audio recording |
| Screening transcript | Process transiently; redact before logs; no general retention; optional explicitly consented QA samples up to 24 hours |
| Structured screening event | Minimal fields for up to 30 days initially |
| Voicemail | Explicitly disclosed recording, authenticated access, proposed 30-day expiry |
| Contact numbers | Encrypted, limited to routing need; remove when consent/account ends |
| Institution directory | Numbers and provenance only, no financial credentials |
| Manual checks | User-submitted content only; no training by default; brief retention if any |

Provider-side logs, backups, abuse monitoring, and model retention are separate from our database policy. Confirm each vendor's settings and contract before promising deletion or “zero retention.” Never place transcripts, bank names, or medical detail in lock-screen notification previews by default.

Use managed identity, least privilege, auditable caregiver grants, tenant-isolated queries, encrypted storage, protected recording playback, and secret management. The model cannot change these controls. Contact access and a number-only dataset still involve personal data.

Recovery material should route participants to verified institution and human-help channels. Do not have the model improvise binding legal/financial advice, guarantee recovery, or claim emergency monitoring. Clearly disclose support hours and escalation limitations.

## 11. Failure and incident runbook

| Failure | Required behavior |
|---|---|
| STT or model is unclear/unavailable | Message-only; no “safe” verdict |
| Main application fails but telephony works | Independently deployed minimal fallback instructions/voicemail where feasible |
| Twilio/carrier cannot deliver the forwarded call | Treat as a service incident; do not claim automatic return to the original line |
| Participant declines, is busy, or cannot answer | No retry loop; original caller goes to voicemail |
| Phone has no data but ordinary cellular voice works | Callback path should still work; prove in test |
| Phone is unreachable | Voicemail; no repeated attempts |
| Callback is carrier-spam-labeled | Suspend enrollment on affected profile until resolved/tested |
| Original caller hangs up during an offer | Cancel pending callback |
| Contact list is incomplete/stale | Show degraded trust-list status; no perfect contacts-only claim |
| User changes SIM/carrier/phone | Revalidate before claiming routing health |
| App removed or account closes | Keep DID funded until routing restoration is verified |
| Privacy breach, wrong recipient, or uncontrolled dialing | Stop new live offers; preserve minimal incident evidence; contact operator; restore affected phones |

Known answered calls normally remain outside the cloud failure path. Unknown and missed calls do not have that protection once forwarded. There is no honest “always available” claim for this design.

Apple documents screening exceptions around roaming and a period after emergency calls. Do not assume the app can detect these states. Explain limitations and use approved testing/documentation; never dial live emergency services merely to test this product. [S1]

## 12. Validation matrix and go/no-go criteria

Use a controlled phone lab before enrolling anyone. At least one caller phone, one protected iPhone, a paid test DID, and a deployed HTTPS service are needed. Additional real carrier lines are needed for compatibility evidence. Test numbers must be owned or used with permission.

Start with the carrier represented by an available test phone; expand to AT&T, Verizon, T-Mobile, and the actual MVNOs used by prospective participants. Do not treat an MVNO as validated because its host network passed. Record exact carrier, plan, phone, OS, SIM configuration, Wi-Fi calling, forwarding settings, and date.

| Test | Acceptance requirement |
|---|---|
| Known call answered | Native ring/conversation; no screening |
| Known call missed | Cloud voicemail; no callback |
| Unknown routine call | Screen, ring participant once, private prompt, digit-1 bridge |
| Unknown bank-account claim | Independent verification, no inbound bridge |
| Sensitive-code request | No inbound bridge |
| Silence/unclear speech/unsupported language | Message-only, not automatic clearing |
| Legitimate automated pharmacy reminder | Preserved via useful routing/voicemail; not silently discarded |
| Senior presses 2 | Original caller reaches voicemail; callback ends |
| Senior presses nothing/invalid digit | No bridge |
| Machine or carrier voicemail answers callback | No bridge without valid private acceptance |
| Original caller sends tones during private prompt | Cannot satisfy the acceptance gate |
| Original caller hangs up during callback | Pending callback is canceled |
| Senior declines callback | No recursive dialing |
| Phone busy / call waiting / unreachable | Bounded behavior, useful voicemail, no loop |
| App closed and mobile data disabled | Voice behavior succeeds when native cellular voice is available |
| Two simultaneous callers | Per-participant guard; at most one pending callback |
| Duplicate or out-of-order webhooks | No repeated dial or incorrect session resurrection |
| Caller ID missing/rewritten | No crash, wrong-tenant routing, or trust assumption |
| Spoofed trusted or Shield number | No authentication based on caller ID; document bypass limitations |
| Model slow/down | Bounded fallback, no hung webhook |
| Main backend down | Fallback path tested, limitations documented |
| Dual SIM, Wi-Fi calling, Focus, Live Voicemail | Each supported configuration documented; otherwise excluded |
| Carrier flags Shield callback | Profile not approved until addressed |
| Legitimate relay/accessibility case | Useful alternative; no assumption silence equals maliciousness |
| Restoration/uninstall | Original incoming call and carrier voicemail verified; DID not released early |
| SMS good/bad/ambiguous/offline | Conservative results and recovery instructions |
| Cross-account recording access | Denied, logged; no publicly usable recording URLs |

Hard safety gates are **zero observed wrong-recipient bridges, zero observed loops, zero bridges without valid acceptance, and successful restoration** in the release test suite. A finite passing suite does not prove zero production risk; any such production incident stops expansion.

Measure routine-call delivery success, false holds, abandonment, screening delay, time to ring, onboarding time, support demand, and billed cost. An initial availability-controlled handoff target can be 99%, but it is a target to test—not an achieved result. Report sample sizes and conditions. Do not describe flagged attempts as proven scams or multiply them by speculative dollars “saved.”

## 13. Cost model

Published Twilio US rates reviewed on 21 September 2026 include a local DID at $1.15/month, local inbound at $0.0085/minute, and ordinary US/Canada outbound at $0.014/minute, with destination exceptions. Selected Gather speech providers are $0.025/use; provider-selected recognition is $0.02/use. Basic TTS is available without a separate speech-generation charge. Recording and storage are additional. [S18]

Illustrative **assumed billable** participant-month:

| Item | Assumption | Cost |
|---|---:|---:|
| Local DID | 1 | $1.15 |
| Inbound minutes, including screening and bridged time | 180 × $0.0085 | $1.53 |
| Outbound callback minutes | 100 × $0.014 | $1.40 |
| Speech recognition using selected-provider rate | 100 × $0.025 | $2.50 |
| **Telephony subtotal** | | **$6.58** |

This is not a complete service price. Add model use, voicemail recording/storage, hosting, taxes, notifications, test calls, billing increments, support, administration, developer accounts, test lines, legal/security work, and development. Carrier plans may also count forwarded minutes. [S14]

For ten participants with exactly this usage, the same subtotal is $65.80/month before those additions. Estimate the rest from measured pilot invoices and staffing, not a guessed $1/user promise. Add account alerts, abuse limits, and a budgeted voicemail fallback; a spend alarm must not silently disconnect participants.

## 14. Delivery sequence and ownership

The timeline below is a planning estimate for two or three developers with the needed accounts/devices. It is not a schedule commitment, and legal/agency/distribution approval may take longer.

| Phase | Planning window | Deliverable and gate |
|---|---|---|
| 0: Baseline and ownership | Before real-user changes | Repo, architecture, operator, paid provider account, test phones, draft consent, baseline carrier configuration |
| 1: Telephony proof, no AI | Week 1 | Fixed prompt, native callback, private acceptance, voicemail, loop guard, successful restoration on one exact profile |
| 2: Screening and verification | Week 2 | Structured extraction, policy tests, malicious-input tests, independent native callback destination |
| 3: Companion and enrollment | Week 3 | Assisted setup, trust-list consent, voicemail/history, grants, restoration, last-tested status |
| 4: Messaging and manual checks | Week 4 | SMS/MMS module and manual submission with explicit coverage limits |
| 5: Reliability and review | Weeks 5–6, or longer as needed | Multi-profile lab evidence, security/privacy review, incident drills, accessibility feedback, cost limits |
| 6: Limited pilot | Only after previous gates | Five to ten consenting volunteers, assisted setup, named support, daily review, two to four weeks of measured use |

Assign a telephony/backend owner, iOS/UX owner, and test/security/operations owner. One person may cover multiple roles, but no role can be left implicit. A responsible organization must own continued service and offboarding after the student project ends.

AAACAP outreach proceeds in parallel. Ask for de-identified scenarios, setup/consent feedback, and the appropriate approval pathway. Do not request client records or use agency branding in the prototype without permission. Agency response is not needed to test consenting team members' phones, but enrollment of AAACAP clients requires the relevant permission and review.

### Final deliverables

The release package consists of the backend and mobile source, deployment configuration, a versioned model/policy specification, validated carrier profiles, completed test records, onboarding and restoration materials, privacy/consent notices, an incident runbook, a cost report, and a controlled demonstration. A marketing video alone is not a release gate.

### First milestone

Prove this exact chain on a real, documented test profile:

```text
Unknown incoming call
 -> iPhone Silence
 -> conditional forwarding
 -> Shield DID
 -> fixed screening prompt
 -> one native cellular callback
 -> private prompt
 -> press 1
 -> original caller and participant speak
 -> restore ordinary carrier routing successfully
```

Also prove decline, no-answer, and voicemail paths without loops. If the chain fails on a profile, do not enroll that profile and do not silently replace the architecture with unconditional forwarding. Keep the demo on a dedicated test number while diagnosing the failure.

**Current report:** The design and implementation plan are complete as a baseline. Software deployment, live carrier validation, measured performance, vendor/account provisioning, legal review, and agency approval remain work to perform. No test result in this document should be read as already achieved.

---

## Sources reviewed

Primary documentation grounds supported features; proposed architecture, thresholds, timelines, retention choices, and acceptance gates are engineering recommendations. Vendor onboarding demonstrates a related method, not certification of this implementation. URLs are included for implementation review.

**S1. Apple — Manage unknown callers on iPhone.**  
`https://support.apple.com/en-us/111106`

**S2. Nomorobo — Activate Nomorobo Max on iPhone.**  
`https://nomorobo.zendesk.com/hc/en-us/articles/4423660425869-How-can-I-activate-Nomorobo-Max-on-my-iPhone`

**S3. Nomorobo — iOS 17 and Live Voicemail.** Historical version-specific setup guidance; retest the actual pilot OS.  
`https://nomorobo.zendesk.com/hc/en-us/articles/19084107152909-Does-Nomorobo-Max-work-with-iOS-17`

**S4. Twilio — TwiML Number: private called-party instructions and lifecycle events.**  
`https://www.twilio.com/docs/voice/twiml/number`

**S5. Twilio — TwiML Gather: speech, digits, timeouts and confidence.**  
`https://www.twilio.com/docs/voice/twiml/gather`

**S6. Twilio — TwiML Dial.**  
`https://www.twilio.com/docs/voice/twiml/dial`

**S7. Twilio — Webhook connection overrides and voice HTTP limit.**  
`https://www.twilio.com/docs/usage/webhooks/webhooks-connection-overrides`

**S8. Twilio — Call resource and forwarded-call metadata.**  
`https://www.twilio.com/docs/voice/api/call-resource`

**S9. Twilio — Request validation and security.**  
`https://www.twilio.com/docs/usage/security`

**S10. Apple — Phone Links and special-character restrictions.**  
`https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/PhoneLinks/PhoneLinks.html`

**S11. Apple — SMS and MMS Message Filtering.**  
`https://developer.apple.com/documentation/identitylookup/sms-and-mms-message-filtering`

**S12. Apple — IdentityLookup extension privacy and network deferral, WWDC17.** Foundational API explanation; confirm behavior against the shipping SDK/device.  
`https://developer.apple.com/videos/play/wwdc2017/249/`

**S13. Nomorobo — Deactivation requires more than uninstalling.**  
`https://nomorobo.zendesk.com/hc/en-us/articles/4423655122189-How-can-I-deactivate-Nomorobo-Max`

**S14. Verizon — Call forwarding FAQs, conditional mode and billing.**  
`https://www.verizon.com/support/call-forwarding-faqs/`

**S15. FTC — Handling unexpected calls about money being at risk.**  
`https://consumer.ftc.gov/consumer-alerts/2026/01/how-handle-unexpected-calls-claim-your-money-risk`

**S16. FCC — AI-generated voices and the TCPA.** Legal applicability requires review; this is not a finding that every automated call is unlawful.  
`https://www.fcc.gov/document/fcc-confirms-tcpa-applies-ai-technologies-generate-human-voices`

**S17. YouMail — Conditional call forwarding and configuration changes.**  
`https://support.youmail.com/en/articles/13416943-what-is-conditional-call-forwarding`

**S18. Twilio — US Programmable Voice pricing.** Prices checked 21 September 2026; verify before purchasing.  
`https://www.twilio.com/en-us/voice/pricing/us`

**S19. Android — CallScreeningService.** A separate second-platform validation path; the five-second service is not a conversational call-audio API.  
`https://developer.android.com/reference/android/telecom/CallScreeningService`

**S20. Twilio — TwiML Record, recording behavior and legal considerations.**  
`https://www.twilio.com/docs/voice/twiml/record`

**S21. Google Play — SMS and Call Log permission policy.** Android messaging access requires the appropriate role or an approved policy exception, not an assumed unrestricted permission.  
`https://support.google.com/googleplay/android-developer/answer/10208820`

## Appendix: Android expansion gate

Reuse the cloud screening, policy, directory, and voicemail services. Implement an Android companion with the selected call-screening role only after testing native call behavior. Android requires a quick screening response; this is not permission to hold that system callback open for an AI interview. Do not assume that rejecting or silencing a call triggers conditional forwarding identically across manufacturers or carriers. [S19]

Complete the same native-ring, callback, loop, voicemail, consent and restoration tests on each supported Android profile. Messaging is a separate Google Play permission/role/exception decision; ship manual checks without restricted permissions until automatic SMS access is approved and validated. Never use an accessibility-service workaround to read private conversations. [S21]
