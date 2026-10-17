import XCTest

@MainActor
final class SeniorPolishUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testIncompleteEmailHasAnExplanationAndCanBeCorrected() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-auth-error"]
        app.launch()
        let email = app.textFields["Email address"]
        XCTAssertTrue(email.appears(timeout: 5))
        email.tap(); email.typeText("synthetic@")
        app.buttons["Done"].firstMatch.tap()
        XCTAssertFalse(app.buttons["sign-in-submit"].isEnabled)
        XCTAssertTrue(app.staticTexts["Check the email address, including the part after @."].exists)
        email.tap(); app.buttons["Clear email address"].tap(); email.typeText("synthetic@example.com")
        app.buttons["Done"].firstMatch.tap()
        XCTAssertTrue(app.buttons["sign-in-submit"].isEnabled)
        app.buttons["sign-in-submit"].tap()
        XCTAssertTrue(app.staticTexts["sign-in-error"].appears(timeout: 5))
        XCTAssertEqual(email.value as? String, "synthetic@example.com")
    }

    func testFailedListsHaveRecoveryWithoutFalseEmptyClaims() {
        let cases = [("numbers", "Numbers couldn’t load", "No numbers yet", "Sample clinic"),
                     ("blocked", "Blocked numbers couldn’t load", "No blocked numbers", "(312) 555-0199"),
                     ("contacts", "Contacts couldn’t load", "Your calling list is empty", "Jamie"),
                     ("quiet", "Quiet hours couldn’t load", "", "Quiet hours"),
                     ("setup", "Phone setup couldn’t load", "", "Phone setup is done with a helper, one step at a time."),
                     ("sharing", "Call sharing couldn’t load", "Your calls are private", "Your calls are private")]
        for (screen, error, empty, recovered) in cases {
            let app = launch(screen, extra: ["--uitesting-load-failure"])
            let notice = app.staticTexts[error]
            reveal(notice, in: app)
            XCTAssertTrue(notice.exists, screen)
            if !empty.isEmpty { XCTAssertFalse(app.staticTexts[empty].exists, screen) }
            capture(app, "polish-\(screen)-error")
            let retry = app.buttons["Try again"].firstMatch
            reveal(retry, in: app); retry.tap()
            XCTAssertFalse(notice.waitForExistence(timeout: 1), screen)
            XCTAssertTrue(app.staticTexts[recovered].appears(timeout: 5) || app.switches[recovered].exists, screen)
        }
    }

    func testAddNumberKeepsLabelsAndInputAfterAnInterruptedSave() {
        let app = launch("add-number")
        let name = app.textFields["Name"]
        XCTAssertTrue(name.appears(timeout: 5))
        name.tap(); name.typeText("My clinic")
        let phone = app.textFields["Phone number"]
        phone.tap(); phone.typeText("5550100")
        app.buttons["Done"].firstMatch.tap()
        XCTAssertFalse(app.buttons["Save number"].isEnabled)
        phone.tap(); app.buttons["Clear phone number"].tap(); phone.typeText("3125550100")
        app.buttons["Done"].firstMatch.tap()
        XCTAssertTrue(app.buttons["Save number"].isEnabled)
        XCTAssertTrue(app.staticTexts["Name"].exists)
        XCTAssertTrue(app.staticTexts["Phone number"].exists)
        app.buttons["Save number"].tap()
        let error = app.staticTexts["Save not confirmed"]
        reveal(error, in: app)
        reveal(name, in: app, towardTop: true)
        XCTAssertEqual(name.value as? String, "My clinic")
        reveal(phone, in: app)
        XCTAssertEqual(phone.value as? String, "(312) 555-0100")
        XCTAssertTrue(app.buttons["Save number"].isEnabled)
        reveal(error, in: app)
        capture(app, "polish-add-number-error")
    }

    func testContactSavedOnPhoneExplainsAnUnconfirmedShieldUpdate() {
        let app = launch("add-contact", extra: ["--uitesting-contact-save-sync-fails"])
        let name = app.textFields["Name"]
        XCTAssertTrue(name.appears(timeout: 5))
        name.tap(); name.typeText("My clinic")
        app.buttons["Done"].firstMatch.tap()
        let phone = app.textFields["Phone number"]
        reveal(phone, in: app); phone.tap(); phone.typeText("3125550100")
        app.buttons["Done"].firstMatch.tap(); app.buttons["Save number"].tap()
        XCTAssertTrue(app.staticTexts["Save not confirmed"].appears(timeout: 5))
        XCTAssertTrue(app.staticTexts["The number is in iPhone Contacts. Try saving again to update Shield."].exists)
        XCTAssertEqual(phone.value as? String, "(312) 555-0100")
        XCTAssertTrue(app.buttons["Save number"].isEnabled)
        capture(app, "polish-contact-partial-save")
    }

    func testQuietHoursFailureKeepsTheUnsavedChoice() {
        let app = launch("quiet")
        let enabled = app.switches["Quiet hours"]
        XCTAssertTrue(enabled.appears(timeout: 5))
        XCTAssertEqual(enabled.value as? String, "0")
        enabled.tap()
        XCTAssertTrue(app.buttons["Save quiet hours"].isEnabled)
        app.buttons["Save quiet hours"].tap()
        XCTAssertTrue(app.staticTexts["Hours not confirmed"].appears(timeout: 5))
        reveal(enabled, in: app, towardTop: true)
        XCTAssertEqual(enabled.value as? String, "1")
        XCTAssertTrue(app.buttons["Save quiet hours"].isEnabled)
        reveal(app.staticTexts["Hours not confirmed"], in: app)
        capture(app, "polish-quiet-unsaved")
    }

    func testPlayedStatusFailureKeepsPlaybackControlsUsable() {
        let app = launch("audio", extra: ["--uitesting-played-status-fails"])
        XCTAssertTrue(app.buttons["Listen to message"].appears(timeout: 5))
        app.buttons["Listen to message"].tap()
        let pause = app.buttons["Pause message"]
        XCTAssertTrue(pause.appears(timeout: 5))
        XCTAssertTrue(pause.isEnabled); pause.tap()
        XCTAssertTrue(app.buttons["Resume message"].exists)
        XCTAssertTrue(app.staticTexts["You can listen. It may still show as new."].appears(timeout: 5))
        XCTAssertFalse(app.alerts["Message couldn’t play"].exists)
        app.buttons["Resume message"].tap()
        XCTAssertTrue(app.buttons["Pause message"].appears(timeout: 5))
        let recovery = app.buttons["Mark as listened"]
        reveal(recovery, in: app)
        XCTAssertTrue(recovery.isHittable)
        capture(app, "polish-audio-status-recovery")
    }

    func testLostListeningAccessDiscardsStartedAudio() {
        let app = launch("audio", extra: ["--uitesting-listening-access-changes"])
        XCTAssertTrue(app.buttons["Listen to message"].appears(timeout: 5))
        app.buttons["Listen to message"].tap()
        XCTAssertTrue(app.buttons["Pause message"].appears(timeout: 5))
        XCTAssertTrue(app.staticTexts["Message is private"].appears(timeout: 10))
        XCTAssertFalse(app.buttons["Pause message"].exists)
        XCTAssertFalse(app.buttons["Resume message"].exists)
        capture(app, "polish-audio-private")
        XCTAssertTrue(app.buttons["Listen to message"].appears(timeout: 8))
        XCTAssertFalse(app.buttons["Resume message"].exists)
        XCTAssertFalse(app.buttons["Start over"].exists)
        capture(app, "polish-audio-permission-restored")
    }

    func testBackgroundingWhileAudioLoadsDoesNotStartItLater() {
        let app = launch("audio", extra: ["--uitesting-delayed-audio"])
        XCTAssertTrue(app.buttons["Listen to message"].appears(timeout: 5))
        app.buttons["Listen to message"].tap()
        XCTAssertTrue(app.buttons["Getting message…"].appears(timeout: 2))
        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertTrue(app.buttons["Listen to message"].appears(timeout: 5))
        XCTAssertFalse(app.buttons["Pause message"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Listen to message"].isEnabled)
        XCTAssertFalse(app.buttons["Start over"].exists)
        capture(app, "polish-audio-canceled-download")
        app.buttons["Listen to message"].tap()
        XCTAssertTrue(app.buttons["Pause message"].appears(timeout: 8))
    }

    func testBackgroundingDuringAudioPreparationDoesNotStartItLater() {
        let app = launch("audio", extra: ["--uitesting-delayed-audio-preparation"])
        XCTAssertTrue(app.buttons["Listen to message"].appears(timeout: 5))
        app.buttons["Listen to message"].tap()
        XCTAssertTrue(app.buttons["Getting message…"].appears(timeout: 2))
        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertTrue(app.buttons["Listen to message"].appears(timeout: 5))
        XCTAssertFalse(app.buttons["Pause message"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["Start over"].exists)
        app.buttons["Listen to message"].tap()
        XCTAssertTrue(app.buttons["Pause message"].appears(timeout: 8))
    }

    func testPersonContextChangeClosesThePreviousCallDetail() {
        let app = launch("audio", extra: ["--uitesting-detail-context-changes"])
        let open = app.buttons["Open sample call"]
        XCTAssertTrue(open.appears(timeout: 5)); open.tap()
        XCTAssertTrue(app.buttons["Listen to message"].appears(timeout: 5))
        app.buttons["Listen to message"].tap()
        XCTAssertTrue(app.buttons["Pause message"].appears(timeout: 5))
        XCTAssertTrue(open.appears(timeout: 12))
        XCTAssertTrue(open.isHittable)
        expectation(for: NSPredicate(format: "exists == false"), evaluatedWith: app.staticTexts["Sample audio message"])
        waitForExpectations(timeout: 5)
        XCTAssertFalse(app.buttons["Pause message"].exists)
        capture(app, "polish-call-context-changed")
    }

    func testLargestTextBringsSaveErrorsIntoView() {
        let options = ["--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        var app = launch("add-number", extra: options)
        let name = app.textFields["Name"]
        reveal(name, in: app); name.tap(); name.typeText("My clinic")
        app.buttons["Done"].firstMatch.tap()
        XCTAssertFalse(app.keyboards.firstMatch.exists)
        let phone = app.textFields["Phone number"]
        reveal(phone, in: app); phone.tap(); phone.typeText("3125550100")
        app.buttons["Done"].firstMatch.tap()
        app.buttons["Save number"].tap()
        expectVisible(app.staticTexts["Save not confirmed"], in: app)
        capture(app, "polish-number-save-error-large-dark")
        app.scrollViews.firstMatch.swipeDown()
        app.scrollViews.firstMatch.swipeDown()
        let saveAgain = app.buttons["Save number"]
        for _ in 0..<8 where !saveAgain.isHittable { app.swipeUp() }
        saveAgain.tap()
        expectVisible(app.staticTexts["Save not confirmed"], in: app)
        capture(app, "polish-number-repeated-error-large-dark")

        app = launch("quiet", extra: options)
        let enabled = app.switches["Quiet hours"]
        reveal(enabled, in: app, towardTop: true); enabled.tap()
        app.buttons["Save quiet hours"].tap()
        expectVisible(app.staticTexts["Hours not confirmed"], in: app)
        capture(app, "polish-quiet-save-error-large-dark")
        reveal(enabled, in: app, towardTop: true); enabled.tap()
        XCTAssertFalse(app.staticTexts["Hours not confirmed"].exists)
    }

    func testAudioCanPauseResumeRestartAndStopsWhenBackgrounded() {
        let app = launch("audio")
        XCTAssertTrue(app.buttons["Listen to message"].appears(timeout: 5))
        app.buttons["Listen to message"].tap()
        XCTAssertTrue(app.buttons["Pause message"].appears(timeout: 5))
        app.buttons["Pause message"].tap()
        XCTAssertTrue(app.buttons["Resume message"].exists)
        app.buttons["Resume message"].tap()
        let restart = app.buttons["Start over"]
        reveal(restart, in: app)
        XCTAssertTrue(restart.isHittable); restart.tap()
        XCTAssertTrue(app.buttons["Pause message"].exists)
        capture(app, "polish-audio-playing")
        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertTrue(app.buttons["Listen to message"].appears(timeout: 5))
        XCTAssertFalse(app.buttons["Resume message"].exists)
    }

    func testLargestTextCanChangePeopleAndReadFullCallMetadata() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        app.launch()
        app.tabBars.buttons["More"].tap()
        let people = app.buttons["Switch person"]
        XCTAssertTrue(people.appears(timeout: 5))
        XCTAssertTrue(people.isHittable); people.tap()
        let alex = app.buttons["person-Alex"]
        reveal(alex, in: app); alex.tap()
        if app.navigationBars["Switch person"].exists { app.navigationBars.buttons.firstMatch.tap() }
        app.buttons["Switch person"].tap()
        XCTAssertTrue(app.buttons["person-Alex"].isSelected)
        app.tabBars.buttons["Calls"].tap()
        let filter = app.buttons["callFilter"]
        reveal(filter, in: app)
        filter.tap()
        app.buttons["Stopped"].tap()
        let number = app.staticTexts["(512) 555-0129"].firstMatch
        reveal(number, in: app)
        XCTAssertTrue(number.exists)
        XCTAssertGreaterThanOrEqual(number.frame.height, 40)
        capture(app, "polish-helper-call-large-dark")
        app.tabBars.buttons["More"].tap()
        XCTAssertTrue(app.navigationBars["Switch person"].exists, "Changing tabs preserves the person-picker navigation stack")
        app.navigationBars.buttons.firstMatch.tap()
        XCTAssertTrue(app.navigationBars["More"].appears(timeout: 5))
        let settings = app.staticTexts["Settings"].firstMatch
        reveal(settings, in: app); settings.tap()
        XCTAssertFalse(app.staticTexts["Checks while you talk"].exists)
        XCTAssertFalse(app.staticTexts["Quiet hours"].exists)
    }

    func testOptionalContactCanBeBackedOutOfAtLargestText() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-trusted-contacts", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        app.launch()
        let add = app.buttons["trusted-contact-yes"]
        reveal(add, in: app); add.tap()
        XCTAssertTrue(app.textFields["trusted-contact-name"].appears(timeout: 5))
        app.navigationBars.buttons.firstMatch.tap()
        let skip = app.buttons["trusted-contact-no"]
        reveal(skip, in: app)
        capture(app, "optional-contact-choice-large-dark")
        skip.tap()
        XCTAssertTrue(app.staticTexts["demoBanner"].appears(timeout: 5))
    }

    func testSecondaryScreensAtLargestTextKeepAllActionsReachable() {
        for screen in ["numbers", "add-number", "sharing", "contacts", "quiet", "blocked", "help", "automatic-texts"] {
            let app = launch(screen, extra: ["--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
            capture(app, "polish-\(screen)-large-dark-top")
            switch screen {
            case "numbers": reveal(app.buttons["Call Sample clinic"], in: app)
            case "add-number": XCTAssertTrue(app.buttons["Save number"].isHittable)
            case "sharing": reveal(app.staticTexts["Sign in to manage sharing."], in: app)
            case "contacts": reveal(app.buttons["Contacts settings"], in: app)
            case "quiet": reveal(app.switches["Quiet hours"], in: app)
            case "blocked": reveal(app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'unblock-'")).firstMatch, in: app)
            case "help": reveal(app.buttons["In an emergency"], in: app)
            case "automatic-texts": reveal(app.buttons["What will Shield see?"], in: app)
            default: break
            }
            capture(app, "polish-\(screen)-large-dark-actions")
        }
    }

    func testLargestProtectionSaveFailureRetainsChoice() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-protection-onboarding", "--protection-save-fails", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        app.launch()
        let protection = app.switches["onboarding-protection-toggle"]
        let completion = app.buttons["onboarding-protection-continue"]
        reveal(protection, in: app); protection.tap()
        reveal(completion, in: app); completion.tap()
        XCTAssertTrue(app.staticTexts["Couldn’t save your choice"].appears(timeout: 5))
        reveal(completion, in: app); XCTAssertTrue(completion.isEnabled)
        reveal(protection, in: app); XCTAssertEqual(protection.value as? String, "1")
        capture(app, "protection-save-recovery-large-dark")
    }

    func testPhoneOptionsExcludesAccountDeletion() {
        for screen in ["setup-details", "trial-options"] {
            let app = launch(screen)
            XCTAssertTrue(app.navigationBars["Phone options"].appears(timeout: 5))
            for _ in 0..<3 { app.swipeUp() }
            XCTAssertFalse(app.buttons["Delete account"].exists)
            capture(app, "phone-setup-without-account-deletion-" + screen)
            app.terminate()
        }
    }

    func testConfiguredSettingsAndSharingScopesStayReadable() {
        for large in [false, true] {
            let options = large ? ["--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"] : []
            for screen in ["setup-details", "trial-options", "sharing-access", "alerts-on", "alerts-off", "quiet-alerts"] {
                let app = launch(screen, extra: options)
                capture(app, "polish-\(screen)-\(large ? "large-dark" : "light")-top")
                switch screen {
                case "setup-details": reveal(app.buttons["Disconnect Shield"], in: app)
                case "trial-options": reveal(app.buttons["Pause call checks"], in: app)
                case "sharing-access":
                    reveal(app.staticTexts["Calls and messages"], in: app)
                    XCTAssertTrue(app.buttons["Stop sharing with Jamie"].exists)
                case "alerts-on": XCTAssertTrue(app.staticTexts["Message alerts are on"].exists)
                case "alerts-off": reveal(app.buttons["Open iPhone settings"], in: app)
                case "quiet-alerts": reveal(app.buttons["Open iPhone settings"], in: app)
                default: break
                }
                capture(app, "polish-\(screen)-\(large ? "large-dark" : "light")-details")
            }
        }
    }

    func testMessagesLeadWithPurposeAndKeepFullReadingInTheDetail() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview", "--uitesting-light"]
        app.launch()
        let title = app.historyRow("Saved account notice")
        XCTAssertTrue(title.appears(timeout: 5))
        XCTAssertFalse(app.staticTexts["An automated caller reported unusual card activity. The sender hasn’t been verified."].exists)
        capture(app, "walkthrough-message-purpose")
        title.tap()
        XCTAssertTrue(app.staticTexts["message-summary"].appears(timeout: 5))
        XCTAssertTrue(app.buttons["Hear sample message"].isHittable)
        reveal(app.buttons["Find a trusted number"], in: app)
        capture(app, "walkthrough-message-reading-and-action")
    }

    func testContactRemovalNamesItsScopeAndHasAFullRowTarget() {
        for large in [false, true] {
            let app = launch("contacts", extra: ["--uitesting-contact-removal"] + (large ? ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"] : []))
            let remove = app.buttons["Remove Jamie from Contacts"]
            reveal(remove, in: app)
            let search = app.searchFields.firstMatch
            for _ in 0..<8 {
                if !search.exists || remove.frame.maxY <= search.frame.minY { break }
                // Move only past the floating search control; a full swipe can
                // recycle the intended row above the visible list.
                let distance = min(100, remove.frame.maxY - search.frame.minY + 12)
                let origin = app.coordinate(withNormalizedOffset: .zero)
                let start = origin.withOffset(CGVector(dx: app.frame.midX, dy: app.frame.midY))
                start.press(forDuration: 0.1,
                            thenDragTo: origin.withOffset(CGVector(dx: app.frame.midX, dy: app.frame.midY - distance)),
                            withVelocity: .slow, thenHoldForDuration: 0.2)
            }
            if search.exists { XCTAssertLessThanOrEqual(remove.frame.maxY, search.frame.minY) }
            XCTAssertTrue(remove.isEnabled)
            XCTAssertGreaterThanOrEqual(remove.frame.height, 52)
            XCTAssertGreaterThan(remove.frame.width, 250)
            capture(app, "walkthrough-contact-removal-scope-\(large ? "large" : "standard")")
            remove.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap()
            XCTAssertTrue(app.buttons["Remove contact"].appears(timeout: 5))
            capture(app, "walkthrough-contact-after-edge-tap")
            XCTAssertTrue(app.buttons["Keep contact"].exists)
            XCTAssertTrue(app.staticTexts["This can also remove the contact from your other devices through iCloud. A restore copy stays on this phone."].exists)
            capture(app, "walkthrough-contact-removal-confirmation")
            app.buttons["Keep contact"].tap()
            XCTAssertTrue(app.staticTexts["Jamie"].exists)
        }
    }

    func testGetStartedAsksForHelpWithoutInvitations() {
        let app = launch("join")
        XCTAssertTrue(app.staticTexts["Welcome to Shield"].appears(timeout: 5))
        XCTAssertTrue(app.staticTexts["Your phone isn’t connected yet. Contact Shield to set it up."].exists)
        XCTAssertFalse(app.buttons["Use an invitation"].exists)
        XCTAssertTrue(app.buttons["Sign out"].exists)
        capture(app, "walkthrough-get-started")
    }

    func testSharingListsHelpersWithoutMakingInvitations() {
        let app = launch("sharing-access")
        XCTAssertTrue(app.navigationBars["Call sharing"].appears(timeout: 5))
        XCTAssertTrue(app.staticTexts["Jamie"].appears(timeout: 5))
        XCTAssertTrue(app.staticTexts["Calls and messages"].exists)
        XCTAssertFalse(app.textFields.firstMatch.exists)
        XCTAssertFalse(app.buttons["Make invitation"].exists)
        reveal(app.buttons["Stop sharing with Morgan"], in: app)
        capture(app, "walkthrough-sharing-helpers")
    }

    func testSharingConfirmationsHaveVisibleSafeChoices() {
        for large in [false, true] {
            let arguments = ["--uitesting-sharing-confirmations"] + (large ? ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"] : [])
            let app = launch("sharing-access", extra: arguments)
            let stop = app.buttons["Stop sharing with Jamie"]
            reveal(stop, in: app); stop.tap()
            XCTAssertTrue(app.alerts["Stop sharing with Jamie?"].appears(timeout: 5))
            XCTAssertTrue(app.buttons["Keep sharing"].isHittable)
            capture(app, "walkthrough-keep-sharing-confirmation-\(large ? "large" : "standard")")
            app.buttons["Keep sharing"].tap()
            XCTAssertTrue(app.buttons["Stop sharing with Jamie"].exists)
        }
    }

    func testLeavingTheSampleHasVisibleCancellation() {
        for large in [false, true] {
            let app = XCUIApplication()
            app.launchArguments = ["--uitesting-preview", "--uitesting-light"] + (large ? ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"] : [])
            app.launch()
            app.tabBars.buttons["More"].tap()
            let settings = app.staticTexts["Settings"].firstMatch
            reveal(settings, in: app); settings.tap()
            let leave = app.buttons["Leave sample app"].firstMatch
            reveal(leave, in: app); leave.tap()
            XCTAssertTrue(app.alerts["Leave the sample app?"].appears(timeout: 5))
            XCTAssertTrue(app.buttons["Cancel"].isHittable)
            capture(app, "walkthrough-exit-confirmation-\(large ? "large" : "standard")")
            app.buttons["Cancel"].tap()
            XCTAssertTrue(leave.exists)
        }
    }

    private func launch(_ screen: String, extra: [String] = []) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-screen", screen, "--uitesting-light"] + extra
        app.launch()
        return app
    }

    private func reveal(_ element: XCUIElement, in app: XCUIApplication, towardTop: Bool = false) {
        _ = element.appears(timeout: 2)
        for _ in 0..<25 {
            let top = app.navigationBars.firstMatch.exists ? app.navigationBars.firstMatch.frame.maxY : 0
            var bottom = app.tabBars.firstMatch.exists ? app.tabBars.firstMatch.frame.minY : app.frame.maxY
            if app.keyboards.firstMatch.exists { bottom = min(bottom, app.keyboards.firstMatch.frame.minY) }
            for title in ["Save number", "Save quiet hours", "Saved"] {
                let button = app.buttons[title]
                if button.exists && button.frame.height > 0 { bottom = min(bottom, button.frame.minY) }
            }
            let actions = app.otherElements["message-action-area"]
            if actions.exists && actions.frame.height > 0 { bottom = min(bottom, actions.frame.minY) }
            if element.exists && element.isHittable && element.frame.minY >= top && element.frame.maxY <= bottom { return }
            let list = app.collectionViews.firstMatch.exists ? app.collectionViews.firstMatch : app.scrollViews.firstMatch
            if list.exists {
                let downward = towardTop || (element.exists && element.frame.minY < top)
                let origin = app.coordinate(withNormalizedOffset: .zero)
                let high = top + (bottom - top) * 0.25
                let low = top + (bottom - top) * 0.75
                origin.withOffset(CGVector(dx: app.frame.midX, dy: downward ? high : low))
                    .press(forDuration: 0.1, thenDragTo: origin.withOffset(CGVector(dx: app.frame.midX, dy: downward ? low : high)))
            } else { app.swipeUp() }
        }
        XCTAssertTrue(element.exists); XCTAssertTrue(element.isHittable)
    }

    private func expectVisible(_ element: XCUIElement, in app: XCUIApplication) {
        XCTAssertTrue(element.appears(timeout: 5))
        let visible = NSPredicate { _, _ in
            element.isHittable && element.frame.minY >= app.navigationBars.firstMatch.frame.maxY && element.frame.maxY <= app.frame.maxY
        }
        expectation(for: visible, evaluatedWith: element)
        waitForExpectations(timeout: 5)
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        Thread.sleep(forTimeInterval: 0.8)
        let screenshot = app.screenshot()
        let shot = XCTAttachment(screenshot: screenshot)
        shot.name = name; shot.lifetime = .keepAlways; add(shot)
        do {
            let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("PolishScreens")
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            try screenshot.pngRepresentation.write(to: directory.appendingPathComponent(name + ".png"))
        } catch { XCTFail("Couldn’t save simulator capture: \(error.localizedDescription)") }
    }
}
