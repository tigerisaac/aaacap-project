import XCTest

@MainActor
final class ShieldUITests: XCTestCase {
    func testWelcomeEmailValidationAndDemoEntry() {
        let app = XCUIApplication()
        app.launch()
        let email = app.textFields["Email address"]
        XCTAssertTrue(email.waitForExistence(timeout: 5))
        let continueButton = app.buttons["Continue"]
        XCTAssertFalse(continueButton.isEnabled)
        capture(app, name: "Welcome")
        email.tap()
        email.typeText("hello")
        XCTAssertFalse(continueButton.isEnabled)
        email.typeText("@example.com")
        XCTAssertTrue(continueButton.isEnabled)
        capture(app, name: "Welcome with keyboard")
        app.swipeUp()
        let demo = app.buttons["View demo"]
        if !demo.isHittable { app.swipeUp() }
        demo.tap()
        XCTAssertTrue(app.staticTexts["demoBanner"].waitForExistence(timeout: 5))
    }

    func testEmailSentShowsAddressOnceAndCanChangeIt() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-email-sent"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Check your email"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts.matching(identifier: "beta@example.com").count, 1)
        XCTAssertFalse(app.textFields["Email address"].exists)
        XCTAssertFalse(app.buttons["View demo"].exists)
        XCTAssertTrue(app.buttons["Resend link"].exists)
        capture(app, name: "Email sent")
        app.buttons["Change email"].tap()
        XCTAssertTrue(app.textFields["Email address"].exists)
        XCTAssertEqual(app.textFields["Email address"].value as? String, "beta@example.com")
        XCTAssertTrue(app.buttons["Continue"].exists)
    }

    func testWelcomeAtLargestTextSize() {
        let app = XCUIApplication()
        app.launchArguments = ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        app.launch()
        XCTAssertTrue(app.textFields["Email address"].waitForExistence(timeout: 5))
        capture(app, name: "Welcome large text")
        let demo = app.buttons["View demo"]
        for _ in 0..<6 {
            if demo.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(demo.isHittable)
        capture(app, name: "Welcome large text controls")
        demo.tap()
        XCTAssertTrue(app.staticTexts["demoBanner"].waitForExistence(timeout: 5))
        capture(app, name: "Today large text")
    }

    func testProtectionOnboardingDefaultsOnAndContinues() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-protection-onboarding"]
        app.launch()
        let toggle = app.switches["onboarding-protection-toggle"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 5))
        XCTAssertEqual(toggle.value as? String, "1")
        capture(app, name: "Onboarding protection default")
        app.buttons["onboarding-protection-continue"].tap()
        XCTAssertTrue(app.staticTexts["demoBanner"].waitForExistence(timeout: 5))
        XCTAssertFalse(toggle.exists)
    }

    func testProtectionOnboardingCanBeTurnedOff() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-protection-onboarding"]
        app.launch()
        let toggle = app.switches["onboarding-protection-toggle"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 5))
        toggle.tap()
        XCTAssertEqual(toggle.value as? String, "0")
        app.buttons["onboarding-protection-continue"].tap()
        XCTAssertTrue(app.staticTexts["demoBanner"].waitForExistence(timeout: 5))
    }

    func testHelperAlertsAskedWithProtectionAndDefaultOn() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-protection-onboarding", "--uitesting-helper-alerts-onboarding"]
        app.launch()
        XCTAssertTrue(app.switches["onboarding-protection-toggle"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.switches["onboarding-helper-alerts-toggle"].exists)
        app.buttons["onboarding-protection-continue"].tap()
        let helpers = app.switches["onboarding-helper-alerts-toggle"]
        XCTAssertTrue(helpers.waitForExistence(timeout: 3))
        XCTAssertFalse(app.switches["onboarding-protection-toggle"].exists)
        XCTAssertEqual(helpers.value as? String, "1")
        capture(app, name: "Onboarding helper alerts step")
        app.buttons["onboarding-protection-continue"].tap()
        XCTAssertTrue(app.staticTexts["demoBanner"].waitForExistence(timeout: 5))
    }

    func testHelperAlertsAskedAlone() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-helper-alerts-onboarding"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Alerts for your helpers"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.switches["onboarding-protection-toggle"].exists)
        let helpers = app.switches["onboarding-helper-alerts-toggle"]
        helpers.tap()
        XCTAssertEqual(helpers.value as? String, "0")
        app.buttons["onboarding-protection-continue"].tap()
        XCTAssertTrue(app.staticTexts["demoBanner"].waitForExistence(timeout: 5))
    }

    func testProtectionSaveFailureKeepsTheChoiceVisible() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-protection-onboarding", "--protection-save-fails"]
        app.launch()
        XCTAssertTrue(app.switches["onboarding-protection-toggle"].waitForExistence(timeout: 5))
        app.switches["onboarding-protection-toggle"].tap()
        app.buttons["onboarding-protection-continue"].tap()
        XCTAssertTrue(app.alerts["Couldn’t save your choice"].waitForExistence(timeout: 5))
        app.alerts.buttons["OK"].tap()
        XCTAssertEqual(app.switches["onboarding-protection-toggle"].value as? String, "0")
        XCTAssertFalse(app.staticTexts["demoBanner"].exists)
        XCTAssertTrue(app.buttons["onboarding-protection-continue"].isEnabled)
    }

    func testProtectionOnboardingLargestTextInDarkMode() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-protection-onboarding", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        app.launch()
        let toggle = app.switches["onboarding-protection-toggle"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 5))
        let scroll = app.scrollViews.firstMatch
        let continueButton = app.buttons["onboarding-protection-continue"]
        for _ in 0..<8 {
            if toggle.isHittable && toggle.frame.minY >= scroll.frame.minY && toggle.frame.maxY <= continueButton.frame.minY { break }
            scroll.swipeUp()
        }
        XCTAssertTrue(toggle.isHittable)
        toggle.tap()
        XCTAssertEqual(toggle.value as? String, "0")
        XCTAssertTrue(app.buttons["onboarding-protection-continue"].isHittable)
        capture(app, name: "Onboarding protection largest text dark")
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
        XCTAssertTrue(app.staticTexts["demoBanner"].waitForExistence(timeout: 5))
        capture(app, name: "Today")
        app.tabBars.buttons["Calls"].tap()
        XCTAssertTrue(app.navigationBars["Calls"].exists)
        XCTAssertTrue(app.buttons["callFilter"].exists)
        capture(app, name: "Calls")
        app.staticTexts["Call held for review"].firstMatch.tap()
        XCTAssertTrue(app.navigationBars["Call details"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.staticTexts["The introduction included a request for a security code. This call was not connected."].exists)
    }

    func testBlockedNumbersShowsWhyAndAsksBeforeUnblocking() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview"]
        app.launch()
        XCTAssertTrue(app.staticTexts["demoBanner"].waitForExistence(timeout: 5))
        openSettings(app)
        let blocked = app.buttons["Blocked numbers"]
        for _ in 0..<4 where !blocked.isHittable { app.swipeUp() }
        blocked.tap()
        XCTAssertTrue(app.navigationBars["Blocked numbers"].waitForExistence(timeout: 3))
        let row = app.staticTexts["+13125550199"]
        XCTAssertTrue(row.waitForExistence(timeout: 3))
        XCTAssertTrue(app.staticTexts["Shield stopped a scam call from this number"].exists)
        capture(app, name: "Blocked numbers")
        app.buttons["unblock-+13125550199"].tap()
        XCTAssertTrue(app.staticTexts["Its next call will be screened again. Only unblock a number you know belongs to someone you trust."].waitForExistence(timeout: 3))
        capture(app, name: "Unblock confirmation")
        app.buttons["Unblock"].firstMatch.tap()
        XCTAssertTrue(app.staticTexts["No blocked numbers"].waitForExistence(timeout: 3))
    }

    func testProtectionCheckListsWhatNeedsAttention() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview", "--uitesting-protection-check"]
        app.launch()
        let title = app.staticTexts["protection-check-title"]
        XCTAssertTrue(title.waitForExistence(timeout: 5))
        XCTAssertEqual(title.label, "Protection needs attention")
        XCTAssertTrue(app.staticTexts["Protection is paused"].exists)
        XCTAssertTrue(app.staticTexts["Shield’s number isn’t in your Contacts"].exists)
        XCTAssertTrue(app.buttons["protection-fix-contact"].exists)
        capture(app, name: "Protection needs attention")
    }

    func testProtectionCheckReportsAFailedDailyCheckCall() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview", "--uitesting-protection-check", "--protection-check-call-failed"]
        app.launch()
        XCTAssertTrue(app.staticTexts["protection-check-title"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Unknown callers are ringing your phone"].exists)
        XCTAssertTrue(app.buttons["Open setup"].exists)
    }

    func testProtectionCheckAllGoodAtLargestText() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview", "--uitesting-protection-check", "--protection-check-good",
                               "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        app.launch()
        let title = app.staticTexts["protection-check-title"]
        XCTAssertTrue(title.waitForExistence(timeout: 5))
        XCTAssertEqual(title.label, "Protection is on")
        capture(app, name: "Protection all good large text")
    }

    func testRemovedVoicemailCannotPlayAndOffersRestore() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview"]
        app.launch()
        app.tabBars.buttons["Calls"].tap()
        let removed = app.staticTexts["Scam voicemail removed"].firstMatch
        for _ in 0..<4 where !removed.isHittable { app.swipeUp() }
        removed.tap()
        XCTAssertTrue(app.navigationBars["Call details"].waitForExistence(timeout: 3))
        let label = app.staticTexts["Removed by Shield"]
        for _ in 0..<4 where !label.isHittable { app.swipeUp() }
        XCTAssertTrue(label.exists)
        XCTAssertTrue(app.buttons["restore-voicemail"].exists)
        XCTAssertFalse(app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Play message'")).firstMatch.exists)
        capture(app, name: "Removed voicemail")
    }

    func testHelperCannotUnblockOrChooseHelperAlerts() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview"]
        app.launch()
        app.tabBars.buttons["People"].tap()
        XCTAssertTrue(app.buttons["person-Alex"].waitForExistence(timeout: 5))
        app.buttons["person-Alex"].tap()
        app.tabBars.buttons["Today"].tap()
        openSettings(app)
        XCTAssertFalse(app.switches["helper-alerts-toggle"].exists)
        let blocked = app.buttons["Blocked numbers"]
        for _ in 0..<4 where !blocked.isHittable { app.swipeUp() }
        blocked.tap()
        let row = app.staticTexts["+13125550199"]
        XCTAssertTrue(row.waitForExistence(timeout: 3))
        XCTAssertTrue(app.staticTexts["Shield ends calls from these numbers without screening them. Only the person Shield protects can unblock a number."].exists)
        XCTAssertFalse(app.buttons["unblock-+13125550199"].exists)
        row.swipeLeft()
        XCTAssertFalse(app.buttons["Unblock"].exists)
    }

    func testQuietHoursIsInSettingsAndExplainsContactsStillRing() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview"]
        app.launch()
        XCTAssertTrue(app.staticTexts["demoBanner"].waitForExistence(timeout: 5))
        openSettings(app)
        app.buttons["Quiet hours"].tap()
        XCTAssertTrue(app.navigationBars["Quiet hours"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.switches["quiet-hours-toggle"].exists)
        XCTAssertFalse(app.switches["quiet-hours-toggle"].isEnabled)
        capture(app, name: "Quiet hours")
    }

    private func openSettings(_ app: XCUIApplication) {
        let settings = app.buttons["Settings"].firstMatch
        for _ in 0..<6 where !settings.isHittable { app.swipeUp() }
        settings.tap()
        XCTAssertTrue(app.navigationBars["Settings"].waitForExistence(timeout: 3))
    }

    func testPreviewCanSwitchPeople() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-preview"]
        app.launch()
        app.tabBars.buttons["People"].tap()
        XCTAssertTrue(app.staticTexts["Pat"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Alex"].exists)
        app.buttons["person-Alex"].tap()
        XCTAssertTrue(app.staticTexts["Phone settings stay with the participant."].waitForExistence(timeout: 3))
        XCTAssertFalse(app.staticTexts["Share with someone"].exists)
    }
}
