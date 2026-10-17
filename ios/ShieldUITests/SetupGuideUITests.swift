import XCTest

@MainActor
final class SetupGuideUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testSettingsHasOnePrimaryActionAndNoPlaybackControls() {
        let app = launch(["--forwarding-start-settings"])
        XCTAssertFalse(app.buttons["setup-guide-playback"].exists)
        XCTAssertFalse(app.buttons["setup-guide-float"].exists)
        XCTAssertTrue(app.staticTexts["phone-settings-navigation"].label.contains("Slide your finger up past Announce Calls"))
        XCTAssertTrue(app.staticTexts["phone-settings-target"].label.contains("Stop at Live Voicemail"))
        XCTAssertTrue(app.staticTexts["1. Live Voicemail: off"].exists)
        XCTAssertTrue(app.staticTexts["2. Screen Unknown Callers: Silence"].exists)
        XCTAssertFalse(app.staticTexts["phone-settings-navigation"].label.contains("back arrow"))
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Open Phone settings")
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        capture(app, "Settings handcrafted GIF")
    }

    func testSettingsReturnStillRequiresExplicitConfirmation() {
        let app = launch(["--forwarding-start-settings"])
        app.buttons["forwarding-continue"].tap()
        XCTAssertTrue(app.staticTexts["Change Phone settings"].exists)
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "I selected Silence")
        app.buttons["Read the steps"].tap()
        XCTAssertTrue(app.buttons["phone-settings-reopen"].exists)
        app.buttons["Read the steps"].tap()
        app.buttons["forwarding-continue"].tap()
        XCTAssertTrue(app.staticTexts["Turn off Live Voicemail"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Live Voicemail is off")
        XCTAssertFalse(app.staticTexts["Connect calls to Shield"].exists, "A visit must not confirm either setting")
        capture(app, "Voicemail confirmation after the same Settings visit")
        app.buttons["forwarding-continue"].tap()
        XCTAssertTrue(app.staticTexts["Connect calls to Shield"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["setup-guide-playback"].exists)
    }

    func testUnavailableFloatingReminderExplainsBeforeLeaving() {
        let app = launch(["--forwarding-start-settings", "--setup-guide-unavailable"])
        app.buttons["forwarding-continue"].tap()
        XCTAssertTrue(app.staticTexts["forwarding-error"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Open Settings anyway")
        XCTAssertFalse(app.buttons["I selected Silence"].exists)
        capture(app, "Floating reminder unavailable recovery")
        app.buttons["forwarding-continue"].tap()
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "I selected Silence")
        XCTAssertTrue(app.staticTexts["Change Phone settings"].exists)
        capture(app, "Reminder unavailable return stays unconfirmed")
        app.buttons["forwarding-continue"].tap()
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Live Voicemail is off")
    }

    func testUnavailableReminderWhenReopeningKeepsDeliberateFallback() {
        let app = launch(["--forwarding-start-settings", "--setup-guide-unavailable"])
        app.buttons["forwarding-continue"].tap()
        app.buttons["forwarding-continue"].tap()
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "I selected Silence")
        app.buttons["Read the steps"].tap()
        reveal(app.buttons["phone-settings-reopen"], in: app)
        app.buttons["phone-settings-reopen"].tap()
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Open Settings anyway")
        app.buttons["forwarding-continue"].tap()
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "I selected Silence")
        XCTAssertTrue(app.staticTexts["Change Phone settings"].exists)
    }

    func testUnavailableReminderLargestTextRecoveryIsReachable() {
        let app = launch(["--forwarding-start-settings", "--setup-guide-unavailable", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        reveal(app.buttons["forwarding-continue"], in: app)
        app.buttons["forwarding-continue"].tap()
        let message = app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "The floating reminder couldn’t open.")).firstMatch
        XCTAssertTrue(message.waitForExistence(timeout: 5))
        capture(app, "Reminder unavailable largest text dark top")
        reveal(app.buttons["forwarding-continue"], in: app)
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Open Settings anyway")
        capture(app, "Reminder unavailable largest text dark action")
        app.buttons["forwarding-continue"].tap()
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "I selected Silence")
    }

    func testReturnFromOtherAppRetainsCarrierStepAndWrittenRecovery() {
        let app = launch(["--forwarding-start-code"])
        app.buttons["forwarding-continue"].tap()
        app.buttons["forwarding-continue"].tap()
        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertTrue(app.staticTexts["forwarding-carrier-result"].waitForExistence(timeout: 5))
        app.buttons["Watch the guide again"].tap()
        XCTAssertFalse(app.buttons["setup-guide-playback"].exists)
        XCTAssertFalse(app.buttons["setup-guide-float"].exists)
        XCTAssertTrue(app.staticTexts["Check Tello’s result"].exists)
        XCTAssertEqual(app.staticTexts["forwarding-code-sequence"].label, "Code 1 of 3")
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        capture(app, "Phone guide after return")
    }

    func testClosingAndReopeningKeepsTheSameStep() {
        let app = launch(["--forwarding-start-settings", "--forwarding-navigation-test"])
        app.buttons["Close"].tap()
        XCTAssertTrue(app.buttons["forwarding-preview-home"].waitForExistence(timeout: 5))
        app.buttons["forwarding-preview-home"].tap()
        XCTAssertTrue(app.staticTexts["Change Phone settings"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Open Phone settings")
        XCTAssertFalse(app.buttons["setup-guide-float"].exists)
    }

    func testLargestTextDarkWrittenStepsAndPrimaryRemainReachable() {
        let app = launch(["--forwarding-start-code", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        let writtenSteps = app.buttons["Read the steps"]
        reveal(writtenSteps, in: app)
        writtenSteps.tap()
        let paste = app.staticTexts["Paste your code"]
        reveal(paste, in: app)
        XCTAssertTrue(paste.isHittable)
        reveal(app.buttons["forwarding-continue"], in: app)
        capture(app, "Phone guide largest text dark")
    }

    func testRestorationGuidesKeepTheirExplicitConfirmations() {
        let app = launch(["--forwarding-start-restore", "--restoration-start-settings"])
        XCTAssertTrue(app.staticTexts["Let ordinary calls ring"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["setup-guide-float"].exists)
        XCTAssertTrue(app.buttons["restoration-settings-open"].isHittable)
        XCTAssertLessThanOrEqual(app.buttons["restoration-settings-open"].frame.maxY,
                                 app.buttons["restoration-settings-confirm"].frame.minY)
        capture(app, "Restoration unknown callers action")
        app.buttons["restoration-settings-confirm"].tap()
        XCTAssertTrue(app.staticTexts["Restore iPhone voicemail"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["setup-guide-playback"].exists)
        XCTAssertFalse(app.staticTexts["restoration-complete"].exists)
        XCTAssertTrue(app.buttons["restoration-settings-open"].isHittable)
        XCTAssertLessThanOrEqual(app.buttons["restoration-settings-open"].frame.maxY,
                                 app.buttons["restoration-settings-confirm"].frame.minY)
        capture(app, "Restoration voicemail handcrafted GIF")
    }

    func testSettingInstructionsKeepExplicitConfirmation() {
        let app = launch(["--forwarding-start-settings"])
        XCTAssertTrue(app.staticTexts["phone-settings-navigation"].exists)
        app.buttons["forwarding-continue"].tap()
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "I selected Silence")
        capture(app, "Setting instructions and confirmation")
    }

    func testVoicemailResumedWithoutCombinedVisitStillOpensSettings() {
        let app = launch(["--forwarding-start-voicemail"])
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Open Phone settings")
        app.buttons["forwarding-continue"].tap()
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Live Voicemail is off")
        XCTAssertFalse(app.staticTexts["Connect calls to Shield"].exists)
    }

    func testAlreadyChangedBothStillRequiresBothConfirmations() {
        let app = launch(["--forwarding-start-settings"])
        app.buttons["Read the steps"].tap()
        let changed = app.buttons["I already changed both"]
        reveal(changed, in: app)
        changed.tap()
        app.buttons["Read the steps"].tap()
        app.buttons["forwarding-continue"].tap()
        XCTAssertTrue(app.staticTexts["Turn off Live Voicemail"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Live Voicemail is off")
        XCTAssertFalse(app.staticTexts["Connect calls to Shield"].exists)
    }

    func testLargestTextSettingsInstructionsAndActionRemainReachable() {
        let app = launch(["--forwarding-start-settings", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        capture(app, "Settings largest text dark top")
        reveal(app.staticTexts["phone-settings-navigation"], in: app)
        reveal(app.staticTexts["phone-settings-target"], in: app)
        reveal(app.buttons["Read the steps"], in: app)
        app.buttons["Read the steps"].tap()
        reveal(app.buttons["forwarding-continue"], in: app)
        XCTAssertFalse(app.buttons["setup-guide-float"].exists)
        capture(app, "Settings guide largest text dark")
    }

    private func launch(_ arguments: [String]) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-forwarding", "--forwarding-manual-settings"] + arguments
        app.launch()
        XCTAssertTrue(app.buttons["forwarding-continue"].waitForExistence(timeout: 10)
            || app.buttons["restoration-settings-confirm"].waitForExistence(timeout: 5))
        return app
    }

    private func reveal(_ element: XCUIElement, in app: XCUIApplication) {
        let top = app.navigationBars.firstMatch.frame.maxY
        let primary = app.buttons["forwarding-continue"]
        let bottom = primary.exists && element.identifier != "forwarding-continue" ? min(primary.frame.minY, app.frame.maxY - 40) : app.frame.maxY - 40
        for _ in 0..<12 {
            if element.exists, element.isHittable, element.frame.minY >= top, element.frame.maxY <= bottom { break }
            let scroll = app.scrollViews.firstMatch
            let movingDown = element.exists && !element.frame.isEmpty && element.frame.minY < top
            let start = scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: movingDown ? 0.35 : 0.75))
            let end = scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: movingDown ? 0.65 : 0.45))
            start.press(forDuration: 0.05, thenDragTo: end)
        }
        capture(app, "Guide control visibility")
        XCTAssertTrue(element.isHittable)
        XCTAssertGreaterThanOrEqual(element.frame.minY, top)
        XCTAssertLessThanOrEqual(element.frame.maxY, bottom)
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
