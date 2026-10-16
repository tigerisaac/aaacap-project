#if DEBUG && !targetEnvironment(simulator)
import Observation
@preconcurrency import ScreenCaptureKit
import UIKit

/// A debug-only experiment. No normal onboarding route can start capture.
@available(iOS 27.0, *)
@MainActor @Observable
final class LiveSetupCapture: NSObject, SCContentSharingPickerObserver, SCStreamDelegate {
    private(set) var active = false
    private(set) var requestingPermission = false
    private(set) var instruction: LiveSetupInstruction = .waiting
    private(set) var failure: String?
    @ObservationIgnored private var stream: SCStream?
    @ObservationIgnored private var output: LiveSetupCaptureOutput?
    @ObservationIgnored private var stability = LiveSetupStability()
    @ObservationIgnored private var deadline: Task<Void, Never>?
    @ObservationIgnored private var generation = 0
    @ObservationIgnored var didStart: (@MainActor () async -> Void)?
    @ObservationIgnored var didUpdate: (@MainActor (LiveSetupInstruction) -> Void)?
    @ObservationIgnored var didStop: (@MainActor () -> Void)?

    func request() {
        guard !active, !requestingPermission else { return }
        failure = nil
        let picker = SCContentSharingPicker.shared
        guard picker.isAvailable else {
            failure = "Screen guidance is unavailable right now. You can still use the illustrated guide."
            return
        }
        generation += 1
        requestingPermission = true
        picker.add(self)
        var configuration = SCContentSharingPickerConfiguration()
        configuration.showsCameraControl = false
        configuration.showsMicrophoneControl = false
        picker.defaultConfiguration = configuration
        picker.isActive = true
        picker.present()
    }

    private func begin(_ filter: SCContentFilter) async {
        guard requestingPermission else { return }
        let attempt = generation
        requestingPermission = false
        stability = LiveSetupStability()
        let captureOutput = LiveSetupCaptureOutput { [weak self] labels in
            Task { @MainActor [weak self] in
                guard let self, self.active, self.generation == attempt else { return }
                let next = self.stability.update(LiveSetupRecognition.instruction(for: labels))
                guard self.instruction != next else { return }
                self.instruction = next
                self.didUpdate?(next)
            }
        }
        let configuration = SCStreamConfiguration()
        configuration.width = 780
        configuration.height = 1688
        configuration.capturesAudio = false
        let capture = SCStream(filter: filter, configuration: configuration, delegate: self)
        do {
            try capture.addStreamOutput(captureOutput, type: .screen, sampleHandlerQueue: captureOutput.queue)
            stream = capture
            output = captureOutput
            try await capture.startCapture()
            guard generation == attempt else { try? await capture.stopCapture(); return }
            active = true
            instruction = .waiting
            deadline = Task { [weak self] in
                do { try await Task.sleep(for: .seconds(120)) } catch { return }
                self?.stop()
            }
            await didStart?()
        } catch {
            guard generation == attempt else { try? await capture.stopCapture(); return }
            stop()
            failure = "The guide couldn’t follow this screen. Return to the illustrated steps in Shield."
        }
    }

    func stop() {
        generation += 1
        deadline?.cancel()
        deadline = nil
        let capture = stream
        stream = nil
        output = nil
        active = false
        requestingPermission = false
        instruction = .stopped
        let picker = SCContentSharingPicker.shared
        picker.remove(self)
        picker.isActive = false
        didStop?()
        if let capture { Task { try? await capture.stopCapture() } }
    }

    private struct Selection: @unchecked Sendable { let filter: SCContentFilter }

    nonisolated func contentSharingPicker(_ picker: SCContentSharingPicker, didUpdateWith filter: SCContentFilter, for stream: SCStream?) {
        let selection = Selection(filter: filter)
        Task { @MainActor [weak self] in await self?.begin(selection.filter) }
    }

    nonisolated func contentSharingPicker(_ picker: SCContentSharingPicker, didCancelFor stream: SCStream?) {
        Task { @MainActor [weak self] in self?.stop() }
    }

    nonisolated func contentSharingPickerStartDidFailWithError(_ error: any Error) {
        Task { @MainActor [weak self] in
            self?.stop()
            self?.failure = "Screen guidance couldn’t start. The illustrated steps are still available."
        }
    }

    private struct StoppedStream: @unchecked Sendable { let stream: SCStream }

    nonisolated func stream(_ stream: SCStream, didStopWithError error: any Error) {
        let stopped = StoppedStream(stream: stream)
        Task { @MainActor [weak self] in
            guard let self, self.stream === stopped.stream else { return }
            self.stop()
        }
    }
}
#endif
