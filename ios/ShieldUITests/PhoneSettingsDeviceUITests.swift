import XCTest
import CallKit

@MainActor
final class PhoneSettingsDeviceUITests: XCTestCase {
    func testPhoneAppOpensWithoutDialingOrConfirmingCarrierChange() throws {
        #if targetEnvironment(simulator)
        throw XCTSkip("Phone is unavailable in the simulator")
        #else
        continueAfterFailure = false
        let observer = CXCallObserver()
        XCTAssertTrue(observer.calls.isEmpty, "Do not interrupt an existing call")
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-forwarding", "--forwarding-start-code", "--uitesting-system-phone"]
        app.launch()
        XCTAssertTrue(app.buttons["forwarding-continue"].waitForExistence(timeout: 15))
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Copy code and open Phone")
        app.buttons["forwarding-continue"].tap()
        let phone = XCUIApplication(bundleIdentifier: "com.apple.mobilephone")
        let opened = phone.wait(for: .runningForeground, timeout: 15)
        if !opened {
            let failureShot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
            failureShot.name = "Phone opening result"
            failureShot.lifetime = .keepAlways
            add(failureShot)
        }
        XCTAssertTrue(opened)
        XCTAssertTrue(observer.calls.isEmpty, "Opening Phone must not create a call")
        app.activate()
        XCTAssertTrue(app.staticTexts["Your code is copied"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["When you don’t answer"].exists)
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Tello confirmed the change")
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = "Phone shortcut return"
        shot.lifetime = .keepAlways
        add(shot)
        app.buttons["forwarding-phone-reopen"].tap()
        let reopened = phone.wait(for: .runningForeground, timeout: 15)
        if !reopened {
            let failureShot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
            failureShot.name = "Phone reopening result"
            failureShot.lifetime = .keepAlways
            add(failureShot)
        }
        XCTAssertTrue(reopened)
        XCTAssertTrue(observer.calls.isEmpty)
        app.activate()
        XCTAssertTrue(app.staticTexts["When you don’t answer"].waitForExistence(timeout: 10))
        #endif
    }

    func testPhoneShortcutOpensAndReturnsWithoutClaimingVerification() throws {
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
