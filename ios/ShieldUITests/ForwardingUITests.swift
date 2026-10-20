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
        let retention = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "The cloud audio copy is deleted after verified delivery")).firstMatch
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
        // Returning from Settings keeps the recovery action outside the help
        // disclosure. Reopening help must not hide it or certify the setting.
        XCTAssertTrue(app.buttons["phone-settings-reopen"].exists)
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
        XCTAssertFalse(app.buttons["Copy phone code"].exists)
        app.buttons["disconnect-continue"].tap()
        expect(app, "Bring calls back to your phone")
        let disclosure = app.buttons["See the code"]
        let action = app.buttons["disconnect-continue"]
        for _ in 0..<8 {
            if disclosure.exists && disclosure.isHittable && disclosure.frame.maxY < action.frame.minY { break }
            app.scrollViews.firstMatch.swipeUp()
        }
        XCTAssertTrue(disclosure.isHittable)
        XCTAssertLessThan(disclosure.frame.maxY, action.frame.minY)
        disclosure.tap()
        let resetCode = app.staticTexts["##61#"]
        for _ in 0..<5 where !resetCode.isHittable { app.scrollViews.firstMatch.swipeUp() }
        capture(app, "Restoration code disclosure")
        XCTAssertTrue(resetCode.appears(timeout: 5))
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
        let reopen = app.buttons["phone-settings-reopen"]
        let primary = app.buttons["forwarding-continue"]
        // Native hittability alone can include a row covered by the pinned action.
        for _ in 0..<8 {
            if reopen.exists && reopen.frame.maxY < primary.frame.minY && reopen.isHittable { break }
            app.scrollViews.firstMatch.swipeUp()
        }
        XCTAssertLessThan(reopen.frame.maxY, primary.frame.minY)
        reopen.tap()
        XCTAssertEqual(primary.label, "I selected Silence")
        for _ in 0..<8 where !app.staticTexts["Change Phone settings"].exists { app.scrollViews.firstMatch.swipeDown() }
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
        let next = app.buttons["disconnect-continue"]
        next.tap()
        for _ in 0..<3 {
            XCTAssertEqual(next.label, "Copy phone code")
            next.tap()
            XCTAssertEqual(next.label, "My carrier confirmed the change")
            capture(app, "Disconnect carrier confirmation")
            next.tap()
        }
        expect(app, "Let ordinary calls ring")
        XCTAssertFalse(app.staticTexts["restoration-complete"].exists)
    }

    func testRestorationGuidesAlreadyDoneSettingsAndPersistsChecks() {
        var app = launch(["--forwarding-start-restore", "--restoration-start-settings"], title: "Let ordinary calls ring")
        XCTAssertFalse(app.staticTexts["restoration-complete"].exists)
        app.buttons["restoration-settings-open"].tap()
        XCTAssertEqual(app.buttons["disconnect-continue"].label, "I selected Never")
        app.buttons["disconnect-continue"].tap()
        expect(app, "Check carrier voicemail next")
        app.terminate()
        app = launch(["--forwarding-start-restore", "--restoration-resume"], title: "Check carrier voicemail next")
        XCTAssertEqual(app.buttons["disconnect-continue"].label, "Live Voicemail is off")
        app.buttons["disconnect-continue"].tap()
        expect(app, "Check that calls reach you")
        app.buttons["disconnect-continue"].tap()
        expect(app, "Check your normal voicemail")
        app.terminate()
        app = launch(["--forwarding-start-restore", "--restoration-resume"], title: "Check your normal voicemail")
        XCTAssertFalse(app.staticTexts["restoration-complete"].exists)
        app.buttons["disconnect-continue"].tap()
        XCTAssertTrue(app.staticTexts["restoration-complete"].appears(timeout: 5))
        capture(app, "Disconnect completed")
    }

    func testRestorationSettingsAtLargestTextInDarkMode() {
        let app = launch(["--forwarding-start-restore", "--restoration-start-settings", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"], title: "Let ordinary calls ring")
        let confirm = app.buttons["disconnect-continue"]
        for _ in 0..<12 where !confirm.isHittable { app.scrollViews.firstMatch.swipeUp() }
        XCTAssertTrue(confirm.isHittable)
        capture(app, "Disconnect settings largest text dark")
        confirm.tap()
        expect(app, "Check carrier voicemail next")
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
