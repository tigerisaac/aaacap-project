import XCTest

@MainActor
final class ShieldUITests: XCTestCase {
    func testWelcomeEmailValidationAndDemoEntry() {
        let app = XCUIApplication()
        app.launch()
        let email = app.textFields["Email address"]
        XCTAssertTrue(email.waitForExistence(timeout: 5))
        let continueButton = app.buttons["Continue"]
        XCTAssertFalse(continueButton.isEnabled)
        capture(app, name: "Welcome")
        email.tap()
        email.typeText("hello")
        XCTAssertFalse(continueButton.isEnabled)
        email.typeText("@example.com")
        XCTAssertTrue(continueButton.isEnabled)
        capture(app, name: "Welcome with keyboard")
        app.swipeUp()
        let demo = app.buttons["View demo"]
        if !demo.isHittable { app.swipeUp() }
        demo.tap()
        XCTAssertTrue(app.staticTexts["demoBanner"].waitForExistence(timeout: 5))
    }

    func testEmailSentShowsAddressOnceAndCanChangeIt() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-email-sent"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Check your email"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts.matching(identifier: "beta@example.com").count, 1)
        XCTAssertFalse(app.textFields["Email address"].exists)
        XCTAssertFalse(app.buttons["View demo"].exists)
        XCTAssertTrue(app.buttons["Resend link"].exists)
        capture(app, name: "Email sent")
        app.buttons["Change email"].tap()
        XCTAssertTrue(app.textFields["Email address"].exists)
        XCTAssertEqual(app.textFields["Email address"].value as? String, "beta@example.com")
        XCTAssertTrue(app.buttons["Continue"].exists)
    }

    func testWelcomeAtLargestTextSize() {
        let app = XCUIApplication()
        app.launchArguments = ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        app.launch()
        XCTAssertTrue(app.textFields["Email address"].waitForExistence(timeout: 5))
        capture(app, name: "Welcome large text")
        let demo = app.buttons["View demo"]
        for _ in 0..<6 {
            if demo.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(demo.isHittable)
        capture(app, name: "Welcome large text controls")
        demo.tap()
        XCTAssertTrue(app.staticTexts["demoBanner"].waitForExistence(timeout: 5))
        capture(app, name: "Today large text")
    }

    private func capture(_ app: XCUIApplication, name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    func testPreviewShowsHeldCallAndClearExplanation() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview"]
        app.launch()
        XCTAssertTrue(app.staticTexts["demoBanner"].waitForExistence(timeout: 5))
        capture(app, name: "Today")
        app.tabBars.buttons["Calls"].tap()
        XCTAssertTrue(app.navigationBars["Calls"].exists)
        XCTAssertTrue(app.buttons["callFilter"].exists)
        capture(app, name: "Calls")
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
