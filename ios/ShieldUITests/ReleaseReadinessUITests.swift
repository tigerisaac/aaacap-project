import XCTest

@MainActor
final class ReleaseReadinessUITests: XCTestCase {
    func testSavedNumberSelectionHasAComfortableTouchTarget() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-screen", "numbers", "--uitesting-light"]
        app.launch()
        let number = app.staticTexts["(312) 555-0148"]
        XCTAssertTrue(number.appears(timeout: 5))
        XCTAssertGreaterThanOrEqual(number.frame.height, 44)
        try app.performAccessibilityAudit(for: .hitRegion)
        let capture = XCTAttachment(screenshot: app.screenshot())
        capture.name = "Saved number selection target"; capture.lifetime = .keepAlways; add(capture)
    }

    override func setUp() { continueAfterFailure = false }

    func testIndependentUserFindsOptionalCaretakerInSettings() {
        let app = launch(["--uitesting-single-person"])
        app.tabBars.buttons["More"].tap()
        XCTAssertFalse(app.buttons["Family & friends"].exists)
        XCTAssertFalse(app.buttons["Switch person"].exists)
        app.buttons["Settings"].tap()
        let caretaker = app.buttons["caretakers-settings"]
        reveal(caretaker, app); XCTAssertTrue(caretaker.isHittable)
        capture(app, "Release independent Settings")
        caretaker.tap()
        XCTAssertTrue(app.navigationBars["Caretakers"].appears(timeout: 5))
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "possible scam request and intervene")).firstMatch.exists)
        XCTAssertFalse(app.switches["Send protection alerts"].exists)
        capture(app, "Release optional caretaker")
        app.buttons["Add caretaker"].tap()
        XCTAssertTrue(app.navigationBars["Add caretaker"].appears(timeout: 5))
        XCTAssertFalse(app.buttons["trusted-contact-send"].isEnabled)
        app.navigationBars.buttons.firstMatch.tap()
        XCTAssertFalse(app.buttons["Remove contact"].exists)
    }

    func testCaretakerRequestKeepsCallAccessSeparateAtLargestText() {
        let app = launch(["--uitesting-single-person", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        app.tabBars.buttons["More"].tap(); app.buttons["Settings"].tap()
        let caretakers = app.buttons["caretakers-settings"]; reveal(caretakers, app); caretakers.tap()
        let add = app.buttons["Add caretaker"]; reveal(add, app); add.tap()
        let name = app.textFields["trusted-contact-name"], phone = app.textFields["trusted-contact-phone"]
        reveal(name, app); name.tap(); name.typeText("Alex"); done(app)
        reveal(phone, app); phone.tap(); phone.typeText("2025550102"); done(app)
        let send = app.buttons["trusted-contact-send"]; reveal(send, app)
        capture(app, "Release caretaker form largest dark")
        XCTAssertTrue(send.isEnabled); send.tap()
        XCTAssertTrue(app.navigationBars["Caretakers"].appears(timeout: 5))
        XCTAssertTrue(app.staticTexts["Alex"].exists)
        XCTAssertFalse(app.staticTexts["Calls and messages"].exists)
        capture(app, "Release pending caretaker largest dark")
        let remove = app.buttons["Remove contact"]; reveal(remove, app); remove.tap()
        XCTAssertTrue(app.alerts["Remove this caretaker?"].appears(timeout: 3))
        app.alerts.buttons["Cancel"].tap()
        XCTAssertTrue(app.staticTexts["Alex"].exists)
    }

    func testUnavailableCaretakerCannotSendRequests() {
        let app = launch(["--uitesting-single-person", "--uitesting-caretakers-unavailable"])
        app.tabBars.buttons["More"].tap(); app.buttons["Settings"].tap()
        let caretakers = app.buttons["caretakers-settings"]; reveal(caretakers, app); caretakers.tap()
        XCTAssertTrue(app.staticTexts["Caretaker alerts aren’t available yet"].appears(timeout: 5))
        XCTAssertFalse(app.buttons["Add caretaker"].exists)
        capture(app, "Release caretaker unavailable")
    }

    func testContactSharingIsExplicitAndCallSharingRemainsSeparate() {
        let app = launch(["--uitesting-single-person"])
        app.tabBars.buttons["More"].tap(); app.buttons["Settings"].tap()
        let contacts = app.buttons["Your contacts"]; reveal(contacts, app); contacts.tap()
        XCTAssertTrue(app.buttons["share-all-contacts"].appears(timeout: 5))
        XCTAssertTrue(app.staticTexts["Only names and numbers go to Shield. Contacts update only when you choose; there are no automatic uploads."].exists)
        capture(app, "Release explicit contact sharing")
        app.navigationBars.buttons.firstMatch.tap()
        let sharing = app.buttons["call-sharing-settings"]; reveal(sharing, app); sharing.tap()
        XCTAssertTrue(app.navigationBars["Call sharing"].appears(timeout: 5))
        XCTAssertFalse(app.buttons["Add caretaker"].exists)
        XCTAssertFalse(app.buttons["Make invitation"].exists)
        capture(app, "Release separate call permissions")
    }

    func testFailedCaretakerPauseIsVisibleAndCanBeRetriedAtLargestText() {
        let app = caretakerFailureFixture()
        let toggle = app.switches["Send protection alerts"]
        reveal(toggle, app); XCTAssertEqual(toggle.value as? String, "1"); toggle.tap()
        assertCaretakerFailureVisible(app, "Caretaker pause failed largest dark")
        reveal(toggle, app, fromBelow: true)
        XCTAssertEqual(toggle.value as? String, "1", "A failed pause must retain the last confirmed setting.")
        toggle.tap()
        let paused = app.switches.matching(NSPredicate(format: "label == %@ AND value == %@", "Send protection alerts", "0")).firstMatch
        XCTAssertTrue(paused.appears(timeout: 3))
        XCTAssertFalse(app.descendants(matching: .any)["caretaker-error-feedback"].exists)
        capture(app, "Caretaker pause retry succeeded largest dark")
    }

    func testFailedCaretakerRemovalIsVisibleAndCanBeRetriedAtLargestText() {
        let app = caretakerFailureFixture()
        let remove = app.buttons["Remove contact"].firstMatch
        reveal(remove, app); remove.tap(); app.alerts.buttons["Remove contact"].tap()
        assertCaretakerFailureVisible(app, "Caretaker removal failed largest dark")
        reveal(app.switches["Send protection alerts"], app, fromBelow: true)
        // At maximum text, the section heading leaves List's accessibility tree
        // when its removal button scrolls into view. Verify the retained name first.
        reveal(app.staticTexts["Jamie"], app)
        XCTAssertTrue(app.staticTexts["Jamie"].exists, "Failure must not claim the caretaker was removed.")
        reveal(remove, app)
        remove.tap(); app.alerts.buttons["Remove contact"].tap()
        reveal(app.switches["Send protection alerts"], app, fromBelow: true)
        reveal(app.staticTexts["Morgan"], app)
        XCTAssertTrue(app.staticTexts["Morgan"].exists, "The next caretaker must remain after removing Jamie.")
        XCTAssertFalse(app.staticTexts["Jamie"].exists)
        XCTAssertFalse(app.descendants(matching: .any)["caretaker-error-feedback"].exists)
        capture(app, "Caretaker removal retry succeeded largest dark")
    }

    private func caretakerFailureFixture() -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview", "--uitesting-screen", "trusted-contacts", "--uitesting-caretaker-change-fails",
            "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        app.launch()
        XCTAssertTrue(app.navigationBars["Caretakers"].appears(timeout: 5))
        return app
    }

    private func assertCaretakerFailureVisible(_ app: XCUIApplication, _ name: String) {
        let error = app.descendants(matching: .any)["caretaker-error-feedback"]
        _ = error.appears(timeout: 3)
        capture(app, name)
        XCTAssertTrue(error.exists, "The failure must be revealed without manual scrolling.")
        XCTAssertGreaterThanOrEqual(error.frame.minY, app.navigationBars.firstMatch.frame.maxY)
        XCTAssertLessThanOrEqual(error.frame.maxY, app.frame.maxY - 35)
        XCTAssertTrue(app.buttons["Check current status"].exists)
    }

    private func launch(_ extra: [String]) -> XCUIApplication {
        let app = XCUIApplication(); app.launchArguments = ["--uitesting-preview"] + extra; app.launch()
        XCTAssertTrue(app.navigationBars["Home"].appears(timeout: 5)); return app
    }
    private func reveal(_ element: XCUIElement, _ app: XCUIApplication, fromBelow: Bool = false) {
        for _ in 0..<14 {
            let top = app.navigationBars.firstMatch.frame.maxY
            let bottom = app.tabBars.firstMatch.exists ? app.tabBars.firstMatch.frame.minY : app.frame.maxY - 35
            if element.exists, element.isHittable, element.frame.minY >= top, element.frame.maxY <= bottom { return }
            let down = element.exists && !element.frame.isEmpty ? element.frame.minY < top : fromBelow
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: down ? 0.35 : 0.72))
                .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: down ? 0.7 : 0.35)))
        }
    }
    private func done(_ app: XCUIApplication) {
        let button = app.buttons["Done"].firstMatch
        if button.wait(for: \.isHittable, toEqual: true, timeout: 3) { button.tap() }
    }
    private func capture(_ app: XCUIApplication, _ name: String) {
        Thread.sleep(forTimeInterval: 0.6)
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
}
