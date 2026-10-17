import XCTest

@MainActor
final class PhoneSetupShortcutUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testNormalSetupInstallsRunsAndRequiresBothConfirmations() {
        let app = launch()
        XCTAssertEqual(primary(app).label, "Add to iPhone")
        XCTAssertTrue(app.staticTexts["phone-helper-install-directions"].exists)
        XCTAssertFalse(app.buttons["setup-guide-float"].exists)
        capture(app, "Actual setup Add helper")
        primary(app).tap()
        XCTAssertTrue(app.staticTexts["Turn off Live Voicemail"].appears(timeout: 5))
        XCTAssertEqual(primary(app).label, "Open Phone settings")
        capture(app, "Actual setup turn Live Voicemail off")
        primary(app).tap()
        XCTAssertTrue(app.staticTexts["Check Silence"].appears(timeout: 5))
        XCTAssertEqual(primary(app).label, "Silence has a checkmark")
        XCTAssertFalse(app.staticTexts["Connect calls to Shield"].exists)
        capture(app, "Actual setup unconfirmed Silence")
        app.buttons["Need help?"].tap()
        app.buttons["phone-settings-reopen"].tap()
        XCTAssertTrue(app.staticTexts["Check Silence"].appears(timeout: 5))
        XCTAssertEqual(primary(app).label, "Silence has a checkmark")
        app.buttons["Need help?"].tap()
        primary(app).tap()
        XCTAssertTrue(app.staticTexts["Confirm Live Voicemail"].appears(timeout: 5))
        XCTAssertEqual(primary(app).label, "Live Voicemail is off")
        XCTAssertFalse(app.staticTexts["Connect calls to Shield"].exists)
        capture(app, "Actual setup unconfirmed voicemail")
        primary(app).tap()
        XCTAssertTrue(app.staticTexts["Connect calls to Shield"].appears(timeout: 5))
    }

    func testAlreadyAddedDoesNotConfirmEitherSetting() {
        let app = launch()
        app.buttons["phone-helper-already-added"].tap()
        XCTAssertEqual(primary(app).label, "Open Phone settings")
        XCTAssertFalse(app.staticTexts["Check Silence"].exists)
        XCTAssertFalse(app.staticTexts["Confirm Live Voicemail"].exists)
    }

    func testMissingShortcutKeepsRetryAndManualGuide() {
        let app = launch(["--shortcut-already-added", "--shortcut-open-fails"])
        primary(app).tap()
        XCTAssertTrue(app.staticTexts["forwarding-error"].appears(timeout: 5))
        XCTAssertEqual(primary(app).label, "Open Phone settings")
        XCTAssertFalse(app.staticTexts["Check Silence"].exists)
        app.buttons["Need help?"].tap()
        reveal(app.buttons["phone-helper-manual-guide"], app: app)
        XCTAssertGreaterThanOrEqual(app.buttons["phone-helper-manual-guide"].frame.height, 52)
        capture(app, "Actual setup missing helper recovery")
        app.buttons["phone-helper-manual-guide"].tap()
        XCTAssertTrue(app.staticTexts["Change Phone settings"].appears(timeout: 5))
        XCTAssertTrue(app.buttons["Read the steps"].exists)
    }

    func testLargestTextInstallationFailureRetainsSavedFileAndManualRecovery() {
        let app = launch(["--shortcut-install-fails", "--uitesting-dark",
                          "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        capture(app, "Actual setup largest text installation top")
        reveal(primary(app), app: app)
        primary(app).tap()
        XCTAssertTrue(app.staticTexts["forwarding-error"].appears(timeout: 5))
        XCTAssertEqual(primary(app).label, "Add to iPhone")
        app.buttons["Need help?"].tap()
        reveal(app.buttons["phone-helper-saved-file"], app: app)
        capture(app, "Actual setup largest text import recovery")
        reveal(app.buttons["phone-helper-manual-guide"], app: app)
        app.buttons["phone-helper-manual-guide"].tap()
        reveal(primary(app), app: app)
        XCTAssertEqual(primary(app).label, "Open Phone settings")
    }

    func testUnavailableGuideRequiresDeliberateContinuationAndReopenRetries() {
        let app = launch(["--shortcut-already-added", "--setup-guide-unavailable"])
        primary(app).tap()
        XCTAssertTrue(app.staticTexts["forwarding-error"].appears(timeout: 5))
        XCTAssertEqual(primary(app).label, "Open Settings anyway")
        XCTAssertFalse(app.staticTexts["Check Silence"].exists)
        capture(app, "Actual setup guide failure before leaving")
        primary(app).tap()
        XCTAssertTrue(app.staticTexts["Check Silence"].appears(timeout: 5))
        app.buttons["Need help?"].tap()
        app.buttons["phone-settings-reopen"].tap()
        XCTAssertEqual(primary(app).label, "Open Settings anyway")
        XCTAssertFalse(app.staticTexts["Check Silence"].exists)
    }

    func testPublicAddRouteInNormalSetupDoesNotRunOrConfirm() {
        let shortcuts = XCUIApplication(bundleIdentifier: "com.apple.shortcuts")
        shortcuts.terminate()
        shortcuts.launch()
        // A newly updated simulator can cover the import sheet with Apple's release notes.
        if shortcuts.staticTexts["What’s New in Shortcuts"].appears(timeout: 3) {
            shortcuts.buttons["Continue"].tap()
        }
        shortcuts.terminate()
        let app = launch(["--uitesting-system-settings"])
        primary(app).tap()
        XCTAssertTrue(shortcuts.buttons["Add Shortcut"].appears(timeout: 30))
        capture(shortcuts, "Actual setup native Add Shortcut")
        app.activate()
        XCTAssertTrue(app.staticTexts["Turn off Live Voicemail"].appears(timeout: 5))
        XCTAssertEqual(primary(app).label, "Open Phone settings")
        XCTAssertFalse(app.staticTexts["Check Silence"].exists)
    }

    private func launch(_ arguments: [String] = []) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-forwarding", "--forwarding-start-settings"] + arguments
        app.launch()
        XCTAssertTrue(primary(app).appears(timeout: 10))
        return app
    }

    private func primary(_ app: XCUIApplication) -> XCUIElement { app.buttons["forwarding-continue"] }

    private func reveal(_ element: XCUIElement, app: XCUIApplication) {
        let scroll = app.scrollViews.firstMatch
        for _ in 0..<16 {
            let top = max(scroll.frame.minY, app.navigationBars.firstMatch.frame.maxY)
            let bottom = element.identifier == "forwarding-continue" ? app.frame.maxY - 28 : min(primary(app).frame.minY, app.frame.maxY - 28)
            if element.exists && element.isHittable && element.frame.minY >= top && element.frame.maxY <= bottom { return }
            let movingDown = element.exists && !element.frame.isEmpty && element.frame.minY < top
            scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: movingDown ? 0.35 : 0.75))
                .press(forDuration: 0.05, thenDragTo: scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: movingDown ? 0.65 : 0.4)))
        }
        XCTAssertTrue(element.isHittable)
        XCTAssertLessThanOrEqual(element.frame.maxY, element.identifier == "forwarding-continue" ? app.frame.maxY - 28 : primary(app).frame.minY)
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
