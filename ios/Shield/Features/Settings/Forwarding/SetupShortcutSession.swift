import Foundation
import Observation
import UIKit

@MainActor @Observable
final class SetupShortcutSession {
    static let installationURL = URL(string: "https://www.icloud.com/shortcuts/a31253e04fa7440094b98f9fd8903bf2")!
    enum Phase { case add, ready, returned, confirmed }
    var phase: Phase
    private let remembersChoice: Bool
    private static let offeredKey = "shield-easy-setup-ready-to-try-v1"

    init() {
        #if DEBUG
        let testing = ProcessInfo.processInfo.arguments.contains("--uitesting-forwarding")
        let alreadyAdded = testing && ProcessInfo.processInfo.arguments.contains("--shortcut-already-added")
        #else
        let testing = false
        let alreadyAdded = false
        #endif
        remembersChoice = !testing
        phase = alreadyAdded || (!testing && UserDefaults.standard.bool(forKey: Self.offeredKey)) ? .ready : .add
    }
    var error: String?
    var reminderUnavailable = false
    private(set) var opening = false
    private var pendingRun = false
    private var pendingImport = false
    private var leftForSettings = false
    var isLeavingForSettings: Bool { pendingRun }

    /// A remembered choice to try the helper, never proof of installation.
    func importHandedOff() {
        phase = .ready
        if remembersChoice { UserDefaults.standard.set(true, forKey: Self.offeredKey) }
    }

    func install(using player: SetupGuidePlayer) async {
        guard !opening else { return }
        opening = true
        defer { opening = false }
        error = nil
        phase = .add
        player.returnedToShield()
        #if DEBUG && targetEnvironment(simulator)
        if ProcessInfo.processInfo.arguments.contains("--uitesting-forwarding") && !ProcessInfo.processInfo.arguments.contains("--uitesting-system-settings") {
            if ProcessInfo.processInfo.arguments.contains("--shortcut-install-fails") {
                reportImportFailure()
            } else {
                // Exercise the return without adding or executing a telephony action.
                phase = .ready
            }
            return
        }
        #endif
        pendingImport = true
        leftForSettings = false
        guard await UIApplication.shared.open(Self.installationURL) else {
            pendingImport = false
            reportImportFailure()
            return
        }
        // Opening Apple's page is not proof that Add Shortcut was accepted.
        // Keep the adding screen until the person returns to Shield.
    }

    func run(using player: SetupGuidePlayer) async {
        guard !opening else { return }
        opening = true
        defer { opening = false }
        error = nil
        phase = .ready
        #if DEBUG && targetEnvironment(simulator)
        if ProcessInfo.processInfo.arguments.contains("--uitesting-forwarding") && !ProcessInfo.processInfo.arguments.contains("--uitesting-system-settings") {
            if ProcessInfo.processInfo.arguments.contains("--shortcut-open-fails") {
                error = "Shortcuts couldn’t open. Add the helper again, or use the step-by-step guide under Need help."
                return
            }
            if !reminderUnavailable && ProcessInfo.processInfo.arguments.contains("--setup-guide-unavailable") {
                reportReminderUnavailable()
                return
            }
            phase = .returned
            return
        }
        #endif
        if reminderUnavailable {
            player.returnedToShield()
        } else if !(await player.startFloating()) {
            player.returnedToShield()
            reportReminderUnavailable()
            return
        }
        var url = URLComponents()
        url.scheme = "shortcuts"
        url.host = "run-shortcut"
        url.queryItems = [URLQueryItem(name: "name", value: "Shield Easy Setup")]
        pendingRun = true
        SetupGuideTrace.record("opening Shortcuts")
        leftForSettings = false
        guard let destination = url.url, await UIApplication.shared.open(destination) else {
            pendingRun = false
            player.returnedToShield()
            error = "Shortcuts couldn’t open. Add the helper again, or use the step-by-step guide under Need help."
            return
        }
        // No callback: Settings must remain open while the person uses its switch.
        SetupGuideTrace.record("Shortcuts URL accepted")
        // A successful URL handoff cannot tell us that a shortcut or setting changed.
    }

    func sceneChanged(isActive: Bool, isBackground: Bool) {
        guard pendingRun || pendingImport else { return }
        if isBackground { leftForSettings = true }
        if isActive && leftForSettings {
            if pendingImport { importHandedOff() } else { phase = .returned }
            pendingImport = false
            pendingRun = false
            leftForSettings = false
        }
    }

    private func reportImportFailure() {
        error = "Add Shortcut couldn’t open. Check your internet connection and try again, or open the saved helper under Need help."
    }

    private func reportReminderUnavailable() {
        reminderUnavailable = true
        error = "The floating reminder couldn’t open. You can still continue: turn Live Voicemail off, then return to Shield."
    }
}
