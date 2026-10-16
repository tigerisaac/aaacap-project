#if DEBUG
import Observation
import SwiftUI

@available(iOS 27.0, *)
@MainActor @Observable
final class LiveSetupPrototypeModel {
    let capture = LiveSetupCapture()
    let floating = LiveSetupFloatingGuide()
    let isDemo = ProcessInfo.processInfo.arguments.contains("--uitesting-live-guide-demo")
    private(set) var demoInstruction: LiveSetupInstruction = .slideUp
    private(set) var handoffFailed = false
    private var wentToSettings = false

    var instruction: LiveSetupInstruction { isDemo ? demoInstruction : capture.instruction }

    func prepare() async {
        capture.didUpdate = { [weak self] next in self?.floating.show(next) }
        capture.didStop = { [weak self] in self?.floating.stop() }
        floating.onClose = { [weak self] in self?.capture.stop() }
        capture.didStart = { [weak self] in await self?.handoff() }
        floating.show(instruction)
        guard isDemo else { return }
        if ProcessInfo.processInfo.arguments.contains("--uitesting-live-guide-floating") {
            handoffFailed = !(await floating.start())
        }
        for next in [LiveSetupInstruction.slideUp, .slowDown, .chooseSilence] {
            guard !Task.isCancelled else { return }
            demoInstruction = next
            floating.show(next)
            do { try await Task.sleep(for: .seconds(1)) } catch { return }
        }
    }

    private func handoff() async {
        guard capture.active else { return }
        guard await floating.start() else { handoffFailed = true; capture.stop(); return }
        guard capture.active, !Task.isCancelled else { floating.stop(); return }
        let destination = await PhoneSettingsLink.open()
        if destination == .unavailable { handoffFailed = true; capture.stop() }
    }

    func sceneChanged(_ phase: ScenePhase) {
        if phase == .background && capture.active { wentToSettings = true }
        if phase == .active && wentToSettings { wentToSettings = false; stop() }
    }

    func stop() { capture.stop(); floating.stop() }
}
#endif
