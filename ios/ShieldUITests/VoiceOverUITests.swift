import XCTest

@MainActor
final class VoiceOverUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }
    override func tearDown() async throws {
        _ = await MainActor.run {
            if #available(iOS 27.0, *) {
                do { try XCUIDevice.shared.voiceOverService.disable(); return true }
                catch { return false }
            }
            return true
        }
    }

    func testVoiceOverReadsAndOpensAMessage() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver testing service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "home-message", arguments: ["--uitesting-preview"])
        defer { walk.finish() }
        try walk.activate("Saved account notice")
        XCTAssertTrue(walk.app.navigationBars["Saved notice"].appears(timeout: 5))
        walk.checkpoint("message-opened")
    }

    func testVoiceOverPhoneSignInKeepsWrongCodeRecoverable() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "phone-sign-in", arguments: ["--uitesting-phone-sign-in"])
        defer { walk.finish() }
        try walk.find("Welcome", where: { $0.localizedCaseInsensitiveContains("Heading") })
        try walk.enter("Mobile number", text: "2025550102")
        try walk.activate("Text me a code")
        try walk.enter("Code", text: "000000")
        try walk.activate("Sign in")
        try walk.find("Couldn’t sign in")
        try walk.activate("Change number")
        XCTAssertEqual(walk.app.textFields["sign-in-phone"].value as? String, "(202) 555-0102")
        walk.checkpoint("wrong-code-recovery")
    }

    func testVoiceOverCaretakerChoiceExplainsScopeAndAllowsDecline() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "caretaker-choice", arguments: ["--uitesting-screen", "contact-alerts"])
        defer { walk.finish() }
        try walk.find("Receive protection alerts?")
        try walk.activate("About alerts")
        try walk.find("Shield alerts you only")
        XCTAssertTrue(walk.app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Calls, messages, and recordings stay private.")).firstMatch.exists)
        try walk.activate("Decline request")
        XCTAssertTrue(walk.app.staticTexts["No requests"].appears(timeout: 5))
        try walk.find("No requests")
        walk.checkpoint("declined-without-permissions")
    }

    func testVoiceOverCanReadAndCheckAFailedCaretakerChange() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "caretaker-change-failure", arguments: ["--uitesting-preview",
            "--uitesting-screen", "trusted-contacts", "--uitesting-caretaker-change-fails"], large: true)
        defer { walk.finish() }
        try walk.activate("Send protection alerts", where: { $0.localizedCaseInsensitiveContains("switch") })
        try walk.find("Change not confirmed")
        walk.checkpoint("failure-readable")
        try walk.activate("Check current status")
        try walk.find("Send protection alerts", where: { $0.localizedCaseInsensitiveContains("switch") })
        XCTAssertEqual(walk.app.switches["Send protection alerts"].value as? String, "1")
        XCTAssertFalse(walk.app.descendants(matching: .any)["caretaker-error-feedback"].exists)
        walk.checkpoint("last-confirmed-setting-retained")
    }

    func testVoiceOverCanRecoverAnUnconfirmedCaretakerDecline() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "caretaker-decline-confirmation", arguments: ["--uitesting-caretaker-refresh",
            "--caretaker-refresh-recipient", "--caretaker-refresh-fresh-fails"], large: true)
        defer { walk.finish() }
        try walk.activate("Start held refresh")
        try walk.activate("Decline request")
        try walk.find("Status not confirmed")
        try walk.find("Your connection was interrupted")
        walk.checkpoint("unconfirmed-status-readable")
        try walk.activate("Release older response")
        try walk.activate("Check current status")
        try walk.find("No requests")
        XCTAssertFalse(walk.app.descendants(matching: .any)["contact-alert-load-error"].exists)
        walk.checkpoint("decline-confirmed-without-repeating-change")
    }

    func testVoiceOverCanReconcileALostCaretakerChangeResponse() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "caretaker-change-response", arguments: ["--uitesting-caretaker-refresh",
            "--caretaker-refresh-recipient", "--caretaker-refresh-change-response-lost"], large: true)
        defer { walk.finish() }
        try walk.activate("Start held refresh")
        try walk.activate("Decline request")
        try walk.find("Status not confirmed")
        try walk.find("Your connection was interrupted")
        walk.checkpoint("lost-response-status-readable")
        try walk.activate("Release older response")
        try walk.activate("Check current status")
        try walk.find("No requests")
        XCTAssertFalse(walk.app.descendants(matching: .any)["contact-alert-load-error"].exists)
        walk.checkpoint("lost-response-reconciled")
    }

    func testVoiceOverCanRecoverALostCaretakerCreationResponse() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "caretaker-creation-response", arguments: ["--uitesting-caretaker-refresh",
            "--caretaker-refresh-create", "--caretaker-refresh-change-response-lost"], large: true)
        defer { walk.finish() }
        try walk.activate("Start held refresh")
        try walk.activate("Add caretaker")
        try walk.enter("Name", text: "Alex")
        try walk.findBackward("Done", where: { $0.localizedCaseInsensitiveContains("Button") })
        try walk.activate("Done")
        try walk.enter("Mobile number", text: "2025550102")
        try walk.findBackward("Done", where: { $0.localizedCaseInsensitiveContains("Button") })
        try walk.activate("Done")
        try walk.activate("Send request")
        try walk.find("Request not confirmed")
        try walk.find("Your connection was interrupted")
        walk.checkpoint("creation-uncertainty-readable")
        try walk.activate("Release older response")
        try walk.activate("Check current status")
        XCTAssertTrue(walk.app.navigationBars["Caretakers"].appears(timeout: 5))
        try walk.find("Alex")
        XCTAssertFalse(walk.app.descendants(matching: .any)["trusted-contact-create-error"].exists)
        walk.checkpoint("creation-confirmed")
    }

    func testVoiceOverPilotAccessHasNoStoreActions() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "pilot-access", arguments: ["--uitesting-preview", "--uitesting-subscription", "pilot"], large: true)
        defer { walk.finish() }
        try walk.activate("More", where: { $0.localizedCaseInsensitiveContains("Tab") })
        try walk.activate("Settings")
        try walk.activate("Shield access")
        try walk.find("Your pilot access is active.")
        XCTAssertFalse(walk.app.buttons["Restore purchases"].exists)
        XCTAssertFalse(walk.app.buttons["Manage subscription"].exists)
        walk.checkpoint("pilot-access")
    }

    func testVoiceOverCanEnterEmailAndRecoverFromAnInterruptedSend() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "sign-in", arguments: ["--uitesting-auth-error"])
        defer { walk.finish() }
        try walk.find("Help with unfamiliar calls", where: { $0.localizedCaseInsensitiveContains("Heading") })
        try walk.enter("Email address", text: "synthetic@example.com")
        try walk.activate("Done")
        try walk.activate("Send sign-in link")
        XCTAssertTrue(walk.app.staticTexts["sign-in-error"].appears(timeout: 5))
        try walk.find("Couldn’t sign in")
        walk.checkpoint("interrupted-send")
        XCTAssertEqual(walk.app.textFields["Email address"].value as? String, "synthetic@example.com")
        try walk.find("Email address")
    }

    func testVoiceOverEmailReturnHasResendAndChangeEmail() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "email-return", arguments: ["--uitesting-email-sent", "--uitesting-auth-error"])
        defer { walk.finish() }
        try walk.find("Check your email")
        try walk.find("beta@example.com")
        try walk.find("Resend link")
        try walk.activate("Change email")
        XCTAssertTrue(walk.app.textFields["Email address"].appears(timeout: 5))
        XCTAssertEqual(walk.app.textFields["Email address"].value as? String, "beta@example.com")
        walk.checkpoint("change-email")
    }

    func testVoiceOverNativeFocusAndDirectToggleActions() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "native-toggle", arguments: ["--uitesting-native-reference", "--native-voiceover-interaction"])
        defer { walk.finish() }
        XCTAssertTrue(walk.app.staticTexts["VoiceOver is running"].appears(timeout: 5))
        try walk.activate("Allow sample alerts")
        XCTAssertEqual(walk.app.switches["Allow sample alerts"].value as? String, "1")
        try walk.find("Allow sample alerts", where: { $0.contains("on") })
        try walk.activate("Allow sample alerts")
        XCTAssertEqual(walk.app.switches["Allow sample alerts"].value as? String, "0")
    }

    func testVoiceOverOnboardingChoicesAndSafeSaveRecovery() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "onboarding", arguments: ["--uitesting-protection-onboarding", "--protection-save-fails"], large: true)
        defer { walk.finish() }
        try walk.find("Help while you talk")
        try walk.activate("Check calls while I talk", where: { $0.localizedCaseInsensitiveContains("Switch") })
        XCTAssertEqual(walk.app.switches["onboarding-protection-toggle"].value as? String, "1")
        try walk.activate("Save my choice")
        try walk.find("Choice not confirmed")
        XCTAssertEqual(walk.app.switches["onboarding-protection-toggle"].value as? String, "1")
        XCTAssertFalse(walk.app.switches["onboarding-protection-toggle"].isEnabled)
        try walk.activate("Check current status")
        try walk.find("Your choice isn’t confirmed yet")
        XCTAssertTrue(walk.app.buttons["onboarding-protection-continue"].isEnabled)
        XCTAssertFalse(walk.app.switches["onboarding-helper-alerts-toggle"].exists)
        walk.checkpoint("retained-protection-choice")
    }

    func testVoiceOverCanConfirmASavedOnboardingChoice() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "onboarding-saved-response", arguments: ["--uitesting-onboarding-recovery"], large: true)
        defer { walk.finish() }
        try walk.find("Help while you talk")
        try walk.activate("Check calls while I talk", where: { $0.localizedCaseInsensitiveContains("Switch") })
        try walk.activate("Save my choice")
        try walk.find("Choice not confirmed")
        try walk.find("Your connection was interrupted")
        XCTAssertFalse(walk.app.switches["onboarding-protection-toggle"].isEnabled)
        walk.checkpoint("choice-uncertainty-readable")
        try walk.activate("Check current status")
        try walk.find("Choice confirmed")
        XCTAssertFalse(walk.app.descendants(matching: .any)["onboarding-choice-error"].exists)
        walk.checkpoint("choice-confirmed")
    }

    func testVoiceOverDailyNavigationAndSampleMessage() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "daily-navigation", arguments: ["--uitesting-preview"])
        defer { walk.finish() }
        try walk.activate("All messages")
        XCTAssertTrue(walk.app.navigationBars["Messages"].appears(timeout: 5))
        try walk.activate("Appointment message")
        XCTAssertTrue(walk.app.navigationBars["Voicemail"].appears(timeout: 5))
        try walk.find("Hear sample message")
        try walk.activate("Keep this message")
        XCTAssertTrue(walk.app.buttons["Message kept"].exists)
        try walk.activate("Back", where: { $0.localizedCaseInsensitiveContains("Button") })
        try walk.activate("Calls", where: { $0.localizedCaseInsensitiveContains("Tab") })
        try walk.activate("Stopped", where: { $0.localizedCaseInsensitiveContains("Button") })
        XCTAssertFalse(walk.app.historyRow("Prescription reminder").exists)
        try walk.activate("Call stopped")
        try walk.find("Need to call back?")
        try walk.activate("More about this call")
        try walk.find("Shield can’t prove who called")
        walk.checkpoint("call-explanation")
    }

    func testVoiceOverSharingHasSafeCancellation() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "sharing", arguments: ["--uitesting-screen", "sharing-access", "--uitesting-sharing-confirmations"], large: true)
        defer { walk.finish() }
        try walk.find("Calls and messages")
        try walk.activate("Stop sharing with Jamie")
        try walk.find("Stop sharing with Jamie?")
        try walk.activate("Keep sharing")
        XCTAssertTrue(walk.app.buttons["Stop sharing with Jamie"].exists)
        walk.checkpoint("safe-sharing")
    }

    func testVoiceOverContactRemovalHasReachableSafeChoice() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "contacts", arguments: ["--uitesting-screen", "contacts", "--uitesting-contact-removal"], large: true)
        defer { walk.finish() }
        try walk.activate("Remove Jamie from Contacts")
        try walk.find("Remove Jamie from iPhone Contacts?")
        try walk.find("This can also remove")
        XCTAssertTrue(walk.app.alerts.firstMatch.staticTexts.matching(NSPredicate(format: "label CONTAINS 'iCloud'")).firstMatch.exists)
        try walk.activate("Keep contact")
        XCTAssertTrue(walk.app.staticTexts["Jamie"].exists)
        walk.checkpoint("safe-contact")
    }

    func testVoiceOverQuietHoursExplainsUnsavedState() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "quiet-hours", arguments: ["--uitesting-screen", "quiet"], large: true)
        defer { walk.finish() }
        try walk.activate("Quiet hours", where: { $0.localizedCaseInsensitiveContains("Switch") })
        try walk.find("From")
        try walk.find("Until")
        try walk.find("Times are Central time")
        try walk.activate("Save quiet hours")
        try walk.find("Hours not confirmed")
        try walk.find("Quiet hours", where: { $0.localizedCaseInsensitiveContains("Switch") })
        XCTAssertEqual(walk.app.switches["Quiet hours"].value as? String, "1")
        walk.checkpoint("unsaved-hours")
    }

    func testVoiceOverPlaybackAndFeedbackAreInReadingFlow() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "playback", arguments: ["--uitesting-screen", "audio", "--uitesting-played-status-fails", "--uitesting-long-audio"], large: true)
        defer { walk.finish() }
        try walk.activate("Listen to message")
        XCTAssertTrue(walk.app.buttons["Pause message"].appears(timeout: 5))
        try walk.find("You can listen. It may still show as new.")
        try walk.activate("Pause message")
        XCTAssertTrue(walk.app.buttons["Resume message"].appears(timeout: 5))
        try walk.activate("Resume message")
        XCTAssertTrue(walk.app.buttons["Pause message"].appears(timeout: 5))
        try walk.activate("Pause message")
        try walk.activate("Can’t hear the message?")
        try walk.find("Turn up the volume")
        walk.checkpoint("playback-recovery")
    }

    func testVoiceOverSetupAndDisconnectionInstructions() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        for restore in [false, true] {
            let walk = try VoiceOverWalkthrough(self, name: restore ? "disconnection" : "phone-consent", arguments: ["--uitesting-forwarding"] + (restore ? ["--forwarding-start-restore"] : []), large: true)
            defer { walk.finish() }
            if restore {
                try walk.find("Bring back ordinary calls")
                try walk.find("Start disconnecting")
                try walk.find("Close", where: { $0.localizedCaseInsensitiveContains("Button") })
            } else {
                try walk.activate("Set up my phone")
                try walk.find("Choose Shield for calls")
                try walk.activate("More before you agree")
                // The service returns only a 64-character speech excerpt.
                try walk.find("Deleting the app")
                XCTAssertTrue(walk.app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Deleting the app won’t disconnect Shield")).firstMatch.exists)
                try walk.find("Privacy")
                try walk.activate("More before you agree")
                try walk.find("Agree and continue")
            }
            walk.checkpoint("instructions")
        }
    }
}
