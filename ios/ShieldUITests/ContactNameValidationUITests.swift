import XCTest

@MainActor
final class ContactNameValidationUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testManualNumberAndContactRejectOverlongNamesAndRecoverAfterEditing() {
        for screen in ["add-number", "add-contact"] {
            let app = launch(["--uitesting-screen", screen])
            let name = app.textFields["Name"], phone = app.textFields["saved-number-phone"]
            XCTAssertTrue(name.appears(timeout: 5))
            phone.tap(); phone.typeText("2025550181"); done(app)
            name.tap(); name.typeText(String(repeating: "A", count: 61))
            XCTAssertEqual((name.value as? String)?.count, 61)
            let save = app.buttons["Save number"]
            XCTAssertTrue(app.staticTexts["Use a shorter name."].appears(timeout: 3))
            XCTAssertFalse(save.isEnabled)
            capture(app, "\(screen) long name blocked")
            // Keep the insertion point established by typing; tapping a wrapped
            // field again can put it before the first character.
            name.typeText(XCUIKeyboardKey.delete.rawValue)
            XCTAssertEqual((name.value as? String)?.count, 60)
            done(app)
            XCTAssertFalse(app.staticTexts["Use a shorter name."].exists)
            XCTAssertTrue(save.isEnabled)
            XCTAssertEqual(phone.value as? String, "(202) 555-0181")
            capture(app, "\(screen) name corrected")
        }
    }

    func testCaretakerRejectsOverlongNameAndRecoversWithoutSendingARequest() {
        let app = launch(["--uitesting-trusted-contacts"])
        app.buttons["trusted-contact-yes"].tap()
        let name = app.textFields["trusted-contact-name"], phone = app.textFields["trusted-contact-phone"]
        XCTAssertTrue(name.appears(timeout: 5))
        phone.tap(); phone.typeText("2025550182"); done(app)
        name.tap(); name.typeText(String(repeating: "A", count: 61))
        XCTAssertEqual((name.value as? String)?.count, 61)
        let send = app.buttons["trusted-contact-send"]
        XCTAssertTrue(app.staticTexts["Use a shorter name."].appears(timeout: 3))
        XCTAssertFalse(send.isEnabled)
        capture(app, "caretaker long name blocked")
        name.typeText(XCUIKeyboardKey.delete.rawValue)
        XCTAssertEqual((name.value as? String)?.count, 60)
        done(app)
        XCTAssertFalse(app.staticTexts["Use a shorter name."].exists)
        XCTAssertTrue(send.isEnabled)
        XCTAssertEqual(phone.value as? String, "(202) 555-0182")
        capture(app, "caretaker name corrected")
    }

    private func launch(_ arguments: [String]) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview", "--uitesting-light"] + arguments
        app.launch()
        return app
    }

    private func done(_ app: XCUIApplication) {
        let button = app.buttons["Done"].firstMatch
        XCTAssertTrue(button.wait(for: \.isHittable, toEqual: true, timeout: 3))
        button.tap()
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
}
