import XCTest

@MainActor
final class HomeReadabilityUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testLongSwitchLabelsKeepTheirWidthAndToggleFromTheRow() {
        let app = launch(["--uitesting-screen", "contact-alerts", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        let toggle = app.switches["contact-app-alerts"]
        reveal(toggle, in: app)
        revealFully(toggle, above: app.tabBars.firstMatch, in: app)
        XCTAssertTrue(toggle.isHittable)
        XCTAssertGreaterThanOrEqual(toggle.frame.height, 52)
        let before = toggle.value as? String
        toggle.coordinate(withNormalizedOffset: CGVector(dx: 0.15, dy: 0.3)).tap()
        XCTAssertNotEqual(toggle.value as? String, before)
        capture("refinement-long-switch-largest")
    }

    func testEmptyHomeKeepsAFullWidthMessagesRoute() {
        let app = launch(["--redesign-state", "empty"])
        let action = app.buttons["today-messages"]
        reveal(action, in: app)
        revealFully(action, above: app.tabBars.firstMatch, in: app)
        XCTAssertTrue(app.staticTexts["No recent messages"].exists)
        XCTAssertGreaterThanOrEqual(action.frame.height, 52)
        XCTAssertGreaterThan(action.frame.width, app.frame.width * 0.7)
        capture("refinement-empty-home")
        action.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap()
        XCTAssertTrue(app.navigationBars["Messages"].appears(timeout: 5))
    }

    func testHomeStatusUsesTheReadingEdgeAndReachableRecovery() {
        for extra in [[], ["--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]] {
            let app = launch(["--redesign-state", "unavailable"] + extra)
            let title = app.staticTexts["today-status-title"]
            let detail = app.staticTexts["Your phone’s setup status will appear here."]
            XCTAssertTrue(title.appears(timeout: 5))
            XCTAssertEqual(title.frame.minX, detail.frame.minX, accuracy: 2)
            let retry = app.buttons["Try again"].firstMatch
            reveal(retry, in: app)
            revealFully(retry, above: app.tabBars.firstMatch, in: app)
            XCTAssertGreaterThanOrEqual(retry.frame.height, 52)
            XCTAssertGreaterThan(retry.frame.width, app.frame.width * 0.7)
            capture(extra.isEmpty ? "refinement-status-retry" : "refinement-status-retry-largest")
            retry.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap()
            XCTAssertTrue(app.navigationBars["Home"].exists)
        }
    }

    func testHelpResourceDisclosureCollapsesWithoutOpeningTheBrowser() {
        for extra in [[], ["--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]] {
            let app = launch(extra)
            app.tabBars.buttons["More"].tap()
            app.staticTexts["Get help"].firstMatch.tap()
            let disclosure = app.buttons["I sent money or private information"]
            reveal(disclosure, in: app)
            revealFully(disclosure, above: app.tabBars.firstMatch, in: app)
            XCTAssertGreaterThanOrEqual(disclosure.frame.height, 52)
            disclosure.tap()
            // Supported iOS versions expose SwiftUI Link as either a link or a button.
            let resource = app.descendants(matching: .any).matching(NSPredicate(
                format: "label == %@ AND (elementType == %d OR elementType == %d)",
                "What to do next", XCUIElement.ElementType.link.rawValue, XCUIElement.ElementType.button.rawValue
            )).firstMatch
            reveal(resource, in: app)
            revealFully(resource, above: app.tabBars.firstMatch, in: app)
            let tree = XCTAttachment(string: app.debugDescription)
            tree.name = extra.isEmpty ? "help-resource-accessibility" : "help-resource-accessibility-largest"
            tree.lifetime = .keepAlways
            add(tree)
            XCTAssertGreaterThanOrEqual(resource.frame.height, 52)
            XCTAssertGreaterThan(resource.frame.width, app.frame.width * 0.7)
            capture(extra.isEmpty ? "refinement-help-expanded" : "refinement-help-expanded-largest")
            reveal(disclosure, in: app, scrollingUp: false)
            revealFully(disclosure, above: app.tabBars.firstMatch, in: app)
            XCTAssertTrue(disclosure.images["expanded"].exists)
            disclosure.tap()
            XCTAssertTrue(disclosure.images["collapsed"].appears(timeout: 5))
            let disappeared = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: resource)
            XCTAssertEqual(XCTWaiter.wait(for: [disappeared], timeout: 5), .completed)
            // The earlier audit showed that disappearance alone can mean Safari opened.
            Thread.sleep(forTimeInterval: 1)
            XCTAssertEqual(app.state, .runningForeground)
            XCTAssertTrue(app.navigationBars["Get help"].exists)
            capture(extra.isEmpty ? "refinement-help-collapsed" : "refinement-help-collapsed-largest")
        }
    }

    func testLargestMessageFilterRespondsAcrossItsWidth() {
        let app = launch(["--uitesting-message-filters", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        app.tabBars.buttons["Messages"].tap()
        let filter = app.buttons["message-filter"]
        XCTAssertTrue(filter.appears(timeout: 5))
        XCTAssertGreaterThanOrEqual(filter.frame.height, 52)
        XCTAssertGreaterThan(filter.frame.width, app.frame.width * 0.8)
        filter.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap()
        app.buttons["Voicemail"].firstMatch.tap()
        XCTAssertEqual(filter.label, "Message type, Voicemail")
        capture("refinement-message-filter-largest")
    }

    func testAllCallsRespondsAcrossTheRowAtStandardAndLargestText() {
        for extra in [[], ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]] {
            let app = launch(extra)
            let action = app.buttons["home-all-calls"]
            reveal(action, in: app)
            revealFully(action, above: app.tabBars.firstMatch, in: app)
            XCTAssertGreaterThanOrEqual(action.frame.height, 52)
            capture(extra.isEmpty ? "readable-all-calls-standard" : "readable-all-calls-largest")
            action.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap()
            XCTAssertTrue(app.navigationBars["Calls"].appears(timeout: 5))
        }
    }

    func testStoppedCountOpensTheMatchingCalls() {
        let app = launch()
        let stopped = app.buttons["home-stopped-calls"]
        XCTAssertTrue(stopped.appears(timeout: 5))
        XCTAssertEqual(stopped.label, "Calls stopped")
        XCTAssertEqual(stopped.value as? String, "3 in total")
        capture("readable-home-light")
        stopped.tap()
        XCTAssertTrue(app.navigationBars["Calls"].appears(timeout: 5))
        XCTAssertTrue(app.historyRow("Call stopped").exists)
        XCTAssertFalse(app.historyRow("Prescription reminder").exists)
        capture("readable-stopped-calls-light")
        let removed = app.historyRow("Suspicious message removed")
        reveal(removed, in: app); removed.tap()
        XCTAssertTrue(app.staticTexts["Message removed"].appears(timeout: 5))
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
        XCTAssertTrue(app.staticTexts["Your account couldn’t load"].appears(timeout: 5))
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
        XCTAssertTrue(app.staticTexts["Message removed"].appears(timeout: 5))
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

    private func reveal(_ element: XCUIElement, in app: XCUIApplication, scrollingUp: Bool = true) {
        for _ in 0..<8 {
            if element.exists && element.isHittable { break }
            if scrollingUp { app.collectionViews.firstMatch.swipeUp() }
            else { app.collectionViews.firstMatch.swipeDown() }
        }
        XCTAssertTrue(element.exists)
    }

    private func revealFully(_ element: XCUIElement, above action: XCUIElement, in app: XCUIApplication) {
        let list = app.collectionViews.firstMatch
        let bottom = action.exists ? action.frame.minY : app.frame.maxY - 24
        for _ in 0..<30 {
            let top = app.navigationBars.firstMatch.frame.maxY
            if element.exists && element.frame.minY >= top && element.frame.maxY <= bottom { break }
            let endY: CGFloat = element.frame.minY < top ? 0.67 : 0.43
            list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.55))
                .press(forDuration: 0.1, thenDragTo: list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: endY)))
        }
        XCTAssertTrue(element.exists)
        XCTAssertGreaterThanOrEqual(element.frame.minY, app.navigationBars.firstMatch.frame.maxY)
        XCTAssertLessThanOrEqual(element.frame.maxY, bottom)
    }

    private func capture(_ name: String) {
        let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        image.name = name; image.lifetime = .keepAlways; add(image)
    }
}
