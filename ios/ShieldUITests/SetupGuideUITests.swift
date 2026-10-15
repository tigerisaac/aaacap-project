import XCTest

@MainActor
final class SetupGuideUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testSettingsGuideCanPauseAndReplayWithoutConfirmingSetting() {
        let app = launch(["--forwarding-start-settings"])
        let playback = app.buttons["setup-guide-playback"]
        XCTAssertTrue(playback.waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["Pause guide"].waitForExistence(timeout: 5))
        playback.tap()
        XCTAssertEqual(playback.label, "Play guide")
        playback.tap()
        XCTAssertEqual(playback.label, "Pause guide")
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Open Phone settings")
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        capture(app, "Settings visual guide")
    }

    func testUnavailableFloatingGuideKeepsSettingsAndProgressUsable() {
        let app = launch(["--forwarding-start-settings", "--setup-guide-unavailable"])
        app.buttons["setup-guide-float"].tap()
        XCTAssertTrue(app.staticTexts["setup-guide-fallback"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Open Phone settings")
        app.buttons["forwarding-continue"].tap()
        XCTAssertTrue(app.buttons["phone-settings-reopen"].exists)
        XCTAssertTrue(app.staticTexts["Screen Unknown Callers"].exists)
        app.buttons["forwarding-continue"].tap()
        XCTAssertTrue(app.staticTexts["Live Voicemail"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Open Phone settings")
        XCTAssertTrue(app.buttons["setup-guide-playback"].exists)
        capture(app, "Voicemail visual guide")
    }

    func testReturnFromOtherAppPausesGuideAndRetainsCarrierStep() {
        let app = launch(["--forwarding-start-code"])
        XCTAssertTrue(app.buttons["Pause guide"].waitForExistence(timeout: 5))
        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertTrue(app.staticTexts["forwarding-carrier-result"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.buttons["setup-guide-playback"].label, "Play guide")
        XCTAssertTrue(app.staticTexts["When you don’t answer"].exists)
        XCTAssertFalse(app.staticTexts["When you’re on a call"].exists)
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        capture(app, "Phone guide after return")
    }

    func testClosingDuringFloatingStartupCanReopenTheSameStep() {
        let app = launch(["--forwarding-start-settings", "--forwarding-navigation-test"])
        app.buttons["setup-guide-float"].tap()
        app.buttons["Close"].tap()
        XCTAssertTrue(app.buttons["forwarding-preview-home"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["setup-guide-playback"].exists)
        app.buttons["forwarding-preview-home"].tap()
        XCTAssertTrue(app.staticTexts["Screen Unknown Callers"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Open Phone settings")
        XCTAssertTrue(app.buttons["Pause guide"].waitForExistence(timeout: 5))
    }

    func testLargestTextDarkGuideControlsAndWrittenStepsRemainReachable() {
        let app = launch(["--forwarding-start-code", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        XCTAssertTrue(app.buttons["Pause guide"].waitForExistence(timeout: 5))
        let playback = app.buttons["setup-guide-playback"]
        reveal(playback, in: app)
        playback.tap()
        XCTAssertEqual(playback.label, "Play guide")
        reveal(app.buttons["setup-guide-float"], in: app)
        let writtenSteps = app.buttons["Read the steps"]
        reveal(writtenSteps, in: app)
        writtenSteps.tap()
        let paste = app.staticTexts["Paste your code"]
        reveal(paste, in: app)
        XCTAssertTrue(paste.isHittable)
        reveal(app.buttons["forwarding-continue"], in: app)
        capture(app, "Phone guide largest text dark")
    }

    func testRestorationSettingsHaveTheirOwnGuidesAndConfirmations() {
        let app = launch(["--forwarding-start-restore", "--restoration-start-settings"])
        XCTAssertTrue(app.staticTexts["Let ordinary calls ring"].waitForExistence(timeout: 5))
        reveal(app.buttons["setup-guide-playback"], in: app)
        XCTAssertTrue(app.buttons["setup-guide-playback"].exists)
        app.buttons["restoration-settings-confirm"].tap()
        XCTAssertTrue(app.staticTexts["Restore iPhone voicemail"].waitForExistence(timeout: 5))
        reveal(app.buttons["setup-guide-playback"], in: app)
        XCTAssertTrue(app.buttons["setup-guide-playback"].exists)
        XCTAssertFalse(app.staticTexts["restoration-complete"].exists)
        capture(app, "Restoration voicemail guide")
    }

    private func launch(_ arguments: [String]) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-forwarding"] + arguments
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
