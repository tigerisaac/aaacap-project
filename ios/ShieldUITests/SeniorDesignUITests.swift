import XCTest

@MainActor
final class SeniorDesignUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testEverydayScreensAndKeepingSampleVoicemail() {
        let app = launch()
        capture(app, "senior-home-light")
        app.tabBars.buttons["Calls"].tap()
        XCTAssertTrue(app.historyRow("Call stopped").waitForExistence(timeout: 5))
        capture(app, "senior-calls-light")
        app.historyRow("Call stopped").tap()
        XCTAssertTrue(app.navigationBars["Call"].waitForExistence(timeout: 5))
        capture(app, "senior-call-detail-light")
        app.tabBars.buttons["Messages"].tap()
        XCTAssertTrue(app.historyRow("Appointment message").waitForExistence(timeout: 5))
        capture(app, "senior-voicemail-light")
        app.historyRow("Appointment message").tap()
        let keep = app.buttons["keep-sample-message"]
        XCTAssertTrue(keep.waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["message-summary"].exists)
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
        XCTAssertTrue(app.historyRow("Appointment message").exists)
        XCTAssertFalse(app.historyRow("(512) 555-0128").exists)
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
        XCTAssertTrue(app.staticTexts["This is an example. Your text hasn’t been checked."].waitForExistence(timeout: 5))
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
        app.tabBars.buttons["Messages"].tap()
        tap(app.historyRow("Appointment message"), in: app)
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

    /// Rendering coverage for forms that normally require a configured account.
    func testSecondaryScreenVisualsInBothAppearances() {
        for dark in [false, true] {
            for screen in ["numbers", "add-number", "add-contact", "sharing", "sharing-access", "contacts", "quiet", "blocked", "setup", "setup-details", "trial-options", "protection", "invitation", "join", "help", "automatic-texts", "audio", "alerts-on", "alerts-off", "quiet-alerts"] {
                let app = launch(["--uitesting-screen", screen, dark ? "--uitesting-dark" : "--uitesting-light"])
                XCTAssertTrue(app.navigationBars.firstMatch.waitForExistence(timeout: 5), screen)
                XCTAssertTrue(app.collectionViews.firstMatch.waitForExistence(timeout: 5), screen)
                capture(app, "visual-\(screen)-\(dark ? "dark" : "light")")
            }
            let app = launch([dark ? "--uitesting-dark" : "--uitesting-light"])
            for tab in ["Home", "Calls", "Messages", "More"] {
                app.tabBars.buttons[tab].tap()
                XCTAssertTrue(app.navigationBars[tab].waitForExistence(timeout: 5))
                capture(app, "visual-\(tab.lowercased())-\(dark ? "dark" : "light")")
            }
        }
    }

    private func launch(_ args: [String] = [], sample: Bool = true) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = (sample ? ["--uitesting-preview"] : []) + args
        app.launch()
        return app
    }

    private func tap(_ element: XCUIElement, in app: XCUIApplication) {
        _ = element.waitForExistence(timeout: 1)
        for _ in 0..<20 {
            let top = app.navigationBars.firstMatch.exists ? app.navigationBars.firstMatch.frame.maxY : 0
            var bottom = app.tabBars.firstMatch.exists ? app.tabBars.firstMatch.frame.minY : app.frame.maxY
            let actions = app.otherElements["message-action-area"]
            if actions.exists && actions.frame.height > 0 { bottom = min(bottom, actions.frame.minY) }
            if element.exists && element.isHittable && element.frame.minY >= top && element.frame.maxY <= bottom { break }
            if app.collectionViews.firstMatch.exists {
                let downward = element.exists && element.frame.minY < top
                let origin = app.coordinate(withNormalizedOffset: .zero)
                let high = top + (bottom - top) * 0.25
                let low = top + (bottom - top) * 0.75
                origin.withOffset(CGVector(dx: app.frame.midX, dy: downward ? high : low))
                    .press(forDuration: 0.1, thenDragTo: origin.withOffset(CGVector(dx: app.frame.midX, dy: downward ? low : high)))
            } else { app.swipeUp() }
        }
        if !element.exists || !element.isHittable {
            capture(app, "polish-unreachable-control")
            let tree = XCTAttachment(string: app.debugDescription)
            tree.name = "Unreachable control accessibility tree"; tree.lifetime = .keepAlways; add(tree)
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
        Thread.sleep(forTimeInterval: 0.8)
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = name; shot.lifetime = .keepAlways; add(shot)
        do {
            let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("SeniorScreens")
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            try app.screenshot().pngRepresentation.write(to: directory.appendingPathComponent(name + ".png"))
        } catch { XCTFail("Couldn’t save simulator capture: \(error.localizedDescription)") }

    }
}
