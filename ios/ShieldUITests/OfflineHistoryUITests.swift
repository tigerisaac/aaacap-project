import XCTest

@MainActor
final class OfflineHistoryUITests: XCTestCase {
    func testOwnerHistoryReopensAndFiltersWithoutService() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-offline-history", "--seed-offline-history"]
        app.launch()
        XCTAssertTrue(app.tabBars.buttons["Calls"].appears(timeout: 20))
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label BEGINSWITH %@", "Saved on this iPhone")).firstMatch.exists)
        app.terminate()
        app.launchArguments = ["--uitesting-offline-history"]
        app.launch()
        XCTAssertTrue(app.tabBars.buttons["Calls"].appears(timeout: 20))
        app.tabBars.buttons["Calls"].tap()
        XCTAssertTrue(app.staticTexts["Offline saved call"].appears(timeout: 10))
        app.buttons["Stopped"].tap()
        XCTAssertTrue(app.staticTexts["Offline saved call"].appears(timeout: 10))
        app.staticTexts["Offline saved call"].tap()
        XCTAssertTrue(app.staticTexts["Call details couldn’t update"].appears(timeout: 10))
        XCTAssertTrue(app.staticTexts["Offline saved call"].exists)
        XCTAssertFalse(app.alerts["Couldn’t finish that"].exists)
    }

    func testEmptyPagesStayVisibleDuringRefreshAndMessagesHasNoStorageBanner() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-offline-history", "--seed-offline-history", "--uitesting-navigation-loading"]
        app.launch()
        XCTAssertTrue(app.tabBars.buttons["Calls"].appears(timeout: 20))
        app.tabBars.buttons["Calls"].tap()
        app.buttons["Answered"].tap()
        XCTAssertTrue(app.staticTexts["Getting your calls…"].appears(timeout: 2), "Slow first loads still need feedback")
        XCTAssertTrue(app.staticTexts["No answered calls"].appears(timeout: 8))
        app.buttons["Stopped"].tap()
        app.buttons["Answered"].tap()
        assertNoLoadingFlash(app, title: "Getting your calls…")
        XCTAssertTrue(app.staticTexts["No answered calls"].exists)

        app.tabBars.buttons["Messages"].tap()
        XCTAssertTrue(app.staticTexts["No messages yet"].appears(timeout: 8))
        XCTAssertFalse(app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Recordings are saved on this iPhone")).firstMatch.exists)
        app.tabBars.buttons["More"].tap()
        app.tabBars.buttons["Messages"].tap()
        assertNoLoadingFlash(app, title: "Getting your messages…")
        XCTAssertTrue(app.staticTexts["No messages yet"].exists)
        let capture = XCTAttachment(screenshot: app.screenshot())
        capture.name = "Messages without storage banner"
        capture.lifetime = .keepAlways
        add(capture)
    }

    private func assertNoLoadingFlash(_ app: XCUIApplication, title: String) {
        let appears = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == true"), object: app.staticTexts[title])
        appears.isInverted = true
        XCTAssertEqual(XCTWaiter.wait(for: [appears], timeout: 1), .completed, "A refresh replaced cached content with a loading box")
    }

}
