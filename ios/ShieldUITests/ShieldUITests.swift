import XCTest

@MainActor
final class ShieldUITests: XCTestCase {
    func testPreviewShowsHeldCallAndClearExplanation() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview"]
        app.launch()
        XCTAssertTrue(app.staticTexts["demoBanner"].waitForExistence(timeout: 5))
        app.tabBars.buttons["Calls"].tap()
        XCTAssertTrue(app.navigationBars["Calls"].exists)
        XCTAssertTrue(app.buttons["callFilter"].exists)
        app.staticTexts["Call held for review"].firstMatch.tap()
        XCTAssertTrue(app.navigationBars["Call details"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.staticTexts["The introduction included a request for a security code. This call was not connected."].exists)
    }

    func testPreviewCanSwitchPeople() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview"]
        app.launch()
        app.tabBars.buttons["People"].tap()
        XCTAssertTrue(app.staticTexts["Pat"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Alex"].exists)
        app.buttons["person-Alex"].tap()
        XCTAssertTrue(app.staticTexts["Phone settings stay with the participant."].waitForExistence(timeout: 3))
        XCTAssertFalse(app.staticTexts["Share with someone"].exists)
    }
}
