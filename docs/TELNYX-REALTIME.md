> Current demo implementation: [GPT Live 1 screening demo](LIVE-DEMO.md). The earlier Realtime-model evaluation below is historical; the requested voice model is now exactly `gpt-live-1`. Live audio and physical forwarding verification are still pending.

# Telnyx and OpenAI Realtime evaluation

Status: 2026-09-24. Telnyx is selected. Realtime is a proposed screening replacement and has not been implemented or tested. The Telnyx TeXML adapter is implemented locally and has passed software tests. The private credentials, Telnyx routing resources and Firebase deployment are now complete; forwarded calls use Telnyx. The iPhone update with dynamic provider disclosure is installed. No real forwarding test has passed.

## Recommended division of work

- **Telnyx:** receive the conditionally forwarded Tello call, carry audio, ring the enrolled recipient, collect explicit keypad acceptance, bridge the two people, and provide voicemail when declined or unanswered.
- **OpenAI Realtime:** conduct a short introduction, ask at most one useful clarification, and return screening evidence through a function call. Start an evaluation with `gpt-realtime-2.1-mini`; compare the larger model if safety or comprehension tests fail.
- **Shield backend:** authenticate and deduplicate provider events, authorize the fixed recipient and test window, validate model output against the existing screening schema and deterministic policy, enforce limits, store encrypted history, and own every call-control action.

Realtime can replace the speech-to-text → Gemini extraction → spoken response pipeline. It cannot replace Telnyx or the application backend. It must not decide arbitrary destinations, equate a plausible introduction with verified identity, or bypass press-1 acceptance. Caller speech and caller ID remain untrusted. Keep the AI out of the connected human conversation.

OpenAI supports direct SIP audio with a server-side control connection. For Shield, prefer a provider-controlled call leg so an AI failure can return the original caller to voicemail. Prove that Telnyx can end/detach the AI leg and resume private acceptance before choosing direct SIP over a media bridge. A successful OpenAI REFER response alone does not prove Telnyx connected the intended recipient. Do not replace the controlled callback with an unconditional transfer.

## Account checkpoint

The portal now confirms **Paid**, with all paid requirements checked. Billing showed $10 available and automatic recharging disabled. The user approved an order quoted at $2 ($1 setup + $1 first month), then $1/month plus call usage. Number **+1 507 473 1802** is purchased and Active; the verified Shield TeXML application is attached. The account menu subsequently showed $8.77 available. No additional funding or automatic recharge was enabled.

The user explicitly approved a backend API key and saved it privately. The key tagged `shield-forwarding-pilot` authenticated successfully; the official Telnyx CLI source identifies `GET /v2/whoami` for retrieving the user account UUID. That UUID was verified against the TeXML call-list endpoint. The key, public verification key, account UUID, application ID and purchased DID are stored in the ignored private runtime and Firebase `SHIELD_RUNTIME` version 2; no key is included in client code or source control. The creation dialog offered tags/expiration but no narrower per-service scope.

`Shield supervised forwarding` and `Shield US callbacks` are provisioned and read back. Limits: two inbound channels, one outbound channel, US destinations only, maximum destination rate $0.05/min, $1/day outbound usage cap, and outbound call recording disabled. All four Firebase functions deployed successfully using secret version 2. Public health/database readiness, unauthenticated setup rejection and unsigned Telnyx webhook rejection passed. The existing test window remains closed pending native consent and a real call.

The owner confirmed original iPhone settings: Screen Unknown Callers = Never, Live Voicemail = On, one data-inclusive Tello line, no custom forwarding, working Tello voicemail. Those facts and the matching restoration steps are saved privately. No carrier setting has changed.

Paid programmable-voice accounts still have an automated-call announcement on documented actions and a limit of 10 outbound calls/hour, 100/day. This is compatible with a small supervised experiment but must be heard during the test. Higher account verification may be required for an unbranded experience. Do not promise immediate activation.

The existing Shield runtime has an OpenRouter Gemini configuration (`google/gemini-3.7-flash`), no direct OpenAI API key, and a validated Telnyx key in the backend. Realtime testing needs a funded OpenAI API project with model access, an API key stored privately, and a webhook signing secret. No secret should be pasted into chat or included in a client build.

## Cost baseline

These are public list rates, not a measured Shield bill:

| Component | Published rate |
| --- | --- |
| Telnyx local number | From $1/month |
| Telnyx Voice API / TeXML | $0.002/min plus SIP transport for each applicable leg |
| Telnyx published US example | $0.0052/min inbound, $0.007/min outbound |
| Telnyx recording | $0.002/min |
| Telnyx media streaming | $0.0035/min if used |
| Realtime 2.1 Mini audio | $10/million input tokens; $20/million output tokens |
| Realtime 2.1 Mini text | $0.60/million input tokens; $2.40/million output tokens |

OpenAI documents 10 input audio tokens/second and 20 output audio tokens/second. As a first-pass illustration, 20 seconds of caller audio plus 10 seconds of assistant audio is $0.006 in Mini audio tokens, before repeated conversation context, instructions, tool outputs, transcription, hosting and telephone charges. This is not a per-call quote. Realtime is not inherently cheaper than a short text classifier. Evaluate cost per completed screening and actual conversational delay.

Telnyx lists separate SIP-interface, transfer and other feature fees; include any that the selected call flow invokes. The $0.002 headline is not the total call price. Stop the AI session as soon as screening is complete and collect its final usage.

## Migration requirements

Implemented locally: exact-byte Ed25519 verification with timestamp checks, provider identifiers, signed child-to-parent binding plus authenticated REST child verification, bounded private recording retrieval/deletion, provider consent version, dynamic native disclosure, and Telnyx provisioning/readback scripts. The prepared outbound profile uses US destinations only, one concurrent call, no conversation recording and a $1/day outbound usage cap. These resources are now provisioned and their settings verified through the API.

Validation: 101 unit tests and 36 Firestore integration tests passed (two provider-inapplicable cases skipped). Signed physical-device build succeeded and the update was installed. Launch after installation was blocked by the locked phone. Real voice, recording-origin validation and Tello carrier tests are still required. Recording media remains blocked until an exact provider storage hostname is configured; never allow arbitrary webhook URLs.

Implementation and live-validation checklist:

1. Replace Twilio HMAC validation with the documented Telnyx validation scheme for the selected callback product, preserving exact raw bytes, timestamps and duplicate handling.
2. Normalize provider call and recording identifiers; the original forwarding hooks accepted only Twilio `CA` and `RE` identifiers. Telnyx documents UUID and opaque versioned call IDs.
3. Replace number provisioning, REST call verification, recording fetch/delete, and provider-specific privacy disclosures. Telnyx's documented TeXML call-fetch schema does not expose the parent field used by the existing Twilio whisper check; prove the new child-to-parent binding instead of dropping that check.
4. Bind recordings to the correct account and call through the provider API. Fetch only verified provider media URLs with bounded size/time and no credential forwarding to unrelated hosts; encrypt, enforce retention, then delete the provider copy.
5. Add a bounded Realtime session controller if selected, with authenticated incoming-call webhooks, validated tool arguments, deterministic routing policy, idle/deadline limits, fail-closed behavior and usage accounting.
6. Update app service disclosures/consent before routing callers through the new services. Keep native onboarding layout, carrier codes, recipient identity and encryption keys consistent.
7. Verify direct inbound, safe screening, refusal, noise/silence, attempted instruction override, correct private whisper, press 1, press 2, no answer, AI disconnect, provider timeout, voicemail playback/deletion and carrier restoration. Only then test conditional forwarding on Tello.

The current supervised limits stay in force: any caller during an explicitly opened 30-minute window, ten screenings, one callback at a time, fixed enrolled recipient, five-minute connected calls and no recording of human conversations.

## Sources

- [Telnyx account verification](https://support.telnyx.com/en/articles/1130595-account-verification)
- [Telnyx billing](https://support.telnyx.com/en/articles/4280500-billing-setup-billing-groups)
- [Telnyx Trial restrictions](https://developers.telnyx.com/docs/account-setup/levels-and-capabilities/trial)
- [Telnyx Paid account restrictions](https://developers.telnyx.com/docs/account-setup/levels-and-capabilities/paid)
- [Telnyx pricing](https://telnyx.com/pricing/voice-api)
- [TeXML compatibility](https://developers.telnyx.com/docs/voice/programmable-voice/texml-twiml-compatibility)
- [TeXML call lookup](https://developers.telnyx.com/api-reference/texml-rest-commands/fetch-a-call)
- [Telnyx webhook validation](https://developers.telnyx.com/docs/development/api-fundamentals/webhooks/receiving-webhooks)
- [OpenAI telephony and SIP](https://developers.openai.com/api/docs/guides/voice-sip)
- [Realtime 2.1 Mini](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini)
- [OpenAI voice cost accounting](https://developers.openai.com/api/docs/guides/voice-latency-cost)


### Guided native setup checkpoint — 2026-09-24

The owner requested a self-guided flow instead of chat/helper handoffs. The updated native app is installed and the tested `shieldApi` is deployed. Consent is saved; server progress is `save`, the test window is closed, and no real call probe has run. After the owner unlocked the phone, the updated app launched successfully on the physical iPhone. The app can now start its own bounded test window, place a fixed-recipient sound check, and verify forwarding with an authenticated per-call DTMF challenge. Passing a probe never promotes the profile to validated. See [FORWARDING-PILOT.md](FORWARDING-PILOT.md) for the implementation and remaining carrier checks.


### Step 3 follow-up

The installed Debug build now opens the Phone settings page in one tap; a physical iPhone UI test confirmed the destination and return handling without changing settings. Six simulator tests passed. Public fallback openers are used in Release. Switch values remain unavailable to the app, so returning never creates a verified result. The owner’s actual sound-check probe has passed; the forwarding check remains pending.
