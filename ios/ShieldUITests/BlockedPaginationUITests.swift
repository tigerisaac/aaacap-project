import XCTest

@MainActor
final class BlockedPaginationUITests: XCTestCase {
    func testSupersededLaterPageShowsRetryInsteadOfLoadingForever() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-blocked-pagination", "--cancel-blocked-page", "--uitesting-light"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Blocked numbers couldn’t load"].appears(timeout: 15))
        XCTAssertTrue(app.staticTexts["The full blocked list couldn’t load. Please try again."].exists)
        XCTAssertFalse(app.buttons["unblock-+10000000001"].exists)
        app.buttons["Try again"].tap()
        XCTAssertTrue(app.buttons["unblock-+10000000001"].appears(timeout: 10))
    }

    func testLaterPageFailureRetriesWithoutShowingPartialDataAndOlderNumberCanBeUnblocked() {
        for large in [false, true] {
            let app = XCUIApplication()
            app.launchArguments = ["--uitesting-blocked-pagination", "--fail-blocked-page", large ? "--uitesting-dark" : "--uitesting-light"]
            if large { app.launchArguments += ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"] }
            app.launch()
            XCTAssertTrue(app.staticTexts["Blocked numbers couldn’t load"].appears(timeout: 15))
            if !large {
                XCTAssertTrue(app.staticTexts["Your connection was interrupted. Check your internet connection and try again."].exists)
            }
            let recent = app.buttons["unblock-+10000000001"], older = app.buttons["unblock-+10000000002"]
            XCTAssertFalse(recent.exists)
            XCTAssertFalse(older.exists)
            XCTAssertFalse(app.staticTexts["No blocked numbers"].exists)
            let retry = app.buttons["Try again"]
            for _ in 0..<6 where !retry.isHittable { app.swipeUp() }
            XCTAssertTrue(retry.isHittable)
            let failed = XCTAttachment(screenshot: app.screenshot()); failed.name = "Blocked later-page failure \(large ? "largest dark" : "standard light")"; failed.lifetime = .keepAlways; add(failed)
            retry.tap()
            XCTAssertTrue(recent.appears(timeout: 10))
            for _ in 0..<8 where !older.isHittable { app.swipeUp() }
            XCTAssertTrue(older.isHittable)
            let loaded = XCTAttachment(screenshot: app.screenshot()); loaded.name = "Older blocked number loaded \(large ? "largest dark" : "standard light")"; loaded.lifetime = .keepAlways; add(loaded)
            older.tap()
            XCTAssertTrue(app.alerts.firstMatch.appears(timeout: 3))
            app.alerts.buttons["Allow calls again"].tap()
            XCTAssertTrue(older.waitForNonExistence(timeout: 5))
            for _ in 0..<8 where !recent.isHittable { app.swipeDown() }
            XCTAssertTrue(recent.isHittable)
            app.terminate()
        }
    }
}
