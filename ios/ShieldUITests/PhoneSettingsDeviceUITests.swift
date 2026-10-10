import XCTest
import CallKit

@MainActor
final class PhoneSettingsDeviceUITests: XCTestCase {
    func testNativeCodeCardDoesNotDialInDemoOrConfirmCarrierChange() throws {
        continueAfterFailure = false
        let observer = CXCallObserver()
        XCTAssertTrue(observer.calls.isEmpty, "Do not interrupt an existing call")
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-forwarding", "--forwarding-start-code", "--uitesting-system-phone"]
        app.launch()
        XCTAssertTrue(app.buttons["forwarding-continue"].waitForExistence(timeout: 15))
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Open Tello code")
        app.buttons["forwarding-continue"].tap()
        XCTAssertTrue(app.buttons["Back to Shield"].waitForExistence(timeout: 15))
        XCTAssertTrue(observer.calls.isEmpty, "Opening a code card must not create a call")
        app.buttons["Back to Shield"].tap()
        XCTAssertTrue(app.staticTexts["Your code is ready"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["When you don’t answer"].exists)
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Tello confirmed the change")
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = "Native code card return"
        shot.lifetime = .keepAlways
        add(shot)
        app.buttons["forwarding-phone-reopen"].tap()
        XCTAssertTrue(app.buttons["Back to Shield"].waitForExistence(timeout: 15))
        XCTAssertTrue(observer.calls.isEmpty)
        app.buttons["Back to Shield"].tap()
        XCTAssertTrue(app.staticTexts["When you don’t answer"].waitForExistence(timeout: 10))
    }

    func testPhoneSettingsOpensAndReturnsWithoutClaimingVerification() throws {
        #if targetEnvironment(simulator)
        throw XCTSkip("Phone settings are unavailable in the simulator")
        #else
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-forwarding", "--forwarding-start-settings", "--uitesting-system-settings"]
        app.launch()
        XCTAssertTrue(app.buttons["forwarding-continue"].waitForExistence(timeout: 15))
        app.buttons["forwarding-continue"].tap()
        let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
        XCTAssertTrue(settings.wait(for: .runningForeground, timeout: 15))
        XCTAssertTrue(settings.navigationBars["Phone"].waitForExistence(timeout: 15))
        app.activate()
        XCTAssertTrue(app.staticTexts["phone-settings-unverified"].waitForExistence(timeout: 10))
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "I selected Silence")
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        #endif
    }
}
