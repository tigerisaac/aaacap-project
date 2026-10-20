import XCTest

@MainActor
final class ContactNameValidationUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testCaretakerDeliveryStatusKeepsManualInvitationAvailable() {
        checkDeliveryStatus(large: false)
    }

    func testCaretakerDeliveryStatusAtLargestText() {
        checkDeliveryStatus(large: true)
    }

    private func checkDeliveryStatus(large: Bool) {
        let app = launch(["--uitesting-screen", "trusted-contacts", "--uitesting-caretaker-delivery"] + (large
            ? ["--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"] : []))
        XCTAssertTrue(app.navigationBars["Caretakers"].appears(timeout: 5))
        let delivered = app.staticTexts["Request text delivered"]
        for _ in 0..<12 where !delivered.isHittable { app.swipeUp() }
        XCTAssertTrue(delivered.exists)
        let failed = app.staticTexts["Request text couldn’t be delivered. Share the invitation instead."]
        for _ in 0..<12 where !failed.isHittable { app.swipeUp() }
        XCTAssertTrue(failed.exists)
        XCTAssertTrue(app.buttons["Share invitation"].firstMatch.exists)
        capture(app, "Caretaker text delivery failure and manual invitation")
        let unknown = app.staticTexts["Text delivery isn’t confirmed. Share the invitation if needed."]
        for _ in 0..<8 where !unknown.isHittable { app.swipeUp() }
        XCTAssertTrue(unknown.exists)
        capture(app, "Caretaker text delivery uncertain")
    }

    func testCaretakerInvitationPreviewNamesSenderBeforeSending() {
        checkInvitationPreview(large: false)
    }

    func testCaretakerInvitationPreviewWrapsAtLargestText() {
        checkInvitationPreview(large: true)
    }

    func testCaretakerCannotSendWithoutAnInvitationPreview() {
        let app = launch(["--uitesting-trusted-contacts", "--uitesting-invitation-preview-fails"])
        app.buttons["trusted-contact-yes"].tap()
        let name = app.textFields["trusted-contact-name"], phone = app.textFields["trusted-contact-phone"]
        XCTAssertTrue(name.appears(timeout: 5)); name.tap(); name.typeText("Alex"); done(app)
        phone.tap(); phone.typeText("2025550182"); done(app)
        let retry = app.buttons["Try preview again"]
        for _ in 0..<8 where !retry.isHittable { app.swipeUp() }
        XCTAssertTrue(retry.exists)
        let send = app.buttons["trusted-contact-send"]
        for _ in 0..<4 where !send.isHittable { app.swipeUp() }
        XCTAssertFalse(send.isEnabled)
        capture(app, "Caretaker preview unavailable blocks sending")
    }

    private func checkInvitationPreview(large: Bool) {
        let app = launch(["--uitesting-trusted-contacts"] + (large
            ? ["--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"] : []))
        app.buttons["trusted-contact-yes"].tap()
        let preview = app.staticTexts["caretaker-invitation-preview"]
        for _ in 0..<12 where !preview.isHittable { app.swipeUp() }
        XCTAssertTrue(preview.exists)
        XCTAssertTrue(preview.label.contains("Someone added you as a caretaker in Shield."))
        XCTAssertTrue(preview.label.contains("Reply STOP to stop texts."))
        XCTAssertTrue(app.staticTexts["From Shield’s text-message number, not your phone."].exists)
        capture(app, large ? "Caretaker invitation largest dark" : "Caretaker invitation preview")
        let send = app.buttons["trusted-contact-send"]
        for step in 0..<12 where !send.isHittable {
            app.swipeUp()
            if large && (step == 1 || step == 3) { capture(app, "Caretaker invitation largest dark continuation \(step)") }
        }
        XCTAssertTrue(send.exists)
        // Preview fixtures do not send a text or submit a request.
    }

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
