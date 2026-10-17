import XCTest

@MainActor
final class ForwardingUITests: XCTestCase {
    func testProvidersAreDisclosedBeforeForwardingConsent() {
        let app = launch()
        tapPrimary(app); expect(app, "Choose Shield for calls")
        let providers = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Soniox transcribes the caller’s speech")).firstMatch
        XCTAssertTrue(providers.exists)
        // Provider disclosure is outside the optional details, before the agreement action.
        XCTAssertTrue(app.staticTexts["I agree to send forwarded calls to Telnyx, Soniox and OpenAI for screening and message processing."].exists)
        capture(app, "Forwarding provider consent")
        app.buttons["More before you agree"].tap()
        let retention = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "The cloud audio copy is deleted after delivery")).firstMatch
        for _ in 0..<8 where !retention.isHittable { app.swipeUp() }
        XCTAssertTrue(retention.exists)
        capture(app, "Forwarding retention details")
    }

    func testGuidedFlowRequiresRealCheckResultsAndPreparesEachCarrierCode() {
        let app = launch()
        capture(app, "Guided welcome")
        tapPrimary(app); expect(app, "Choose Shield for calls")
        capture(app, "Guided consent light")
        tapPrimary(app); expect(app, "Add Shield to Contacts")
        capture(app, "Guided contact light")
        tapPrimary(app); expect(app, "Can you hear Shield?")
        capture(app, "Guided sound check light")
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        tapPrimary(app)
        XCTAssertTrue(app.staticTexts["forwarding-probe-passed"].appears(timeout: 5))
        tapPrimary(app); expect(app, "Let iPhone lend a hand")
        capture(app, "Guided helper installation light")
        tapPrimary(app); expect(app, "Turn off Live Voicemail")
        capture(app, "Guided phone settings light")
        tapPrimary(app)
        app.buttons["Need help?"].tap()
        XCTAssertTrue(app.buttons["phone-settings-reopen"].exists)
        app.buttons["Need help?"].tap()
        tapPrimary(app); expect(app, "Confirm Live Voicemail")
        capture(app, "Guided voicemail setting light")
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Live Voicemail is off")
        XCTAssertFalse(app.buttons["phone-settings-reopen"].exists)
        app.buttons["Need help?"].tap()
        XCTAssertTrue(app.buttons["phone-settings-reopen"].exists)
        app.buttons["Need help?"].tap()
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Live Voicemail is off")
        tapPrimary(app)
        for index in 1...3 {
            expect(app, "Connect calls to Shield")
            XCTAssertEqual(app.staticTexts["forwarding-code-sequence"].label, "Code \(index) of 3")
            XCTAssertEqual(app.buttons["forwarding-continue"].label, "Copy setup code")
            tapPrimary(app)
            XCTAssertTrue(app.staticTexts["forwarding-code-copied"].exists)
            XCTAssertEqual(app.buttons["forwarding-continue"].label, "Open Phone")
            capture(app, "Guided carrier code \(index) ready")
            tapPrimary(app)
            XCUIDevice.shared.press(.home); app.activate()
            expect(app, "Check Tello’s result")
            tapPrimary(app)
        }
        expect(app, "Check that calls reach Shield")
        capture(app, "Guided forwarding check light")
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        tapPrimary(app)
        XCTAssertTrue(app.staticTexts["forwarding-probe-passed"].appears(timeout: 5))
        capture(app, "Automatic forwarding result")
        tapPrimary(app); expect(app, "Your setup is done")
        XCTAssertFalse(app.staticTexts["Phone setup tested"].exists)
    }
    func testDoneLeavesSetupAndRestorationRemainsSeparate() {
        let app = launch(["--forwarding-start-checks", "--forwarding-navigation-test"], title: "Your setup is done")
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Done")
        XCTAssertTrue(app.staticTexts["A call reached Shield"].exists)
        capture(app, "Setup completion")
        tapPrimary(app)
        XCTAssertTrue(app.buttons["forwarding-preview-home"].appears(timeout: 5))
        XCTAssertFalse(app.buttons["Start disconnecting"].exists)
        XCTAssertFalse(app.staticTexts["forwarding-reset-code"].exists)
        app.buttons["forwarding-preview-home"].tap()
        expect(app, "Your setup is done")
        app.buttons["Setup options"].tap()
        app.buttons["Disconnect Shield"].tap()
        XCTAssertTrue(app.buttons["Start disconnecting"].appears(timeout: 5))
        app.buttons["Start disconnecting"].tap()
        expect(app, "Bring back ordinary calls")
        app.buttons["See copied code"].tap()
        XCTAssertEqual(app.staticTexts["forwarding-reset-code"].label, "##61#")
    }

    func testFailedSoundCheckShowsRetryAndDoesNotAdvance() {
        let app = launch(["--forwarding-test-fails"])
        for _ in 0..<3 { tapPrimary(app) }
        tapPrimary(app)
        XCTAssertTrue(app.staticTexts["This check didn’t finish"].appears(timeout: 5))
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Try the call again")
        XCTAssertFalse(app.staticTexts["Change Phone settings"].exists)
        capture(app, "Call check recovery")
    }
    func testLargestTextContactsFailureIsVisibleWithoutAdvancing() {
        let app = launch(["--forwarding-save-fails", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        tapPrimary(app); tapPrimary(app)
        expect(app, "Add Shield to Contacts")
        tapPrimary(app)
        let error = app.staticTexts["forwarding-error"]
        XCTAssertTrue(error.appears(timeout: 5))
        let visible = NSPredicate { _, _ in error.isHittable && error.frame.minY >= app.navigationBars.firstMatch.frame.maxY }
        expectation(for: visible, evaluatedWith: error)
        waitForExpectations(timeout: 5)
        let settings = app.descendants(matching: .any).matching(identifier: "Allow Contacts in Settings").firstMatch
        for _ in 0..<5 {
            if settings.exists && settings.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(settings.isHittable)
        XCTAssertFalse(app.staticTexts["Can you hear Shield?"].exists)
        capture(app, "Contact save error large dark")
    }
    func testLargestTextKeepsActionsVisibleAndInstructionsScrollable() {
        let app = launch(["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        capture(app, "Guided welcome large text")
        tapPrimary(app)
        expect(app, "Choose Shield for calls")
        capture(app, "Consent large text before reading")
        for _ in 0..<12 where !app.buttons["forwarding-continue"].isHittable {
            app.scrollViews.firstMatch.swipeUp()
        }
        capture(app, "Consent large text after reading")
        XCTAssertTrue(app.buttons["forwarding-continue"].isHittable)
    }
    func testDarkAppearance() {
        let app = launch(["--uitesting-dark"])
        capture(app, "Guided welcome dark")
        tapPrimary(app); tapPrimary(app)
        capture(app, "Contact dark")
    }
    func testSettingsReturnDoesNotConfirmSwitchesAndCanReopen() {
        let app = launch(["--forwarding-start-settings", "--forwarding-manual-settings"], title: "Change Phone settings")
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Open Phone settings")
        capture(app, "Phone setting shortcut")
        tapPrimary(app)
        app.buttons["Read the steps"].tap()
        XCTAssertTrue(app.buttons["phone-settings-reopen"].exists)
        app.buttons["Read the steps"].tap()
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "I selected Silence")
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        app.buttons["Read the steps"].tap()
        app.buttons["phone-settings-reopen"].tap()
        expect(app, "Change Phone settings")
        capture(app, "Phone setting return")
    }
    func testSettingsFallbackKeepsProgressAndInstructionsAvailable() {
        let app = launch(["--forwarding-start-settings", "--forwarding-manual-settings", "--settings-link-fails"], title: "Change Phone settings")
        tapPrimary(app)
        XCTAssertTrue(app.staticTexts["phone-settings-navigation"].label.contains("finger up"))
        app.buttons["Read the steps"].tap()
        XCTAssertTrue(app.buttons["phone-settings-reopen"].exists)
        app.buttons["Read the steps"].tap()
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "I selected Silence")
        tapPrimary(app)
        expect(app, "Turn off Live Voicemail")
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Open Phone settings")
        tapPrimary(app)
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Live Voicemail is off")
    }
    func testCopyRequiresCarrierConfirmationAndResetsForNextCode() {
        let app = launch(["--forwarding-start-code"], title: "Connect calls to Shield")
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Copy setup code")
        tapPrimary(app)
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Open Phone")
        XCUIDevice.shared.press(.home); app.activate()
        XCTAssertFalse(app.staticTexts["forwarding-carrier-result"].exists)
        tapPrimary(app)
        XCUIDevice.shared.press(.home); app.activate()
        expect(app, "Check Tello’s result")
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Tello confirmed the change")
        tapPrimary(app)
        expect(app, "Connect calls to Shield")
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Copy setup code")
        XCTAssertFalse(app.staticTexts["forwarding-code-copied"].exists)
        app.buttons["See setup code"].tap()
        XCTAssertEqual(app.staticTexts["forwarding-code"].label, "**67*12025550100#")
        app.terminate()
        let resumed = launch(["--forwarding-start-code"], title: "Connect calls to Shield")
        XCTAssertEqual(resumed.buttons["forwarding-continue"].label, "Copy setup code")
        XCTAssertFalse(resumed.staticTexts["Check that calls reach Shield"].exists)
    }
    func testRestorationPreparesEachResetWithoutAdvancingUntilConfirmed() {
        let app = launch(["--forwarding-start-restore"], title: "Bring back ordinary calls")
        app.buttons["See copied code"].tap()
        XCTAssertTrue(app.staticTexts["forwarding-reset-code"].appears(timeout: 5))
        XCTAssertEqual(app.staticTexts["forwarding-reset-code"].label, "##61#")
        XCTAssertEqual(app.buttons["forwarding-reset-continue"].label, "Tello confirmed this reset")
        // Optional help sits below the action; scroll it clear of the home indicator first.
        app.scrollViews.firstMatch.swipeUp()
        app.buttons["Need help?"].tap()
        app.buttons["forwarding-reset-copy"].tap()
        XCTAssertEqual(app.staticTexts["forwarding-reset-code"].label, "##61#")
        app.buttons["forwarding-reset-continue"].tap()
        XCTAssertEqual(app.staticTexts["forwarding-reset-code"].label, "##67#")
        XCTAssertEqual(app.buttons["forwarding-reset-continue"].label, "Tello confirmed this reset")
        app.buttons["forwarding-reset-continue"].tap()
        XCTAssertEqual(app.staticTexts["forwarding-reset-code"].label, "##62#")
        app.buttons["forwarding-reset-continue"].tap()
        expect(app, "Let ordinary calls ring")
        XCTAssertFalse(app.staticTexts["forwarding-reset-code"].exists)
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
    }

    func testRestorationGuidesAlreadyDoneSettingsAndPersistsChecks() {
        var app = launch(["--forwarding-start-restore", "--restoration-start-settings"], title: "Bring back ordinary calls")
        expect(app, "Let ordinary calls ring")
        XCTAssertFalse(app.staticTexts["restoration-complete"].exists)
        app.buttons["restoration-settings-open"].tap()
        expect(app, "Let ordinary calls ring")
        XCTAssertEqual(app.buttons["restoration-settings-confirm"].label, "I selected Never")
        XCTAssertFalse(app.staticTexts["Restore iPhone voicemail"].exists)
        app.buttons["restoration-settings-confirm"].tap()
        expect(app, "Restore iPhone voicemail")
        app.terminate()
        app = launch(["--forwarding-start-restore", "--restoration-resume"], title: "Bring back ordinary calls")
        expect(app, "Restore iPhone voicemail")
        XCTAssertEqual(app.buttons["restoration-settings-confirm"].label, "Live Voicemail is on")
        app.buttons["restoration-settings-confirm"].tap()
        expect(app, "Check that calls reach you")
        XCTAssertFalse(app.staticTexts["restoration-complete"].exists)
        app.buttons["restoration-call-confirm"].tap()
        expect(app, "Check your normal voicemail")
        app.terminate()
        app = launch(["--forwarding-start-restore", "--restoration-resume"], title: "Bring back ordinary calls")
        expect(app, "Check your normal voicemail")
        XCTAssertFalse(app.staticTexts["restoration-complete"].exists)
        app.buttons["restoration-call-confirm"].tap()
        XCTAssertTrue(app.staticTexts["restoration-complete"].appears(timeout: 5))
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        capture(app, "Restoration checklist complete")
    }

    func testRestorationSettingsAtLargestTextInDarkMode() {
        let app = launch(["--forwarding-start-restore", "--restoration-start-settings", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"], title: "Bring back ordinary calls")
        let confirm = app.buttons["restoration-settings-confirm"]
        for _ in 0..<8 where !confirm.isHittable { app.scrollViews.firstMatch.swipeUp() }
        XCTAssertTrue(confirm.isHittable)
        capture(app, "Restoration settings largest text dark")
        confirm.tap()
        expect(app, "Restore iPhone voicemail")
        XCTAssertFalse(app.staticTexts["restoration-complete"].exists)
    }

    func testReturningChangesInstructionsButNeverConfirmsCarrierChange() {
        let app = launch(["--forwarding-start-code"], title: "Connect calls to Shield")
        tapPrimary(app); tapPrimary(app)
        XCUIDevice.shared.press(.home); app.activate()
        XCTAssertTrue(app.staticTexts["forwarding-carrier-result"].appears(timeout: 5))
        XCTAssertTrue(app.staticTexts["Check Tello’s result"].exists)
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Tello confirmed the change")
        app.buttons["Need help?"].tap()
        app.buttons["forwarding-phone-reopen"].tap()
        XCTAssertFalse(app.staticTexts["forwarding-carrier-result"].exists)
        XCTAssertTrue(app.staticTexts["Connect calls to Shield"].exists)
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Open Phone")
        capture(app, "Phone return and retry")
    }

    func testCarrierCodeAtLargestTextInDarkMode() {
        let app = launch(["--forwarding-start-code", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"], title: "Connect calls to Shield")
        for _ in 0..<12 where !app.buttons["forwarding-continue"].isHittable { app.scrollViews.firstMatch.swipeUp() }
        XCTAssertTrue(app.buttons["forwarding-continue"].isHittable)
        app.buttons["forwarding-continue"].tap()
        app.scrollViews.firstMatch.swipeDown()
        app.scrollViews.firstMatch.swipeDown()
        let codeDisclosure = app.buttons["See setup code"]
        for _ in 0..<8 where !codeDisclosure.isHittable { app.scrollViews.firstMatch.swipeUp() }
        codeDisclosure.tap()
        XCTAssertEqual(app.staticTexts["forwarding-code"].label, "**61*12025550100#")
        let help = app.buttons["Need help?"]
        for _ in 0..<8 where !help.isHittable { app.scrollViews.firstMatch.swipeUp() }
        help.tap()
        let retry = app.buttons["forwarding-phone-reopen"]
        for _ in 0..<6 where !retry.isHittable { app.scrollViews.firstMatch.swipeUp() }
        XCTAssertTrue(retry.isHittable)
        capture(app, "Carrier code largest text dark")
    }

    private func launch(_ extra: [String] = [], title: String = "Set up your phone") -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting-forwarding"] + extra
        app.launch(); expect(app, title); return app
    }
    private func expect(_ app: XCUIApplication, _ text: String) {
        XCTAssertTrue(app.staticTexts[text].appears(timeout: 5))
    }
    private func tapPrimary(_ app: XCUIApplication) {
        let button = app.buttons["forwarding-continue"]
        XCTAssertTrue(button.appears(timeout: 5))
        for _ in 0..<12 where !button.isHittable { app.scrollViews.firstMatch.swipeUp() }
        XCTAssertTrue(button.isHittable); button.tap()
    }
    private func capture(_ app: XCUIApplication, _ name: String) {
        Thread.sleep(forTimeInterval: 0.8)
        let screenshot = app.screenshot()
        let shot = XCTAttachment(screenshot: screenshot); shot.name = name; shot.lifetime = .keepAlways; add(shot)
        do {
            let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("SeniorScreens")
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            try screenshot.pngRepresentation.write(to: directory.appendingPathComponent(name.replacingOccurrences(of: " ", with: "-") + ".png"))
        } catch { XCTFail("Couldn’t save simulator capture: \(error.localizedDescription)") }

    }
}
