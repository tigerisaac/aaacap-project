import XCTest

@MainActor
final class SeniorDesignUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testEverydayScreensAndKeepingSampleVoicemail() {
        let app = launch()
        capture(app, "senior-home-light")
        app.tabBars.buttons["Calls"].tap()
        XCTAssertTrue(app.historyRow("Call stopped").appears(timeout: 5))
        capture(app, "senior-calls-light")
        app.historyRow("Call stopped").tap()
        XCTAssertTrue(app.navigationBars["Call"].appears(timeout: 5))
        capture(app, "senior-call-detail-light")
        app.tabBars.buttons["Messages"].tap()
        XCTAssertTrue(app.historyRow("Appointment message").appears(timeout: 5))
        capture(app, "senior-voicemail-light")
        app.historyRow("Appointment message").tap()
        let keep = app.buttons["keep-sample-message"]
        XCTAssertTrue(keep.appears(timeout: 5))
        XCTAssertTrue(app.staticTexts["message-summary"].exists)
        XCTAssertTrue(app.buttons["Hear sample message"].exists)
        app.buttons["Hear sample message"].tap()
        XCTAssertTrue(app.buttons["Stop sample"].appears(timeout: 3))
        app.buttons["Stop sample"].tap()
        XCTAssertFalse(app.buttons["Delete message"].exists)
        capture(app, "senior-message-detail-light")
        keep.tap()
        XCTAssertEqual(keep.label, "Message kept")
        app.navigationBars.buttons.firstMatch.tap()
        let kept = app.segmentedControls["sample-message-filter"].buttons["Kept"]
        XCTAssertTrue(kept.appears(timeout: 5)); kept.tap()
        XCTAssertTrue(app.historyRow("Appointment message").exists)
        XCTAssertFalse(app.historyRow("(512) 555-0128").exists)
        capture(app, "senior-kept-message-light")
        app.tabBars.buttons["More"].tap()
        XCTAssertTrue(app.staticTexts["Check a text"].appears(timeout: 5))
        capture(app, "senior-more-light")
    }

    func testSecondaryScreensAndPlainTextCheck() {
        let app = launch()
        openMore(app, "Check a text")
        let editor = app.textViews.firstMatch
        XCTAssertTrue(editor.appears(timeout: 5))
        capture(app, "senior-check-light")
        editor.tap(); editor.typeText("Please send your secret code.")
        app.buttons["Done"].tap()
        app.buttons["Check this text"].tap()
        XCTAssertTrue(app.alerts["Check this text?"].appears(timeout: 5))
        app.buttons["Show sample answer"].tap()
        XCTAssertTrue(app.staticTexts["This is an example. Your text hasn’t been checked."].appears(timeout: 5))
        capture(app, "senior-check-answer-light")
        openMore(app, "Switch person")
        XCTAssertTrue(app.buttons["person-Pat"].appears(timeout: 5))
        capture(app, "senior-family-light")
        openMore(app, "Settings")
        tap(app.staticTexts["Call sharing"].firstMatch, in: app)
        XCTAssertTrue(app.navigationBars["Call sharing"].appears(timeout: 5))
        capture(app, "senior-sharing-light")
        openMore(app, "Get help")
        capture(app, "senior-help-light")
        openMore(app, "Settings")
        capture(app, "senior-settings-light")
        tap(app.staticTexts["Blocked numbers"].firstMatch, in: app)
        XCTAssertTrue(app.staticTexts["(312) 555-0199"].appears(timeout: 5))
        capture(app, "senior-blocked-light")
        app.navigationBars.buttons.firstMatch.tap()
        tap(app.staticTexts["Your contacts"].firstMatch, in: app)
        XCTAssertTrue(app.staticTexts["Jamie"].appears(timeout: 5))
        capture(app, "senior-contacts-light")
        app.navigationBars.buttons.firstMatch.tap()
        tap(app.staticTexts["Numbers you trust"].firstMatch, in: app)
        XCTAssertTrue(app.staticTexts["Sample clinic"].appears(timeout: 5))
        capture(app, "senior-trusted-numbers-light")
        app.navigationBars.buttons.firstMatch.tap()
        tap(app.staticTexts["Checks while you talk"].firstMatch, in: app, towardTop: true)
        capture(app, "senior-call-checks-light")
        // Automatic text checks left Settings on October 17; its screen is covered by the visual test below.
    }

    func testLargestTextDarkModeKeepsEverydayActionsReachable() {
        let app = launch(["--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        capture(app, "senior-home-large-dark")
        app.tabBars.buttons["Calls"].tap()
        XCTAssertTrue(app.buttons["callFilter"].appears(timeout: 5))
        capture(app, "senior-calls-large-dark")
        app.tabBars.buttons["Messages"].tap()
        tap(app.historyRow("Appointment message"), in: app)
        let keep = app.buttons["keep-sample-message"]
        tap(keep, in: app)
        XCTAssertEqual(keep.label, "Message kept")
        capture(app, "senior-message-large-dark")
        app.tabBars.buttons["More"].tap()
        capture(app, "senior-more-large-dark")
        tap(app.staticTexts["Check a text"].firstMatch, in: app)
        XCTAssertTrue(app.textViews.firstMatch.appears(timeout: 5))
        capture(app, "senior-check-large-dark")
        openMore(app, "Settings")
        capture(app, "senior-settings-large-dark")
    }

    func testWelcomeAndChoicesStayBrief() {
        var app = launch([], sample: false)
        XCTAssertTrue(app.textFields["sign-in-phone"].appears(timeout: 5))
        capture(app, "senior-sign-in-light")
        app = launch(["--uitesting-protection-onboarding"], sample: false)
        XCTAssertTrue(app.switches["onboarding-protection-toggle"].appears(timeout: 5))
        capture(app, "senior-protection-choice-light")
        app = launch(["--uitesting-trusted-contacts"], sample: false)
        XCTAssertTrue(app.buttons["trusted-contact-no"].appears(timeout: 5))
        capture(app, "senior-helper-choice-light")
    }

    /// Rendering coverage for forms that normally require a configured account.
    func testSecondaryScreenVisualsInBothAppearances() {
        for dark in [false, true] {
            for screen in ["numbers", "add-number", "add-contact", "sharing", "sharing-access", "contacts", "quiet", "blocked", "setup", "setup-details", "trial-options", "protection", "join", "help", "automatic-texts", "audio", "alerts-on", "alerts-off", "quiet-alerts"] {
                let app = launch(["--uitesting-screen", screen, dark ? "--uitesting-dark" : "--uitesting-light"])
                XCTAssertTrue(app.navigationBars.firstMatch.appears(timeout: 5), screen)
                // Add number and Add contact are scroll views since October 17; the rest are lists.
                let content = app.descendants(matching: .any).matching(NSPredicate(format: "elementType IN %@", [
                    XCUIElement.ElementType.collectionView.rawValue, XCUIElement.ElementType.scrollView.rawValue])).firstMatch
                XCTAssertTrue(content.appears(timeout: 5), screen)
                capture(app, "visual-\(screen)-\(dark ? "dark" : "light")")
            }
            let app = launch([dark ? "--uitesting-dark" : "--uitesting-light"])
            for tab in ["Home", "Calls", "Messages", "More"] {
                app.tabBars.buttons[tab].tap()
                XCTAssertTrue(app.navigationBars[tab].appears(timeout: 5))
                capture(app, "visual-\(tab.lowercased())-\(dark ? "dark" : "light")")
            }
        }
    }

    func testMotionNavigationReturnsToExpandedContentAndRetainsTabs() {
        let app = launch()
        openMore(app, "Get help")
        app.buttons["How can I check a caller?"].tap()
        app.buttons["Numbers you trust"].tap()
        XCTAssertTrue(app.navigationBars["Numbers you trust"].appears(timeout: 5))
        // Exercise the system edge gesture, including a cancelled interactive return.
        let edge = app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.5))
        edge.press(forDuration: 0.1, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.18, dy: 0.5)), withVelocity: .slow, thenHoldForDuration: 0.3)
        if app.navigationBars["Numbers you trust"].exists {
            edge.press(forDuration: 0.1, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.85, dy: 0.5)))
        }
        XCTAssertTrue(app.navigationBars["Get help"].appears(timeout: 5))
        XCTAssertTrue(app.buttons["Numbers you trust"].exists, "Returning must preserve the expanded disclosure")
        capture(app, "motion-help-after-interactive-back")
        app.tabBars.buttons["Calls"].tap()
        app.historyRow("Call stopped").tap()
        XCTAssertTrue(app.navigationBars["Call"].appears(timeout: 5))
        app.tabBars.buttons["More"].tap()
        XCTAssertTrue(app.navigationBars["Get help"].exists)
        app.tabBars.buttons["Calls"].tap()
        XCTAssertTrue(app.navigationBars["Call"].exists, "Changing tabs must preserve the navigation stack")
        edge.press(forDuration: 0.1, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.85, dy: 0.5)))
        XCTAssertTrue(app.navigationBars["Calls"].appears(timeout: 5))
        capture(app, "motion-calls-after-interactive-back")
    }

    func testMotionQuietHoursKeepsTimeRowsStableAndCanReverse() {
        for large in [false, true] {
            let app = launch(["--uitesting-screen", "quiet", "--uitesting-slow-quiet-save"] + (large ? ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"] : []))
            let toggle = app.switches["Quiet hours"]
            XCTAssertTrue(toggle.appears(timeout: 5))
            let start = app.descendants(matching: .any)["quiet-start-time"].firstMatch
            let end = app.descendants(matching: .any)["quiet-end-time"].firstMatch
            XCTAssertTrue(start.exists)
            XCTAssertTrue(end.exists)
            XCTAssertFalse(start.isEnabled)
            let actionTop = app.buttons["Saved"].frame.minY
            let initialFrame = start.frame
            let initialValue = start.value as? String
            // The label remains a full-row action, with no inserted rows.
            toggle.coordinate(withNormalizedOffset: CGVector(dx: 0.1, dy: 0.5)).tap()
            XCTAssertEqual(toggle.value as? String, "1")
            XCTAssertTrue(start.isEnabled)
            XCTAssertEqual(start.frame.minY, initialFrame.minY, accuracy: 1)
            XCTAssertTrue(app.buttons["Save quiet hours"].isEnabled)
            XCTAssertEqual(app.buttons["Save quiet hours"].frame.minY, actionTop, accuracy: 1)
            capture(app, "motion-quiet-enabled-\(large ? "large" : "standard")")
            toggle.tap()
            XCTAssertEqual(toggle.value as? String, "0")
            XCTAssertFalse(start.isEnabled)
            XCTAssertEqual(start.frame.minY, initialFrame.minY, accuracy: 1)
            XCTAssertEqual(start.value as? String, initialValue)
            XCTAssertFalse(app.buttons["Saved"].isEnabled)
            XCTAssertEqual(app.buttons["Saved"].frame.minY, actionTop, accuracy: 1)
            toggle.tap()
            XCTAssertEqual(toggle.value as? String, "1")
            XCTAssertEqual(start.frame.minY, initialFrame.minY, accuracy: 1)
            XCTAssertEqual(app.buttons["Save quiet hours"].frame.minY, actionTop, accuracy: 1)
            capture(app, "motion-quiet-reversed-\(large ? "large" : "standard")")
            app.buttons["Save quiet hours"].tap()
            let saving = app.buttons["Saving…"]
            XCTAssertTrue(saving.appears(timeout: 2))
            XCTAssertEqual(saving.frame.minY, actionTop, accuracy: 1)
            capture(app, "motion-quiet-saving-\(large ? "large" : "standard")")
            XCTAssertTrue(app.staticTexts["Hours not confirmed"].appears(timeout: 6))
        }
    }

    func testPhoneSignInHasNoRetiredEmailSheetAtLargestText() {
        for large in [false, true] {
            let args = ["--uitesting-phone-sign-in", "--uitesting-dark"] + (large ? ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"] : [])
            let app = launch(args, sample: false)
            let phone = app.textFields["sign-in-phone"]
            XCTAssertTrue(phone.appears(timeout: 5))
            tap(phone, in: app)
            phone.typeText("2025550102")
            XCTAssertFalse(app.buttons["Use email instead"].exists)
            XCTAssertFalse(app.textFields["Email address"].exists)
            XCTAssertFalse(app.buttons["Done"].exists)
            capture(app, "phone-keyboard-\(large ? "large" : "standard")")
        }
    }

    func testMotionAllSecondaryScreensAtLargestText() {
        for screen in ["numbers", "add-number", "add-contact", "sharing", "sharing-access", "contacts", "quiet", "blocked", "setup", "setup-details", "trial-options", "protection", "join", "help", "automatic-texts", "audio", "alerts-on", "alerts-off", "quiet-alerts", "contact-alerts", "trusted-contacts"] {
            let app = launch(["--uitesting-screen", screen, "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
            XCTAssertTrue(app.navigationBars.firstMatch.appears(timeout: 5), screen)
            capture(app, "motion-\(screen)-largest-dark-top")
            app.swipeUp()
            capture(app, "motion-\(screen)-largest-dark-scrolled")
        }
    }

    func testMotionOptionalVoicemailGuideReturnsToCompletedDisconnect() {
        let app = launch(["--uitesting-forwarding", "--forwarding-start-restore", "--restoration-start-checks"], sample: false)
        let next = app.buttons["disconnect-continue"]
        XCTAssertTrue(next.appears(timeout: 5))
        next.tap(); next.tap()
        XCTAssertTrue(app.staticTexts["restoration-complete"].appears(timeout: 5))
        tap(app.buttons["Turn Live Voicemail back on (optional)"], in: app)
        XCTAssertTrue(app.navigationBars["Live Voicemail"].appears(timeout: 5))
        XCTAssertTrue(app.buttons["restoration-settings-open"].exists)
        capture(app, "motion-optional-voicemail-guide")
        app.navigationBars.buttons.firstMatch.tap()
        XCTAssertTrue(app.staticTexts["restoration-complete"].appears(timeout: 5))
    }

    func testMotionNativePickersCancelBackToTheirForms() {
        var app = launch(["--uitesting-trusted-contacts"], sample: false)
        tap(app.buttons["trusted-contact-yes"], in: app)
        app.buttons["Choose from Contacts"].tap()
        // The native service may finish its first launch after the app is idle.
        let closeContacts = app.buttons.matching(NSPredicate(format: "label IN %@", ["Cancel", "Close"])).firstMatch
        XCTAssertTrue(closeContacts.appears(timeout: 10))
        capture(app, "motion-native-contact-picker")
        closeContacts.tap()
        XCTAssertTrue(app.textFields["trusted-contact-name"].exists)

        app = launch()
        openMore(app, "Check a text")
        app.buttons["Choose picture"].tap()
        XCTAssertTrue(app.buttons["Cancel"].appears(timeout: 5))
        capture(app, "motion-native-photo-picker")
        app.buttons["Cancel"].tap()
        XCTAssertTrue(app.textViews.firstMatch.isHittable)
    }

    /// A name in a list row must not act as that row's Remove or Stop sharing button.
    func testNamesInActionRowsDoNotTriggerTheirActions() {
        var app = launch(["--uitesting-screen", "sharing-access", "--uitesting-sharing-confirmations"])
        XCTAssertTrue(app.staticTexts["Jamie"].firstMatch.appears(timeout: 5))
        app.staticTexts["Jamie"].firstMatch.tap()
        XCTAssertFalse(app.alerts.firstMatch.waitForExistence(timeout: 2))
        let stop = app.buttons["Stop sharing with Jamie"].firstMatch
        XCTAssertGreaterThanOrEqual(stop.frame.height, 52)
        stop.tap()
        XCTAssertTrue(app.alerts["Stop sharing with Jamie?"].appears(timeout: 5))
        app = launch(["--uitesting-screen", "numbers"])
        let remove = app.buttons["Remove Sample clinic"].firstMatch
        XCTAssertTrue(remove.appears(timeout: 5))
        XCTAssertGreaterThanOrEqual(remove.frame.height, 52)
        XCTAssertGreaterThan(app.buttons["Call Sample clinic"].firstMatch.frame.width, remove.frame.width)
    }

    /// Capsule buttons meet the 52-point target without growing into tall pills.
    func testCapsuleButtonsStayAtTheMinimumTarget() {
        func check(_ button: XCUIElement, _ name: String) {
            XCTAssertTrue(button.waitForExistence(timeout: 5), name)
            XCTAssertTrue((52...56).contains(button.frame.height), "\(name) is \(button.frame.height) points tall")
        }
        var app = launch(["--uitesting-screen", "numbers"]); check(app.buttons["Call Sample clinic"], "Call")
        app = launch(["--uitesting-screen", "blocked"])
        check(app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'unblock-'")).firstMatch, "Allow calls again")
        app = launch(["--uitesting-protection-onboarding"], sample: false); check(app.buttons["Save my choice"], "Save my choice")
        app = launch([], sample: false); check(app.buttons["Text me a code"], "Text me a code")
    }

    private func launch(_ args: [String] = [], sample: Bool = true) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = (sample ? ["--uitesting-preview"] : []) + args
        app.launch()
        return app
    }

    private func tap(_ element: XCUIElement, in app: XCUIApplication, towardTop: Bool = false) {
        _ = element.appears(timeout: 1)
        for _ in 0..<20 {
            let top = app.navigationBars.firstMatch.exists ? app.navigationBars.firstMatch.frame.maxY : 0
            var bottom = app.tabBars.firstMatch.exists ? app.tabBars.firstMatch.frame.minY : app.frame.maxY
            let actions = app.otherElements["message-action-area"]
            if actions.exists && actions.frame.height > 0 { bottom = min(bottom, actions.frame.minY) }
            if element.exists && element.isHittable && element.frame.minY >= top && element.frame.maxY <= bottom { break }
            if app.collectionViews.firstMatch.exists {
                let downward = towardTop || (element.exists && element.frame.minY < top)
                let origin = app.coordinate(withNormalizedOffset: .zero)
                let high = top + (bottom - top) * 0.25
                let low = top + (bottom - top) * 0.75
                origin.withOffset(CGVector(dx: app.frame.midX, dy: downward ? high : low))
                    .press(forDuration: 0.1, thenDragTo: origin.withOffset(CGVector(dx: app.frame.midX, dy: downward ? low : high)))
            } else { app.swipeUp() }
        }
        if !element.exists || !element.isHittable {
            capture(app, "polish-unreachable-control")
            let tree = XCTAttachment(string: app.debugDescription)
            tree.name = "Unreachable control accessibility tree"; tree.lifetime = .keepAlways; add(tree)
        }
        XCTAssertTrue(element.exists); XCTAssertTrue(element.isHittable); element.tap()
    }

    private func openMore(_ app: XCUIApplication, _ title: String) {
        app.tabBars.buttons["More"].tap()
        for _ in 0..<5 {
            if app.navigationBars["More"].exists { break }
            app.navigationBars.buttons.firstMatch.tap()
        }
        tap(app.staticTexts[title].firstMatch, in: app)
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        Thread.sleep(forTimeInterval: 0.8)
        let screenshot = app.screenshot()
        let shot = XCTAttachment(screenshot: screenshot)
        shot.name = name; shot.lifetime = .keepAlways; add(shot)
        do {
            let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("SeniorScreens")
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            try screenshot.pngRepresentation.write(to: directory.appendingPathComponent(name + ".png"))
        } catch { XCTFail("Couldn’t save simulator capture: \(error.localizedDescription)") }

    }
}
