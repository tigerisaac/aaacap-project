#if DEBUG
import Foundation
import Observation
import UIKit

@MainActor @Observable
final class SetupShortcutSession {
    enum Phase { case add, ready, returned, confirmed }
    var phase: Phase = ProcessInfo.processInfo.arguments.contains("--shortcut-already-added") ? .ready : .add
    var error: String?
    var reminderUnavailable = false
    private(set) var opening = false
    private var pendingRun = false
    private var leftForSettings = false
    var isLeavingForSettings: Bool { pendingRun }

    func importHandedOff() { phase = .ready }

    func run(using player: SetupGuidePlayer) async {
        guard !opening else { return }
        opening = true
        defer { opening = false }
        error = nil
        #if targetEnvironment(simulator)
        if !ProcessInfo.processInfo.arguments.contains("--uitesting-system-settings") {
            if ProcessInfo.processInfo.arguments.contains("--shortcut-open-fails") {
                error = "Shortcuts couldn’t open. Add the helper again, or use the step-by-step guide below."
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
        leftForSettings = false
        guard let destination = url.url, await UIApplication.shared.open(destination) else {
            pendingRun = false
            player.returnedToShield()
            error = "Shortcuts couldn’t open. Add the helper again, or use the step-by-step guide below."
            return
        }
        // No callback: Settings must remain open while the person uses its switch.
        // A successful URL handoff cannot tell us that a shortcut or setting changed.
    }

    func sceneChanged(isActive: Bool, isBackground: Bool) {
        guard pendingRun else { return }
        if isBackground { leftForSettings = true }
        if isActive && leftForSettings {
            pendingRun = false
            leftForSettings = false
            phase = .returned
        }
    }

    private func reportReminderUnavailable() {
        reminderUnavailable = true
        error = "The floating reminder couldn’t open. You can still continue: leave Live Voicemail gray (off), then open Shield again."
    }
}
#endif
