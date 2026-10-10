import XCTest

@MainActor
final class ForwardingUITests: XCTestCase {
    func testGuidedFlowRequiresRealCheckResultsAndCopiesEachCarrierCode() {
        let app = launch()
        capture(app, "Guided welcome")
        tapPrimary(app); expect(app, "You’re in control")
        tapPrimary(app); expect(app, "Know when Shield calls")
        tapPrimary(app); expect(app, "First, a sound check")
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        tapPrimary(app)
        XCTAssertTrue(app.staticTexts["forwarding-probe-passed"].waitForExistence(timeout: 5))
        tapPrimary(app); expect(app, "Send unknown calls to Shield")
        tapPrimary(app)
        XCTAssertTrue(app.staticTexts["phone-settings-unverified"].exists)
        tapPrimary(app); expect(app, "Let Shield take messages")
        tapPrimary(app)
        XCTAssertTrue(app.staticTexts["phone-settings-unverified"].exists)
        tapPrimary(app)
        for title in ["When you don’t answer", "When your line is busy", "When you have no signal"] {
            expect(app, title)
            XCTAssertTrue(app.staticTexts["forwarding-code"].exists)
            tapPrimary(app)
            XCTAssertTrue(app.staticTexts["Your code is copied"].exists)
            if title == "When you don’t answer" { capture(app, "Guided Tello code") }
            tapPrimary(app)
        }
        expect(app, "Check your forwarding")
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        tapPrimary(app)
        XCTAssertTrue(app.staticTexts["forwarding-probe-passed"].waitForExistence(timeout: 5))
        capture(app, "Automatic forwarding result")
        tapPrimary(app); expect(app, "Your call checks")
        XCTAssertFalse(app.staticTexts["Phone setup tested"].exists)
    }
    func testFailedSoundCheckShowsRetryAndDoesNotAdvance() {
        let app = launch(["--forwarding-test-fails"])
        for _ in 0..<3 { tapPrimary(app) }
        tapPrimary(app)
        XCTAssertTrue(app.staticTexts["This check didn’t finish"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Try the call again")
        XCTAssertFalse(app.staticTexts["Send unknown calls to Shield"].exists)
        capture(app, "Call check recovery")
    }
    func testLargestTextKeepsActionsVisibleAndInstructionsScrollable() {
        let app = launch(["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        capture(app, "Guided welcome large text")
        tapPrimary(app)
        XCTAssertTrue(app.buttons["forwarding-continue"].isHittable)
        app.swipeUp(); app.swipeUp()
        capture(app, "Consent large text")
        XCTAssertTrue(app.buttons["forwarding-continue"].isHittable)
    }
    func testDarkAppearance() {
        let app = launch(["--uitesting-dark"])
        capture(app, "Guided welcome dark")
        tapPrimary(app); tapPrimary(app)
        capture(app, "Contact dark")
    }
    func testSettingsReturnDoesNotConfirmSwitchesAndCanReopen() {
        let app = launch(["--forwarding-start-settings"], title: "Send unknown calls to Shield")
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Open Phone settings")
        capture(app, "Phone setting shortcut")
        tapPrimary(app)
        XCTAssertTrue(app.staticTexts["phone-settings-unverified"].exists)
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "I selected Silence")
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        app.buttons["phone-settings-reopen"].tap()
        expect(app, "Send unknown calls to Shield")
        capture(app, "Phone setting return")
    }
    func testSettingsFallbackKeepsProgressAndInstructionsAvailable() {
        let app = launch(["--forwarding-start-settings", "--settings-link-fails"], title: "Send unknown calls to Shield")
        tapPrimary(app)
        XCTAssertTrue(app.staticTexts["phone-settings-unverified"].exists)
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "I selected Silence")
        tapPrimary(app)
        expect(app, "Let Shield take messages")
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Open Phone settings")
    }
    func testPhoneOpenFailureKeepsCodeAndRequiresCarrierConfirmation() {
        let app = launch(["--forwarding-start-code", "--phone-link-fails"], title: "When you don’t answer")
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Copy code and open Phone")
        tapPrimary(app)
        expect(app, "Your code is copied")
        XCTAssertTrue(app.staticTexts["Your code is copied. iPhone couldn’t open Phone. Open the green Phone app, then choose Keypad to paste it."].exists)
        XCTAssertTrue(app.buttons["forwarding-phone-reopen"].exists)
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Tello confirmed the change")
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        tapPrimary(app)
        expect(app, "When your line is busy")
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Copy code and open Phone")
    }
    private func launch(_ extra: [String] = [], title: String = "Let’s set up Shield") -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-forwarding"] + extra
        app.launch(); expect(app, title); return app
    }
    private func expect(_ app: XCUIApplication, _ text: String) {
        XCTAssertTrue(app.staticTexts[text].waitForExistence(timeout: 5))
    }
    private func tapPrimary(_ app: XCUIApplication) {
        let button = app.buttons["forwarding-continue"]
        XCTAssertTrue(button.waitForExistence(timeout: 5)); XCTAssertTrue(button.isHittable); button.tap()
    }
    private func capture(_ app: XCUIApplication, _ name: String) {
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = name; shot.lifetime = .keepAlways; add(shot)
    }
}
