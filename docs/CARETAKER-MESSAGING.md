# Caretaker text messaging

October 19, 2026. The owner selected **Shield’s existing number**, conditional on preserving calling capabilities and limits. A briefly selected dedicated number was superseded; do not buy, port or replace a number for this work.

## Implemented source

Caretakers use the existing Telnyx Verify → Firebase mobile sign-in. No protected-phone enrollment or subscription is needed to review a request. The owner previews the exact generic invitation and sender before submission. The recipient verifies the invited number and explicitly accepts available text, notification or inbox delivery. Pending relationships grant no alerts; accepted caretakers gain no call-history/audio access. Owner pause, recipient decline, revocation, account deletion and signed STOP/START retain their existing controls.

The SMS sender now retains the provider response’s message identifier only as a keyed hash on the existing contact/delivery receipt. A successful API response is **submitted**, not delivered; malformed success and network uncertainty remain unknown with no automatic resend. The signed messaging webhook accepts only known outbound final receipts from the configured sender/profile. Valid destination numbers must match the stored recipient hash; provider-redacted destinations are supported through the signed, known message identity. Final outcomes distinguish delivered, delivery failure and unconfirmed delivery. Replays do not change a terminal outcome, and worker completion cannot overwrite an earlier final callback. A receipt beating response persistence receives a short retry response; erased records are never recreated. Unknown submissions without a returned ID cannot be reconciled by these hashes.

The owner’s Caretakers screen explains each invitation outcome and keeps manual sharing available. Acceptance remains separate from text delivery. Provider IDs, message bodies and recipient numbers are not added to public responses or delivery-status logs. Added delivery metadata follows the existing contact/account lifecycle and 30-day alert-receipt expiry; this feature does not promise provider zero retention.

## Observed live state

A read-only observation at **21:53 Central October 19** confirms phone sign-in is configured, SMS alerts are not configured, the owned local number has no messaging profile, and the account has zero registered 10DLC brands. The voice connection is attached to the expected active application with **30 inbound/application outbound channels** and an **account outbound ceiling of 10**; its voice spending cap is enabled. No provider configuration, secret, phone setting, call, message or deployment was changed.

[Telnyx’s sender guide](https://developers.telnyx.com/docs/messaging/getting-started/choosing-your-sender-type) supports voice and SMS on the same local number. [Number messaging configuration](https://developers.telnyx.com/docs/messaging/messages/phone-number-configuration) attaches a messaging profile independently. The activation plan uses only that messaging setting and must preserve the voice connection, application/webhooks, outbound profile, all call limits and the existing voice spend cap. SMS and voice draw on the same account balance; a separate text spend cap limits messaging exposure but is not reserved credit or an overall account cap.

## Remaining activation work

`node scripts/check-caretaker-messaging.mjs` performs read-only readiness checks and prints only flags/counts and call limits. `--plan` prints a disabled-profile proposal with US/Canada destinations, signed webhook destination and a **proposed $2/day SMS cap requiring approval**. It does not create resources or activate anything.

The existing US local sender requires [Telnyx 10DLC brand/campaign registration](https://developers.telnyx.com/docs/messaging/10dlc/quickstart). Wheema’s real registration/contact details, campaign opt-in description and provider approval must be supplied; the working Verify profile does not supply that approval. Registration and recurring carrier/provider charges need review before submission. Do not invent business details or reuse the OTP service for arbitrary messages.

After registration: create/configure the reviewed messaging profile, attach only its ID through `/phone_numbers/{id}/messaging`, read back voice configuration and limits against the saved baseline, and add the approved sender/profile to `SMS_ALERTS`. Prepare and approve the scoped API/alert worker/Hosting deployment, preserving deployed screening, call control and post-call policies. All of main must not be published as a shortcut. Verify STOP/START, signed delivery callbacks, acceptance, revocation and actual receipt using separately approved consenting test recipients. Provider delivery status is distinct from a person reading the text. Calling the owner or messaging the owner’s phones remains prohibited without explicit authorization.

The implementation is local until that activation. Provider registration, real text delivery and post-change voice acceptance are not established by synthetic tests. [Dated evidence](../.impeccable/review/caretaker-messaging-2026-10-19/verification.json).


Local validation passes **395 unit + 323 Firestore tests**, including seven new messaging integration cases and a provider-response regression. A final focused 30-case phone/caretaker suite also passes. Four UI methods pass on each of iOS 26.5 and 27, covering delivery feedback at standard/largest text, the sender/message preview and failure-disabled sending. The initial UI route error and the later iOS27 test-service failure remain recorded; the simulator retry used unchanged app/test products. [Evidence](../.impeccable/review/caretaker-messaging-2026-10-19/verification.json).

The final unsigned arm64 Release archive passes package inspection (app, Call Directory, three privacy manifests, production networking and fixture exclusion). Distribution signing and installation on a real phone remain unverified.
