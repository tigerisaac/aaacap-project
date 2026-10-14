import XCTest

@MainActor
final class HomeReadabilityUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testAllCallsRespondsAcrossTheRowAtStandardAndLargestText() {
        for extra in [[], ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]] {
            let app = launch(extra)
            let action = app.buttons["home-all-calls"]
            reveal(action, in: app)
            revealFully(action, above: app.tabBars.firstMatch, in: app)
            XCTAssertGreaterThanOrEqual(action.frame.height, 52)
            capture(extra.isEmpty ? "readable-all-calls-standard" : "readable-all-calls-largest")
            action.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap()
            XCTAssertTrue(app.navigationBars["Calls"].waitForExistence(timeout: 5))
        }
    }

    func testStoppedCountOpensTheMatchingCalls() {
        let app = launch()
        let stopped = app.buttons["home-stopped-calls"]
        XCTAssertTrue(stopped.waitForExistence(timeout: 5))
        XCTAssertEqual(stopped.label, "Calls stopped")
        XCTAssertEqual(stopped.value as? String, "3 in total")
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
        XCTAssertEqual(stopped.label, "Calls stopped")
        XCTAssertEqual(stopped.value as? String, "0 in total")
        capture("readable-home-zero-light")
        app = launch(["--redesign-state", "legacy"])
        XCTAssertEqual(app.buttons["home-stopped-calls"].label, "Calls stopped")
        XCTAssertEqual(app.buttons["home-stopped-calls"].value as? String, "Total unavailable")
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
        let visibleTop = app.navigationBars.firstMatch.frame.maxY
        let visibleBottom = app.tabBars.firstMatch.frame.minY
        if removed.frame.height > visibleBottom - visibleTop - 32 {
            // At the maximum font on a 667-point phone a complete row can exceed the viewport.
            // It must scroll without shrinking text, and its visible portion must still open it.
            var visible = CGRect.zero
            for _ in 0..<8 {
                let list = app.collectionViews.firstMatch
                let viewport = CGRect(x: 0, y: max(list.frame.minY, app.navigationBars.firstMatch.frame.maxY),
                                      width: app.frame.width, height: 0)
                let bottom = min(list.frame.maxY, app.tabBars.firstMatch.frame.minY)
                visible = removed.frame.intersection(CGRect(x: viewport.minX, y: viewport.minY,
                    width: viewport.width, height: bottom - viewport.minY))
                if !visible.isNull && visible.height >= 52 { break }
                list.swipeUp()
            }
            XCTAssertGreaterThanOrEqual(visible.height, 52)
            capture("readable-oversized-row-large-dark")
            app.coordinate(withNormalizedOffset: .zero)
                .withOffset(CGVector(dx: visible.midX, dy: visible.midY)).tap()
        } else {
            revealFully(removed, above: app.tabBars.firstMatch, in: app); removed.tap()
        }
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
        for _ in 0..<30 {
            let top = app.navigationBars.firstMatch.frame.maxY
            if element.exists && element.frame.minY >= top && element.frame.maxY <= action.frame.minY { break }
            let endY: CGFloat = element.frame.minY < top ? 0.67 : 0.43
            list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.55))
                .press(forDuration: 0.1, thenDragTo: list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: endY)))
        }
        XCTAssertTrue(element.exists)
        XCTAssertGreaterThanOrEqual(element.frame.minY, app.navigationBars.firstMatch.frame.maxY)
        XCTAssertLessThanOrEqual(element.frame.maxY, action.frame.minY)
    }

    private func capture(_ name: String) {
        let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        image.name = name; image.lifetime = .keepAlways; add(image)
    }
}
