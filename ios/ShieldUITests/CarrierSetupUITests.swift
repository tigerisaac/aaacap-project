import XCTest

@MainActor
final class CarrierSetupUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }
    func testCopyOpenReturnAndConfirmationAreSeparate() {
        let app = launch()
        XCTAssertEqual(primary(app).label, "Copy setup code")
        XCTAssertFalse(app.staticTexts["forwarding-code-copied"].exists)
        capture(app, "Carrier explain and copy")
        primary(app).tap()
        XCTAssertEqual(primary(app).label, "Open Phone")
        capture(app, "Carrier ready to open Phone")
        leaveAndReturn(app, expecting: "Open Phone")
        XCTAssertEqual(primary(app).label, "Open Phone")
        XCTAssertFalse(app.staticTexts["forwarding-carrier-result"].exists)
        primary(app).tap()
        XCTAssertEqual(primary(app).label, "Open Phone")
        leaveAndReturn(app)
        XCTAssertEqual(primary(app).label, "Tello confirmed the change")
        XCTAssertTrue(app.staticTexts["forwarding-carrier-result"].exists)
        capture(app, "Carrier unconfirmed return")
        primary(app).tap()
        XCTAssertEqual(primary(app).label, "Copy setup code")
        XCTAssertEqual(app.staticTexts["forwarding-code-sequence"].label, "Code 2 of 3")
        capture(app, "Carrier next code starts fresh")
    }

    func testOneCodeSkipsUnusedStepsAndBackReturnsToItsCode() {
        let app = launch(["--forwarding-one-code"])
        XCTAssertTrue(app.staticTexts["Step 6 of 8"].exists)
        XCTAssertFalse(app.staticTexts["forwarding-code-sequence"].exists)
        capture(app, "Carrier one code")
        primary(app).tap(); primary(app).tap(); leaveAndReturn(app, expecting: "Verizon confirmed the change")
        XCTAssertEqual(primary(app).label, "Verizon confirmed the change")
        capture(app, "Carrier one code confirmation tones")
        primary(app).tap()
        XCTAssertTrue(app.staticTexts["Check that calls reach Shield"].appears(timeout: 5))
        XCTAssertTrue(app.staticTexts["Step 7 of 8"].exists)
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        app.buttons["forwarding-previous"].tap()
        XCTAssertEqual(primary(app).label, "Copy setup code")
        XCTAssertTrue(app.staticTexts["Step 6 of 8"].exists)
    }

    func testTwoCodeProfileAndStaleResumeDoNotCreateEmptySteps() {
        let app = launch(["--forwarding-two-codes"])
        for index in 1...2 {
            XCTAssertEqual(app.staticTexts["forwarding-code-sequence"].label, "Code \(index) of 2")
            primary(app).tap(); primary(app).tap(); leaveAndReturn(app); primary(app).tap()
        }
        XCTAssertTrue(app.staticTexts["Check that calls reach Shield"].appears(timeout: 5))
        app.terminate()
        let resumed = launch(["--forwarding-one-code", "--forwarding-resume-extra-code"])
        XCTAssertTrue(resumed.staticTexts["Check that calls reach Shield"].exists)
        XCTAssertFalse(resumed.staticTexts["forwarding-probe-passed"].exists)
    }

    func testReopenAndCopyAgainRequireAnotherVisit() {
        let app = launch()
        primary(app).tap(); primary(app).tap(); leaveAndReturn(app)
        app.buttons["Need help?"].tap()
        reveal(app.buttons["forwarding-phone-reopen"], app)
        XCTAssertGreaterThanOrEqual(app.buttons["forwarding-phone-reopen"].frame.height, 51.5)
        app.buttons["forwarding-phone-reopen"].tap()
        XCTAssertEqual(primary(app).label, "Open Phone")
        leaveAndReturn(app)
        XCTAssertEqual(primary(app).label, "Tello confirmed the change")
        reveal(app.buttons["forwarding-copy-code"], app)
        app.buttons["forwarding-copy-code"].tap()
        XCTAssertEqual(primary(app).label, "Open Phone")
        leaveAndReturn(app, expecting: "Open Phone")
        XCTAssertEqual(primary(app).label, "Open Phone")
    }

    func testNativePhoneLauncherKeepsCodeAndManualRoute() {
        let app = launch()
        primary(app).tap(); primary(app).tap()
        XCTAssertTrue(app.staticTexts["forwarding-phone-navigation"].label.contains("Tap Open on the Phone banner"))
        XCTAssertEqual(primary(app).label, "Open Phone")
        XCTAssertTrue(app.staticTexts["forwarding-code-copied"].exists)
        capture(app, "Carrier native Phone launcher directions")
        leaveAndReturn(app)
        XCTAssertEqual(primary(app).label, "Tello confirmed the change")
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
    }

    func testLargestTextDarkCopyAndReturnRemainReachable() {
        let app = launch(["--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        capture(app, "Carrier largest text top")
        reveal(primary(app), app)
        capture(app, "Carrier largest text copy action")
        primary(app).tap()
        reveal(primary(app), app)
        XCTAssertEqual(primary(app).label, "Open Phone")
        primary(app).tap(); leaveAndReturn(app)
        reveal(primary(app), app)
        XCTAssertEqual(primary(app).label, "Tello confirmed the change")
        capture(app, "Carrier largest text confirmation")
    }

    private func launch(_ arguments: [String] = []) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-forwarding", "--forwarding-start-code"] + arguments
        app.launch()
        XCTAssertTrue(primary(app).appears(timeout: 10))
        return app
    }
    private func primary(_ app: XCUIApplication) -> XCUIElement { app.buttons["forwarding-continue"] }
    private func leaveAndReturn(_ app: XCUIApplication, expecting label: String = "Tello confirmed the change") {
        XCUIDevice.shared.press(.home); app.activate()
        let settled = XCTNSPredicateExpectation(predicate: NSPredicate(format: "label == %@", label), object: primary(app))
        XCTAssertEqual(XCTWaiter.wait(for: [settled], timeout: 5), .completed)
    }
    private func reveal(_ element: XCUIElement, _ app: XCUIApplication) {
        let scroll = app.scrollViews.firstMatch
        for _ in 0..<16 {
            let top = max(scroll.frame.minY, app.navigationBars.firstMatch.frame.maxY)
            let bottom = element.identifier == "forwarding-continue" ? app.frame.maxY - 28 : min(primary(app).frame.minY, app.frame.maxY - 28)
            if element.exists && element.isHittable && element.frame.minY >= top && element.frame.maxY <= bottom { return }
            let down = element.exists && !element.frame.isEmpty && element.frame.minY < top
            scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: down ? 0.35 : 0.75))
                .press(forDuration: 0.05, thenDragTo: scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: down ? 0.65 : 0.4)))
        }
        XCTAssertTrue(element.isHittable)
    }
    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
}
