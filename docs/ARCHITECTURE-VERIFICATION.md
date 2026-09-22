# Shield architecture verification

Reviewed 21 September 2026 against the full [Implementation Plan v1.0](Shield_Implementation_Plan_v1.md), downloaded from the [AAACAP Call Screening Design conversation](https://chatgpt.com/c/6a9f2e22-1e60-83e8-a220-ca7168bfffef), and current primary documentation.

## Assessment

**The latest v1 plan is technically credible enough for a controlled prototype. It is not yet verified enough for a participant's primary phone.** The important Apple and Twilio building blocks exist, the cost example is arithmetically correct, and the plan explicitly acknowledges most major limitations. Documentation supports the components; it does not establish reliability of the assembled carrier → screening → cellular callback path.

The earlier conversation and the latest specification must be distinguished. v1 already excludes a replacement iPhone dialer, continuous monitoring, caller authentication, and universal protection. Those exclusions are appropriate, not missing features to quietly reintroduce.

This review checked documentation, the specification, and cost arithmetic. The project directory contained no implementation to inspect. No carrier configuration, live phone call, deployed endpoint, model evaluation, provider-account setting, or App Store submission was tested. The accompanying [validation protocol](PHONE-VALIDATION.md) records the remaining tests as **NOT RUN**.

## Claims and evidence

“Documented” means an official API or behavior is described. “Conditional” means the building block exists but the Shield outcome still depends on configuration or experiments. “Unverified” means there is no implementation or measured evidence here.

| Claim in the plan | Result | Evidence and practical boundary |
|---|---|---|
| iPhone can silence unfamiliar callers toward voicemail | Documented | Apple describes **Silence**, separately from **Ask Reason for Calling**. It also documents screening exceptions. This alone does not prove the carrier forwards the resulting call to Shield. [Apple](https://support.apple.com/en-us/111106) |
| Conditional forwarding can preserve normally answered native calls | Documented / conditional | Verizon documents conditional forwarding; T-Mobile exposes separate unanswered, unreachable, and busy conditions. Actual plan and line provisioning matter. [Verizon](https://www.verizon.com/support/call-forwarding-faqs/), [T-Mobile](https://www.t-mobile.com/support/plans-features/self-service-short-codes) |
| Combining silencing and conditional forwarding has commercial precedent | Documented | Nomorobo describes that combination for its own product. This supports feasibility, not equivalence to Shield's callback implementation or compatibility certification. [Nomorobo activation](https://nomorobo.zendesk.com/hc/en-us/articles/4423660425869-How-can-I-activate-Nomorobo-Max-on-my-iPhone) |
| Live Voicemail can interfere with the intended forwarding path | Conditional | The cited vendor instruction explicitly concerns iOS 17. Test the actual release; do not turn an old workaround into a universal current-iOS claim. [Nomorobo iOS 17](https://nomorobo.zendesk.com/hc/en-us/articles/19084107152909-Does-Nomorobo-Max-work-with-iOS-17) |
| Missed saved-contact calls may also reach Shield | Documented consequence | Conditional forwarding operates on call outcome, not Shield's contact list. Replacement voicemail and the trusted-number branch are necessary parts of this design. [YouMail](https://support.youmail.com/en/articles/13416943-what-is-conditional-call-forwarding) |
| A dedicated DID is preferable to depending on `ForwardedFrom` | Supported design choice | Twilio says forwarded-number metadata depends on the carrier. Use the called Shield DID to choose the participant; validate that mapping in live requests. A DID is not an authentication secret. [TwiML request parameters](https://www.twilio.com/docs/voice/twiml) |
| Speech can be collected without a conversational agent | Documented | `<Gather input="speech">` returns speech results. Its confidence value is not a fraud or identity score. [Gather](https://www.twilio.com/docs/voice/twiml/gather) |
| The recipient can hear a private prompt and accept before bridging | Documented | `<Number url>` executes on the called leg before connection and supports `Say`, `Play`, `Gather`, and `Hangup`. Live error-path testing remains essential. [Number](https://www.twilio.com/docs/voice/twiml/number) |
| The callback can display the participant's Shield number | Documented / conditional | Specify that number as `Dial`'s `callerId`. The default is the original caller's number. Whether the callback rings through device and carrier filters is a separate test. [Dial](https://www.twilio.com/docs/voice/twiml/dial) |
| Voice routing should work with the companion app closed or without app data | Architectural inference | This design uses carrier voice and cloud processing, not app audio. It still requires usable cellular voice, correct forwarding, and working providers. No device test has established this yet. |
| Duplicate and reordered events need explicit handling | Documented | Twilio events can arrive out of order. Completion is not evidence of keypad acceptance. Database and provider state must be reconciled. [Number callbacks](https://www.twilio.com/docs/voice/twiml/number) |
| The model must finish well inside a 15-second webhook budget | Documented limit; unverified target | Twilio imposes a hard 15-second limit on call-related HTTP requests. The plan's 3–4-second model deadline is a proposed application budget, not a measured service guarantee. [Webhook limits](https://www.twilio.com/docs/usage/webhooks/webhooks-connection-overrides) |
| Provider signatures secure inbound webhooks | Documented, limited scope | SDK validation must use the externally visible URL and request parameters. It authenticates the provider request, not the original caller or claims made in speech. [Twilio security](https://www.twilio.com/docs/usage/security) |
| Cloud voicemail is implementable | Documented | `Record` supports recording; use the recording-ready callback before assuming media is available. Access control and deletion remain implementation work. [Record](https://www.twilio.com/docs/voice/twiml/record) |
| An independent fallback can help during backend failure | Conditional | Twilio supports failover arrangements. A fallback still depends on working telephony and cannot undo carrier forwarding during a provider outage. [Voice failover](https://www.twilio.com/docs/voice/twilio-voice-failover-best-practices) |
| Removing the app does not restore carrier routing | Documented | Nomorobo requires separate forwarding deactivation. Restoration must be tested before releasing the forwarding destination. [Deactivation](https://nomorobo.zendesk.com/hc/en-us/articles/4423655122189-How-can-I-deactivate-Nomorobo-Max) |
| Forwarding does not forward the SMS inbox | Documented | Verizon explicitly distinguishes voice forwarding from messages. [Verizon FAQ](https://www.verizon.com/support/call-forwarding-faqs/) |
| IdentityLookup can filter eligible unknown SMS/MMS | Documented, narrower than an inbox reader | Apple excludes known-contact messages and iMessage from this API's stated scope. Do not infer access to all conversations or multimedia attachments. [Apple filtering](https://developer.apple.com/documentation/identitylookup/sms-and-mms-message-filtering) |
| Message classification can be deferred to a server | Documented | Use Apple's system-managed network deferral. The extension cannot perform arbitrary networking or write to shared app containers. Configure the associated domain and extension network URL. [Extension setup](https://developer.apple.com/documentation/identitylookup/creating-a-message-filter-app-extension) |
| The message endpoint should not assume recipient identity or app login cookies | Supported | Apple's documented request contains sender/message data and app version, not an authenticated participant identity. A stateless endpoint is an appropriate v1 choice. [Deferral payload](https://developer.apple.com/documentation/identitylookup/ilmessagefilterextensioncontext/deferqueryrequesttonetwork(completion:)) |
| RCS filtering coverage is established | Unverified; correctly excluded from promises | The reviewed API documentation does not establish the proposed RCS coverage. Test the exact OS/API before advertising it. Absence of documentation is not proof of impossibility. |
| Setup cannot silently dial carrier `*`/`#` codes through ordinary `tel:` URLs | Documented restriction | Apple's archived Phone Links reference states that these characters are not dialed. Do not infer that the app can silently change forwarding by opening a URL. [Apple Phone Links](https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/PhoneLinks/PhoneLinks.html) |
| Structured outputs make extraction dependable enough to trust automatically | Not established | Schema adherence is useful, but outputs can still be factually wrong or refused. The plan correctly keeps routing authority in code and requires evaluation. [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs) |
| Calling an independently sourced institution number is the right response to an account-threat claim | Supported | FTC guidance recommends ending the unexpected call and using independently obtained contact details. It does not certify any incoming caller. [FTC](https://consumer.ftc.gov/consumer-alerts/2026/01/how-handle-unexpected-calls-claim-your-money-risk) |
| Saved numbers authenticate the caller | False; v1 correctly rejects this | Caller ID can be spoofed. Consequently a saved-number bypass, including the Shield contact itself, cannot be described as authentication. [FTC caller ID guidance](https://consumer.ftc.gov/consumer-alerts/2016/05/scammers-can-fake-caller-id-info) |
| The timetable, handoff rate, and fraud reduction are verified | Unverified | Two to three developers, six weeks, 99% handoff, and any fraud-reduction outcome require staffing and measurements. The plan appropriately labels its schedule and reliability numbers as targets. |

## Implementation additions to make explicit

These are refinements to the specification, not claims that its existing safeguards are absent.

### 1. Specify the callback's exact telephony behavior

Set `callerId` explicitly. Twilio also adds a roughly five-second buffer to `Dial timeout`; a configured value is not the observed ringing duration. Choose the timeout from measured carrier behavior and keep the independent loop guard. A short ring timeout alone cannot prevent recursion. [Dial reference](https://www.twilio.com/docs/voice/twiml/dial)

For private keypad collection, explicitly handle empty input, use one DTMF digit, supply an action URL, and terminate rejection paths. `Gather` otherwise falls through on no input. Test a missing action response, HTTP error, malformed XML, and late response using real calls. Application exception handling does not prove the provider's failure behavior. [Gather reference](https://www.twilio.com/docs/voice/twiml/gather)

### 2. Turn “one attempt” into a durable invariant

Engineering recommendation: enforce a unique callback intent per original session and one active offer per participant in transactional storage. Bind acceptance to the original and child call IDs, participant, current state, and deadline. A valid signature or opaque URL alone is insufficient.

Define what happens when the provider may have created a call but the application loses the response: reconcile the outcome or use message-only handling; do not blindly retry dialing. A lock's expiry must not permit another callback while an earlier provider call is still active or unresolved. Cleanup must preserve accepted and terminal states. These properties require fault-injection tests, not just a happy-path demo.

### 3. Treat the private summary as attacker-influenced content

The caller supplies names, organization claims, and purpose. A model-generated summary could repeat instructions such as “ignore the warning” or imply institutional endorsement. This is a design risk inferred from the data flow.

Use a fixed prompt template with short validated fields, preserve “claims to be” wording, and prevent caller-supplied instructions, payment directions, codes, or arbitrary telephone numbers from becoming trusted assistant speech. Escape XML through the SDK. Unusable fields should produce a generic unverified-call prompt or message-only outcome.

Formalize absent/false/unknown values in the schema and policy, rather than relying on prose around the example JSON. Validate evidence against the input transcript and test negation, quoted speech, conflicting claims, prompt injection, and legitimate automated callers. A matching quotation does not prove the caller's story is true.

### 4. Verify provider privacy settings, not just the database policy

Twilio's Request Inspector documentation describes 30-day TwiML response retention; disabling that inspector does not also disable debugger information. Review every place transcripts or spoken summaries can appear, including logging, errors, tracing, backups, and the selected speech provider. [Request Inspector](https://help.twilio.com/articles/223136367)

OpenAI API data is not used for training by default, but abuse-monitoring retention and endpoint storage are separate. `store: false` alone is not a promise of zero retention; Zero Data Retention has eligibility and feature conditions. Check the selected model and endpoint before setting a public policy. [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data)

There is a documentation inconsistency worth resolving through configuration and tests: Twilio's general security page describes recording authentication as an opt-in setting, while its current Recordings reference says HTTP Basic authentication is enforced for media. Explicitly verify unauthenticated access is denied, then separately test participant-to-participant authorization in Shield. Do not place provider credentials in the app. [Security](https://www.twilio.com/docs/usage/security), [Recordings](https://www.twilio.com/docs/voice/api/recording)

### 5. Keep routing health observable and its coverage honest

Commercial documentation notes that a previously dialed number can bypass silencing; an “unknown” test number must actually be unfamiliar to the phone. Carrier/SIM/plan changes can invalidate forwarding. Use dated end-to-end evidence and explicit supported profiles, not a permanent protection indicator. [Nomorobo troubleshooting](https://nomorobo.zendesk.com/hc/en-us/articles/4423777543181-Help-The-test-call-wasn-t-silenced-on-my-iPhone), [YouMail](https://support.youmail.com/en/articles/13416943-what-is-conditional-call-forwarding)

Even perfect screening code cannot analyze calls that never reach it, or detect a scam introduced only after the unmonitored conversation starts. The latest plan already acknowledges both boundaries. Test whether users understand them before treating “screened” as an acceptable trust cue.

### 6. Resolve distribution and consent before participant enrollment

Apple's review rules require conservative blocking criteria for call/SMS filtering and explicit permission before personal data is shared with third-party AI. Translate those requirements into real onboarding, disclosures, classification behavior, and review notes. The specification alone cannot establish approval. [App Review Guidelines, 2.5.12 and 5.1.2](https://developer.apple.com/app-store/review/guidelines/)

The plan correctly leaves recording/transcription and artificial-voice callback consent for jurisdiction-specific review. The FCC's artificial-voice ruling is relevant; it is not a blanket prohibition on every consented assistant callback or a legal clearance for this service. Agency sponsorship, participant access, and ongoing support ownership also remain unverified. [FCC ruling](https://www.fcc.gov/document/fcc-confirms-tcpa-applies-ai-technologies-generate-human-voices)

## Earlier roadmap: keep these separate from v1

| Earlier idea | Verified boundary |
|---|---|
| A default cellular dialer can provide a U.S. outbound firewall | Apple's current default-dialer preparation documentation requires an EU-registered developer account and an EU-located test device. It cannot be assumed available for the proposed U.S. pilot. Default VoIP calling and cellular dialer capabilities are distinct. v1 already avoids depending on either. [Apple](https://developer.apple.com/documentation/livecommunicationkit/preparing-your-app-to-be-the-default-dialer-app) |
| Continuous analysis can be added to any phone conversation | Twilio can stream both tracks of calls it carries using a unidirectional stream; bidirectional streams receive only the inbound track. This does not expose ordinary native calls that bypass Twilio. Monitoring, intervention, consent, cost, and accuracy need a separate design. [Media Streams](https://www.twilio.com/docs/voice/twiml/stream) |
| Android supplies a ready conversational screening layer | Android's `CallScreeningService` has a five-second response requirement, not an indefinite AI interview window. SMS permissions additionally depend on Google Play roles or approved exceptions. Validate Android independently. [Android API](https://developer.android.com/reference/android/telecom/CallScreeningService), [Google Play policy](https://support.google.com/googleplay/android-developer/answer/10208820?hl=en) |

## Cost verification

The plan's published-rate arithmetic is correct as of this review. [Twilio U.S. pricing](https://www.twilio.com/en-us/voice/pricing/us)

| Item | Assumed billable usage | Subtotal |
|---|---:|---:|
| Local number | 1 × $1.15/month | $1.15 |
| Inbound voice | 180 minutes × $0.0085 | $1.53 |
| Ordinary U.S./Canada callback destinations | 100 minutes × $0.014 | $1.40 |
| Selected-provider speech recognition | 100 uses × $0.025 | $2.50 |
| **Telephony subtotal per participant-month** | | **$6.58** |
| **Ten participants at identical usage** | | **$65.80** |

The inbound leg continues during a bridged conversation. Twilio rounds each call leg separately to billable minutes; raw aggregate seconds are therefore insufficient to estimate invoices. [Billing increments](https://help.twilio.com/articles/223132307-How-do-you-round-minutes-for-billing-)

The subtotal excludes model usage, hosting, voicemail, taxes, carrier charges, test lines, support, and development. Destination and speech-provider rates vary. Treat the selected usage as an assumption, not an observed monthly average. Both the subtotal and these exclusions are already stated appropriately in v1.

## What would change this assessment

The decisive next milestone is the plan's own **telephony proof without AI**: an unfamiliar call reaches Shield, one ordinary cellular callback rings, only private digit 1 connects the parties, failed offers produce useful voicemail without recursion, and removal restores the original phone service.

Complete that on one fully recorded carrier/device profile before building a polished companion app. Then evaluate the model on held-out realistic scenarios and test additional profiles. Twilio test credentials do not place real calls and cannot establish this evidence. [Test credentials](https://www.twilio.com/docs/iam/test-credentials)

No numerical probability of feasibility, fraud prevention, or production reliability is supported by the material reviewed. The defensible result today is **documented components, plausible assembly, untested operational outcome**.
