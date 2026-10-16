import XCTest

@MainActor
final class LiveSetupGuideUITests: XCTestCase {
    func testPracticeGuideChangesToStopWithoutScreenPermission() throws {
        let app = launch(["--uitesting-live-guide-demo"])
        let instruction = app.staticTexts["live-guide-instruction"]
        let stopped = NSPredicate(format: "label == %@", "Stop here")
        expectation(for: stopped, evaluatedWith: instruction)
        waitForExpectations(timeout: 8)
        XCTAssertFalse(app.buttons["live-guide-open-settings"].isEnabled)
        XCTAssertFalse(app.buttons["setup-guide-float"].exists)
        XCTAssertFalse(app.buttons["setup-guide-playback"].exists)
        capture(app, "Live instruction stop preview")
    }

    func testSimulatorExplainsCaptureUnavailableWithoutLeavingApp() throws {
        #if targetEnvironment(simulator)
        let app = launch([])
        app.buttons["live-guide-open-settings"].tap()
        XCTAssertTrue(app.staticTexts["live-guide-error"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.staticTexts["live-guide-error"].label.contains("real iPhone"))
        XCTAssertEqual(app.state, .runningForeground)
        #else
        throw XCTSkip("Never approve owner screen access from an automated test")
        #endif
    }

    func testLargestTextKeepsPermissionExplanationReachable() throws {
        let app = launch(["--uitesting-live-guide-demo", "--uitesting-dark",
                          "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        capture(app, "Live instruction largest text top")
        for _ in 0..<4 { app.swipeUp() }
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "With your permission")).firstMatch.isHittable)
        capture(app, "Live instruction largest text privacy")
    }

    func testAuthoredCardsCanFloatWithoutScreenCapture() throws {
        #if targetEnvironment(simulator)
        throw XCTSkip("Sample-buffer PiP did not become possible in this simulator; verify this path on a physical iPhone")
        #else
        let app = launch(["--uitesting-live-guide-demo", "--uitesting-live-guide-floating"])
        let status = app.staticTexts["live-guide-floating-status"]
        let active = NSPredicate(format: "label == %@", "Floating guide active")
        expectation(for: active, evaluatedWith: status)
        waitForExpectations(timeout: 8)
        capture(app, "Live authored card floating")
        #endif
    }

    private func launch(_ arguments: [String]) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-forwarding", "--uitesting-live-setup-guide"] + arguments
        app.launch()
        XCTAssertTrue(app.buttons["live-guide-open-settings"].waitForExistence(timeout: 10))
        return app
    }
    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
