import XCTest

@MainActor
final class ForwardingUITests: XCTestCase {
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
        tapPrimary(app); expect(app, "Screen Unknown Callers")
        capture(app, "Guided phone settings light")
        tapPrimary(app)
        XCTAssertTrue(app.buttons["phone-settings-reopen"].exists)
        tapPrimary(app); expect(app, "Live Voicemail")
        capture(app, "Guided voicemail setting light")
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Open Phone settings")
        XCTAssertFalse(app.buttons["phone-settings-reopen"].exists)
        tapPrimary(app)
        XCTAssertTrue(app.buttons["phone-settings-reopen"].exists)
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Live Voicemail is off")
        tapPrimary(app)
        for title in ["When you don’t answer", "When you’re on a call", "When there’s no signal"] {
            expect(app, title)
            app.buttons["See copied code"].tap()
            XCTAssertTrue(app.staticTexts["forwarding-code"].exists)
            XCTAssertTrue(app.staticTexts["Code copied"].appears(timeout: 5))
            app.buttons["See copied code"].tap()
            XCTAssertTrue(app.buttons["Need help?"].isHittable)
            XCTAssertTrue(app.buttons["forwarding-continue"].isHittable)
            capture(app, "Guided \(title) light")
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
        XCTAssertFalse(app.staticTexts["Screen Unknown Callers"].exists)
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
        let app = launch(["--forwarding-start-settings"], title: "Screen Unknown Callers")
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Open Phone settings")
        capture(app, "Phone setting shortcut")
        tapPrimary(app)
        XCTAssertTrue(app.buttons["phone-settings-reopen"].exists)
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "I selected Silence")
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        app.buttons["phone-settings-reopen"].tap()
        expect(app, "Screen Unknown Callers")
        capture(app, "Phone setting return")
    }
    func testSettingsFallbackKeepsProgressAndInstructionsAvailable() {
        let app = launch(["--forwarding-start-settings", "--settings-link-fails"], title: "Screen Unknown Callers")
        tapPrimary(app)
        XCTAssertTrue(app.buttons["phone-settings-reopen"].exists)
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "I selected Silence")
        tapPrimary(app)
        expect(app, "Live Voicemail")
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Open Phone settings")
        tapPrimary(app)
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Live Voicemail is off")
    }
    func testCopyRequiresCarrierConfirmationAndResetsForNextCode() {
        let app = launch(["--forwarding-start-code"], title: "When you don’t answer")
        expect(app, "Code copied")
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Tello confirmed the change")
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        app.buttons["Need help?"].tap()
        app.buttons["forwarding-copy-code"].tap()
        expect(app, "When you don’t answer")
        tapPrimary(app)
        expect(app, "When you’re on a call")
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Tello confirmed the change")
        XCTAssertTrue(app.staticTexts["forwarding-code-copied"].exists)
        app.buttons["See copied code"].tap()
        XCTAssertEqual(app.staticTexts["forwarding-code"].label, "**67*12025550100#")
        app.terminate()
        let resumed = launch(["--forwarding-start-code"], title: "When you don’t answer")
        expect(resumed, "Code copied")
        XCTAssertFalse(resumed.staticTexts["Check that calls reach Shield"].exists)
    }
    func testRestorationPreparesEachResetWithoutAdvancingUntilConfirmed() {
        let app = launch(["--forwarding-start-restore"], title: "Bring back ordinary calls")
        app.buttons["See copied code"].tap()
        XCTAssertTrue(app.staticTexts["forwarding-reset-code"].appears(timeout: 5))
        XCTAssertEqual(app.staticTexts["forwarding-reset-code"].label, "##61#")
        XCTAssertEqual(app.buttons["forwarding-reset-continue"].label, "Tello confirmed this reset")
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
        let app = launch(["--forwarding-start-code"], title: "When you don’t answer")
        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertTrue(app.staticTexts["forwarding-carrier-result"].appears(timeout: 5))
        XCTAssertTrue(app.staticTexts["When you don’t answer"].exists)
        XCTAssertFalse(app.staticTexts["When you’re on a call"].exists)
        XCTAssertFalse(app.staticTexts["forwarding-probe-passed"].exists)
        XCTAssertEqual(app.buttons["forwarding-continue"].label, "Tello confirmed the change")
        app.buttons["Need help?"].tap()
        app.buttons["forwarding-phone-reopen"].tap()
        XCTAssertFalse(app.staticTexts["forwarding-carrier-result"].exists)
        XCTAssertTrue(app.staticTexts["When you don’t answer"].exists)
        capture(app, "Phone return and retry")
    }

    func testCarrierCodeAtLargestTextInDarkMode() {
        let app = launch(["--forwarding-start-code", "--uitesting-dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"], title: "When you don’t answer")
        XCTAssertTrue(app.buttons["forwarding-continue"].isHittable)
        app.buttons["See copied code"].tap()
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
