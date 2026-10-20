import XCTest

@MainActor
final class OnboardingRecoveryUITests: XCTestCase {
    func testEarlierSessionSaveCannotCancelTheNewSessionRefresh() {
        let app = launch(arguments: ["--onboarding-session-race"])
        let toggle = app.switches["onboarding-protection-toggle"]
        reveal(toggle, app); toggle.tap()
        let save = app.buttons["onboarding-protection-continue"]
        reveal(save, app); save.tap()
        inspect(app, containing: "attempts:1", "changes:1", "heldSave:true")
        app.buttons["Start a new session"].tap()
        XCTAssertEqual(toggle.value as? String, "0")
        app.buttons["Refresh setup choices"].tap()
        inspect(app, containing: "reads:1", "heldRefresh:true")
        app.buttons["Release earlier save"].tap()
        let completed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "label == %@", "No earlier save"), object: app.staticTexts["onboarding-client-operation"])
        XCTAssertEqual(XCTWaiter.wait(for: [completed], timeout: 5), .completed)
        XCTAssertFalse(app.descendants(matching: .any)["onboarding-choice-error"].exists)
        app.buttons["Release setup refresh"].tap()
        XCTAssertTrue(app.staticTexts["onboarding-fixture-complete"].appears(timeout: 5), "Finishing an old-session save must not invalidate the new session's fresh status read.")
        inspect(app, containing: "reads:2", "attempts:1", "changes:1", "heldSave:false", "heldRefresh:false")
        capture(app, "Onboarding new session after earlier save finishes")
    }

    func testLostProtectionChoiceCanBeCheckedWithoutSavingAgain() {
        checkLostChoice(caretaker: false)
    }

    func testLostCaretakerChoiceCanBeCheckedWithoutSavingAgain() {
        checkLostChoice(caretaker: true)
    }

    func testLostCaretakerChoiceIsVisibleAtLargestText() {
        checkLostChoice(caretaker: true, large: true)
    }

    func testLostProtectionOptOutCanBeConfirmed() {
        checkLostChoice(caretaker: false, enabled: false)
    }

    func testFailedChoiceStatusReadDoesNotSaveAgain() {
        checkLostChoice(caretaker: false, readFails: true)
    }

    func testAddedCaretakerChoiceCanBeConfirmedWithoutSavingAgain() {
        checkLostChoice(caretaker: true, addContact: true)
    }

    func testMissingProtectionChoiceAllowsAnExplicitSameChoiceRetry() {
        let app = launch(arguments: ["--onboarding-not-saved"])
        let toggle = app.switches["onboarding-protection-toggle"]
        reveal(toggle, app); toggle.tap()
        let save = app.buttons["onboarding-protection-continue"]
        reveal(save, app); save.tap()
        XCTAssertTrue(app.descendants(matching: .any)["onboarding-choice-error"].appears(timeout: 5))
        XCTAssertFalse(toggle.isEnabled)
        XCTAssertFalse(save.isEnabled)
        let check = app.buttons["Check current status"]
        reveal(check, app); check.tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Your choice isn’t confirmed yet")).firstMatch.appears(timeout: 5))
        inspect(app, containing: "attempts:1", "changes:0", "reads:1")
        XCTAssertFalse(toggle.isEnabled, "A still-pending first write must not race a different choice.")
        reveal(check, app); XCTAssertTrue(check.isEnabled)
        capture(app, "Onboarding missing choice status action remains available")
        reveal(save, app); XCTAssertTrue(save.isEnabled)
        capture(app, "Onboarding missing choice permits deliberate retry")
        save.tap()
        XCTAssertTrue(app.staticTexts["onboarding-fixture-complete"].appears(timeout: 5))
        inspect(app, containing: "attempts:2", "changes:1", "enabled:true")
        capture(app, "Onboarding same choice retry confirmed")
    }

    func testRejectedProtectionChoiceRemainsEditable() {
        let app = launch(arguments: ["--onboarding-save-rejected"])
        let toggle = app.switches["onboarding-protection-toggle"]
        reveal(toggle, app); toggle.tap()
        let save = app.buttons["onboarding-protection-continue"]
        reveal(save, app); save.tap()
        XCTAssertTrue(app.descendants(matching: .any)["onboarding-choice-error"].appears(timeout: 5))
        XCTAssertTrue(toggle.isEnabled)
        XCTAssertTrue(save.isEnabled)
        XCTAssertFalse(app.buttons["Check current status"].exists)
        inspect(app, containing: "attempts:1", "changes:0", "reads:0")
        capture(app, "Onboarding rejected choice remains editable")
    }

    private func launch(arguments: [String] = []) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-onboarding-recovery", "--uitesting-light"] + arguments
        app.launch()
        XCTAssertTrue(app.buttons["Inspect saved choice"].appears(timeout: 10))
        return app
    }

    private func checkLostChoice(caretaker: Bool, large: Bool = false, enabled: Bool = true, readFails: Bool = false, addContact: Bool = false) {
        var arguments = caretaker ? ["--onboarding-caretaker"] : []
        if large { arguments += ["--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"] }
        if readFails { arguments += ["--onboarding-read-fails"] }
        let app = launch(arguments: arguments)
        if !caretaker, enabled {
            let toggle = app.switches["onboarding-protection-toggle"]
            reveal(toggle, app); toggle.tap()
            XCTAssertEqual(toggle.value as? String, "1")
        }
        if addContact {
            let add = app.buttons["trusted-contact-yes"]
            reveal(add, app); add.tap()
            let name = app.textFields["trusted-contact-name"], phone = app.textFields["trusted-contact-phone"]
            reveal(name, app); name.tap(); name.typeText("Alex"); app.buttons["Done"].firstMatch.tap()
            reveal(phone, app); phone.tap(); phone.typeText("2025550102"); app.buttons["Done"].firstMatch.tap()
            let send = app.buttons["trusted-contact-send"]
            reveal(send, app); send.tap()
            XCTAssertTrue(app.buttons["trusted-contact-finish"].appears(timeout: 5))
        }
        let save = app.buttons[caretaker ? (addContact ? "trusted-contact-finish" : "trusted-contact-no") : "onboarding-protection-continue"]
        reveal(save, app); save.tap()
        inspect(app, containing: "attempts:1", "changes:1", "recorded:true", (caretaker ? addContact : enabled) ? "enabled:true" : "enabled:false")
        let notice = app.descendants(matching: .any)["onboarding-choice-error"]
        let appeared = notice.appears(timeout: 3)
        capture(app, "Onboarding saved choice response lost")
        XCTAssertTrue(appeared, "A lost response needs uncertainty feedback and a read-only status check.")
        XCTAssertFalse(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Couldn’t save your choice")).firstMatch.exists)
        guard appeared else { return }
        XCTAssertTrue(notice.isHittable)
        XCTAssertFalse(save.isEnabled)
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Your connection was interrupted.")).firstMatch.exists)
        XCTAssertFalse(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "NSURLErrorDomain")).firstMatch.exists)
        let check = app.buttons["Check current status"]
        reveal(check, app)
        capture(app, "Onboarding status action")
        check.tap()
        if readFails {
            XCTAssertTrue(notice.exists)
            inspect(app, containing: "reads:1", "attempts:1", "changes:1")
            capture(app, "Onboarding status read failed")
            reveal(check, app); check.tap()
        }
        XCTAssertTrue(app.staticTexts["onboarding-fixture-complete"].appears(timeout: 5))
        inspect(app, containing: readFails ? "reads:2" : "reads:1", "attempts:1", "changes:1")
        capture(app, "Onboarding saved choice confirmed")
    }

    private func inspect(_ app: XCUIApplication, containing values: String...) {
        app.buttons["Inspect saved choice"].tap()
        let status = app.staticTexts["onboarding-fixture-state"]
        for value in values {
            XCTAssertTrue(NSPredicate(format: "label CONTAINS %@", value).evaluate(with: status), "Expected \(value), got \(status.label)")
        }
    }

    private func reveal(_ element: XCUIElement, _ app: XCUIApplication) {
        for _ in 0..<24 {
            let top = app.navigationBars.firstMatch.exists ? app.navigationBars.firstMatch.frame.maxY : 0
            let bottom = app.staticTexts["onboarding-fixture-state"].frame.minY - 8
            if element.exists, element.isHittable, element.frame.minY >= top, element.frame.maxY <= bottom { return }
            let down = element.exists && !element.frame.isEmpty && element.frame.minY < top
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: down ? 0.42 : 0.68))
                .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: down ? 0.68 : 0.42)))
        }
        XCTAssertTrue(element.isHittable)
        XCTAssertLessThanOrEqual(element.frame.maxY, app.staticTexts["onboarding-fixture-state"].frame.minY - 8)
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
}
