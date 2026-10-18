import XCTest

@MainActor
final class CaretakerRefreshUITests: XCTestCase {
    func testPauseIsConfirmedDespiteAnOlderRefresh() {
        let app = launch()
        let toggle = app.switches["Send protection alerts"]
        XCTAssertTrue(toggle.appears(timeout: 10))
        XCTAssertEqual(toggle.value as? String, "1")
        holdRefresh(app)
        toggle.tap()
        inspect(app, containing: "changes:1", "enabled:false")
        releaseRefresh(app)
        let paused = XCTNSPredicateExpectation(predicate: NSPredicate(format: "value == %@", "0"), object: toggle)
        XCTAssertEqual(XCTWaiter.wait(for: [paused], timeout: 5), .completed, "An older refresh must not undo the confirmed paused state.")
        inspect(app, containing: "reads:3", "changes:1")
        capture(app, "Caretaker pause after older response")
    }

    func testRemovalIsConfirmedDespiteAnOlderRefresh() {
        let app = launch()
        let remove = app.buttons["Remove contact"]
        XCTAssertTrue(remove.appears(timeout: 10))
        holdRefresh(app)
        remove.tap()
        app.alerts["Remove this caretaker?"].buttons["Remove contact"].tap()
        inspect(app, containing: "changes:1", "contacts:0")
        releaseRefresh(app)
        XCTAssertTrue(remove.waitForNonExistence(timeout: 5), "A removed caretaker must not return from an older refresh.")
        inspect(app, containing: "reads:3", "changes:1")
        capture(app, "Caretaker removal after older response")
    }

    func testDeclinedRequestDoesNotReturnFromAnOlderRefresh() {
        checkDecline()
    }

    func testOlderRefreshFailureDoesNotReplaceAConfirmedDecline() {
        checkDecline(arguments: ["--caretaker-refresh-old-fails"])
    }

    func testRecipientConfirmationFailureIsVisibleAndRecoverable() {
        checkRecipientConfirmationFailure()
    }

    func testRecipientConfirmationFailureIsVisibleAtLargestText() {
        checkRecipientConfirmationFailure(arguments: ["--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
    }

    func testLostDeclineResponseCanBeReconciledWithoutRepeatingTheChange() {
        checkLostChangeResponse(accept: false)
    }

    func testLostDeclineResponseIsRecoverableAtLargestText() {
        checkLostChangeResponse(accept: false, arguments: ["--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
    }

    func testLostAcceptResponseRevealsTheAcceptedChoices() {
        checkLostChangeResponse(accept: true)
    }

    func testLostStopAlertsResponseCanBeReconciledWithoutRepeatingTheChange() {
        checkLostChangeResponse(accept: false, alreadyAccepted: true)
    }

    func testFailedConfirmationRetainsItsErrorUntilAnExplicitFreshRead() {
        let app = launch(arguments: ["--caretaker-refresh-fresh-fails"])
        let toggle = app.switches["Send protection alerts"]
        XCTAssertTrue(toggle.appears(timeout: 10))
        holdRefresh(app)
        toggle.tap()
        let error = app.descendants(matching: .any)["caretaker-error-feedback"]
        XCTAssertTrue(error.appears(timeout: 5))
        inspect(app, containing: "reads:3", "changes:1", "enabled:false")
        releaseRefresh(app)
        XCTAssertTrue(error.exists, "An older successful read must not clear a failed confirmation.")
        app.buttons["Check current status"].tap()
        XCTAssertTrue(error.waitForNonExistence(timeout: 5))
        for _ in 0..<3 where !toggle.isHittable { app.swipeDown() }
        XCTAssertEqual(toggle.value as? String, "0")
        inspect(app, containing: "reads:4", "changes:1")
        capture(app, "Caretaker confirmation failure recovered")
    }

    private func checkDecline(arguments: [String] = []) {
        let app = launch(recipient: true, arguments: arguments)
        let decline = app.buttons["Decline request"]
        XCTAssertTrue(decline.appears(timeout: 10))
        holdRefresh(app)
        decline.tap()
        XCTAssertTrue(app.staticTexts["No requests"].appears(timeout: 5))
        inspect(app, containing: "reads:3", "changes:1", "contacts:0")
        releaseRefresh(app)
        let stale = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == true"), object: decline)
        stale.isInverted = true
        XCTAssertEqual(XCTWaiter.wait(for: [stale], timeout: 2), .completed)
        XCTAssertTrue(app.staticTexts["No requests"].appears(timeout: 5), "A declined request must not return from an older refresh.")
        XCTAssertFalse(decline.exists)
        XCTAssertFalse(app.staticTexts["Requests couldn’t load"].exists)
        capture(app, "Declined request after older response")
    }

    private func checkRecipientConfirmationFailure(arguments: [String] = []) {
        let app = launch(recipient: true, arguments: ["--caretaker-refresh-fresh-fails"] + arguments)
        XCTAssertTrue(app.buttons["Start held refresh"].appears(timeout: 10))
        holdRefresh(app)
        let decline = app.buttons["Decline request"]
        for _ in 0..<6 where !decline.isHittable { app.collectionViews.firstMatch.swipeUp() }
        decline.tap()
        inspect(app, containing: "reads:3", "changes:1", "contacts:0")
        let notice = app.descendants(matching: .any)["contact-alert-load-error"]
        let check = app.buttons["Check current status"]
        XCTAssertTrue(notice.appears(timeout: 5))
        XCTAssertTrue(notice.isHittable, "An unconfirmed decline needs visible recovery feedback.")
        XCTAssertTrue(check.exists, "The notice needs an explicit status-check action.")
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Your connection was interrupted. Check your internet connection.")).firstMatch.exists)
        XCTAssertFalse(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "NSURLErrorDomain")).firstMatch.exists)
        capture(app, "Recipient confirmation failure visible")
        releaseRefresh(app)
        XCTAssertTrue(notice.exists, "An older response must not clear the current confirmation failure.")
        // At maximum text, the notice and button span more than one viewport. XCTest's
        // isHittable can be true even when the test footer covers most of the button.
        let footer = app.staticTexts["caretaker-fixture-state"]
        for _ in 0..<4 where check.frame.maxY > footer.frame.minY - 8 {
            app.collectionViews.firstMatch.swipeUp()
        }
        XCTAssertTrue(check.isHittable)
        XCTAssertLessThanOrEqual(check.frame.maxY, footer.frame.minY - 8)
        capture(app, "Recipient status-check action fully revealed")
        check.tap()
        XCTAssertTrue(app.staticTexts["No requests"].appears(timeout: 5))
        XCTAssertFalse(notice.exists)
        inspect(app, containing: "reads:4", "changes:1", "contacts:0")
        capture(app, "Recipient confirmation failure recovered")
    }

    private func checkLostChangeResponse(accept: Bool, alreadyAccepted: Bool = false, arguments: [String] = []) {
        let initial = alreadyAccepted ? ["--caretaker-refresh-recipient-accepted"] : []
        let app = launch(recipient: true, arguments: ["--caretaker-refresh-change-response-lost"] + initial + arguments)
        XCTAssertTrue(app.buttons["Start held refresh"].appears(timeout: 10))
        holdRefresh(app)
        if accept {
            let texts = app.switches["contact-text-alerts"]
            for _ in 0..<6 where !texts.isHittable { app.collectionViews.firstMatch.swipeUp() }
            texts.tap()
        }
        let action = app.buttons[accept ? "Accept request" : alreadyAccepted ? "Stop these alerts" : "Decline request"]
        for _ in 0..<6 where !action.isHittable { app.collectionViews.firstMatch.swipeUp() }
        action.tap()
        inspect(app, containing: "reads:2", "changes:1", accept ? "contacts:1" : "contacts:0")
        let notice = app.descendants(matching: .any)["contact-alert-load-error"]
        let check = app.buttons["Check current status"]
        let appeared = notice.appears(timeout: 5)
        capture(app, "Recipient lost change response before recovery")
        XCTAssertTrue(appeared, "A lost response cannot establish that the server did not save the change.")
        XCTAssertFalse(app.descendants(matching: .any)["contact-alert-error"].exists, "Do not claim alert choices were not saved after a response was lost.")
        // Preserve the useful baseline failure without trying to tap a missing recovery action.
        guard appeared else { return }
        XCTAssertTrue(notice.isHittable)
        XCTAssertTrue(check.exists)
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Your connection was interrupted. Check your internet connection.")).firstMatch.exists)
        releaseRefresh(app)
        XCTAssertTrue(notice.exists, "An older read cannot dismiss an unconfirmed change.")
        let footer = app.staticTexts["caretaker-fixture-state"]
        for _ in 0..<4 where check.frame.maxY > footer.frame.minY - 8 { app.collectionViews.firstMatch.swipeUp() }
        XCTAssertTrue(check.isHittable)
        XCTAssertLessThanOrEqual(check.frame.maxY, footer.frame.minY - 8)
        capture(app, "Recipient lost change response status action")
        check.tap()
        XCTAssertTrue(notice.waitForNonExistence(timeout: 5))
        if accept {
            XCTAssertTrue(app.staticTexts["You’re a caretaker."].appears(timeout: 5))
            XCTAssertEqual(app.switches["contact-text-alerts"].value as? String, "1")
            XCTAssertTrue(app.buttons["Save alert choices"].exists)
        } else { XCTAssertTrue(app.staticTexts["No requests"].appears(timeout: 5)) }
        inspect(app, containing: "reads:3", "changes:1", accept ? "contacts:1" : "contacts:0")
        capture(app, "Recipient lost change response reconciled")
    }

    private func launch(recipient: Bool = false, arguments: [String] = []) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-caretaker-refresh", "--uitesting-light"]
        if recipient { app.launchArguments += ["--caretaker-refresh-recipient"] }
        app.launchArguments += arguments
        app.launch()
        return app
    }

    private func holdRefresh(_ app: XCUIApplication) {
        // Use the screen's real load method without a never-ending native refresh animation,
        // which prevents XCTest from acting until the intentionally held response is released.
        app.buttons["Start held refresh"].tap()
        inspect(app, containing: "reads:2", "held:true", "changes:0")
    }

    private func inspect(_ app: XCUIApplication, containing values: String...) {
        app.buttons["Inspect requests"].tap()
        let status = app.staticTexts["caretaker-fixture-state"]
        for value in values {
            XCTAssertTrue(NSPredicate(format: "label CONTAINS %@", value).evaluate(with: status), "Expected \(value), got \(status.label)")
        }
    }

    private func releaseRefresh(_ app: XCUIApplication) {
        app.buttons["Release older response"].tap()
        inspect(app, containing: "held:false", "released:true")
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
