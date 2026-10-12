import XCTest

@MainActor
final class RedesignUITests: XCTestCase {
    func testWelcomeAndRecoverableSignInError() {
        let app = launch(["--uitesting-auth-error"])
        XCTAssertTrue(app.textFields["Email address"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Screen unfamiliar calls and check messages."].exists)
        capture(app, "Redesign Sign in")
        app.textFields["Email address"].tap()
        app.textFields["Email address"].typeText("synthetic@example.com")
        let keyboardDone = app.keyboards.buttons["Continue"]
        if keyboardDone.exists { keyboardDone.tap() } else { app.buttons["Continue"].tap() }
        XCTAssertTrue(app.staticTexts["sign-in-error"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.textFields["Email address"].exists)
        XCTAssertFalse(app.alerts.firstMatch.exists)
        capture(app, "Redesign Sign in error")
    }

    func testSignInReturnAndLoadingStayInContext() {
        var app = launch(["--uitesting-auth-return", "--uitesting-auth-error"])
        XCTAssertTrue(app.staticTexts["Confirm the email used for this link."].waitForExistence(timeout: 5))
        let email = app.textFields["Email address"]
        XCTAssertTrue(email.exists)
        XCTAssertFalse(app.buttons["Sign in"].isEnabled)
        email.tap(); email.typeText("synthetic@example.com")
        capture(app, "Redesign Sign in return keyboard")
        let keyboardContinue = app.keyboards.buttons["Continue"]
        if keyboardContinue.exists { keyboardContinue.tap() }
        else { app.buttons["Sign in"].tap() }
        XCTAssertTrue(app.staticTexts["sign-in-error"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Sign in"].isEnabled)
        capture(app, "Redesign Sign in return retry")
        app = launch(["--uitesting-auth-loading"])
        XCTAssertTrue(app.textFields["Email address"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.textFields["Email address"].isEnabled)
        XCTAssertFalse(app.buttons["Continue"].isEnabled)
        XCTAssertTrue(app.activityIndicators.firstMatch.exists)
        capture(app, "Redesign Sign in loading")
    }

    func testTodayStatesNeverTreatMissingOrExpiredDataAsOpen() {
        let cases = [("window", "Screening window open"), ("expired", "Screening window closed"),
                     ("paused", "Call screening paused"), ("restoring", "Restoring your phone"),
                     ("setup", "Finish phone setup"), ("unavailable", "Status unavailable"), ("stale", "Status unavailable")]
        for (state, title) in cases {
            let app = launch(["--uitesting-preview", "--redesign-state", state])
            XCTAssertTrue(app.staticTexts["demoBanner"].waitForExistence(timeout: 5))
            XCTAssertTrue(app.staticTexts["today-status-title"].waitForExistence(timeout: 5))
            XCTAssertEqual(app.staticTexts["today-status-title"].label, title)
            XCTAssertFalse(app.staticTexts["Protected"].exists)
            capture(app, "Redesign Today \(state)")
        }
    }

    func testTodayEmptyAndLoadingAreDistinct() {
        var app = launch(["--uitesting-preview", "--redesign-state", "empty"])
        let empty = app.staticTexts["No recent calls"]
        for _ in 0..<4 { if empty.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(empty.exists)
        capture(app, "Redesign Today empty")
        app = launch(["--uitesting-preview", "--redesign-state", "loading"])
        XCTAssertTrue(app.staticTexts["Loading activity…"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["No recent calls"].exists)
        capture(app, "Redesign Today loading")
    }

    func testCallsUnavailableIsNotAnEmptyHistory() {
        for state in ["empty", "loading", "error"] {
            let app = launch(["--uitesting-preview", "--uitesting-calls-state", state])
            XCTAssertTrue(app.staticTexts["today-status-title"].waitForExistence(timeout: 5))
            app.tabBars.buttons["Calls"].tap()
            let expected = state == "loading" ? "Loading calls…" : state == "error" ? "Calls couldn’t refresh" : "No calls yet"
            XCTAssertTrue(app.staticTexts[expected].waitForExistence(timeout: 5))
            if state != "empty" { XCTAssertFalse(app.staticTexts["No calls yet"].exists) }
            if state == "error" { XCTAssertTrue(app.buttons["Try Again"].exists); XCTAssertFalse(app.alerts.firstMatch.exists) }
            capture(app, "Redesign Calls \(state)")
        }
    }

    func testMainJourneysAndMessageFilters() {
        let app = launch(["--uitesting-preview"])
        XCTAssertTrue(app.staticTexts["today-status-title"].waitForExistence(timeout: 5))
        capture(app, "Redesign Today")
        let messages = app.buttons["today-messages"]
        for _ in 0..<4 { if messages.isHittable { break }; app.swipeUp() }
        messages.tap()
        XCTAssertTrue(app.navigationBars["Calls"].waitForExistence(timeout: 5))
        let filters = app.segmentedControls["callFilter"]
        XCTAssertTrue(filters.exists)
        // SwiftUI's segmented buttons do not consistently expose a numeric value.
        // Verify the resulting history rather than the platform's AX encoding.
        XCTAssertTrue(app.staticTexts["Missed contact call"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["Prescription notification"].exists)
        XCTAssertFalse(app.staticTexts["Call held for review"].exists)
        capture(app, "Redesign Messages")
        filters.buttons["Connected"].tap()
        XCTAssertTrue(app.staticTexts["Prescription notification"].waitForExistence(timeout: 5))
        filters.buttons["All"].tap()
        capture(app, "Redesign Calls")
        app.staticTexts["Call held for review"].firstMatch.tap()
        XCTAssertTrue(app.navigationBars["Call details"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["The introduction included a request for a security code. This call was not connected."].exists)
        capture(app, "Redesign Call detail")
    }

    func testCheckUsesConsentAndClearlyLabelsSampleResult() {
        let app = launch(["--uitesting-preview"])
        app.tabBars.buttons["Check"].tap()
        XCTAssertTrue(app.textViews.firstMatch.waitForExistence(timeout: 5))
        capture(app, "Redesign Check")
        let editor = app.textViews.firstMatch
        editor.tap(); editor.typeText("A message asks for a security code.")
        capture(app, "Redesign Check keyboard")
        app.buttons["Done"].tap()
        let check = app.buttons["Check message"]
        for _ in 0..<4 { if check.isHittable { break }; app.swipeUp() }
        check.tap()
        XCTAssertTrue(app.buttons["Show sample result"].waitForExistence(timeout: 5))
        app.buttons["Show sample result"].tap()
        let result = app.staticTexts["Sample result"]
        XCTAssertTrue(result.waitForExistence(timeout: 5))
        XCTAssertTrue(result.isHittable)
        XCTAssertTrue(app.staticTexts["Check independently"].isHittable)
        XCTAssertTrue(app.staticTexts["Contact the sender through a number or app you already trust."].isHittable)
        capture(app, "Redesign Check result")
        // Rechecking unchanged text can return the same title; still show the new result.
        for _ in 0..<4 { if check.isHittable { break }; app.swipeDown() }
        check.tap()
        app.buttons["Show sample result"].tap()
        XCTAssertTrue(result.waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Contact the sender through a number or app you already trust."].isHittable)
    }

    func testNativePasteRequiresConsentInDarkMode() {
        let app = launch(["--uitesting-preview", "--uitesting-dark", "--uitesting-check-clipboard"])
        app.tabBars.buttons["Check"].tap()
        let paste = app.buttons["Paste"].firstMatch
        XCTAssertTrue(paste.waitForExistence(timeout: 5))
        XCTAssertTrue(paste.isEnabled)
        capture(app, "Color review Paste enabled dark")
        paste.tap()
        XCTAssertEqual(app.textViews.firstMatch.value as? String, "A synthetic message to paste.")
        XCTAssertFalse(app.staticTexts["Sample result"].exists)
        XCTAssertFalse(app.alerts.firstMatch.exists)
        app.buttons["Check message"].tap()
        XCTAssertTrue(app.buttons["Show sample result"].waitForExistence(timeout: 5))
        app.buttons["Cancel"].tap()
        XCTAssertFalse(app.staticTexts["Sample result"].exists)
        capture(app, "Color review Paste consent cancelled dark")
    }

    func testPeopleAndAccurateUnavailableSettings() {
        let app = launch(["--uitesting-preview"])
        app.tabBars.buttons["People"].tap()
        XCTAssertTrue(app.buttons["person-Pat"].waitForExistence(timeout: 5))
        capture(app, "Redesign People")
        app.buttons["person-Alex"].tap()
        XCTAssertTrue(app.staticTexts["Phone settings stay with the participant."].waitForExistence(timeout: 5))
        app.buttons["person-Pat"].tap()
        app.tabBars.buttons["Today"].tap()
        app.buttons["Settings"].tap()
        XCTAssertTrue(app.navigationBars["Settings"].waitForExistence(timeout: 5))
        capture(app, "Redesign Settings")
        let unavailable = app.staticTexts["Unavailable"]
        for _ in 0..<5 { if unavailable.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(unavailable.exists)
        XCTAssertFalse(app.buttons["Enable notifications"].exists)
        capture(app, "Redesign Settings availability")
    }

    func testDarkLargeTextCoreNavigationAndAccessibility() throws {
        let app = launch(["--uitesting-preview", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        XCTAssertTrue(app.staticTexts["today-status-title"].waitForExistence(timeout: 5))
        capture(app, "Redesign Today large dark")
        app.tabBars.buttons["Calls"].tap()
        XCTAssertTrue(app.buttons["callFilter"].waitForExistence(timeout: 5))
        capture(app, "Redesign Calls large dark")
        app.tabBars.buttons["Check"].tap()
        XCTAssertTrue(app.textViews.firstMatch.waitForExistence(timeout: 5))
        capture(app, "Redesign Check large dark")
        app.tabBars.buttons["People"].tap()
        let person = app.buttons["person-Pat"]
        for _ in 0..<5 { if person.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(person.isHittable)
        capture(app, "Redesign People large dark")
    }

    func testCoreScreensAccessibilityAudit() throws {
        let app = launch(["--uitesting-preview"])
        XCTAssertTrue(app.staticTexts["today-status-title"].waitForExistence(timeout: 5))
        let audit: XCUIAccessibilityAuditType = [.contrast, .textClipped, .hitRegion, .sufficientElementDescription]
        try auditScreen(app, types: audit)
        for tab in ["Calls", "Check", "People"] {
            app.tabBars.buttons[tab].tap()
            XCTAssertTrue(app.navigationBars[tab].waitForExistence(timeout: 5))
            try auditScreen(app, types: audit)
        }
    }

    func testWelcomeAccessibilityAudit() throws {
        let app = launch([])
        XCTAssertTrue(app.textFields["Email address"].waitForExistence(timeout: 5))
        try auditScreen(app, types: [.contrast, .textClipped, .hitRegion, .sufficientElementDescription])
    }

    func testDetailSettingsAndSharingAccessibility() throws {
        let app = launch(["--uitesting-preview"])
        XCTAssertTrue(app.staticTexts["today-status-title"].waitForExistence(timeout: 5))
        let types: XCUIAccessibilityAuditType = [.contrast, .textClipped, .hitRegion, .sufficientElementDescription]
        app.tabBars.buttons["Calls"].tap()
        app.staticTexts["Call held for review"].firstMatch.tap()
        XCTAssertTrue(app.navigationBars["Call details"].waitForExistence(timeout: 5))
        try auditScreen(app, types: types)
        app.tabBars.buttons["Today"].tap()
        app.buttons["Settings"].tap()
        XCTAssertTrue(app.navigationBars["Settings"].waitForExistence(timeout: 5))
        try auditScreen(app, types: types)
        let sharing = app.staticTexts["Sharing"].firstMatch
        for _ in 0..<4 { if sharing.isHittable { break }; app.swipeUp() }
        sharing.tap()
        XCTAssertTrue(app.navigationBars["Sharing"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.switches["Include voicemail"].value as? String, "0")
        XCTAssertFalse(app.buttons["Create invitation"].isEnabled)
        capture(app, "Redesign Sharing")
        try auditScreen(app, types: types)
    }

    func testGuidedFlowsAccessibilityAudit() throws {
        var app = launch(["--uitesting-forwarding"])
        XCTAssertTrue(app.buttons["forwarding-continue"].waitForExistence(timeout: 5))
        capture(app, "Redesign Setup")
        try auditScreen(app, types: [.contrast, .textClipped, .hitRegion, .sufficientElementDescription])
        app = launch(["--uitesting-forwarding", "--forwarding-start-restore"])
        XCTAssertTrue(app.staticTexts["forwarding-reset-code"].waitForExistence(timeout: 5))
        capture(app, "Redesign Restoration")
        try auditScreen(app, types: [.contrast, .textClipped, .hitRegion, .sufficientElementDescription])
    }

    func testFlaggedControlsAtLargestTextSize() {
        let large = ["--uitesting-light", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        var app = launch(large + ["--uitesting-auth-error"])
        let email = app.textFields["Email address"]
        XCTAssertTrue(email.waitForExistence(timeout: 5))
        for _ in 0..<8 { if email.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(email.isHittable)
        capture(app, "Audit review Email largest text")
        email.tap(); email.typeText("synthetic@example.com")
        XCTAssertEqual(email.value as? String, "synthetic@example.com")
        capture(app, "Audit review Email largest keyboard")
        // This fixture cannot submit to the service.
        let keyboardContinue = app.keyboards.buttons["Continue"]
        if keyboardContinue.exists { keyboardContinue.tap() }
        else { app.buttons["Continue"].tap() }
        XCTAssertTrue(app.staticTexts["sign-in-error"].waitForExistence(timeout: 5))

        app = launch(large + ["--uitesting-preview"])
        app.tabBars.buttons["People"].tap()
        let sharing = app.staticTexts["Share with someone"].firstMatch
        for _ in 0..<10 { if sharing.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(sharing.isHittable); sharing.tap()
        XCTAssertTrue(app.navigationBars["Sharing"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.switches["Include voicemail"].value as? String, "0")
        let sharedPerson = app.staticTexts["Sign in to manage sharing."]
        for _ in 0..<10 { if sharedPerson.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(sharedPerson.isHittable)
        capture(app, "Audit review Sharing largest text")
        let tree = XCTAttachment(string: app.debugDescription)
        tree.name = "Sharing largest text accessibility tree"; tree.lifetime = .keepAlways; add(tree)

        app = launch(large + ["--uitesting-preview"])
        app.buttons["Settings"].tap()
        XCTAssertTrue(app.navigationBars["Settings"].waitForExistence(timeout: 5))
        capture(app, "Audit review Settings largest text")
        let unavailable = app.staticTexts["Unavailable"]
        for _ in 0..<12 { if unavailable.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(unavailable.isHittable)
        capture(app, "Audit review Settings availability largest text")
    }

    private func auditScreen(_ app: XCUIApplication, types: XCUIAccessibilityAuditType) throws {
        try app.performAccessibilityAudit(for: types) { issue in
            print("Shield audit: \(issue.compactDescription); \(issue.element?.debugDescription ?? "No associated element")")
            return false // Keep native edge/overlay diagnostics visible in the results.
        }
    }

    private func launch(_ arguments: [String]) -> XCUIApplication {
        let app = XCUIApplication(); app.launchArguments = arguments; app.launch(); return app
    }
    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot()); attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
}
