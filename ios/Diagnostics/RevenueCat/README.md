# RevenueCat SDK verification

This opt-in harness tests the real pinned RevenueCat SDK through Shield's `RevenueCatClient`, without Apple setup or charges. It is not the production subscription UI or a replacement for Apple's sandbox, TestFlight, Ask to Buy, receipt transfer, billing recovery, refund or physical-device checks. The regular subscription UI and state machine have separate tests.

`node scripts/prepare-revenuecat-sdk-test.mjs artifacts/private/<new-directory>` exports the current committed iOS source, overlays the current adapter, replaces the app entry point with these diagnostic files, and generates a temporary project. It uses the separate bundle identifier `org.isaaczhang.Shield.RevenueCatQA`. No canonical project file is changed.

Build this temporary project for a simulator with the Shield scheme and Debug configuration. The copied Debug configuration explicitly defines `SHIELD_REVENUECAT_TEST_STORE`; all three conditions (that flag, `DEBUG`, and simulator) are required. The adapter then accepts only Test Store keys. The diagnostic entry point refuses to compile for Release or a device. Never use `forceAllowTestStoreInReleaseBuilds`.

Create a mode-0600 JSON file under the ignored private directory with `test_key`, `monthly_customer`, `annual_customer`, and `secondary_customer`. Retrieve the public Test Store key privately from RevenueCat and generate new synthetic UUIDs for the customer fields. Do not use a live Shield customer binding. Pass only the file's absolute path to the UI test runner as `SHIELD_REVENUECAT_CONFIG_FILE` through the generated `.xctestrun` target's `EnvironmentVariables`. If copying that file outside Build/Products, resolve its `__TESTROOT__` paths to the original products directory. Keep logs and raw result bundles private because SDK diagnostics may contain customer identifiers.

Run `testAnnualPurchase` and `testMonthlyCancellationFailurePurchaseAndIdentityIsolation` serially. They verify localized SDK prices, successful purchases, cancellation recovery, a readable simulated-failure message, customer-info updates, active sandbox entitlements, restore, identity switching and rejection of stale packages. The QA app has no connection to the Shield backend.

Then uninstall **only** `org.isaaczhang.Shield.RevenueCatQA` from that simulator. Run `testRestoreAnnualAfterFreshInstall` using the same annual customer UUID. This verifies recovering the Test Store entitlement with the same RevenueCat identity and calling restore after a fresh installation; it does not verify Apple receipt restoration or transfer between Shield accounts.

Finally, inspect the synthetic customers in RevenueCat. Both purchased subscriptions must say `store: test_store`, `environment: sandbox`, the expected product and price, and entitlement `shield_qa_access`. The secondary identity must have no subscriptions or entitlements. Production offering `default` and entitlement `shield_access` must remain unattached to these QA products. Do not count only the on-device success message as verification.

After testing, verify a normal Release archive with `scripts/check-ios-archive.mjs`; it rejects QA markers and fixtures. Keep Apple lifecycle and real-phone gates open in the release report.
