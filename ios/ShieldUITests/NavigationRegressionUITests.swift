import XCTest

@MainActor
final class NavigationRegressionUITests: XCTestCase {
    func testRootTypographyAndDirectPhoneSetupReturn() {
        for large in [false, true] {
            let app = launch(["--uitesting-forwarding-route"] + (large
                ? ["--uitesting-light", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"] : []))
            for tab in ["Home", "Calls", "Messages", "More"] {
                app.tabBars.buttons[tab].tap()
                XCTAssertTrue(app.navigationBars[tab].appears(timeout: 3))
                capture(app, "Serif \(tab) \(large ? "large-light" : "standard-dark")")
            }
            app.buttons["Settings"].tap()
            reveal(app.buttons["Phone setup"], app)
            app.buttons["Phone setup"].tap()
            XCTAssertTrue(app.staticTexts["Save Shield"].appears(timeout: 5))
            XCTAssertTrue(app.navigationBars["Phone setup"].exists)
            XCTAssertFalse(app.buttons["Open phone setup"].exists)
            XCTAssertFalse(app.navigationBars["Phone options"].exists)
            capture(app, "Direct phone setup \(large ? "large-light" : "standard-dark")")
            app.navigationBars.buttons["Close"].tap()
            XCTAssertTrue(app.navigationBars["Settings"].appears(timeout: 3))
            app.navigationBars.buttons.firstMatch.tap()
            XCTAssertTrue(app.navigationBars["More"].appears(timeout: 3))
            capture(app, "Serif More restored \(large ? "large-light" : "standard-dark")")
        }
    }

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
            XCTAssertTrue(app.staticTexts["It may warn you and end a suspicious call."].appears(timeout: 3))
            XCTAssertFalse(app.staticTexts.containing(NSPredicate(format: "label BEGINSWITH %@", "Telnyx and its transcription provider")).firstMatch.exists)
            XCTAssertFalse(app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "It can miss scams or end ordinary calls.")).firstMatch.exists)
            capture(app, "Simplified call checks \(large ? "large" : "standard")")
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
        app.launchArguments = ["--uitesting-preview"] + (extra.contains("--uitesting-light") ? [] : ["--uitesting-dark"]) + extra
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
