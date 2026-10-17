import XCTest

@MainActor
final class PhoneOnboardingUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }
    func testSignInOffersOnlyPhoneAndPrivacy() {
        let app = launch([])
        XCTAssertTrue(app.textFields["sign-in-phone"].appears(timeout: 5))
        XCTAssertFalse(app.buttons["Try sample app"].exists)
        XCTAssertFalse(app.buttons["Use email instead"].exists)
        XCTAssertFalse(app.textFields["Email address"].exists)
        XCTAssertTrue(app.buttons["Privacy"].exists || app.links["Privacy"].exists)
        capture(app, "Phone-only sign-in")
    }
    func testPhoneCodeErrorAndSuccessfulSignIn() {
        let app = launch(["--uitesting-phone-sign-in"])
        let phone = app.textFields["sign-in-phone"], submit = app.buttons["phone-sign-in-submit"]
        XCTAssertTrue(phone.appears(timeout: 5)); XCTAssertFalse(submit.isEnabled)
        capture(app, "phone-welcome")
        phone.tap(); phone.typeText("2025550102"); done(app)
        reveal(submit, app); XCTAssertTrue(submit.isEnabled); submit.tap()
        let code = app.textFields["sign-in-phone-code"]
        XCTAssertTrue(code.appears(timeout: 5)); code.tap(); code.typeText("000000"); done(app)
        reveal(submit, app); submit.tap()
        XCTAssertTrue(app.descendants(matching: .any)["phone-sign-in-error"].appears(timeout: 5))
        XCTAssertTrue(code.exists); capture(app, "phone-code-error")
        code.tap(); code.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: 6) + "123456"); done(app)
        reveal(submit, app); submit.tap()
        XCTAssertTrue(app.staticTexts["demoBanner"].appears(timeout: 5))
    }
    func testCodeKeyboardHasNoExtraDoneToolbar() {
        for large in [false, true] {
            let app = launch(["--uitesting-phone-sign-in", "--uitesting-dark"] + (large
                ? ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"] : []))
            let phone = app.textFields["sign-in-phone"], submit = app.buttons["phone-sign-in-submit"]
            reveal(phone, app); phone.tap(); phone.typeText("2025550102")
            reveal(submit, app); submit.tap()
            let code = app.textFields["sign-in-phone-code"]
            XCTAssertTrue(code.appears(timeout: 5))
            code.tap()
            XCTAssertTrue(app.keyboards.firstMatch.wait(for: \.isHittable, toEqual: true, timeout: 5))
            XCTAssertFalse(app.buttons["Done"].exists)
            capture(app, "Code keyboard without toolbar \(large ? "largest" : "standard")")
            code.typeText("123456")
            reveal(submit, app)
            XCTAssertTrue(submit.isHittable)
            submit.tap()
            XCTAssertTrue(app.staticTexts["demoBanner"].appears(timeout: 5))
        }
    }
    func testCanContinueIndependently() {
        let app = launch(["--uitesting-trusted-contacts"])
        XCTAssertTrue(app.buttons["trusted-contact-no"].appears(timeout: 5))
        XCTAssertTrue(app.buttons["trusted-contact-yes"].exists)
        capture(app, "optional-contacts")
        app.buttons["trusted-contact-no"].tap()
        XCTAssertTrue(app.staticTexts["demoBanner"].appears(timeout: 5))
    }
    func testContactRequiresDetailsAndWaitsForAcceptance() {
        let app = launch(["--uitesting-trusted-contacts"])
        app.buttons["trusted-contact-yes"].tap()
        let send = app.buttons["trusted-contact-send"]
        XCTAssertFalse(send.isEnabled); capture(app, "add-contact")
        let name = app.textFields["trusted-contact-name"], phone = app.textFields["trusted-contact-phone"]
        name.tap(); name.typeText("Alex"); done(app)
        reveal(phone, app); phone.tap(); phone.typeText("2025550102"); done(app)
        reveal(send, app); XCTAssertTrue(send.isEnabled); send.tap()
        XCTAssertTrue(app.staticTexts["Waiting for confirmation"].appears(timeout: 5))
        capture(app, "contact-pending")
        app.buttons["trusted-contact-finish"].tap()
        XCTAssertTrue(app.staticTexts["demoBanner"].appears(timeout: 5))
    }
    func testPhoneAndContactChoicesAtLargestTextDark() {
        let large = ["--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        var app = launch(["--uitesting-phone-sign-in"] + large)
        capture(app, "phone-welcome-large-dark")
        reveal(app.textFields["sign-in-phone"], app)
        XCTAssertTrue(app.textFields["sign-in-phone"].isHittable)
        capture(app, "phone-form-large-dark")
        app = launch(["--uitesting-trusted-contacts"] + large)
        capture(app, "optional-contacts-large-dark")
        let no = app.buttons["trusted-contact-no"]
        reveal(no, app); XCTAssertTrue(no.isHittable); capture(app, "optional-choices-large-dark")
        no.tap(); XCTAssertTrue(app.staticTexts["demoBanner"].appears(timeout: 5))
    }
    func testRecipientChoosesBothChannelsAndCanStop() {
        let app = launch(["--uitesting-screen", "contact-alerts"])
        let accept = app.buttons["contact-accept"]
        XCTAssertTrue(accept.appears(timeout: 5)); XCTAssertFalse(accept.isEnabled)
        capture(app, "recipient-alert-choice")
        let texts = app.switches["contact-text-alerts"], alerts = app.switches["contact-app-alerts"]
        reveal(texts, app); texts.tap(); reveal(alerts, app); alerts.tap()
        reveal(accept, app); XCTAssertTrue(accept.isEnabled); accept.tap()
        XCTAssertTrue(app.staticTexts["You’re a caretaker."].appears(timeout: 5))
        capture(app, "recipient-both-channels")
        let stop = app.buttons["Stop these alerts"]; reveal(stop, app); stop.tap()
        XCTAssertTrue(app.staticTexts["No requests for this mobile number."].appears(timeout: 5))
    }

    private func launch(_ arguments: [String]) -> XCUIApplication {
        let app = XCUIApplication(); app.launchArguments = arguments; app.launch(); return app
    }
    private func reveal(_ element: XCUIElement, _ app: XCUIApplication) {
        // Swipe inside the content above the keyboard; a full-screen swipe can land on the number pad.
        for _ in 0..<10 {
            let keyboard = app.keyboards.firstMatch
            let bottom = keyboard.exists ? keyboard.frame.minY : app.frame.maxY
            if element.isHittable && element.frame.maxY < bottom - 8 { return }
            let startY = max(0.25, min(0.7, (bottom - 36) / app.frame.height))
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: startY))
                .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.18)))
        }
    }
    private func done(_ app: XCUIApplication) {
        let button = app.buttons["Done"].firstMatch
        if button.wait(for: \.isHittable, toEqual: true, timeout: 3) { button.tap() }
    }
    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot()); attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
}
