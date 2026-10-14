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
        XCTAssertTrue(walk.app.navigationBars["Saved notice"].waitForExistence(timeout: 5))
        walk.checkpoint("message-opened")
    }

    func testVoiceOverCanEnterEmailAndRecoverFromAnInterruptedSend() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "sign-in", arguments: ["--uitesting-auth-error"])
        defer { walk.finish() }
        try walk.enter("Email address", text: "synthetic@example.com")
        try walk.activate("Done")
        try walk.activate("Send sign-in link")
        XCTAssertTrue(walk.app.staticTexts["sign-in-error"].waitForExistence(timeout: 5))
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
        XCTAssertTrue(walk.app.textFields["Email address"].waitForExistence(timeout: 5))
        XCTAssertEqual(walk.app.textFields["Email address"].value as? String, "beta@example.com")
        walk.checkpoint("change-email")
    }

    func testVoiceOverNativeFocusAndDirectToggleActions() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "native-toggle", arguments: ["--uitesting-native-reference", "--native-voiceover-interaction"])
        defer { walk.finish() }
        XCTAssertTrue(walk.app.staticTexts["VoiceOver is running"].waitForExistence(timeout: 5))
        try walk.activate("Allow sample alerts")
        XCTAssertEqual(walk.app.switches["Allow sample alerts"].value as? String, "1")
        try walk.find("Allow sample alerts", where: { $0.contains("on") })
        try walk.activate("Allow sample alerts")
        XCTAssertEqual(walk.app.switches["Allow sample alerts"].value as? String, "0")
    }

    func testVoiceOverOnboardingChoicesAndSafeSaveRecovery() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "onboarding", arguments: ["--uitesting-protection-onboarding", "--uitesting-helper-alerts-onboarding", "--protection-save-fails"], large: true)
        defer { walk.finish() }
        try walk.find("Help while you talk")
        try walk.activate("Check calls while I talk", where: { $0.localizedCaseInsensitiveContains("Switch") })
        XCTAssertEqual(walk.app.switches["onboarding-protection-toggle"].value as? String, "0")
        try walk.activate("Next")
        try walk.find("Let a helper know")
        try walk.activate("Let my helpers know", where: { $0.localizedCaseInsensitiveContains("Switch") })
        try walk.activate("What does the alert say?")
        try walk.find("It includes your name")
        try walk.activate("Back")
        XCTAssertEqual(walk.app.switches["onboarding-protection-toggle"].value as? String, "0")
        try walk.activate("Next")
        XCTAssertEqual(walk.app.switches["onboarding-helper-alerts-toggle"].value as? String, "0")
        try walk.activate("Save my choice")
        try walk.find("Couldn’t save your choice")
        try walk.activate("Cancel")
        XCTAssertEqual(walk.app.switches["onboarding-helper-alerts-toggle"].value as? String, "0")
        walk.checkpoint("retained-choices")
    }

    func testVoiceOverDailyNavigationAndSampleMessage() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "daily-navigation", arguments: ["--uitesting-preview"])
        defer { walk.finish() }
        try walk.activate("All messages")
        XCTAssertTrue(walk.app.navigationBars["Messages"].waitForExistence(timeout: 5))
        try walk.activate("Appointment message")
        XCTAssertTrue(walk.app.navigationBars["Voicemail"].waitForExistence(timeout: 5))
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

    func testVoiceOverSharingRetainsNameAndSafeCancellation() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "sharing", arguments: ["--uitesting-screen", "sharing-access", "--uitesting-sharing-confirmations"], large: true)
        defer { walk.finish() }
        try walk.enter("Your helper’s name", text: "Jamie")
        try walk.activate("Finish editing name")
        try walk.find("They can see your call history, without messages")
        try walk.activate("Make invitation")
        try walk.find("Make an invitation for Jamie?")
        try walk.activate("Not now")
        XCTAssertEqual(walk.app.textFields.firstMatch.value as? String, "Jamie")
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

    func testVoiceOverInvitationErrorIsCorrectable() throws {
        guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver service requires iOS 27.") }
        let walk = try VoiceOverWalkthrough(self, name: "invitation", arguments: ["--uitesting-screen", "invitation"], large: true)
        defer { walk.finish() }
        try walk.enter("Invitation code", text: "SyntheticExpiredInvitationCode")
        try walk.activate("Finish editing code")
        try walk.activate("Accept invitation")
        try walk.find("You couldn’t join yet")
        try walk.activate("Edit code")
        try walk.find("Invitation code", where: { $0.localizedCaseInsensitiveContains("Text field") })
        XCTAssertEqual(walk.app.textFields.firstMatch.value as? String, "SyntheticExpiredInvitationCode")
        try walk.enter("Invitation code", text: "Corrected")
        XCTAssertFalse(walk.app.staticTexts["You couldn’t join yet"].exists)
        walk.checkpoint("correctable-code")
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
        XCTAssertTrue(walk.app.buttons["Pause message"].waitForExistence(timeout: 5))
        try walk.find("You can listen. It may still show as new.")
        try walk.activate("Pause message")
        XCTAssertTrue(walk.app.buttons["Resume message"].waitForExistence(timeout: 5))
        try walk.activate("Resume message")
        XCTAssertTrue(walk.app.buttons["Pause message"].waitForExistence(timeout: 5))
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
                try walk.find("Copy")
                try walk.find("Close", where: { $0.localizedCaseInsensitiveContains("Button") })
            } else {
                try walk.activate("Set up my phone")
                try walk.find("Choose Shield for calls")
                try walk.find("Deleting the app won’t disconnect it")
                try walk.activate("More before you agree")
                try walk.find("Privacy")
                try walk.activate("More before you agree")
                try walk.find("Agree and continue")
            }
            walk.checkpoint("instructions")
        }
    }
}
