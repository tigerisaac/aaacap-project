import XCTest

@MainActor
final class RevenueCatSDKUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testMonthlyCancellationFailurePurchaseAndIdentityIsolation() throws {
        let app = try launch(customer: "monthly_customer")
        XCTAssertEqual(app.staticTexts["sdk-price-month"].label, "$9.99 / month")
        XCTAssertEqual(app.staticTexts["sdk-price-year"].label, "$99.99 / year")
        XCTAssertEqual(app.staticTexts["sdk-monthly-equivalent"].label, "$8.33")
        expect(app, "sdk-entitlement", "Inactive")

        buy(app, period: "month", response: "Cancel")
        expect(app, "sdk-outcome", "Cancelled")
        expect(app, "sdk-entitlement", "Inactive")
        XCTAssertTrue(app.buttons["sdk-buy-month"].isEnabled)

        buy(app, period: "month", response: "Test failed purchase")
        expect(app, "sdk-outcome", "The App Store couldn’t finish that. You can try again or restore a purchase.")
        expect(app, "sdk-entitlement", "Inactive")
        XCTAssertTrue(app.buttons["sdk-buy-month"].isEnabled)

        buy(app, period: "month", response: "Test valid purchase")
        expect(app, "sdk-outcome", "Purchased")
        expect(app, "sdk-entitlement", "Active sandbox")
        expect(app, "sdk-product", "shield_qa_monthly")
        XCTAssertGreaterThanOrEqual(Int(app.staticTexts["sdk-events"].label) ?? 0, 2)

        tap(app, "Restore")
        expect(app, "sdk-outcome", "Restored")
        expect(app, "sdk-entitlement", "Active sandbox")

        tap(app, "Switch account")
        expect(app, "sdk-outcome", "Switched")
        expect(app, "sdk-identity", "Secondary")
        expect(app, "sdk-entitlement", "Inactive")
        tap(app, "sdk-buy-month")
        expect(app, "sdk-outcome", "Subscriptions aren’t available right now. Your phone settings haven’t changed. Please try again later.")
        XCTAssertFalse(app.alerts["Test Store Purchase"].exists)

        tap(app, "Switch account")
        expect(app, "sdk-identity", "Primary")
        expect(app, "sdk-entitlement", "Active sandbox")
        tap(app, "Restore")
        expect(app, "sdk-outcome", "Restored")
        capture(app, "Monthly purchase and account isolation")
    }

    func testAnnualPurchase() throws {
        let app = try launch(customer: "annual_customer")
        expect(app, "sdk-entitlement", "Inactive")
        buy(app, period: "year", response: "Test valid purchase")
        expect(app, "sdk-outcome", "Purchased")
        expect(app, "sdk-entitlement", "Active sandbox")
        expect(app, "sdk-product", "shield_qa_annual")
        capture(app, "Annual Test Store purchase")
    }

    /// Run separately after uninstalling the QA app, with the same private customer IDs.
    func testRestoreAnnualAfterFreshInstall() throws {
        let app = try launch(customer: "annual_customer")
        tap(app, "Restore")
        expect(app, "sdk-outcome", "Restored")
        expect(app, "sdk-entitlement", "Active sandbox")
        expect(app, "sdk-product", "shield_qa_annual")
        capture(app, "Fresh install restored Test Store annual")
    }

    private func launch(customer: String) throws -> XCUIApplication {
        guard let path = ProcessInfo.processInfo.environment["SHIELD_REVENUECAT_CONFIG_FILE"] else {
            throw XCTSkip("Opt-in Test Store verification requires a private configuration file")
        }
        let configuration = try JSONDecoder().decode([String: String].self, from: Data(contentsOf: URL(fileURLWithPath: path)))
        guard let key = configuration["test_key"], key.hasPrefix("test_"),
              let primary = configuration[customer], UUID(uuidString: primary) != nil,
              let secondary = configuration["secondary_customer"], UUID(uuidString: secondary) != nil else {
            throw XCTSkip("A Test Store SDK key and synthetic customer UUIDs are required")
        }
        let app = XCUIApplication()
        app.launchEnvironment = ["SHIELD_RC_TEST_KEY": key,
            "SHIELD_RC_CUSTOMER": primary, "SHIELD_RC_SECOND_CUSTOMER": secondary]
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        app.launch()
        expect(app, "sdk-outcome", "Ready")
        return app
    }

    private func buy(_ app: XCUIApplication, period: String, response: String) {
        tap(app, "sdk-buy-\(period)")
        let sheet = app.alerts["Test Store Purchase"]
        XCTAssertTrue(sheet.waitForExistence(timeout: 15))
        sheet.buttons[response].tap()
    }

    private func tap(_ app: XCUIApplication, _ identifier: String) {
        let element = app.buttons[identifier]
        for _ in 0..<6 where !element.isHittable { app.swipeUp() }
        if !element.isHittable { for _ in 0..<6 where !element.isHittable { app.swipeDown() } }
        XCTAssertTrue(element.isHittable)
        element.tap()
    }

    private func expect(_ app: XCUIApplication, _ id: String, _ value: String) {
        let element = app.staticTexts[id]
        // SwiftUI's List may unload the status rows after scrolling to Restore.
        for _ in 0..<5 where !element.exists { app.swipeDown() }
        let expectation = XCTNSPredicateExpectation(predicate: NSPredicate(format: "label == %@", value), object: element)
        let result = XCTWaiter.wait(for: [expectation], timeout: 25)
        if result != .completed { capture(app, "Unexpected \(id)") }
        XCTAssertEqual(result, .completed, "Expected \(id): \(value); observed: \(element.exists ? element.label : "missing row")")
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        let image = XCTAttachment(screenshot: app.screenshot())
        image.name = name; image.lifetime = .keepAlways; add(image)
    }
}
