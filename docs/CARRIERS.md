# Carrier forwarding for Shield

Researched October 12, 2026. Scope: U.S. mobile lines, prioritizing **Verizon and T-Mobile** for the ten-person pilot. This is a support and validation specification, not a claim that the app supports these carriers today. No carrier setting was changed during this research.

The current API still returns Tello and its three codes. Existing Tello registration and historical call evidence are recorded in [Status](STATUS.md); they do not establish current routing or another carrier's behavior. No new real-call verification was performed. The [pilot plan](TEN-PERSON-PILOT-PLAN.md) describes the required backend changes.

## The exact use case

Keep the senior's existing mobile number and carrier. Forward **conditional** calls to an assigned Shield number: no answer, busy/rejected, and, where supported, unreachable. Keep unconditional forwarding off. Shield calls the senior back from their saved Shield contact and connects only after they press 1.

The forwarding codes do not distinguish friends from strangers. iPhone's **Screen Unknown Callers → Silence** supplies that first distinction. Apple describes Silence as sending unsaved callers to voicemail; it does not promise a particular carrier signaling condition. Test the actual Silence path independently from ordinary busy/no-answer. [Apple's instructions](https://support.apple.com/en-us/111106)

Shield's setup requires Live Voicemail off so the handset does not intercept the call. Save the Shield offer number in Contacts first. A missed call from a contact can also reach Shield; current behavior sends forwarded trusted callers to Shield voicemail. Explain that voicemail moves into Shield for forwarded calls.

Unconditional forwarding is incompatible with calling back the same mobile number: the offer can immediately loop back to Shield. A carrier's generic “Call Forwarding” switch or an all-calls guide is not enough to establish support for this product. Landlines and business VoIP need a separate routing design; they lack this iPhone contact/silence behavior.

## Codes and evidence

`N` below means the **assigned 10-digit U.S. Shield destination**, without punctuation. `1N` means country code 1 followed by those ten digits; neither `N` nor a literal plus sign is dialed. Press Call after each complete code, on the correct SIM. Do not copy the owner's existing destination into another user's setup.

Evidence levels:

- **Carrier documented:** current carrier instructions specify the operation. Still needs Shield testing.
- **Integration documented:** a service integrating with the carrier documents it; carrier confirmation and testing remain necessary.
- **Incomplete:** missing, conflicting, or inaccessible instructions. Do not enable self-service setup.
- **Line verified:** reserved for a dated, completed end-to-end check on that particular line. None added here.

| Carrier / product | Conditional activation | Disable / restoration starting point | Evidence and remaining gap |
|---|---|---|---|
| **Verizon mobile** | `*71N` for busy/no answer | `*73` | Carrier documented. No separate unreachable code established. Test Silence, decline, powered-off, and voicemail restoration. [Activate](https://www.verizon.com/support/knowledge-base-181139/), [disable / FAQ](https://www.verizon.com/support/call-forwarding-faqs/) |
| **T-Mobile mobile** | `**61*1N#` no answer; `**67*1N#` busy; `**62*1N#` unreachable | Individual: `##61#`, `##67#`, `##62#`. T-Mobile also documents `##004#` to reset forwarding to defaults. | Carrier documented. Keep reset-to-default distinct from restoring a person's previous custom configuration. [Codes](https://www.t-mobile.com/support/plans-features/self-service-short-codes) |
| **Tello** | `**61*1N#`; `**67*1N#`; `**62*1N#` | `##61#`; `##67#`; `##62#` | Carrier documented, including busy/rejected. Plan must contain data; forwarded minutes consume allowance/balance. [Tello instructions](https://tello.com/help_center/device-settings/how-can-i-set-up-call-forwarding) |
| **Mint Mobile** | `**61*1N#`; `**67*1N#`; `**62*1N#` | `##61#`; `##67#`; `##62#` | Carrier documented. Mint's wording around busy/unreachable overlaps; verify each condition separately. [Mint instructions](https://www.mintmobile.com/help/how-to-turn-on-off-call-forwarding/) |
| **AT&T Wireless** | `*61*N#` no answer; `*67*N#` busy; `*62*N#` unreachable | `##61#`; `##67#`; `##62#`, followed by voicemail verification | Integration documented by Google Voice, specifically for AT&T Wireless. Single leading star, unlike T-Mobile. AT&T's general wireless page is not a complete conditional-code reference. [Google integration instructions](https://support.google.com/voice/answer/165656?hl=en), [AT&T](https://www.att.com/support/article/wireless/KM1011513/) |
| **Xfinity Mobile** | `*71N` for unanswered calls | `*73` | Carrier documented. Busy/rejected and unreachable require separate validation. [Xfinity instructions](https://www.xfinity.com/support/articles/how-to-use-call-forwarding) |
| **Visible** | `*71N` | `*73` | Carrier documents busy/on-another-line, but does not explicitly establish unanswered coverage. Do not equate this with Verizon validation. [Visible features](https://www.visible.com/content/value/visible/en/help/about-visible/plan-features.html) |
| **Spectrum Mobile** | `*71N` for unanswered calls appears in the carrier's indexed instructions | Confirm restoration through Spectrum before setup | Incomplete current read: full page returned HTTP 403; indexed carrier text supports activation only. Previous October 10 research listed `*73`; re-confirm it rather than promoting that older note to current verification. [Spectrum instructions](https://www.spectrum.net/support/mobile/spectrum-mobile-call-forwarding) |
| **US Mobile — Warp** | `*71N` | `*73` | Carrier documented. Page labels this busy and describes conditional forwarding as busy/no-answer. [US Mobile instructions](https://www.usmobile.com/help/docs/troubleshooting-and-setup/setting-up-device/advanced-device-setup) |
| **US Mobile — Light Speed** | `**61*N#` unanswered; page also lists `**62*N#` under a busy heading | `##61#`; `##62#` for those entries | Incomplete: the busy label conflicts with the usual unreachable meaning of 62. Obtain carrier clarification; do not invent a third code from T-Mobile's profile. [US Mobile](https://www.usmobile.com/help/docs/troubleshooting-and-setup/setting-up-device/advanced-device-setup) |
| **US Mobile — Dark Star** | `*61*N#`; `*62*N#`; `*67*N#` | Carrier confirmation required for conditional restoration | Activation documented. Page's cancellation example is `#21#`; that does not establish restoration of all three conditional paths. [US Mobile](https://www.usmobile.com/help/docs/troubleshooting-and-setup/setting-up-device/advanced-device-setup) |

### Verizon setup card

1. Confirm the brand really is Verizon, the correct mobile line is selected, and cellular coverage is available. Record existing forwarding and voicemail behavior.
2. Once the assigned Shield destination is ready, dial `*71N`. Wait for the confirmation beeps and automatic call end.
3. Complete the line tests below before showing “Protection ready.”
4. To stop Shield forwarding, dial `*73`, wait for confirmation, restore original phone settings, and verify normal calls and carrier voicemail.

Verizon describes no-answer forwarding after **3–6 rings**. Do not promise an exact timeout or powered-off behavior. Its FAQ says forwarding is available across plans, with plan-dependent minute charges and possible fees on older plans. Those statements do not validate every plan for Shield. [Verizon activation](https://www.verizon.com/support/knowledge-base-181139/), [FAQ](https://www.verizon.com/support/call-forwarding-faqs/)

### T-Mobile setup card

1. Confirm the line and original settings; save the assigned Shield contact.
2. Dial `**61*1N#`, `**67*1N#`, and `**62*1N#` separately. Record each carrier response. Returning from Phone is not confirmation.
3. Complete the line tests below.
4. Restore the prior configuration. For ordinary carrier defaults, T-Mobile documents `##004#`; verify voicemail afterward. Preserve custom forwarding targets instead of blindly resetting them.

Do not initially change ring duration. T-Mobile publishes a timer example containing its own voicemail destination: copying that example would replace Shield as the destination. A custom Shield timer needs a separate tested profile. If reset fails over Wi-Fi Calling, T-Mobile's troubleshooting guide recommends switching Wi-Fi Calling off for the reset; restore its previous setting afterward. [Short codes](https://www.t-mobile.com/support/plans-features/self-service-short-codes), [voicemail troubleshooting](https://www.t-mobile.com/support/devices/device-troubleshooting/voicemail-troubleshooting)

### Other brands investigated

“Not enabled” below means insufficient evidence for Shield, not proof that the carrier can never support it. Do not inherit support merely from the underlying network.

| Brand / service | Finding and next action |
|---|---|
| **Cricket** | [Carrier lists call forwarding](https://www.cricketwireless.com/support/plans-and-features/features), but this research did not establish a complete current conditional-code and restoration guide. Confirm plan, destination eligibility, and all conditions with Cricket. |
| **Consumer Cellular** | Carrier-hosted device manuals describe forwarding, but a current plan-wide conditional-code contract was not established. Support-assisted qualification only. [Example carrier manual](https://www.consumercellular.com/api/Assets/documents/Manuals/zmax_11_user_manual.pdf) |
| **Metro by T-Mobile** | No complete current official conditional guide established. Confirm entitlement, any add-on charge, codes, and restoration with Metro; do not automatically apply T-Mobile's profile. |
| **Boost Mobile** | No complete current official conditional guide established. Retire the older blanket “unsupported” conclusion based on a legacy community page; keep enrollment disabled pending direct evidence. |
| **Total Wireless / Straight Talk / Tracfone / Lively / UScellular** | Not qualified for this pilot. Device-specific all-calls forwarding instructions or an underlying network relationship are insufficient. Example: [Total's device FAQ](https://support.totalwireless.com/en/brands/Samsung/TOSAX238UV/faq/1647737/) documents all-calls activation, not Shield's three conditions. Obtain current brand/plan instructions. |
| **Google Fi** | Official setup is through Fi's app/site, with don't-forward, simultaneous-ring, and always-forward choices. No conditional option documented there; not compatible with this Shield flow as documented. Do not use T-Mobile dial codes by inference. [Fi instructions](https://support.google.com/fi/answer/6201380?hl=en) |
| **Landline / home phone / business VoIP** | Separate qualification required. Do not use mobile codes on these services. Unknown-caller selection and a non-looping recipient endpoint need a different design. |

## Verification for every participant

Required before enrollment: qualified carrier profile; senior's consent; verified recipient; assigned and provider-configured Shield number; recorded original settings and carrier restoration procedure; a way to reach a helper if setup fails. Do not expose codes until the destination is actually ready.

Staff should use another agreed communication channel or split setup into instruction, hang-up, and callback stages. Staying on the senior's line changes the busy condition and prevents a meaningful ring test. The owner must authorize any live testing; this document does not authorize calls to the owner's phones.

| Test | Required observation |
|---|---|
| Saved contact, answered normally | Phone rings directly. Shield does not claim the call. |
| Unsaved caller with Silence on | Call reaches the correct Shield participant. Test separately from ringing to timeout. |
| Manual decline / busy | Correct forwarding; test with call waiting in the user's normal configuration. Do not disable call waiting just to make a test pass. |
| No answer | Correct forwarding; measure time to diversion. |
| Powered off / no coverage | Record actual outcome: Shield or carrier voicemail/failure. Don't promise unreachable protection if it fails. |
| Wi-Fi Calling | Repeat critical conditions in the user's normal Wi-Fi Calling configuration. |
| Shield offer | Saved Shield contact rings; only that recipient hears the private summary; only their digit 1 connects. Digit 2, silence, and voicemail pickup do not connect. |
| Missed/declined Shield offer | No recursive screening/dialing; original caller gets the intended voicemail fallback. |
| Private caller ID / international caller | Route to the right person without depending on caller ID; retain current screening/fallback behavior. |
| Two participants at once | Calls, histories, voicemail and acceptance events remain isolated. Use the same synthetic originating caller for both as an identity test. |
| Restoration | Disable the configured forwarding, restore saved phone settings, then confirm both direct ringing and a retrievable message in ordinary carrier voicemail. |

Use consenting test participants and synthetic scripts; record metadata and pass/fail outcomes, not transcripts or audio in repository evidence. Each carrier qualification should include two independent lines when practical and callers originating on different networks; this is proposed coverage, not statistical proof. Every senior still needs their own setup check. Revalidate after carrier/plan/SIM changes, number changes, relevant iOS updates, or routing incidents.

Keep a private record keyed by participant ID: carrier brand, product/network, plan type, device/OS, code-profile version, condition, originating test network, Wi-Fi Calling state, timestamp, opaque provider call reference, observed destination match, time to diversion, restoration result, verifier. Never publish phone numbers, webhook URLs, or raw SIP headers.

## Carrier-profile algorithm to implement

Store versioned profiles by **brand + product/network + verified capabilities**, not just network family:

```text
profile = {
  id, version, brand, product, sourceUrls, researchedAt,
  activationSteps: [{ condition, template, destinationFormat, confirmationCopy }],
  restorationSteps, restorationPrerequisites,
  documentedConditions, testedConditions, evidenceRefs,
  eligibilityRules, ringTimerPolicy, qualificationStatus
}
```

Use explicit 10-digit versus 11-digit templates. A missing/ambiguous profile returns support-needed, never a best-guess dial code. A network lookup can suggest a profile, but ported numbers and resellers require user/staff confirmation.

Setup state: `eligible → destination_ready → consented → settings_saved → codes_confirmed → line_tests_passed → active`. Each test result must match the current participant, destination assignment and profile version; changed assignments invalidate old results. All required steps must pass before activation. If setup fails partway through, guide restoration while retaining the assigned number.

Restoration state: `restoring → codes_confirmed → settings_restored → ringing_verified → carrier_voicemail_verified → restored`. A backend pause, uninstall, logout, or successful reset message is not proof that carrier forwarding stopped.

The API should return carrier-specific activation and restoration steps. Replace Tello strings and fixed three-step assumptions in iOS. Keep status queries such as `*#61#` out of generic self-service flows until the exact carrier profile establishes them. Do not display a single “all carriers supported” badge.

## Changes from the October 10 draft

This revision removes network-family support inheritance, unverified blanket exclusions, fixed Verizon ring-time claims, and a generic T-Mobile/AT&T timer recommendation. AT&T's single-star conditional examples now cite Google's integration documentation explicitly. No claim about AT&T/Cricket forwarding-minute caps is carried forward without a current plan-specific source. Voicemail restoration remains a tested outcome, not an assumption from a reset command.
