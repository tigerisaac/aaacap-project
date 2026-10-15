import Foundation
import Observation
import UIKit

@MainActor @Observable
final class ForwardingSetupModel {
    let guidePlayer = SetupGuidePlayer()
    var carrier: String { status?.carrier ?? "your carrier" }
    var status: ForwardingStatus?
    var step = ForwardingStep.overview
    var working = false
    var error: String?
    var errorRevision = 0
    var codePreparedStep: ForwardingStep?
    var codeReturnedStep: ForwardingStep?
    private var pendingCodeReturn: ForwardingStep?
    var showingPhoneLauncher = false
    var showingHelp = false
    var settingsDestination = PhoneSettingsLink.preferredDestination
    var settingsReturned = false
    private var pendingSettingsStep: ForwardingStep?
    private var leftForSettings = false
    private var settingsVisitKey: String { "shield-phone-settings-visit-" + (status?.participantId.uuidString ?? "none") }
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

    func reportError(_ message: String) {
        error = message
        errorRevision += 1
    }

    func load(_ app: AppState) async {
        #if DEBUG
        if isUITest {
            if status == nil {
                status = .uiTestFixture
                if ProcessInfo.processInfo.arguments.contains("--forwarding-start-settings") { step = .settings }
                if ProcessInfo.processInfo.arguments.contains("--forwarding-start-code") { step = .forward0 }
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
            preparePhoneHandoff()
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
                showingPhoneLauncher = false
                if UserDefaults.standard.string(forKey: "shield-phone-settings-visit-" + id.uuidString) == step.rawValue {
                    settingsReturned = true
                }
            }
            if status == nil { error = nil }
            status = result
            if result.restorationRequested { step = .restore }
            preparePhoneHandoff()
        } catch is CancellationError {} catch { self.error = error.localizedDescription }
    }

    func primaryAction(_ app: AppState) async {
        guard let status, !working else { return }
        error = nil
        if isPhoneSettingsStep && !settingsReturned {
            await openPhoneSettings()
            return
        }
        if step.codeIndex != nil {
            guard code != nil else { await startWindow(app); return }
            if codePreparedStep != step {
                copyCode()
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
            try await move(to: step.next, app: app)
        } catch { reportError(error.localizedDescription) }
    }

    func move(to next: ForwardingStep, app: AppState) async throws {
        guard let status else { return }
        if !isUITest {
            let _: APIResponses.Empty = try await app.api.send("/api/forwarding/progress", method: "POST",
                body: APIClient.payload(["stage": next.rawValue]), participantID: status.participantId)
            guard app.selectedPersonID == status.participantId else { return }
        }
        guidePlayer.stop()
        step = next
        codePreparedStep = nil
        codeReturnedStep = nil
        pendingCodeReturn = nil
        showingPhoneLauncher = false
        // Each page guides one setting. A visit to the first does not stand in for the second.
        settingsReturned = false
        pendingSettingsStep = nil
        leftForSettings = false
        settingsDestination = PhoneSettingsLink.preferredDestination
        showingHelp = false
        error = nil
        await load(app)
    }

    func copyCode(showPhoneLauncher: Bool = true) {
        guard let code, !working else { return }
        prepareCode(code, showPhoneLauncher: showPhoneLauncher)
    }

    private func preparePhoneHandoff() {
        guard codePreparedStep != step, let code else { return }
        prepareCode(code, showPhoneLauncher: true)
    }

    private func prepareCode(_ code: String, showPhoneLauncher: Bool) {
        PhoneAppLink.copy(code: code)
        if showPhoneLauncher { guidePlayer.resumeForHandoff() }
        codePreparedStep = step
        if showPhoneLauncher { codeReturnedStep = nil }
        #if DEBUG
        showingPhoneLauncher = showPhoneLauncher && (!isUITest || ProcessInfo.processInfo.arguments.contains("--uitesting-system-phone"))
        #else
        showingPhoneLauncher = showPhoneLauncher
        #endif
        error = nil
        // Copying never confirms a carrier change or advances the step.
    }

    func codeSceneChanged(isActive: Bool, isBackground: Bool) {
        if isBackground, codePreparedStep == step, code != nil { pendingCodeReturn = step }
        if isActive {
            if pendingCodeReturn == step, code != nil { codeReturnedStep = step }
            pendingCodeReturn = nil
        }
        // A return changes the instructions, never carrier progress or verification.
    }

    func openPhoneSettings() async {
        guard isPhoneSettingsStep, !working else { return }
        error = nil
        working = true
        defer { working = false }
        pendingSettingsStep = step
        leftForSettings = false
        if !isUITest { UserDefaults.standard.set(step.rawValue, forKey: settingsVisitKey) }
        #if DEBUG
        if isUITest && !ProcessInfo.processInfo.arguments.contains("--uitesting-system-settings") {
            settingsDestination = ProcessInfo.processInfo.arguments.contains("--settings-link-fails") ? .unavailable : .phone
            settingsReturned = true
            pendingSettingsStep = nil
            return
        }
        #endif
        await guidePlayer.startFloating()
        settingsDestination = await PhoneSettingsLink.open()
        if settingsDestination == .unavailable {
            pendingSettingsStep = nil
            settingsReturned = true
            reportError("iPhone couldn’t open Settings. Open Settings → Apps → Phone, then make the change shown above.")
        }
    }

    func acknowledgeManualSettingsVisit() {
        settingsReturned = true
        pendingSettingsStep = nil
    }

    func settingsSceneChanged(isActive: Bool, isBackground: Bool) {
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
