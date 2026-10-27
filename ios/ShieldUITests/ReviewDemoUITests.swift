import XCTest

/// Uses the public entry point, including in Release. No fixture launch argument or backend login.
@MainActor
final class ReviewDemoUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    private func openDemo(large: Bool = false) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = large ? ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"] : []
        app.launch()
        // The prior case may have left the disposable local session onscreen.
        let explore = app.buttons["explore-review-demo"]
        XCTAssertTrue(explore.waitForExistence(timeout: 15))
        reveal(explore, app)
        capture(app, large ? "Demo Welcome largest" : "Demo Welcome")
        explore.tap()
        XCTAssertTrue(app.staticTexts["demoBanner"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["demoBanner"].label, "Demo, fictional activity, no live calls")
        capture(app, large ? "Demo Home largest" : "Demo Home")
        return app
    }

    func testSavedMessageSummaryPauseResumeAndReplay() {
        let app = openDemo()
        app.buttons["Messages"].tap()
        XCTAssertTrue(app.segmentedControls["message-filter"].waitForExistence(timeout: 5))
        capture(app, "Demo Messages")
        let message = app.buttons.containing(NSPredicate(format: "label CONTAINS %@", "Appointment message")).firstMatch
        reveal(message, app); message.tap()
        XCTAssertTrue(app.staticTexts["message-summary"].waitForExistence(timeout: 5))
        let listen = app.buttons["Listen to message"]
        reveal(listen, app); listen.tap()
        let pause = app.buttons["Pause message"]
        XCTAssertTrue(pause.waitForExistence(timeout: 5)); pause.tap()
        XCTAssertTrue(app.buttons["Resume message"].waitForExistence(timeout: 3))
        capture(app, "Demo Message paused")
        XCTAssertTrue(app.staticTexts["demoBanner"].isHittable)
        app.buttons["Resume message"].tap()
        XCTAssertTrue(pause.waitForExistence(timeout: 3)); pause.tap()
        let restart = app.buttons["Start over"]
        reveal(restart, app); restart.tap()
        XCTAssertTrue(pause.waitForExistence(timeout: 3))
        app.buttons["Calls"].tap()
        XCTAssertFalse(app.alerts["Couldn’t finish that"].exists)
        capture(app, "Demo Calls")
    }

    func testBlockedChangesPersistWithinDemoAndResetOnExit() {
        let app = openDemo()
        settings(app)
        app.buttons["Blocked numbers"].tap()
        let allow = app.buttons["unblock-+13125550199"]
        XCTAssertTrue(allow.waitForExistence(timeout: 5)); capture(app, "Demo Blocked numbers")
        allow.tap(); app.alerts.buttons["Allow calls again"].tap()
        XCTAssertTrue(app.staticTexts["No blocked numbers"].waitForExistence(timeout: 3))
        app.buttons["BackButton"].tap()
        app.buttons["Blocked numbers"].tap()
        XCTAssertTrue(app.staticTexts["No blocked numbers"].waitForExistence(timeout: 3))
        app.buttons["More"].tap()
        for _ in 0..<3 where app.buttons["BackButton"].exists { app.buttons["BackButton"].tap() }
        let leave = app.buttons["Leave demo"]
        reveal(leave, app); leave.tap()
        XCTAssertTrue(app.buttons["explore-review-demo"].waitForExistence(timeout: 5))
        app.buttons["explore-review-demo"].tap()
        settings(app); app.buttons["Blocked numbers"].tap()
        XCTAssertTrue(app.buttons["unblock-+13125550199"].waitForExistence(timeout: 5))
    }

    func testCaretakersAndWarningUseLocalState() {
        let app = openDemo()
        settings(app)
        let caretakers = app.buttons["caretakers-settings"]
        reveal(caretakers, app); caretakers.tap()
        let toggle = app.switches["Send protection alerts"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 5)); XCTAssertEqual(toggle.value as? String, "1")
        capture(app, "Demo Caretakers")
        toggle.tap(); XCTAssertEqual(toggle.value as? String, "0")
        app.buttons["BackButton"].tap(); caretakers.tap()
        XCTAssertEqual(toggle.value as? String, "0")
        app.buttons["BackButton"].tap()
        let checks = app.buttons["Checks while you talk"]
        reveal(checks, app, up: true); checks.tap()
        let monitoring = app.switches["Check calls while I talk"]
        XCTAssertTrue(monitoring.waitForExistence(timeout: 5)); monitoring.tap()
        app.alerts.buttons["Turn on"].tap(); XCTAssertEqual(monitoring.value as? String, "1")
        let warning = app.buttons["Hear sample warning"]
        reveal(warning, app); warning.tap()
        XCTAssertTrue(app.buttons["Pause warning"].waitForExistence(timeout: 5))
        app.buttons["Pause warning"].tap(); capture(app, "Demo Warning paused")
        XCTAssertTrue(app.buttons["Resume warning"].exists)
    }

    func testLargestTextKeepsDemoEntryAndPlaybackReachable() {
        let app = openDemo(large: true)
        app.buttons["Messages"].tap()
        let message = app.buttons.containing(NSPredicate(format: "label CONTAINS %@", "Saved account notice")).firstMatch
        reveal(message, app); message.tap()
        let listen = app.buttons["Listen to message"]
        reveal(listen, app); XCTAssertTrue(listen.isHittable); listen.tap()
        let pause = app.buttons["Pause message"]
        reveal(pause, app); pause.tap()
        XCTAssertTrue(app.buttons["Resume message"].exists)
        capture(app, "Demo Message largest paused")
        XCTAssertTrue(app.staticTexts["demoBanner"].isHittable)
    }

    func testGuideDisclosesLimitsAndOpensSampleAlert() {
        let app = openDemo()
        let about = app.buttons["About this demo"]
        reveal(about, app); about.tap()
        XCTAssertTrue(app.staticTexts["Explore Shield with fictional calls, people and voice messages."].exists)
        capture(app, "Demo Guide")
        let inbox = app.buttons["See a caretaker alert"]
        reveal(inbox, app); inbox.tap()
        XCTAssertTrue(app.staticTexts["Pat · Sample alert"].waitForExistence(timeout: 5))
        capture(app, "Demo Caretaker alert")
        XCTAssertTrue(app.staticTexts["demoBanner"].isHittable)
    }

    private func settings(_ app: XCUIApplication) {
        app.buttons["More"].tap()
        let settings = app.buttons["Settings"]
        XCTAssertTrue(settings.waitForExistence(timeout: 5)); reveal(settings, app); settings.tap()
    }

    private func reveal(_ element: XCUIElement, _ app: XCUIApplication, up: Bool = false) {
        for _ in 0..<10 where !element.isHittable { if up { app.swipeDown() } else { app.swipeUp() } }
        XCTAssertTrue(element.isHittable)
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        // Let native navigation and the separate demo marker finish their layout before capturing pixels.
        Thread.sleep(forTimeInterval: 1)
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
}
