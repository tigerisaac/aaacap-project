import XCTest

@MainActor
final class SeniorDesignUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testEverydayScreensAndKeepingSampleVoicemail() {
        let app = launch()
        capture(app, "senior-home-light")
        app.tabBars.buttons["Calls"].tap()
        XCTAssertTrue(app.staticTexts["Call stopped"].waitForExistence(timeout: 5))
        capture(app, "senior-calls-light")
        app.staticTexts["Call stopped"].firstMatch.tap()
        XCTAssertTrue(app.navigationBars["Call"].waitForExistence(timeout: 5))
        capture(app, "senior-call-detail-light")
        app.tabBars.buttons["Voicemail"].tap()
        XCTAssertTrue(app.staticTexts["Appointment message"].waitForExistence(timeout: 5))
        capture(app, "senior-voicemail-light")
        app.staticTexts["Appointment message"].firstMatch.tap()
        let keep = app.buttons["keep-sample-message"]
        XCTAssertTrue(keep.waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Sample summary"].exists)
        XCTAssertTrue(app.buttons["Hear sample message"].exists)
        app.buttons["Hear sample message"].tap()
        XCTAssertTrue(app.buttons["Stop sample"].waitForExistence(timeout: 3))
        app.buttons["Stop sample"].tap()
        XCTAssertFalse(app.buttons["Delete message"].exists)
        capture(app, "senior-message-detail-light")
        keep.tap()
        XCTAssertEqual(keep.label, "Message kept")
        app.navigationBars.buttons.firstMatch.tap()
        let kept = app.segmentedControls["sample-message-filter"].buttons["Kept"]
        XCTAssertTrue(kept.waitForExistence(timeout: 5)); kept.tap()
        XCTAssertTrue(app.staticTexts["Appointment message"].exists)
        XCTAssertFalse(app.staticTexts["(512) 555-0128"].exists)
        capture(app, "senior-kept-message-light")
        app.tabBars.buttons["More"].tap()
        XCTAssertTrue(app.staticTexts["Check a text"].waitForExistence(timeout: 5))
        capture(app, "senior-more-light")
    }

    func testSecondaryScreensAndPlainTextCheck() {
        let app = launch()
        openMore(app, "Check a text")
        let editor = app.textViews.firstMatch
        XCTAssertTrue(editor.waitForExistence(timeout: 5))
        capture(app, "senior-check-light")
        editor.tap(); editor.typeText("Please send your secret code.")
        app.buttons["Done"].tap()
        app.buttons["Check this text"].tap()
        XCTAssertTrue(app.alerts["Check this text?"].waitForExistence(timeout: 5))
        app.buttons["Show sample answer"].tap()
        XCTAssertTrue(app.staticTexts["Sample answer"].waitForExistence(timeout: 5))
        capture(app, "senior-check-answer-light")
        openMore(app, "Family & friends")
        XCTAssertTrue(app.buttons["person-Pat"].waitForExistence(timeout: 5))
        capture(app, "senior-family-light")
        tap(app.staticTexts["Invite someone to help"].firstMatch, in: app)
        XCTAssertTrue(app.navigationBars["Share with a helper"].waitForExistence(timeout: 5))
        capture(app, "senior-sharing-light")
        openMore(app, "Get help")
        capture(app, "senior-help-light")
        openMore(app, "Settings")
        capture(app, "senior-settings-light")
        tap(app.staticTexts["Blocked numbers"].firstMatch, in: app)
        XCTAssertTrue(app.staticTexts["(312) 555-0199"].waitForExistence(timeout: 5))
        capture(app, "senior-blocked-light")
        app.navigationBars.buttons.firstMatch.tap()
        tap(app.staticTexts["Your contacts"].firstMatch, in: app)
        XCTAssertTrue(app.staticTexts["Jamie"].waitForExistence(timeout: 5))
        capture(app, "senior-contacts-light")
        app.navigationBars.buttons.firstMatch.tap()
        tap(app.staticTexts["Numbers you trust"].firstMatch, in: app)
        XCTAssertTrue(app.staticTexts["Sample clinic"].waitForExistence(timeout: 5))
        capture(app, "senior-trusted-numbers-light")
        app.navigationBars.buttons.firstMatch.tap()
        tap(app.staticTexts["Checks while you talk"].firstMatch, in: app)
        capture(app, "senior-call-checks-light")
        app.navigationBars.buttons.firstMatch.tap()
        tap(app.staticTexts["Automatic text checks"].firstMatch, in: app)
        capture(app, "senior-auto-text-light")
    }

    func testLargestTextDarkModeKeepsEverydayActionsReachable() {
        let app = launch(["--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        capture(app, "senior-home-large-dark")
        app.tabBars.buttons["Calls"].tap()
        XCTAssertTrue(app.buttons["callFilter"].waitForExistence(timeout: 5))
        capture(app, "senior-calls-large-dark")
        app.tabBars.buttons["Voicemail"].tap()
        tap(app.staticTexts["Appointment message"].firstMatch, in: app)
        let keep = app.buttons["keep-sample-message"]
        tap(keep, in: app)
        XCTAssertEqual(keep.label, "Message kept")
        capture(app, "senior-message-large-dark")
        app.tabBars.buttons["More"].tap()
        capture(app, "senior-more-large-dark")
        tap(app.staticTexts["Check a text"].firstMatch, in: app)
        XCTAssertTrue(app.textViews.firstMatch.waitForExistence(timeout: 5))
        capture(app, "senior-check-large-dark")
        openMore(app, "Settings")
        capture(app, "senior-settings-large-dark")
    }

    func testWelcomeAndChoicesStayBrief() {
        var app = launch([], sample: false)
        XCTAssertTrue(app.textFields["Email address"].waitForExistence(timeout: 5))
        capture(app, "senior-sign-in-light")
        app = launch(["--uitesting-protection-onboarding"], sample: false)
        XCTAssertTrue(app.switches["onboarding-protection-toggle"].waitForExistence(timeout: 5))
        capture(app, "senior-protection-choice-light")
        app = launch(["--uitesting-helper-alerts-onboarding"], sample: false)
        XCTAssertTrue(app.switches["onboarding-helper-alerts-toggle"].waitForExistence(timeout: 5))
        capture(app, "senior-helper-choice-light")
    }

    private func launch(_ args: [String] = [], sample: Bool = true) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = (sample ? ["--uitesting-preview"] : []) + args
        app.launch()
        return app
    }

    private func tap(_ element: XCUIElement, in app: XCUIApplication) {
        _ = element.waitForExistence(timeout: 1)
        for _ in 0..<10 {
            if element.exists && element.isHittable { break }
            if app.collectionViews.firstMatch.exists { app.collectionViews.firstMatch.swipeUp() }
            else { app.swipeUp() }
        }
        XCTAssertTrue(element.exists); XCTAssertTrue(element.isHittable); element.tap()
    }

    private func openMore(_ app: XCUIApplication, _ title: String) {
        app.tabBars.buttons["More"].tap()
        for _ in 0..<5 {
            if app.navigationBars["More"].exists { break }
            app.navigationBars.buttons.firstMatch.tap()
        }
        tap(app.staticTexts[title].firstMatch, in: app)
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = name; shot.lifetime = .keepAlways; add(shot)
        do {
            let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("SeniorScreens")
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            try app.screenshot().pngRepresentation.write(to: directory.appendingPathComponent(name + ".png"))
        } catch { XCTFail("Couldn’t save simulator capture: \(error.localizedDescription)") }

    }
}
