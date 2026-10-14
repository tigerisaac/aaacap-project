import XCTest

@MainActor
final class HomeReadabilityUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testStoppedCountOpensTheMatchingCalls() {
        let app = launch()
        let stopped = app.buttons["home-stopped-calls"]
        XCTAssertTrue(stopped.waitForExistence(timeout: 5))
        XCTAssertEqual(stopped.label, "3 calls stopped in total. See calls.")
        capture("readable-home-light")
        stopped.tap()
        XCTAssertTrue(app.navigationBars["Calls"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.historyRow("Call stopped").exists)
        XCTAssertFalse(app.historyRow("Prescription reminder").exists)
        capture("readable-stopped-calls-light")
        let removed = app.historyRow("Suspicious message removed")
        reveal(removed, in: app); removed.tap()
        XCTAssertTrue(app.staticTexts["Message removed"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["It seemed suspicious."].exists)
        XCTAssertFalse(app.staticTexts["Shield removed this message"].exists)
        XCTAssertFalse(app.staticTexts["Need to call back? Use a number you already know."].exists)
        XCTAssertFalse(app.buttons["restore-voicemail"].exists)
        XCTAssertFalse(app.buttons["Hear sample message"].exists)
        capture("readable-removed-message-light")
        app.buttons["More about this call"].tap()
        let trusted = app.buttons["Find a trusted number"].firstMatch
        reveal(trusted, in: app)
        XCTAssertTrue(trusted.isHittable)
        capture("readable-removed-details-light")
    }

    func testZeroCountIsExplicitAndUnavailableCountIsNotZero() {
        var app = launch(["--redesign-state", "empty"])
        let stopped = app.buttons["home-stopped-calls"]
        reveal(stopped, in: app)
        XCTAssertEqual(stopped.label, "0 calls stopped in total. See calls.")
        capture("readable-home-zero-light")
        app = launch(["--redesign-state", "legacy"])
        XCTAssertEqual(app.buttons["home-stopped-calls"].label, "Calls stopped. Total unavailable. See calls.")
        XCTAssertTrue(app.buttons["home-stopped-calls"].isHittable)
        app = XCUIApplication()
        app.launchArguments = ["--uitesting-account-error"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Your account couldn’t load"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["home-stopped-calls"].exists)
    }

    func testLargestTextDarkModeKeepsDiscardedMessageReadable() {
        let app = launch(["--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        let stopped = app.buttons["home-stopped-calls"]
        reveal(stopped, in: app)
        XCTAssertTrue(stopped.isHittable)
        capture("readable-home-large-dark")
        stopped.tap()
        let removed = app.historyRow("Suspicious message removed")
        reveal(removed, in: app)
        revealFully(removed, above: app.tabBars.firstMatch, in: app); removed.tap()
        XCTAssertTrue(app.staticTexts["Message removed"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["restore-voicemail"].exists)
        capture("readable-removed-large-dark")
        let reason = app.staticTexts["It seemed suspicious."]
        let deadline = app.staticTexts["This message is no longer available."]
        let restore = app.tabBars.firstMatch
        revealFully(reason, above: restore, in: app)
        capture("readable-removed-large-dark-reason")
        revealFully(deadline, above: restore, in: app)
        capture("readable-removed-large-dark-scrolled")
    }

    private func launch(_ extra: [String] = []) -> XCUIApplication {
        let app = XCUIApplication(); app.launchArguments = ["--uitesting-preview", "--uitesting-light"] + extra
        app.launch(); return app
    }

    private func reveal(_ element: XCUIElement, in app: XCUIApplication) {
        for _ in 0..<8 {
            if element.exists && element.isHittable { break }
            app.collectionViews.firstMatch.swipeUp()
        }
        XCTAssertTrue(element.exists)
    }

    private func revealFully(_ element: XCUIElement, above action: XCUIElement, in app: XCUIApplication) {
        let list = app.collectionViews.firstMatch
        let top = app.navigationBars.firstMatch.frame.maxY
        for _ in 0..<20 {
            if element.exists && element.frame.minY >= top && element.frame.maxY <= action.frame.minY { break }
            let endY: CGFloat = element.frame.minY < top ? 0.59 : 0.51
            list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.55))
                .press(forDuration: 0.1, thenDragTo: list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: endY)))
        }
        XCTAssertTrue(element.exists)
        XCTAssertGreaterThanOrEqual(element.frame.minY, top)
        XCTAssertLessThanOrEqual(element.frame.maxY, action.frame.minY)
    }

    private func capture(_ name: String) {
        let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        image.name = name; image.lifetime = .keepAlways; add(image)
    }
}
