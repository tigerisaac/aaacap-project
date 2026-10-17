import XCTest

@MainActor
final class HomeStatusStabilityUITests: XCTestCase {
    func testMessagesFilterNeverInsertsRemovedMessagesBeforeRefresh() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-offline-history", "--seed-offline-history", "--uitesting-call-filter-parity"]
        app.launch()
        XCTAssertTrue(app.tabBars.buttons["Calls"].appears(timeout: 10))
        app.tabBars.buttons["Calls"].tap()
        XCTAssertTrue(app.historyRow("Removed synthetic message").appears(timeout: 5))
        for _ in 0..<2 {
            app.segmentedControls["callFilter"].buttons["Messages"].tap()
            XCTAssertTrue(app.historyRow("Saved synthetic voicemail").exists)
            let removed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == true"), object: app.historyRow("Removed synthetic message"))
            removed.isInverted = true
            XCTAssertEqual(XCTWaiter.wait(for: [removed], timeout: 3.5), .completed)
            XCTAssertFalse(app.descendants(matching: .any)["calls-refresh-progress"].firstMatch.exists)
            capture(app, "Messages keeps the same local and remote rows")
            app.segmentedControls["callFilter"].buttons["All"].tap()
        }
    }

    func testConfirmedHomeStatusSurvivesOldTimestampAndFailedRefresh() {
        for (state, extra) in [("stale", ["--uitesting-light"]), ("refresh-failed", ["--uitesting-dark"]),
                              ("refresh-failed", ["--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])] {
            let app = XCUIApplication()
            app.launchArguments = ["--uitesting-preview", "--redesign-state", state] + extra
            app.launch()
            let title = app.staticTexts["today-status-title"]
            XCTAssertTrue(title.appears(timeout: 5))
            XCTAssertEqual(title.label, "Call checks are on")
            XCTAssertFalse(app.staticTexts["Couldn’t check your phone"].exists)
            if state == "refresh-failed" { XCTAssertTrue(app.staticTexts["today-status-confirmed"].exists) }
            XCTAssertLessThanOrEqual(title.frame.maxX, app.frame.maxX - 12)
            capture(app, "Confirmed Home \(state) \(extra.count)")
        }
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        let image = XCTAttachment(screenshot: app.screenshot())
        image.name = name; image.lifetime = .keepAlways; add(image)
    }
}
