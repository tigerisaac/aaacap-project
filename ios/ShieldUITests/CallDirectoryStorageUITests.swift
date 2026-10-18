import XCTest

@MainActor
final class CallDirectoryStorageUITests: XCTestCase {
    func testSignOutClearsProtectedFileAndFailedReloadCanRetryAndSurviveRelaunch() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-call-directory", "--seed-call-directory", "--uitesting-dark"]
        app.launchArguments += ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Blocking storage passed"].appears(timeout: 15))
        XCTAssertTrue(app.staticTexts["Blocking clear pending"].exists)
        let retry = app.buttons["Update iPhone list"]
        for _ in 0..<6 where !retry.isHittable { app.swipeUp() }
        XCTAssertTrue(retry.isHittable)
        let failure = XCTAttachment(screenshot: app.screenshot()); failure.name = "Blocking reload failure largest dark"; failure.lifetime = .keepAlways; add(failure)
        retry.tap()
        for _ in 0..<6 where !app.staticTexts["Blocking clear applied"].isHittable { app.swipeDown() }
        XCTAssertTrue(app.staticTexts["Blocking clear applied"].appears(timeout: 5))
        XCTAssertFalse(app.buttons["Update iPhone list"].exists)
        let recovered = XCTAttachment(screenshot: app.screenshot()); recovered.name = "Blocking reload recovered largest dark"; recovered.lifetime = .keepAlways; add(recovered)
        app.terminate()
        app.launchArguments = ["--uitesting-call-directory", "--uitesting-light"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Blocking storage passed"].appears(timeout: 15))
        XCTAssertTrue(app.staticTexts["Blocking clear applied"].exists)
        XCTAssertFalse(app.buttons["Update iPhone list"].exists)
    }
}
