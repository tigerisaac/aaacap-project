import XCTest

@MainActor
final class ContactRecoveryUITests: XCTestCase {
    func testVoiceOverCanFindContactRecoveryAndConfirmTheSavedChange() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver testing service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "contact-change-recovery", arguments: ["--uitesting-preview", "--uitesting-contact-recovery"], large: true)
        defer { walk.finish() }
        try walk.activate("Remove Synthetic contact recovery from Contacts")
        try walk.activate("Remove number")
        try walk.find("Finish contact change")
        try walk.find("Check saved change")
        walk.checkpoint("contact-recovery-controls-readable")
        // Fixture controls are outside the production navigation container.
        // Change the simulated network directly; audit VoiceOver on the actual screen.
        try XCUIDevice.shared.voiceOverService.disable()
        walk.app.buttons["Restore test connection"].tap()
        try XCUIDevice.shared.voiceOverService.enable()
        try walk.activate("Check saved change")
        try walk.find("Your calling list is empty")
        try XCUIDevice.shared.voiceOverService.disable()
        walk.app.buttons["Inspect contact state"].tap()
        XCTAssertEqual(walk.app.staticTexts["contact-recovery-state"].label, "phone:false;server:false;patches:1;shares:0")
        try XCUIDevice.shared.voiceOverService.enable()
        walk.checkpoint("contact-recovery-confirmed-without-another-edit")
    }

    func testSavedChangeWithLostReplySettlesWithoutAnotherEdit() { checkRecovery() }
    func testSavedChangeRecoveryIsUsableAtLargestTextInDarkMode() {
        checkRecovery(arguments: ["--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
    }
    func testMissingRestoredNumberCanBeCancelledOrKeptRemovedAtLargestText() {
        let app = launch(["--contact-recovery-missing-restoration", "--uitesting-dark",
                          "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        inspect(app, "phone:true;server:false;patches:0;shares:0")
        let keepRemoved = app.buttons["Keep number removed"]
        reveal(keepRemoved, app); keepRemoved.tap()
        XCTAssertTrue(app.navigationBars["Contacts"].appears(timeout: 5))
        XCTAssertTrue(app.staticTexts["Keep this number removed?"].exists)
        capture(app, "Missing contact removal explanation")
        app.navigationBars["Contacts"].buttons["Cancel"].tap()
        inspect(app, "phone:true;server:false;patches:0;shares:0")
        let pending = app.staticTexts["Finish contact change"]
        for _ in 0..<8 where !pending.isHittable { app.swipeDown() }
        XCTAssertTrue(pending.isHittable)
        capture(app, "Cancelling keeps the contact change pending")
        reveal(keepRemoved, app); keepRemoved.tap()
        let confirm = app.buttons["confirm-contact-removal"]
        reveal(confirm, app); confirm.tap()
        XCTAssertTrue(app.staticTexts["Finish contact change"].waitForNonExistence(timeout: 5))
        inspect(app, "phone:false;server:false;patches:0;shares:0")
        capture(app, "Missing contact settled without a server edit")
    }
    func testUnsavedChangeRequiresAnExplicitRetry() {
        let app = launch(["--contact-recovery-before-save"])
        remove(app)
        inspect(app, "phone:false;server:true;patches:1;shares:0")
        let check = app.buttons["check-contact-change"]; reveal(check, app); check.tap()
        inspect(app, "phone:false;server:true;patches:1;shares:0")
        let retry = app.buttons["continue-contact-change"]; reveal(retry, app); retry.tap()
        XCTAssertTrue(app.staticTexts["Finish contact change"].waitForNonExistence(timeout: 5))
        inspect(app, "phone:false;server:false;patches:2;shares:0")
        capture(app, "Explicit contact removal retry")
    }
    func testAppRelaunchRecoversSavedChangeWithoutPostingOrRestoringTheNumber() {
        let app = launch(); remove(app)
        inspect(app, "phone:false;server:false;patches:1;shares:0")
        app.terminate()
        app.launchArguments += ["--contact-recovery-resume"]
        app.launch()
        XCTAssertTrue(app.navigationBars["Your contacts"].appears(timeout: 10))
        inspect(app, "phone:false;server:false;patches:0;shares:0")
        XCTAssertFalse(app.staticTexts["Finish contact change"].exists)
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "was removed from Contacts and your shared list")).firstMatch.exists)
        capture(app, "Contact recovery after process relaunch")
    }
    private func checkRecovery(arguments: [String] = []) {
        let app = launch(arguments); remove(app)
        inspect(app, "phone:false;server:false;patches:1;shares:0")
        let check = app.buttons["check-contact-change"]; revealFully(check, app)
        XCTAssertTrue(check.isEnabled)
        capture(app, "Contact recovery awaiting confirmation")
        app.buttons["Restore test connection"].tap(); check.tap()
        XCTAssertTrue(app.staticTexts["Finish contact change"].waitForNonExistence(timeout: 5))
        inspect(app, "phone:false;server:false;patches:1;shares:0")
        capture(app, "Contact recovery confirmed")
    }
    private func launch(_ arguments: [String] = []) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview", "--uitesting-contact-recovery"] + arguments
        app.launch()
        XCTAssertTrue(app.navigationBars["Your contacts"].appears(timeout: 15))
        return app
    }
    private func remove(_ app: XCUIApplication) {
        let button = app.buttons["Remove Synthetic contact recovery from Contacts"]
        reveal(button, app); XCTAssertTrue(button.isEnabled); button.tap()
        let confirmation = app.buttons["confirm-contact-removal"]
        reveal(confirmation, app); confirmation.tap()
        let heading = app.staticTexts["Finish contact change"]
        for _ in 0..<6 where !heading.isHittable { app.swipeDown() }
        XCTAssertTrue(heading.appears(timeout: 5))
        let share = app.buttons["share-all-contacts"]
        reveal(share, app); XCTAssertFalse(share.isEnabled)
        for _ in 0..<8 where !heading.isHittable { app.swipeDown() }
    }
    private func reveal(_ element: XCUIElement, _ app: XCUIApplication) {
        for _ in 0..<8 where !element.isHittable { app.swipeUp() }
        XCTAssertTrue(element.isHittable)
    }
    private func revealFully(_ element: XCUIElement, _ app: XCUIApplication) {
        reveal(element, app)
        let top = app.navigationBars.firstMatch.frame.maxY + 8
        let bottom = app.buttons["Inspect contact state"].frame.minY - 70
        for _ in 0..<12 {
            if element.frame.minY >= top && element.frame.maxY <= bottom { return }
            let direction = element.frame.minY < top ? 0.12 : -0.12
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
                .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5 + direction)))
        }
        XCTAssertGreaterThanOrEqual(element.frame.minY, top)
        XCTAssertLessThanOrEqual(element.frame.maxY, bottom)
    }
    private func inspect(_ app: XCUIApplication, _ expected: String) {
        app.buttons["Inspect contact state"].tap()
        let status = app.staticTexts["contact-recovery-state"]
        let expectation = XCTNSPredicateExpectation(predicate: NSPredicate(format: "label == %@", expected), object: status)
        XCTAssertEqual(XCTWaiter.wait(for: [expectation], timeout: 5), .completed)
    }
    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot()); attachment.name = name; attachment.lifetime = .keepAlways
        add(attachment)
    }
}
