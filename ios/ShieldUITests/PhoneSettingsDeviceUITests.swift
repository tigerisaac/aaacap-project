import XCTest
import CallKit

@MainActor
final class PhoneSettingsDeviceUITests: XCTestCase {
    func testCopyDoesNotDialOrConfirmCarrierChange() throws {
        continueAfterFailure = false
        let observer = CXCallObserver()
        XCTAssertTrue(observer.calls.isEmpty, "Do not interrupt an existing call")
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-forwarding", "--forwarding-start-code"]
        app.launch()
        XCTAssertTrue(app.buttons["forwarding-continue"].appears(timeout: 15))
        XCTAssertTrue(app.staticTexts["forwarding-code-copied"].appears(timeout: 10))
        XCTAssertTrue(observer.calls.isEmpty, "Copying a code must not create a call")
        XCTAssertTrue(app.staticTexts["When you don’t answer"].exists)
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Tello confirmed the change")
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
    }

    func testPhoneSettingsOpensAndReturnsWithoutClaimingVerification() throws {
        #if targetEnvironment(simulator)
        throw XCTSkip("Phone settings are unavailable in the simulator")
        #else
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-forwarding", "--forwarding-start-settings", "--uitesting-system-settings"]
        app.launch()
        XCTAssertTrue(app.buttons["forwarding-continue"].appears(timeout: 15))
        app.buttons["forwarding-continue"].tap()
        let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
        XCTAssertTrue(settings.wait(for: .runningForeground, timeout: 15))
        XCTAssertTrue(settings.navigationBars["Phone"].appears(timeout: 15))
        app.activate()
        XCTAssertTrue(app.buttons["phone-settings-reopen"].appears(timeout: 10))
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "I selected Silence")
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        #endif
    }
}
