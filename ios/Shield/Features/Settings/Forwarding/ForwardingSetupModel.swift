import Foundation
import Observation
import UIKit

@MainActor @Observable
final class ForwardingSetupModel {
    let guidePlayer = SetupGuidePlayer()
    let shortcutGuidePlayer = SetupGuidePlayer(automaticFloating: false)
    let phoneShortcut = SetupShortcutSession()
    var usingManualPhoneSettings = false
    var addingPhoneHelper: Bool { isPhoneSettingsStep && !usingManualPhoneSettings && !settingsReturned && phoneShortcut.phase == .add }
    var phoneSettingsTitle: String {
        if usingManualPhoneSettings { return step.title }
        if settingsReturned { return step == .settings ? "Check Silence" : "Confirm Live Voicemail" }
        return addingPhoneHelper ? "Let iPhone lend a hand" : "Turn off Live Voicemail"
    }
    var phoneSettingsAction: String {
        if addingPhoneHelper { return "Add to iPhone" }
        if !settingsReturned { return settingsReminderUnavailable ? "Open Settings anyway" : "Open Phone settings" }
        return step == .settings ? "Silence has a checkmark" : "Live Voicemail is off"
    }
    var carrier: String { status?.carrier ?? "your carrier" }
    var status: ForwardingStatus?
    var step = ForwardingStep.overview
    var working = false
    var error: String?
    var errorRevision = 0
    var codePreparedStep: ForwardingStep?
    var codeReturnedStep: ForwardingStep?
    private var pendingCodeReturn: ForwardingStep?
    private var leftForCarrierPhone = false
    var phoneNeedsBanner = false
    var showingPhoneLauncher = false
    var showingHelp = false
    var settingsDestination = PhoneSettingsLink.preferredDestination
    var settingsReturned = false
    var settingsReminderUnavailable = false
    private var pendingSettingsStep: ForwardingStep?
    private var leftForSettings = false
    private var settingsVisitKey: String { "shield-phone-settings-visit-" + (status?.participantId.uuidString ?? "none") }
    private var combinedVisitKey: String { settingsVisitKey + "-both-v1" }
    private var combinedPhoneVisit = false
    var isPhoneSettingsStep: Bool { step == .settings || step == .liveVoicemail }
    private var participantID: UUID?
    private var loaded = false

    var isUITest: Bool {
        #if DEBUG
        ProcessInfo.processInfo.arguments.contains("--uitesting-forwarding")
        #else
        false
        #endif
    }
    var probeKind: String { step == .ring ? "ring" : "forwarding" }
    var probe: ForwardingStatus.Probe? { status?.probe?.kind == probeKind ? status?.probe : nil }
    var probePassed: Bool { probe?.state == "passed" }
    var probeWaiting: Bool { probe?.state == "waiting" && (probe?.expiresAt ?? .distantPast) > .now }
    var code: String? {
        guard let status, let index = step.codeIndex, status.activationCodes.indices.contains(index) else { return nil }
        return status.activationCodes[index]
    }
    // An empty list can mean the supervised window expired, rather than a
    // carrier needing no setup. Keep its recovery step until codes are loaded.
    private var carrierCodeCount: Int {
        let count = status?.activationCodes.count ?? 0
        return (1...3).contains(count) ? count : 3
    }
    private var setupSteps: [ForwardingStep] {
        ForwardingStep.allCases.filter { $0 != .restore && ($0.codeIndex.map { $0 < carrierCodeCount } ?? true) }
    }
    var nextStep: ForwardingStep { setupSteps.drop { $0 != step }.dropFirst().first ?? step.next }
    var previousStep: ForwardingStep? {
        guard step != .restore, let index = setupSteps.firstIndex(of: step), index > 0 else { return nil }
        return setupSteps[index - 1]
    }
    var progressIndex: Int { setupSteps.firstIndex(of: step) ?? 0 }
    var progressTotal: Int { setupSteps.count - 1 }
    var codeSequence: String? {
        guard carrierCodeCount > 1, let index = step.codeIndex else { return nil }
        return "Code \(index + 1) of \(carrierCodeCount)"
    }
    var pageTitle: String {
        if isPhoneSettingsStep { return phoneSettingsTitle }
        if step.codeIndex != nil { return codeReturnedStep == step ? "Check \(carrier)’s result" : "Connect calls to Shield" }
        return step.title
    }

    func reportError(_ message: String) {
        error = message
        errorRevision += 1
    }

    func load(_ app: AppState) async {
        #if DEBUG
        if isUITest {
            if status == nil {
                status = .uiTestFixture
                usingManualPhoneSettings = ProcessInfo.processInfo.arguments.contains("--forwarding-manual-settings")
                if ProcessInfo.processInfo.arguments.contains("--forwarding-start-settings") { step = .settings }
                if ProcessInfo.processInfo.arguments.contains("--forwarding-start-voicemail") { step = .liveVoicemail }
                if ProcessInfo.processInfo.arguments.contains("--forwarding-start-code") { step = .forward0 }
                if ProcessInfo.processInfo.arguments.contains("--forwarding-resume-extra-code") { step = .forward2 }
                if ProcessInfo.processInfo.arguments.contains("--forwarding-start-checks") {
                    step = .checks
                    status?.ringTestAt = .now
                    status?.forwardingTestAt = .now
                }
                if ProcessInfo.processInfo.arguments.contains("--forwarding-start-restore") {
                    step = .restore
                    let key = "shield-restoration-step-" + ForwardingStatus.uiTestFixture.participantId.uuidString
                    let args = ProcessInfo.processInfo.arguments
                    if !args.contains("--restoration-resume") {
                        UserDefaults.standard.set(args.contains("--restoration-start-settings") ? 3 : 0, forKey: key)
                    }
                }
            }
            skipUnusedCarrierSteps()
            return
        }
        #endif
        guard let id = app.selectedPersonID else { return }
        do {
            let result: ForwardingStatus = try await app.api.send("/api/forwarding", participantID: id)
            guard app.selectedPersonID == id else { return }
            if !loaded || participantID != id {
                step = ForwardingStep(rawValue: result.stage) ?? .overview
                loaded = true
                participantID = id
                codePreparedStep = nil
                codeReturnedStep = nil
                pendingCodeReturn = nil
                leftForCarrierPhone = false
                showingPhoneLauncher = false
                settingsReturned = UserDefaults.standard.string(forKey: "shield-phone-settings-visit-" + id.uuidString) == step.rawValue
                combinedPhoneVisit = isPhoneSettingsStep && UserDefaults.standard.bool(forKey: "shield-phone-settings-visit-" + id.uuidString + "-both-v1")
            }
            if status == nil { error = nil }
            status = result
            if result.restorationRequested { step = .restore }
            skipUnusedCarrierSteps()
        } catch is CancellationError {} catch { self.error = error.localizedDescription }
    }

    func primaryAction(_ app: AppState) async {
        guard let status, !working else { return }
        error = nil
        if isPhoneSettingsStep && !settingsReturned {
            if addingPhoneHelper { await installPhoneHelper() }
            else { await openPhoneSettings(withoutReminder: settingsReminderUnavailable) }
            return
        }
        if step.codeIndex != nil {
            guard code != nil else { await startWindow(app); return }
            if codePreparedStep != step {
                copyCode()
                return
            }
            if codeReturnedStep != step {
                await openCarrierPhone()
                return
            }
        }
        if (step == .ring || step == .test) && !probePassed {
            await startProbe(app)
            return
        }
        working = true
        defer { working = false }
        do {
            #if DEBUG && targetEnvironment(simulator)
            if isUITest && step == .save && ProcessInfo.processInfo.arguments.contains("--forwarding-save-fails") {
                reportError("Contacts access is off. Allow Contacts in Settings, then try saving again.")
                return
            }
            #endif
            if !isUITest {
                if step == .consent {
                    let _: APIResponses.Empty = try await app.api.send("/api/forwarding/consent", method: "POST",
                        body: APIClient.payload(["version": status.consentVersion, "accepted": true]), participantID: status.participantId)
                }
                if step == .save { try await SaveShieldContact.save(number: status.shieldNumber) }
                if step == .liveVoicemail { try await openWindow(app, status: status) }
            }
            try await move(to: nextStep, app: app)
        } catch { reportError(error.localizedDescription) }
    }

    func move(to next: ForwardingStep, app: AppState) async throws {
        guard let status else { return }
        let carriesPhoneVisit = step == .settings && next == .liveVoicemail && settingsReturned && combinedPhoneVisit
        if !isUITest {
            let _: APIResponses.Empty = try await app.api.send("/api/forwarding/progress", method: "POST",
                body: APIClient.payload(["stage": next.rawValue]), participantID: status.participantId)
            guard app.selectedPersonID == status.participantId else { return }
        }
        guidePlayer.stop()
        shortcutGuidePlayer.stop()
        step = next
        codePreparedStep = nil
        codeReturnedStep = nil
        pendingCodeReturn = nil
        leftForCarrierPhone = false
        phoneNeedsBanner = false
        showingPhoneLauncher = false
        // One guide now shows both adjacent controls. Carry only the visit,
        // never a setting confirmation; the next page still requires its own tap.
        settingsReturned = carriesPhoneVisit
        settingsReminderUnavailable = false
        phoneShortcut.reminderUnavailable = false
        if !isPhoneSettingsStep {
            combinedPhoneVisit = false
            if !isUITest { UserDefaults.standard.removeObject(forKey: combinedVisitKey) }
        }
        if carriesPhoneVisit && !isUITest { UserDefaults.standard.set(next.rawValue, forKey: settingsVisitKey) }
        pendingSettingsStep = nil
        leftForSettings = false
        settingsDestination = PhoneSettingsLink.preferredDestination
        showingHelp = false
        error = nil
        await load(app)
    }

    func copyCode() {
        guard let code, !working else { return }
        PhoneAppLink.copy(code: code)
        codePreparedStep = step
        codeReturnedStep = nil
        pendingCodeReturn = nil
        leftForCarrierPhone = false
        showingPhoneLauncher = false
        phoneNeedsBanner = false
        error = nil
        // This explicit tap copies only. Open Phone is the next action.
    }

    private func skipUnusedCarrierSteps() {
        guard let index = step.codeIndex, let codes = status?.activationCodes,
              !codes.isEmpty, index >= codes.count else { return }
        step = .test
    }

    func openCarrierPhone() async {
        guard let code, !working else { return }
        working = true
        defer { working = false }
        error = nil
        PhoneAppLink.copy(code: code)
        codePreparedStep = step
        codeReturnedStep = nil
        pendingCodeReturn = step
        leftForCarrierPhone = false
        phoneNeedsBanner = true
        #if DEBUG && targetEnvironment(simulator)
        if isUITest && !ProcessInfo.processInfo.arguments.contains("--uitesting-system-phone") {
            return
        }
        #endif
        // Apple's Open button launches Phone without a calling URL. Neither
        // showing its banner nor leaving Shield proves a carrier change.
        await guidePlayer.prepare(.keypad, reduceMotion: UIAccessibility.isReduceMotionEnabled)
        // A repeat visit remounts the guide's source layer. Give that layer a
        // bounded opportunity to become visible before requesting PiP.
        for _ in 0..<20 where !guidePlayer.hasFrame {
            do { try await Task.sleep(for: .milliseconds(50)) } catch { return }
        }
        guidePlayer.resumeForHandoff()
        showingPhoneLauncher = true
    }

    func codeSceneChanged(isActive: Bool, isBackground: Bool) {
        if isBackground, pendingCodeReturn == step { leftForCarrierPhone = true }
        if isActive && leftForCarrierPhone {
            if pendingCodeReturn == step, code != nil {
                codeReturnedStep = step
                showingPhoneLauncher = false
                phoneNeedsBanner = false
            }
            pendingCodeReturn = nil
            leftForCarrierPhone = false
        }
        // A return changes the instructions, never carrier progress or verification.
    }

    func openPhoneSettings(withoutReminder: Bool = false) async {
        guard isPhoneSettingsStep, !working else { return }
        error = nil
        working = true
        defer { working = false }
        pendingSettingsStep = step
        leftForSettings = false
        if !usingManualPhoneSettings {
            settingsReturned = false
            // Reopening from the Silence confirmation must carry the voicemail
            // instruction, rather than floating that confirmation's poster.
            await shortcutGuidePlayer.prepare(.shortcutVoicemail, reduceMotion: UIAccessibility.isReduceMotionEnabled)
            if !withoutReminder { phoneShortcut.reminderUnavailable = false }
            await phoneShortcut.run(using: shortcutGuidePlayer)
            if let message = phoneShortcut.error {
                pendingSettingsStep = nil
                settingsReminderUnavailable = phoneShortcut.reminderUnavailable
                settingsReturned = false
                reportError(message)
                return
            }
            settingsDestination = .phone
            if !isUITest { UserDefaults.standard.set(step.rawValue, forKey: settingsVisitKey) }
            if phoneShortcut.phase == .returned { settingsReturned = true; pendingSettingsStep = nil }
            if step == .settings {
                combinedPhoneVisit = true
                if !isUITest { UserDefaults.standard.set(true, forKey: combinedVisitKey) }
            }
            return
        }
        #if DEBUG
        if isUITest && !ProcessInfo.processInfo.arguments.contains("--uitesting-system-settings") {
            if !withoutReminder && ProcessInfo.processInfo.arguments.contains("--setup-guide-unavailable") {
                pendingSettingsStep = nil
                reportReminderUnavailable()
                return
            }
            settingsDestination = ProcessInfo.processInfo.arguments.contains("--settings-link-fails") ? .unavailable : PhoneSettingsLink.preferredDestination
            settingsReturned = true
            pendingSettingsStep = nil
            if step == .settings { combinedPhoneVisit = settingsDestination == .phone }
            return
        }
        #endif
        if !withoutReminder {
            let floated = await guidePlayer.startFloating()
            guard floated else {
                pendingSettingsStep = nil
                guidePlayer.returnedToShield()
                reportReminderUnavailable()
                return
            }
        }
        if withoutReminder { guidePlayer.returnedToShield() }
        // Persist only an actual handoff attempt, not a failed reminder start.
        if !isUITest { UserDefaults.standard.set(step.rawValue, forKey: settingsVisitKey) }
        settingsDestination = await PhoneSettingsLink.open()
        if settingsDestination == .unavailable {
            guidePlayer.returnedToShield()
            pendingSettingsStep = nil
            settingsReturned = true
            reportError("iPhone couldn’t open Settings. Open Settings → Apps → Phone, then make the change shown above.")
        } else if step == .settings {
            combinedPhoneVisit = true
            if !isUITest { UserDefaults.standard.set(true, forKey: combinedVisitKey) }
        }
    }

    private func reportReminderUnavailable() {
        settingsReminderUnavailable = true
        settingsReturned = false
        pendingSettingsStep = nil
        reportError(step == .settings
                    ? "The floating reminder couldn’t open. Turn Live Voicemail off, then choose Silence just below it. You can stay here to watch the guide, or tap Open Settings anyway to continue without the reminder."
                    : "The floating reminder couldn’t open. Turn Live Voicemail off. You can stay here to watch the guide, or tap Open Settings anyway to continue without the reminder.")
    }

    func acknowledgeManualSettingsVisit() {
        settingsReturned = true
        pendingSettingsStep = nil
        if !isUITest { UserDefaults.standard.set(step.rawValue, forKey: settingsVisitKey) }
        if step == .settings {
            combinedPhoneVisit = true
            if !isUITest { UserDefaults.standard.set(true, forKey: combinedVisitKey) }
        }
    }

    func installPhoneHelper() async {
        guard !working else { return }
        working = true
        defer { working = false }
        error = nil
        settingsReturned = false
        settingsReminderUnavailable = false
        phoneShortcut.reminderUnavailable = false
        await phoneShortcut.install(using: shortcutGuidePlayer)
        if let message = phoneShortcut.error { reportError(message) }
    }

    func acknowledgePhoneHelper() {
        phoneShortcut.importHandedOff()
        settingsReturned = false
        error = nil
    }

    func useManualPhoneSettings() {
        shortcutGuidePlayer.stop()
        usingManualPhoneSettings = true
        settingsReturned = false
        settingsReminderUnavailable = false
        error = nil
    }

    func settingsSceneChanged(isActive: Bool, isBackground: Bool) {
        phoneShortcut.sceneChanged(isActive: isActive, isBackground: isBackground)
        guard pendingSettingsStep == step, isPhoneSettingsStep else { return }
        if isBackground { leftForSettings = true }
        else if isActive && leftForSettings {
            settingsReturned = true
            pendingSettingsStep = nil
            leftForSettings = false
            // Returning is navigation evidence only; it never sets a verified flag.
        }
    }

    private func openWindow(_ app: AppState, status: ForwardingStatus) async throws {
        let _: APIResponses.Empty = try await app.api.send("/api/forwarding/test-window", method: "POST",
            body: APIClient.payload(["allowAnyCaller": true]), participantID: status.participantId)
    }
    func startWindow(_ app: AppState) async {
        guard let status, !working else { return }
        working = true
        defer { working = false }
        do { try await openWindow(app, status: status); await load(app) }
        catch { reportError(error.localizedDescription) }
    }
    private func startProbe(_ app: AppState) async {
        guard let status, !working, !probeWaiting else { return }
        working = true
        defer { working = false }
        if isUITest {
            #if DEBUG
            self.status?.probe = .init(id: UUID().uuidString, kind: probeKind, state: "waiting", expiresAt: .now.addingTimeInterval(90))
            try? await Task.sleep(for: .seconds(1))
            let failed = ProcessInfo.processInfo.arguments.contains("--forwarding-test-fails")
            self.status?.probe = .init(id: UUID().uuidString, kind: probeKind, state: failed ? "failed" : "passed", expiresAt: .now.addingTimeInterval(90))
            if !failed {
                if step == .ring { self.status?.ringTestAt = .now } else { self.status?.forwardingTestAt = .now }
            }
            #endif
            return
        }
        do {
            try await openWindow(app, status: status)
            let _: APIResponses.Empty = try await app.api.send("/api/forwarding/probe", method: "POST",
                body: APIClient.payload(["kind": probeKind]), participantID: status.participantId)
            await load(app)
        } catch { reportError(error.localizedDescription) }
    }
    func restore(_ app: AppState) async {
        guard let status, !working else { return }
        working = true
        defer { working = false }
        do {
            if !isUITest {
                let _: APIResponses.Empty = try await app.api.send("/api/forwarding/restore", method: "POST", participantID: status.participantId)
            }
            UserDefaults.standard.set(0, forKey: "shield-restoration-step-" + status.participantId.uuidString)
            step = .restore
            await load(app)
        } catch { reportError(error.localizedDescription) }
    }
}
