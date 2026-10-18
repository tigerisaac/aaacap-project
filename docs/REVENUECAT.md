# RevenueCat and Shield access

Updated October 17, 2026. **App integration implemented and scoped server support deployed; purchases are not enabled in production.** The owner selected RevenueCat and explicitly deferred Apple account/upload work. This document does not authorize a deployment, enrollment, charge or store change.

## Agreed product choices

Wheema Inc. operates Shield; support is `isaac.cw.zhang@gmail.com`. The intended launch countries are the United States and Canada. The baseline prices are USD $9.99 monthly and $99.99 billed annually (approximately $8.33/month equivalent). The app displays Apple's localized prices, including the full annual charge; it never assumes the Canadian price equals the USD price. Carrier eligibility is separate from storefront availability: only Tello and T-Mobile US have current verified carrier entries. No Canadian carrier is enabled for purchase.

Ten selected senior accounts receive two calendar months from successful setup, without automatic billing or conversion. This is a separate account classification, retained after expiry. Pilot screens never initialize RevenueCat, show a price or offer restore/manage/purchase actions. Apple's acceptance of this complimentary access model remains an external release gate.

## Saved RevenueCat configuration

Read back October 17 through the connected RevenueCat plugin:

| Item | Identifier / ID | State |
|---|---|---|
| Project | Shield / `proj34b083d4` | Created |
| iOS app | Shield iOS / `app8cae3b0fbc` | Bundle `org.isaaczhang.Shield` |
| Entitlement | `shield_access` / `entle002f2fe42` | Created; products not attached |
| Current offering | `default` / `ofrng45fa3c1328` | Created |
| Monthly package | `$rc_monthly` / `pkgef79b2036f0` | Position 1; product not attached |
| Annual package | `$rc_annual` / `pkge2d3b42b35e` | Position 2; product not attached |
| Planned products | `shield_monthly`, `shield_annual` | Not created in Apple or RevenueCat |
| Earlier Apple store-state plan | `c8a0b647-3b7a-4b52-bd46-da000fc2eb89` | Never applied; RevenueCat automatically discarded the failed plan when the Test Store draft was created |
| Revised Apple product draft | [Saved desired state](revenuecat-apple-product-draft.json) | $9.99 monthly / $99.99 annually; unapplied, Apple work deferred |
| Built-in Test Store | `appa6baf06f9d` | Two synthetic QA products; never used to authorize live service |
| QA store-state plan | `c3c08559-41c0-471d-b249-d9a58301b575` | Owner approved corrected prices; both products applied October 17 at 20:54 UTC, no warnings |
| QA entitlement | `shield_qa_access` / `entla206ea0c43` | Separate from production `shield_access` |
| QA offering | `shield_sdk_qa` / `ofrngbd4e5ce913` | Not current; production `default` preserved |
| QA monthly product | `shield_qa_monthly` / `prod8503e1c21c` | Test Store P1M, USD $9.99; live store-state read verified |
| QA annual product | `shield_qa_annual` / `prod26b7d138b3` | Test Store P1Y, USD $99.99; live store-state read verified |

[RevenueCat offering](https://app.revenuecat.com/projects/34b083d4/product-catalog/offerings/ofrng45fa3c1328) · [iOS connection](https://app.revenuecat.com/projects/34b083d4/apps/app8cae3b0fbc).

The App Store Connect API key and In-App Purchase key are not attached. No Apple transaction, receipt, product price, renewal or refund has been exercised. The saved plan is not proof of an available subscription. Another pre-existing RevenueCat project was left untouched.

The owner revised the intended prices from $15/$120 to $9.99/$99.99 before approving Test Store creation. Earlier release screenshots retain the old sample prices as historical evidence. Current preview fixtures and assertions use $9.99/month, $99.99/year and approximately $8.33/month equivalent. Real purchase prices continue to come from the selected store products. A later live/source comparison found the unused intended-price fields in `commercial-policy.json` still held $15/$120. They are now corrected to $9.99/$99.99 in version `2026-10-17-v2`; publication is included in the separately reviewed [retention/configuration rollout](RETENTION-ROLLOUT.md).

The optional [SDK verification harness](../ios/Diagnostics/RevenueCat/README.md) runs the actual pinned RevenueCat SDK and Shield adapter in a separately identified simulator app. Only that temporary Debug build defines `SHIELD_REVENUECAT_TEST_STORE`; it accepts `test_` keys exclusively. Normal Debug and all Release/device builds continue to require `appl_` keys. The harness never initializes Shield authentication, API, push registration or telephone service; its QA entitlement cannot authorize the live backend. No SDK key is committed or embedded in the app.

## October 17 SDK verification

The real **5.96.0** SDK and Shield adapter passed three iPhone 17e/iOS 27 Test Store checks: monthly/yearly product prices, successful purchase, cancellation without error, simulated failure with recovery, customer-info notifications, restore, account switching, stale-package rejection and recovery after uninstall/reinstall with the same annual customer. RevenueCat independently showed both synthetic purchasers as `test_store` / `sandbox`, active on `shield_qa_access`, with $9.99/$99.99 simulated revenue; the secondary identity had no subscriptions or entitlements. The production entitlement still has no products and `default` remains current.

The actual v1 provider response was also checked in memory with Shield's subscription verifier, using matching QA product/entitlement identifiers to ensure rejection was due to the store. It rejected both ordinary and sandbox-review service access. No production database was involved and no provider body was saved. The final three SDK tests and eight revised-price UI tests all passed with no runtime warnings. Fresh-install removal was verified before reinstall. The earlier SDK restore assertion failure was a scrolled, unloaded List row; the corrected locator passed without changing restore behavior.

The normal unsigned Release archive passed the expanded QA-marker exclusion check. [Evidence](../.impeccable/review/release-2026-10-17/revenuecat/verification.json) and [dashboard verification](../.impeccable/review/release-2026-10-17/revenuecat/dashboard-verification.json) distinguish this from deferred Apple acceptance. [RevenueCat documents Test Store](https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store) as its simulated purchase environment. Its restore implementation returns customer information for the same RevenueCat identity; real Apple receipt restoration and transfer still require Apple's sandbox.

## App and server contract

- The official RevenueCat Swift package is pinned to **5.96.0**, revision `62df33e85b1aefaecbf7f19e89e71e2322ec15ac`. Only the main app links it; Call Directory does not. The unfinished message-filter target is not embedded.
- `/api/access` derives audience and access from the authenticated UID. The app cannot supply a customer ID, grant pilot access or submit an `active` flag. An old backend returning 404 produces no paywall.
- An operator approves a verified owner, US/Canadian phone country, verified carrier, prepared service, data plan and restoration guide. The server creates a random RevenueCat customer ID. Names, phone numbers, contacts, call history and recordings are not sent as RevenueCat attributes.
- Existing assisted users are not automatically converted into paying users. An explicit account migration is required before applying billing gates.
- Purchase and restore run only after the server identifies a public account. Purchase rechecks eligibility immediately before the Apple sheet. Both plans must exist, with the expected monthly/yearly subscription periods. Displayed amounts come from StoreKit through RevenueCat.
- The app distinguishes cancellation, approval pending, unavailable offerings, an existing purchase on another account, and delayed server verification. It claims purchase/restore actions before yielding, so rapid taps cannot queue duplicate store sheets, while a deliberate retry after cancellation remains available. It also prevents another purchase while verification is pending. Transactions and identity changes are serialized; late results from a previous login cannot update the next account. SDK login/offer/purchase/restore failures use Shield's readable recovery messages rather than provider diagnostics.
- SDK success and webhook contents cannot grant Shield service. The backend re-queries RevenueCat's authenticated subscriber API, validates the allowed product and `app_store` source, uses the earlier of entitlement/subscription expiries, honors matching grace periods, and rejects refunds, family-shared purchases, unsupported products/stores and production sandbox access. Sandbox access requires an explicit operator flag on a review account.
- Cancellation preserves paid access until expiry. A missing/expired entitlement prevents a new activation or resume. **It does not hang up an existing call, alter forwarding, erase history or block restoration/deletion.** Expiry requires assisted restoration, rather than leaving forwarded calls stranded.
- A secret-authenticated, bounded webhook processes only known server-owned customer bindings. It rechecks both sides of transfer events; failures remain retryable. Content-free event receipts expire after 30 days. A 60-second cache and a fenced lookup lease bound ordinary refreshes; purchase/webhook refreshes bypass the cache.
- `reviewServiceAccess` checks a bounded page hourly to recover missed notifications and flag expired access. `serviceAccessControl/review` records only cursor/time/counts. Failed pages retry. Operations must monitor `needsAccessReview` and failed reviews before public launch; the worker does not claim to restore a carrier automatically.
- Pilot grants are transactional and idempotent, limited to ten grants in total. Deletion does not recycle a seat. The start is persisted only after current forwarding consent and both server call-check timestamps; repeating setup or reinstalling cannot restart the clock. Two calendar months clamp month-end dates.
- Deletion clears the RevenueCat profile and customer mapping before deleting Firebase Auth. Provider failures leave the durable deletion job retryable. Public accounts see Apple's separate cancellation guidance and management action, using Shield's stored audience even if RevenueCat is unavailable; deletion does not wait for expiry. Apple financial records and cancellation remain separate.

## Configuration and operator use

Optional `REVENUECAT` in Secret Manager's `SHIELD_RUNTIME` contains `applePublicKey`, `secretApiKey`, `webhookAuthorization`, the four product/entitlement/offering identifiers, and `purchasesEnabled` (default **false**). Only the public SDK key and identifiers are returned to the authenticated account. Never put keys in source, screenshots, logs, chat or this document.

The operator tool uses Application Default Credentials with the project's normal Firestore permissions. It validates the same server rules, defaults to a dry run and prints only a small redacted outcome. Supply a private input file containing `uid`, `participantId`, `country`, `carrier`, `audience`, `operator` and optionally `allowSandbox`:

```sh
npm run build
node scripts/manage-service-access.mjs --project shield-calls-isaac --input operator-input/access-approval.json
```

Only after a concrete owner-approved enrollment, add `--confirm`. It creates account access records only; it does not provision a number, place a call, send a message, change carrier settings or charge anyone. Public provisioning remains assisted. A dry run is not enrollment. Local emulator execution requires `--emulator`, a `demo-` project and a loopback emulator address.

## Before enabling public purchases — deferred work

1. Finish Apple app/contracts/tax/banking and credential setup; validate the exact monthly/annual store plan, US/Canada availability and localized prices; review its differences before applying. Attach both products to `shield_access` and the matching packages.
2. Set and verify RevenueCat's restore behavior. For this phone-bound service, use **Keep with original App User ID** only with an approved account-recovery procedure, including deleted/recreated accounts. The default transfers subscriptions between identified accounts; neither setting may be assumed without inspection. Keep Apple Family Sharing off for these products.
3. The scoped backend and hourly review worker are deployed and verified in [the rollout record](IOS-BACKEND-ROLLOUT.md). Configure secret credentials, the RevenueCat webhook and both Apple server-notification environments; establish monitoring. Keep purchases disabled until transaction verification is complete.
4. Resolve public legal/recording consent, service limits, refund/support and expiry/restoration procedures. Review the policy and App Privacy answers. Purchase history is linked to the Shield account and used for app functionality and subscription analytics; the app manifest reflects that even though the SDK's default manifest says unlinked.
5. Exercise Apple sandbox/TestFlight: both plans, approval pending, cancellation, interruption, duplicate taps, restore/reinstall, two Shield accounts on one Apple account, transfer policy, renewal, grace/billing failure, expiry, refund/revocation, webhook outage/replay, deleting/recreating an account and purchasing after deletion. Test the actual Canadian storefront once a Canadian carrier is verified. Local mocks do not satisfy this gate.
6. Prove purchase-to-service setup on a new account and safe assisted offboarding on the intended carriers. Enable paid access only after owner release approval.

Primary references: [RevenueCat iOS installation](https://www.revenuecat.com/docs/getting-started/installation/ios), [webhooks](https://www.revenuecat.com/docs/integrations/webhooks), [customer response fields](https://www.revenuecat.com/docs/api-v1/customer-info-model), [restore behavior](https://www.revenuecat.com/docs/projects/restore-behavior), [App Privacy disclosures](https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy), [Apple standard terms](https://www.apple.com/legal/internet-services/itunes/dev/stdeula/).
