import XCTest
import CallKit
import UIKit

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
        if settings.navigationBars.count == 0 && settings.cells.count == 0 {
            throw XCTSkip("Settings exposes no native accessibility tree while iPhone Mirroring owns the display. Verify this handoff in Mirroring.")
        }
        XCTAssertTrue(settings.navigationBars["Phone"].appears(timeout: 15))
        try verifyNativeChoices(settings, app: app)
        #endif
    }

    func testFloatingGuideOnPhysicalPhone() throws {
        #if targetEnvironment(simulator)
        throw XCTSkip("Verify system PiP on the physical phone")
        #else
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-forwarding", "--forwarding-start-settings"]
        app.launch()
        XCTAssertTrue(app.buttons["forwarding-continue"].appears(timeout: 15))
        app.buttons["setup-guide-float"].tap()
        XCTAssertTrue(app.staticTexts["Guide is floating"].appears(timeout: 10))
        let floating = XCTAttachment(screenshot: app.screenshot())
        floating.name = "Floating guide on synthetic setup"
        floating.lifetime = .keepAlways
        add(floating)
        #endif
    }

    private func verifyNativeChoices(_ settings: XCUIApplication, app: XCUIApplication) throws {
        // Read the native choices without selecting or changing any of them.
        // This checks the visual guide against iOS, rather than our own fixture.
        let silence = settings.staticTexts["Silence"]
        for _ in 0..<6 where !silence.isHittable { settings.swipeUp() }
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
