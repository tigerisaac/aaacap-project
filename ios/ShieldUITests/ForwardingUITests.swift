import XCTest

@MainActor
final class ForwardingUITests: XCTestCase {
    func testGuidedFlowRequiresRealCheckResultsAndPreparesEachCarrierCode() {
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
        XCTAssertTrue(app.staticTexts["phone-settings-unverified"].exists)
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Live Voicemail is off")
        tapPrimary(app)
        for title in ["When you don’t answer", "When your line is busy", "When you have no signal"] {
            expect(app, title)
            XCTAssertTrue(app.staticTexts["forwarding-code"].exists)
            XCTAssertTrue(app.staticTexts["Your code is copied"].waitForExistence(timeout: 5))
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
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Live Voicemail is off")
    }
    func testCopyRequiresCarrierConfirmationAndResetsForNextCode() {
        let app = launch(["--forwarding-start-code"], title: "When you don’t answer")
        expect(app, "Your code is copied")
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Tello confirmed the change")
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        app.swipeUp()
        app.buttons["forwarding-copy-code"].tap()
        expect(app, "When you don’t answer")
        tapPrimary(app)
        expect(app, "When your line is busy")
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Tello confirmed the change")
        XCTAssertTrue(app.staticTexts["forwarding-code-copied"].exists)
        XCTAssertEqual(app.staticTexts["forwarding-code"].label, "**67*12025550100#")
        app.terminate()
        let resumed = launch(["--forwarding-start-code"], title: "When you don’t answer")
        expect(resumed, "Your code is copied")
        XCTAssertFalse(resumed.staticTexts["Check your forwarding"].exists)
    }
    func testRestorationPreparesEachResetWithoutAdvancingUntilConfirmed() {
        let app = launch(["--forwarding-start-restore"], title: "Restore your phone")
        XCTAssertTrue(app.staticTexts["forwarding-reset-code"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["forwarding-reset-code"].label, "##61#")
        XCTAssertEqual(app.buttons["forwarding-reset-continue"].label, "Tello confirmed this reset")
        app.buttons["forwarding-reset-copy"].tap()
        XCTAssertEqual(app.staticTexts["forwarding-reset-code"].label, "##61#")
        app.buttons["forwarding-reset-continue"].tap()
        XCTAssertEqual(app.staticTexts["forwarding-reset-code"].label, "##67#")
        XCTAssertEqual(app.buttons["forwarding-reset-continue"].label, "Tello confirmed this reset")
        app.buttons["forwarding-reset-continue"].tap()
        XCTAssertEqual(app.staticTexts["forwarding-reset-code"].label, "##62#")
        app.buttons["forwarding-reset-continue"].tap()
        expect(app, "Restore your original iPhone settings")
        XCTAssertFalse(app.staticTexts["forwarding-reset-code"].exists)
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
    }

    func testReturningChangesInstructionsButNeverConfirmsCarrierChange() {
        let app = launch(["--forwarding-start-code"], title: "When you don’t answer")
        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertTrue(app.staticTexts["forwarding-carrier-result"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["When you don’t answer"].exists)
        XCTAssertFalse(app.staticTexts["When your line is busy"].exists)
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Tello confirmed the change")
        app.buttons["forwarding-phone-reopen"].tap()
        XCTAssertFalse(app.staticTexts["forwarding-carrier-result"].exists)
        XCTAssertTrue(app.staticTexts["When you don’t answer"].exists)
        capture(app, "Phone return and retry")
    }

    func testCarrierCodeAtLargestTextInDarkMode() {
        let app = launch(["--forwarding-start-code", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"], title: "When you don’t answer")
        XCTAssertTrue(app.buttons["forwarding-continue"].isHittable)
        XCTAssertEqual(app.staticTexts["forwarding-code"].label, "**61*12025550100#")
        let retry = app.buttons["forwarding-phone-reopen"]
        for _ in 0..<6 where !retry.isHittable { app.scrollViews.firstMatch.swipeUp() }
        XCTAssertTrue(retry.isHittable)
        capture(app, "Carrier code largest text dark")
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
