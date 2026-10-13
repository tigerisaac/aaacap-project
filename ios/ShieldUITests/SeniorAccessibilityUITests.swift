import XCTest

@MainActor
final class SeniorAccessibilityUITests: XCTestCase {
    override func setUp() { continueAfterFailure = true }

    func testWelcomeAndSentEmailAudit() throws {
        var app = launch(["--uitesting-auth-error"])
        XCTAssertTrue(app.textFields["Email address"].waitForExistence(timeout: 5))
        try audit(app, "accessibility-welcome")
        app = launch(["--uitesting-email-sent"])
        XCTAssertTrue(app.staticTexts["Check your email"].waitForExistence(timeout: 5))
        try audit(app, "accessibility-email-sent")
    }

    func testEverydayScreensAudit() throws {
        let app = launch(["--uitesting-preview"])
        try audit(app, "accessibility-home")
        moveFullyIntoView(app.staticTexts["Call stopped"].firstMatch, in: app)
        try audit(app, "accessibility-home-row-exposed")
        app.tabBars.buttons["Calls"].tap()
        try audit(app, "accessibility-calls")
        moveFullyIntoView(app.staticTexts["Suspicious message removed"].firstMatch, in: app)
        try audit(app, "accessibility-calls-row-exposed")
        app.tabBars.buttons["Messages"].tap()
        try audit(app, "accessibility-messages")
        app.tabBars.buttons["More"].tap()
        try audit(app, "accessibility-more")
    }

    func testOwnerSettingsScreensAudit() throws {
        for screen in ["numbers", "add-number", "sharing", "contacts", "quiet", "blocked", "protection", "invitation", "help", "automatic-texts"] {
            let app = launch(["--uitesting-screen", screen])
            try audit(app, "accessibility-\(screen)")
        }
    }

    func testOnboardingChoicesAudit() throws {
        var app = launch(["--uitesting-protection-onboarding"])
        XCTAssertTrue(app.switches["onboarding-protection-toggle"].waitForExistence(timeout: 5))
        try audit(app, "accessibility-protection-choice")
        app = launch(["--uitesting-helper-alerts-onboarding"])
        XCTAssertTrue(app.switches["onboarding-helper-alerts-toggle"].waitForExistence(timeout: 5))
        try audit(app, "accessibility-helper-choice")
    }

    func testPhoneSetupAndDisconnectionAudit() throws {
        var app = launch(["--uitesting-forwarding"])
        XCTAssertTrue(app.buttons["forwarding-continue"].waitForExistence(timeout: 5))
        try audit(app, "accessibility-phone-setup")
        app = launch(["--uitesting-forwarding", "--forwarding-start-restore"])
        XCTAssertTrue(app.buttons["forwarding-reset-continue"].waitForExistence(timeout: 5))
        try audit(app, "accessibility-disconnection")
    }

    private func launch(_ arguments: [String]) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-light"] + arguments
        app.launch()
        return app
    }

    private func audit(_ app: XCUIApplication, _ name: String) throws {
        let capture = XCTAttachment(screenshot: app.screenshot())
        capture.name = name; capture.lifetime = .keepAlways; add(capture)
        let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("AccessibilityScreens")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try app.screenshot().pngRepresentation.write(to: directory.appendingPathComponent(name + ".png"))
        // Keep every diagnostic. Review native scroll-edge/disabled-control reports against the capture.
        try app.performAccessibilityAudit(for: [.contrast, .textClipped, .hitRegion, .sufficientElementDescription]) { issue in
            print("Shield accessibility: \(name): \(issue.compactDescription); \(issue.element?.debugDescription ?? "No associated element")")
            return false
        }
    }

    private func moveFullyIntoView(_ element: XCUIElement, in app: XCUIApplication) {
        for _ in 0..<8 {
            if element.exists && element.frame.minY >= app.navigationBars.firstMatch.frame.maxY && element.frame.maxY <= app.tabBars.firstMatch.frame.minY { return }
            app.swipeUp()
        }
        XCTAssertTrue(element.isHittable)
    }
}
