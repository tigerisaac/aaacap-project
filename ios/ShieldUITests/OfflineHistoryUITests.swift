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
}
