import XCTest

@MainActor
final class RedesignUITests: XCTestCase {
    func testInitialAccountErrorShowsRetryInsteadOfJoining() {
        let app = launch(["--uitesting-account-error"])
        XCTAssertTrue(app.staticTexts["Your account couldn’t load"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["Use an invitation"].exists)
        XCTAssertFalse(app.staticTexts["Welcome to Shield"].exists)
        app.buttons["Try again"].tap()
        XCTAssertTrue(app.navigationBars["Home"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["Your account couldn’t load"].exists)
    }

    func testSuccessfulCallsPullToRefreshClearsPreviousError() {
        let app = launch(["--uitesting-preview", "--uitesting-calls-state", "error"])
        XCTAssertTrue(app.navigationBars["Home"].waitForExistence(timeout: 5))
        app.tabBars.buttons["Calls"].tap()
        let error = app.staticTexts["Your calls couldn’t load"]
        XCTAssertTrue(error.waitForExistence(timeout: 5))
        let list = app.collectionViews.firstMatch
        list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.2))
            .press(forDuration: 0.1, thenDragTo: list.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.9)))
        let disappeared = NSPredicate(format: "exists == false")
        expectation(for: disappeared, evaluatedWith: error)
        waitForExpectations(timeout: 5)
        XCTAssertTrue(app.historyRow("Prescription reminder").exists)
    }

    func testWelcomeAndRecoverableSignInError() {
        let app = launch(["--uitesting-auth-error"])
        XCTAssertTrue(app.textFields["Email address"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Help with unfamiliar calls"].exists)
        capture(app, "Redesign Sign in")
        app.textFields["Email address"].tap()
        app.textFields["Email address"].typeText("synthetic@example.com")
        let keyboardDone = app.keyboards.buttons["Continue"]
        if keyboardDone.exists { keyboardDone.tap() } else { app.buttons["sign-in-submit"].tap() }
        XCTAssertTrue(app.staticTexts["sign-in-error"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.textFields["Email address"].exists)
        XCTAssertFalse(app.alerts.firstMatch.exists)
        capture(app, "Redesign Sign in error")
    }

    func testSignInReturnAndLoadingStayInContext() {
        var app = launch(["--uitesting-auth-return", "--uitesting-auth-error"])
        XCTAssertTrue(app.staticTexts["Finish signing in"].waitForExistence(timeout: 5))
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
        XCTAssertFalse(app.buttons["Sending email…"].isEnabled)
        XCTAssertTrue(app.activityIndicators.firstMatch.exists)
        capture(app, "Redesign Sign in loading")
    }

    func testTodayStatesNeverTreatMissingOrExpiredDataAsOpen() {
        let cases = [("window", "Call checks are on"), ("expired", "Call checks are off"),
                     ("always-on", "Call checks are on"), ("always-on-disabled", "Call checks are off"),
                     ("paused", "Call checks are paused"), ("restoring", "Disconnecting Shield"),
                     ("setup", "Your phone needs setup"), ("unavailable", "Couldn’t check your phone"), ("stale", "Couldn’t check your phone")]
        for (state, title) in cases {
            let app = launch(["--uitesting-preview", "--redesign-state", state])
            XCTAssertTrue(app.staticTexts["demoBanner"].waitForExistence(timeout: 5))
            XCTAssertTrue(app.navigationBars["Home"].waitForExistence(timeout: 5))
            XCTAssertTrue(app.staticTexts["today-status-title"].waitForExistence(timeout: 5))
            XCTAssertEqual(app.staticTexts["today-status-title"].label, title)
            XCTAssertFalse(app.staticTexts["Protected"].exists)
            capture(app, "Redesign Today \(state)")
        }
    }

    func testTodayEmptyAndLoadingAreDistinct() {
        var app = launch(["--uitesting-preview", "--redesign-state", "empty"])
        let empty = app.staticTexts["Your calls will appear here."]
        for _ in 0..<4 { if empty.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(empty.exists)
        capture(app, "Redesign Today empty")
        app = launch(["--uitesting-preview", "--redesign-state", "loading"])
        XCTAssertTrue(app.staticTexts["Getting your calls…"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["Your calls will appear here."].exists)
        capture(app, "Redesign Today loading")
    }

    func testCallsUnavailableIsNotAnEmptyHistory() {
        for state in ["empty", "loading", "error"] {
            let app = launch(["--uitesting-preview", "--uitesting-calls-state", state])
            XCTAssertTrue(app.navigationBars["Home"].waitForExistence(timeout: 5))
            app.tabBars.buttons["Calls"].tap()
            let expected = state == "loading" ? "Getting your calls…" : state == "error" ? "Your calls couldn’t load" : "No calls yet"
            XCTAssertTrue(app.staticTexts[expected].waitForExistence(timeout: 5))
            if state != "empty" { XCTAssertFalse(app.staticTexts["No calls yet"].exists) }
            if state == "error" { XCTAssertTrue(app.buttons["Try again"].exists); XCTAssertFalse(app.alerts.firstMatch.exists) }
            capture(app, "Redesign Calls \(state)")
        }
    }

    func testMainJourneysAndMessageFilters() {
        let app = launch(["--uitesting-preview"])
        XCTAssertTrue(app.navigationBars["Home"].waitForExistence(timeout: 5))
        app.tabBars.buttons["Messages"].tap()
        XCTAssertTrue(app.historyRow("Appointment message").waitForExistence(timeout: 5))
        app.tabBars.buttons["Calls"].tap()
        let filters = app.segmentedControls["callFilter"]
        XCTAssertTrue(filters.exists)
        filters.buttons["Answered"].tap()
        XCTAssertTrue(app.historyRow("Prescription reminder").waitForExistence(timeout: 5))
        XCTAssertFalse(app.historyRow("Call stopped").exists)
        filters.buttons["All"].tap()
        app.historyRow("Call stopped").tap()
        XCTAssertTrue(app.navigationBars["Call"].waitForExistence(timeout: 5))
        app.buttons["More about this call"].tap()
        XCTAssertTrue(app.staticTexts["The caller asked for a secret code. Shield didn’t connect the call."].exists)
    }

    func testCheckUsesConsentAndClearlyLabelsSampleResult() {
        let app = launch(["--uitesting-preview"])
        openMore(app, "Check a text")
        XCTAssertTrue(app.textViews.firstMatch.waitForExistence(timeout: 5))
        capture(app, "Redesign Check")
        let editor = app.textViews.firstMatch
        editor.tap(); editor.typeText("A message asks for a security code.")
        capture(app, "Redesign Check keyboard")
        app.buttons["Done"].tap()
        let check = app.buttons["Check this text"]
        for _ in 0..<4 { if check.isHittable { break }; app.swipeUp() }
        check.tap()
        XCTAssertTrue(app.buttons["Show sample answer"].waitForExistence(timeout: 5))
        app.buttons["Show sample answer"].tap()
        let result = app.staticTexts["This is an example. Your text hasn’t been checked."]
        XCTAssertTrue(result.waitForExistence(timeout: 5))
        XCTAssertTrue(result.isHittable)
        XCTAssertTrue(app.staticTexts["Check with the sender"].isHittable)
        XCTAssertTrue(app.staticTexts["Use a number you already know to check with the sender."].isHittable)
        capture(app, "Redesign Check result")
        // Rechecking unchanged text can return the same title; still show the new result.
        for _ in 0..<4 { if check.isHittable { break }; app.swipeDown() }
        check.tap()
        app.buttons["Show sample answer"].tap()
        XCTAssertTrue(result.waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Use a number you already know to check with the sender."].isHittable)
    }

    func testNativePasteRequiresConsentInDarkMode() {
        let app = launch(["--uitesting-preview", "--uitesting-dark", "--uitesting-check-clipboard"])
        openMore(app, "Check a text")
        let paste = app.buttons["Paste"].firstMatch
        XCTAssertTrue(paste.waitForExistence(timeout: 5))
        XCTAssertTrue(paste.isEnabled)
        capture(app, "Color review Paste enabled dark")
        paste.tap()
        XCTAssertEqual(app.textViews.firstMatch.value as? String, "A synthetic message to paste.")
        XCTAssertFalse(app.staticTexts["This is an example. Your text hasn’t been checked."].exists)
        XCTAssertFalse(app.alerts.firstMatch.exists)
        app.buttons["Check this text"].tap()
        XCTAssertTrue(app.buttons["Show sample answer"].waitForExistence(timeout: 5))
        app.buttons["Cancel"].tap()
        XCTAssertFalse(app.staticTexts["This is an example. Your text hasn’t been checked."].exists)
        capture(app, "Color review Paste consent cancelled dark")
    }

    func testPeopleAndAccurateUnavailableSettings() {
        let app = launch(["--uitesting-preview"])
        openMore(app, "Family & friends")
        XCTAssertTrue(app.buttons["person-Pat"].waitForExistence(timeout: 5))
        capture(app, "Redesign People")
        app.buttons["person-Alex"].tap()
        XCTAssertTrue(app.staticTexts["Only they can change their phone settings."].waitForExistence(timeout: 5))
        app.buttons["person-Pat"].tap()
        app.tabBars.buttons["Home"].tap()
        openMore(app, "Settings")
        XCTAssertTrue(app.navigationBars["Settings"].waitForExistence(timeout: 5))
        capture(app, "Redesign Settings")
        XCTAssertFalse(app.buttons["Turn on message alerts"].exists)
        XCTAssertFalse(app.buttons["Enable notifications"].exists)
        capture(app, "Redesign Settings availability")
    }

    func testDarkLargeTextCoreNavigationAndAccessibility() throws {
        let app = launch(["--uitesting-preview", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        XCTAssertTrue(app.navigationBars["Home"].waitForExistence(timeout: 5))
        capture(app, "Redesign Today large dark")
        app.tabBars.buttons["Calls"].tap()
        XCTAssertTrue(app.buttons["callFilter"].waitForExistence(timeout: 5))
        capture(app, "Redesign Calls large dark")
        openMore(app, "Check a text")
        XCTAssertTrue(app.textViews.firstMatch.waitForExistence(timeout: 5))
        capture(app, "Redesign Check large dark")
        openMore(app, "Family & friends")
        let person = app.buttons["person-Pat"]
        for _ in 0..<5 { if person.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(person.isHittable)
        capture(app, "Redesign People large dark")
    }

    func testCoreScreensAccessibilityAudit() throws {
        let app = launch(["--uitesting-preview"])
        XCTAssertTrue(app.navigationBars["Home"].waitForExistence(timeout: 5))
        let audit: XCUIAccessibilityAuditType = [.contrast, .textClipped, .hitRegion, .sufficientElementDescription]
        try auditScreen(app, types: audit)
        for tab in ["Calls", "Messages", "More"] {
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
        XCTAssertTrue(app.navigationBars["Home"].waitForExistence(timeout: 5))
        let types: XCUIAccessibilityAuditType = [.contrast, .textClipped, .hitRegion, .sufficientElementDescription]
        app.tabBars.buttons["Calls"].tap()
        app.historyRow("Call stopped").tap()
        XCTAssertTrue(app.navigationBars["Call"].waitForExistence(timeout: 5))
        try auditScreen(app, types: types)
        app.tabBars.buttons["Home"].tap()
        openMore(app, "Settings")
        XCTAssertTrue(app.navigationBars["Settings"].waitForExistence(timeout: 5))
        try auditScreen(app, types: types)
        openMore(app, "Family & friends")
        let sharing = app.staticTexts["Invite someone to help"].firstMatch
        for _ in 0..<4 { if sharing.isHittable { break }; app.swipeUp() }
        sharing.tap()
        XCTAssertTrue(app.navigationBars["Share with a helper"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.switches["Include messages"].value as? String, "0")
        XCTAssertFalse(app.buttons["Make invitation"].isEnabled)
        capture(app, "Redesign Sharing")
        try auditScreen(app, types: types)
    }

    func testGuidedFlowsAccessibilityAudit() throws {
        var app = launch(["--uitesting-forwarding"])
        XCTAssertTrue(app.buttons["forwarding-continue"].waitForExistence(timeout: 5))
        capture(app, "Redesign Setup")
        try auditScreen(app, types: [.contrast, .textClipped, .hitRegion, .sufficientElementDescription])
        app = launch(["--uitesting-forwarding", "--forwarding-start-restore"])
        XCTAssertTrue(app.buttons["See copied code"].waitForExistence(timeout: 5)); app.buttons["See copied code"].tap()
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
        else { app.buttons["sign-in-submit"].tap() }
        XCTAssertTrue(app.staticTexts["sign-in-error"].waitForExistence(timeout: 5))

        app = launch(large + ["--uitesting-preview"])
        openMore(app, "Family & friends")
        let sharing = app.staticTexts["Invite someone to help"].firstMatch
        for _ in 0..<10 { if sharing.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(sharing.isHittable); sharing.tap()
        XCTAssertTrue(app.navigationBars["Share with a helper"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.switches["Include messages"].value as? String, "0")
        let sharedPerson = app.staticTexts["Sign in to manage sharing."]
        for _ in 0..<10 { if sharedPerson.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(sharedPerson.isHittable)
        capture(app, "Audit review Sharing largest text")
        let tree = XCTAttachment(string: app.debugDescription)
        tree.name = "Sharing largest text accessibility tree"; tree.lifetime = .keepAlways; add(tree)

        app = launch(large + ["--uitesting-preview"])
        openMore(app, "Settings")
        XCTAssertTrue(app.navigationBars["Settings"].waitForExistence(timeout: 5))
        capture(app, "Audit review Settings largest text")
        XCTAssertFalse(app.buttons["Turn on message alerts"].exists)
        capture(app, "Audit review Settings availability largest text")
    }

    private func auditScreen(_ app: XCUIApplication, types: XCUIAccessibilityAuditType) throws {
        capture(app, "audit-" + app.navigationBars.firstMatch.identifier)
        try app.performAccessibilityAudit(for: types) { issue in
            print("Shield audit: \(issue.compactDescription); \(issue.element?.debugDescription ?? "No associated element")")
            return false // Keep native edge/overlay diagnostics visible in the results.
        }
    }

    private func launch(_ arguments: [String]) -> XCUIApplication {
        let app = XCUIApplication(); app.launchArguments = arguments; app.launch(); return app
    }
    private func openMore(_ app: XCUIApplication, _ title: String) {
        app.tabBars.buttons["More"].tap()
        for _ in 0..<4 {
            if app.navigationBars["More"].exists { break }
            app.navigationBars.buttons.firstMatch.tap()
        }
        let row = app.staticTexts[title].firstMatch
        for _ in 0..<5 { if row.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(row.waitForExistence(timeout: 5)); row.tap()
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot()); attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
        do {
            let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("SeniorScreens")
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            try app.screenshot().pngRepresentation.write(to: directory.appendingPathComponent(name + ".png"))
        } catch { XCTFail("Couldn’t save simulator capture: \(error.localizedDescription)") }
    }
}
