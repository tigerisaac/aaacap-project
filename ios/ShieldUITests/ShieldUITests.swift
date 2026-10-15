import XCTest

@MainActor
final class ShieldUITests: XCTestCase {
    func testWelcomeEmailValidationAndDemoEntry() {
        let app = XCUIApplication()
        app.launch()
        let email = app.textFields["Email address"]
        XCTAssertTrue(email.appears(timeout: 5))
        let continueButton = app.buttons["sign-in-submit"]
        XCTAssertFalse(continueButton.isEnabled)
        capture(app, name: "Welcome")
        email.tap()
        email.typeText("hello")
        XCTAssertFalse(continueButton.isEnabled)
        email.typeText("@example.com")
        XCTAssertTrue(continueButton.isEnabled)
        capture(app, name: "Welcome with keyboard")
        app.swipeUp()
        let demo = app.buttons["Try sample app"]
        if !demo.isHittable { app.swipeUp() }
        demo.tap()
        XCTAssertTrue(app.staticTexts["demoBanner"].appears(timeout: 5))
    }

    func testSimulatorTestAccountSequenceOpensSampleAccount() {
        let app = XCUIApplication()
        app.launch()
        let email = app.textFields["Email address"]
        XCTAssertTrue(email.appears(timeout: 5))
        email.tap()
        email.typeText("shield-test-account1")
        let banner = app.staticTexts["demoBanner"]
        XCTAssertTrue(banner.appears(timeout: 5))
        XCTAssertEqual(banner.label, "Test account, sample activity")
        let check = app.buttons["Phone setup needs attention"]
        XCTAssertTrue(check.appears(timeout: 5))
        for _ in 0..<4 where !check.isHittable { app.swipeUp() }
        XCTAssertTrue(check.exists)
        XCTAssertFalse(app.buttons["Exit Demo"].exists)
        capture(app, name: "Test account")
        openSettings(app)
        let signOut = app.buttons["Sign out"]
        for _ in 0..<8 where !signOut.isHittable { app.swipeUp() }
        XCTAssertTrue(signOut.isHittable)
        XCTAssertFalse(app.buttons["Leave demo"].exists)
    }

    func testEmailSentShowsAddressOnceAndCanChangeIt() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-email-sent"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Check your email"].appears(timeout: 5))
        XCTAssertEqual(app.staticTexts.matching(identifier: "sign-in-address").count, 1)
        XCTAssertEqual(app.staticTexts["sign-in-address"].label, "Email sent to beta@example.com")
        XCTAssertFalse(app.textFields["Email address"].exists)
        XCTAssertFalse(app.buttons["Try sample app"].exists)
        XCTAssertTrue(app.buttons["Resend link"].exists)
        capture(app, name: "Email sent")
        app.buttons["Change email"].tap()
        XCTAssertTrue(app.textFields["Email address"].exists)
        XCTAssertEqual(app.textFields["Email address"].value as? String, "beta@example.com")
        XCTAssertTrue(app.buttons["sign-in-submit"].exists)
    }

    func testWelcomeAtLargestTextSize() {
        let app = XCUIApplication()
        app.launchArguments = ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        app.launch()
        XCTAssertTrue(app.textFields["Email address"].appears(timeout: 5))
        capture(app, name: "Welcome large text")
        let demo = app.buttons["Try sample app"]
        for _ in 0..<6 {
            if demo.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(demo.isHittable)
        capture(app, name: "Welcome large text controls")
        demo.tap()
        XCTAssertTrue(app.staticTexts["demoBanner"].appears(timeout: 5))
        capture(app, name: "Today large text")
    }

    func testProtectionOnboardingDefaultsOnAndContinues() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-protection-onboarding"]
        app.launch()
        let toggle = app.switches["onboarding-protection-toggle"]
        XCTAssertTrue(toggle.appears(timeout: 5))
        XCTAssertEqual(toggle.value as? String, "1")
        capture(app, name: "Onboarding protection default")
        app.buttons["onboarding-protection-continue"].tap()
        XCTAssertTrue(app.staticTexts["demoBanner"].appears(timeout: 5))
        XCTAssertFalse(toggle.exists)
    }

    func testProtectionOnboardingCanBeTurnedOff() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-protection-onboarding"]
        app.launch()
        let toggle = app.switches["onboarding-protection-toggle"]
        XCTAssertTrue(toggle.appears(timeout: 5))
        toggle.tap()
        XCTAssertEqual(toggle.value as? String, "0")
        app.buttons["onboarding-protection-continue"].tap()
        XCTAssertTrue(app.staticTexts["demoBanner"].appears(timeout: 5))
    }

    func testHelperAlertsAskedWithProtectionAndDefaultOn() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-protection-onboarding", "--uitesting-helper-alerts-onboarding"]
        app.launch()
        XCTAssertTrue(app.switches["onboarding-protection-toggle"].appears(timeout: 5))
        XCTAssertFalse(app.switches["onboarding-helper-alerts-toggle"].exists)
        app.buttons["onboarding-protection-continue"].tap()
        let helpers = app.switches["onboarding-helper-alerts-toggle"]
        XCTAssertTrue(helpers.appears(timeout: 3))
        XCTAssertFalse(app.switches["onboarding-protection-toggle"].exists)
        XCTAssertEqual(helpers.value as? String, "1")
        capture(app, name: "Onboarding helper alerts step")
        app.buttons["onboarding-protection-continue"].tap()
        XCTAssertTrue(app.staticTexts["demoBanner"].appears(timeout: 5))
    }

    func testHelperAlertsAskedAlone() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-helper-alerts-onboarding"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Let a helper know"].appears(timeout: 5))
        XCTAssertFalse(app.switches["onboarding-protection-toggle"].exists)
        let helpers = app.switches["onboarding-helper-alerts-toggle"]
        helpers.tap()
        XCTAssertEqual(helpers.value as? String, "0")
        app.buttons["onboarding-protection-continue"].tap()
        XCTAssertTrue(app.staticTexts["demoBanner"].appears(timeout: 5))
    }

    func testProtectionSaveFailureKeepsTheChoiceVisible() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-protection-onboarding", "--protection-save-fails"]
        app.launch()
        XCTAssertTrue(app.switches["onboarding-protection-toggle"].appears(timeout: 5))
        app.switches["onboarding-protection-toggle"].tap()
        app.buttons["onboarding-protection-continue"].tap()
        XCTAssertTrue(app.alerts["Couldn’t save your choice"].appears(timeout: 5))
        app.alerts.buttons["Cancel"].tap()
        XCTAssertEqual(app.switches["onboarding-protection-toggle"].value as? String, "0")
        XCTAssertFalse(app.staticTexts["demoBanner"].exists)
        XCTAssertTrue(app.buttons["onboarding-protection-continue"].isEnabled)
    }

    func testProtectionOnboardingLargestTextInDarkMode() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-protection-onboarding", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        app.launch()
        let toggle = app.switches["onboarding-protection-toggle"]
        XCTAssertTrue(toggle.appears(timeout: 5))
        let scroll = app.scrollViews.firstMatch
        let continueButton = app.buttons["onboarding-protection-continue"]
        for _ in 0..<8 {
            if toggle.isHittable && toggle.frame.minY >= scroll.frame.minY && toggle.frame.maxY <= continueButton.frame.minY { break }
            scroll.swipeUp()
        }
        XCTAssertTrue(toggle.isHittable)
        toggle.tap()
        XCTAssertEqual(toggle.value as? String, "0")
        for _ in 0..<8 where !continueButton.isHittable { scroll.swipeUp() }
        XCTAssertGreaterThanOrEqual(continueButton.frame.minY, toggle.frame.maxY)
        XCTAssertTrue(app.buttons["onboarding-protection-continue"].isHittable)
        capture(app, name: "Onboarding protection largest text dark")
    }

    private func openMore(_ app: XCUIApplication, _ title: String) {
        app.tabBars.buttons["More"].tap()
        for _ in 0..<4 {
            if app.navigationBars["More"].exists { break }
            app.navigationBars.buttons.firstMatch.tap()
        }
        let row = app.staticTexts[title].firstMatch
        for _ in 0..<5 { if row.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(row.appears(timeout: 5)); row.tap()
    }

    private func capture(_ app: XCUIApplication, name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    func testPreviewShowsHeldCallAndClearExplanation() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview"]
        app.launch()
        XCTAssertTrue(app.staticTexts["demoBanner"].appears(timeout: 5))
        capture(app, name: "Today")
        app.tabBars.buttons["Calls"].tap()
        XCTAssertTrue(app.navigationBars["Calls"].exists)
        XCTAssertTrue(app.segmentedControls["callFilter"].exists || app.buttons["callFilter"].exists)
        capture(app, name: "Calls")
        app.historyRow("Call stopped").tap()
        XCTAssertTrue(app.navigationBars["Call"].appears(timeout: 3))
        app.buttons["More about this call"].tap()
        XCTAssertTrue(app.staticTexts["The caller asked for a secret code. Shield didn’t connect the call."].exists)
    }

    func testBlockedNumbersShowsWhyAndAsksBeforeUnblocking() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview"]
        app.launch()
        XCTAssertTrue(app.staticTexts["demoBanner"].appears(timeout: 5))
        openSettings(app)
        let blocked = app.buttons["Blocked numbers"]
        for _ in 0..<4 where !blocked.isHittable { app.swipeUp() }
        blocked.tap()
        XCTAssertTrue(app.navigationBars["Blocked numbers"].appears(timeout: 3))
        let row = app.staticTexts["(312) 555-0199"]
        XCTAssertTrue(row.appears(timeout: 3))
        XCTAssertTrue(app.staticTexts["Scam call stopped"].exists)
        capture(app, name: "Blocked numbers")
        app.buttons["unblock-+13125550199"].tap()
        XCTAssertTrue(app.staticTexts["Shield can check future calls from this number. Only allow calls if you know who it belongs to."].appears(timeout: 3))
        capture(app, name: "Unblock confirmation")
        app.buttons["Allow calls again"].firstMatch.tap()
        XCTAssertTrue(app.staticTexts["No blocked numbers"].appears(timeout: 3))
    }

    func testProtectionCheckListsWhatNeedsAttention() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview", "--uitesting-protection-check"]
        app.launch()
        let title = app.buttons["Phone setup needs attention"]
        XCTAssertTrue(title.appears(timeout: 5))
        XCTAssertEqual(title.label, "Phone setup needs attention")
        title.tap()
        XCTAssertTrue(app.staticTexts["Call checks are paused"].exists)
        let contactFix = app.buttons["protection-fix-contact"]
        for _ in 0..<5 { if contactFix.isHittable { break }; app.collectionViews.firstMatch.swipeUp() }
        XCTAssertTrue(app.staticTexts["Save Shield in Contacts"].exists)
        XCTAssertTrue(app.buttons["protection-fix-contact"].exists)
        capture(app, name: "Phone setup needs attention")
    }

    func testProtectionCheckAllGoodAtLargestText() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview", "--uitesting-protection-check", "--protection-check-good",
                               "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        app.launch()
        XCTAssertTrue(app.navigationBars["Home"].appears(timeout: 5))
        // A successful setup check doesn't add a second status block to Home.
        XCTAssertFalse(app.buttons["Phone setup needs attention"].exists)
        capture(app, name: "Protection all good large text")
    }

    func testDiscardedScamHasNoPlaybackOrRestore() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview"]
        app.launch()
        app.tabBars.buttons["Calls"].tap()
        let removed = app.historyRow("Suspicious message removed")
        for _ in 0..<4 where !removed.isHittable { app.swipeUp() }
        removed.tap()
        XCTAssertTrue(app.navigationBars["Voicemail"].appears(timeout: 3))
        let label = app.staticTexts["Message removed"]
        for _ in 0..<4 where !label.isHittable { app.swipeUp() }
        XCTAssertTrue(label.exists)
        XCTAssertFalse(app.buttons["restore-voicemail"].exists)
        XCTAssertFalse(app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Play message'")).firstMatch.exists)
        capture(app, name: "Removed voicemail")
    }
    func testSavedNoticeHasSummaryAudioAndIndependentContactWithoutTranscript() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview"]
        app.launch()
        app.tabBars.buttons["Messages"].tap()
        XCTAssertTrue(app.navigationBars["Messages"].appears(timeout: 5))
        capture(app, name: "Messages inbox")
        app.historyRow("Saved account notice").tap()
        XCTAssertTrue(app.navigationBars["Saved notice"].appears(timeout: 5))
        XCTAssertTrue(app.staticTexts["message-summary"].exists)
        capture(app, name: "Saved notice summary")
        XCTAssertFalse(app.buttons["Transcript"].exists)
        XCTAssertFalse(app.staticTexts["message-transcript"].exists)
        XCTAssertTrue(app.buttons["Hear sample message"].isHittable)
        let trusted = app.buttons["Find a trusted number"].firstMatch
        for _ in 0..<5 where !trusted.isHittable { app.swipeUp() }
        XCTAssertTrue(trusted.exists)
        capture(app, name: "Saved notice audio and independent contact")
    }
    func testSavedNoticeAtLargestTextInDarkMode() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        app.launch()
        app.tabBars.buttons["Messages"].tap()
        let notice = app.historyRow("Saved account notice")
        XCTAssertTrue(notice.appears(timeout: 5))
        capture(app, name: "Messages inbox large dark")
        notice.tap()
        XCTAssertTrue(app.navigationBars["Saved notice"].appears(timeout: 5))
        capture(app, name: "Saved notice large dark")
        let summary = app.staticTexts["message-summary"].firstMatch
        let list = app.collectionViews.firstMatch
        let top = app.navigationBars["Saved notice"].frame.maxY
        let bottom = app.buttons["Hear sample message"].frame.minY
        let origin = app.coordinate(withNormalizedOffset: .zero)
        let start = origin.withOffset(CGVector(dx: list.frame.midX, dy: top + (bottom - top) * 0.65))
        let end = origin.withOffset(CGVector(dx: list.frame.midX, dy: top + (bottom - top) * 0.5))
        for _ in 0..<24 {
            if summary.exists, summary.isHittable, summary.frame.minY >= top + 8, summary.frame.minY < bottom - 100 { break }
            start.press(forDuration: 0.2, thenDragTo: end, withVelocity: .slow, thenHoldForDuration: 0.2)
        }
        XCTAssertTrue(summary.exists)
        XCTAssertFalse(app.buttons["Transcript"].exists)
        XCTAssertTrue(app.buttons["Hear sample message"].isHittable)
        capture(app, name: "Saved notice summary large dark")
    }

    func testHelperCannotUnblockOrChooseHelperAlerts() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview"]
        app.launch()
        openMore(app, "Family & friends")
        XCTAssertTrue(app.buttons["person-Alex"].appears(timeout: 5))
        app.buttons["person-Alex"].tap()
        app.tabBars.buttons["Home"].tap()
        openSettings(app)
        XCTAssertFalse(app.switches["helper-alerts-toggle"].exists)
        let blocked = app.buttons["Blocked numbers"]
        for _ in 0..<4 where !blocked.isHittable { app.swipeUp() }
        blocked.tap()
        let row = app.staticTexts["(312) 555-0199"]
        XCTAssertTrue(row.appears(timeout: 3))
        app.buttons["About blocked numbers"].tap()
        XCTAssertTrue(app.staticTexts["Only the person using Shield can allow calls again."].exists)
        XCTAssertFalse(app.buttons["unblock-+13125550199"].exists)
        row.swipeLeft()
        XCTAssertFalse(app.buttons["Allow calls again"].exists)
    }

    private func openSettings(_ app: XCUIApplication) {
        openMore(app, "Settings")
        XCTAssertTrue(app.navigationBars["Settings"].appears(timeout: 3))
    }

    func testPreviewCanSwitchPeople() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview"]
        app.launch()
        openMore(app, "Family & friends")
        XCTAssertTrue(app.staticTexts["Pat"].appears(timeout: 5))
        XCTAssertTrue(app.staticTexts["Alex"].exists)
        app.buttons["person-Alex"].tap()
        XCTAssertTrue(app.staticTexts["Only they can change their phone settings."].appears(timeout: 3))
        XCTAssertFalse(app.staticTexts["Your helpers"].exists)
    }
}
