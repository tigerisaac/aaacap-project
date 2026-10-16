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
        app.launchArguments = ["--uitesting-forwarding", "--forwarding-start-settings", "--forwarding-manual-settings", "--uitesting-system-settings"]
        app.launch()
        XCTAssertTrue(app.buttons["forwarding-continue"].appears(timeout: 15))
        app.buttons["forwarding-continue"].tap()
        let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
        XCTAssertTrue(settings.wait(for: .runningForeground, timeout: 15))
        let phone = settings.navigationBars["Phone"]
        if !phone.appears(timeout: 5),
           !settings.navigationBars["Call Blocking & Identification"].exists,
           settings.navigationBars.allElementsBoundByIndex.allSatisfy({ $0.label.isEmpty }) {
            throw XCTSkip("Settings exposes no readable navigation labels under Mirroring. Check the first destination visually, before scrolling.")
        }
        XCTAssertTrue(phone.exists, "The first page must be Phone, without a back-arrow detour")
        try verifyNativeChoices(settings, app: app)
        #endif
    }

    private func verifyNativeChoices(_ settings: XCUIApplication, app: XCUIApplication) throws {
        // Read the native choices without selecting or changing any of them.
        // This checks the visual guide against iOS, rather than our own fixture.
        let silence = settings.staticTexts["Silence"]
        for _ in 0..<8 where !settings.staticTexts["Never"].isHittable { settings.swipeUp() }
        let heading = settings.descendants(matching: .any)
            .matching(NSPredicate(format: "label ==[c] %@", "Screen Unknown Callers")).firstMatch
        XCTAssertTrue(heading.isHittable)
        XCTAssertTrue(settings.staticTexts["Never"].isHittable)
        XCTAssertTrue(settings.staticTexts["Ask Reason for Calling"].isHittable)
        XCTAssertTrue(silence.isHittable)
        XCTAssertLessThan(heading.frame.minY, silence.frame.minY)
        // Keep only the public labels and options, excluding the rest of the
        // owner's Settings page from the review attachment.
        let screenshot = settings.screenshot().image
        if let image = screenshot.cgImage {
            let scale = CGFloat(image.width) / settings.frame.width
            let crop = CGRect(x: 20, y: heading.frame.minY - 4,
                              width: settings.frame.width - 40,
                              height: silence.frame.maxY - heading.frame.minY + 8)
                .applying(CGAffineTransform(scaleX: scale, y: scale))
            if let pixels = image.cropping(to: crop) {
                let attachment = XCTAttachment(image: UIImage(cgImage: pixels))
                attachment.name = "Native caller choices only"
                attachment.lifetime = .keepAlways
                add(attachment)
            }
        }
        app.activate()
        app.buttons["Read the steps"].tap()
        XCTAssertTrue(app.buttons["phone-settings-reopen"].appears(timeout: 10))
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "I selected Silence")
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
    }
}
