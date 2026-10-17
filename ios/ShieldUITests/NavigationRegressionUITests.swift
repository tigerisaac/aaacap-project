import XCTest

@MainActor
final class NavigationRegressionUITests: XCTestCase {
    func testTextCheckPushesAboveAutomaticChecksAndTitlesFollowTheStack() {
        let app = launch()
        app.tabBars.buttons["More"].tap()
        XCTAssertTrue(app.navigationBars["More"].appears(timeout: 5))
        app.buttons["Settings"].tap()
        XCTAssertTrue(app.navigationBars["Settings"].appears(timeout: 3))
        XCTAssertFalse(app.navigationBars["More"].exists)
        reveal(app.buttons["Automatic text checks"], app)
        app.buttons["Automatic text checks"].tap()
        XCTAssertTrue(app.navigationBars["Automatic text checks"].appears(timeout: 3))
        app.buttons["Check a text yourself"].tap()
        XCTAssertTrue(app.navigationBars["Check a text"].appears(timeout: 3))
        XCTAssertTrue(app.textViews.firstMatch.isHittable)
        XCTAssertFalse(app.buttons["Check a text yourself"].isHittable)
        capture(app, "Text check opens on top")
        app.navigationBars.buttons.firstMatch.tap()
        XCTAssertTrue(app.navigationBars["Automatic text checks"].appears(timeout: 3))
        app.navigationBars.buttons.firstMatch.tap()
        XCTAssertTrue(app.navigationBars["Settings"].appears(timeout: 3))
        app.navigationBars.buttons.firstMatch.tap()
        XCTAssertTrue(app.navigationBars["More"].appears(timeout: 2))
        capture(app, "More title restored on return")
    }

    func testDisclosureExpandsWithinItsCardAndCollapses() {
        for large in [false, true] {
            let app = launch(large ? ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"] : [])
            app.tabBars.buttons["More"].tap()
            app.buttons["Settings"].tap()
            reveal(app.buttons["Checks while you talk"], app)
            app.buttons["Checks while you talk"].tap()
            let disclosure = app.buttons["What happens to my words?"]
            reveal(disclosure, app)
            disclosure.tap()
            let details = app.staticTexts.containing(NSPredicate(format: "label BEGINSWITH %@", "Telnyx currently uses Soniox")).firstMatch
            XCTAssertTrue(details.appears(timeout: 3))
            XCTAssertGreaterThanOrEqual(details.frame.minX, disclosure.frame.minX - 2)
            XCTAssertLessThanOrEqual(details.frame.maxX, app.frame.maxX - 12)
            capture(app, "Disclosure expanded within card \(large ? "large" : "standard")")
            reveal(disclosure, app)
            disclosure.tap()
            XCTAssertTrue(details.waitForNonExistence(timeout: 3))
            // Opening an external link can finish after the first accessibility
            // snapshot, so check the settled foreground state as well.
            Thread.sleep(forTimeInterval: 1)
            XCTAssertEqual(app.state, .runningForeground)
            XCTAssertTrue(app.navigationBars["Checks while you talk"].appears(timeout: 3))
            capture(app, "Disclosure collapsed \(large ? "large" : "standard")")
        }
    }

    func testMessageTypeFiltersReuseTheSameInbox() {
        let app = launch(["--uitesting-message-filters"])
        app.tabBars.buttons["Messages"].tap()
        XCTAssertTrue(app.segmentedControls["message-filter"].appears(timeout: 5))
        app.buttons["Notices"].tap()
        XCTAssertTrue(app.staticTexts["Saved account notice"].appears(timeout: 3))
        XCTAssertFalse(app.staticTexts["Appointment message"].exists)
        capture(app, "Messages filtered to notices")
        app.buttons["Voicemail"].tap()
        XCTAssertTrue(app.staticTexts["Appointment message"].appears(timeout: 3))
        XCTAssertFalse(app.staticTexts["Saved account notice"].exists)
        XCTAssertFalse(app.progressIndicators["messages-refresh-progress"].exists)
        app.buttons["All"].tap()
        XCTAssertTrue(app.staticTexts["Saved account notice"].appears(timeout: 3))
    }

    private func launch(_ extra: [String] = []) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview", "--uitesting-dark"] + extra
        app.launch()
        XCTAssertTrue(app.tabBars.buttons["More"].appears(timeout: 5))
        return app
    }
    private func reveal(_ element: XCUIElement, _ app: XCUIApplication) {
        for _ in 0..<8 where !element.isHittable { app.swipeUp() }
        XCTAssertTrue(element.isHittable)
    }
    private func capture(_ app: XCUIApplication, _ name: String) {
        let image = XCTAttachment(screenshot: app.screenshot())
        image.name = name; image.lifetime = .keepAlways; add(image)
    }
}
