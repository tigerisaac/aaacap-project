import AVKit
import Observation
import UIKit

/// A retained player carries a steady reminder into the system floating window.
/// Media is bundled and generic: no clipboard, carrier code, or phone data enters it.
@MainActor @Observable
final class SetupGuidePlayer: NSObject, @MainActor AVPictureInPictureControllerDelegate {
    private(set) var isPlaying = false
    private(set) var isFloating = false
    private(set) var unavailable = false
    private(set) var floatingUnavailable = false
    private(set) var hasFrame = false
    @ObservationIgnored let player = AVQueuePlayer()
    @ObservationIgnored private var looper: AVPlayerLooper?
    @ObservationIgnored private var pictureInPicture: AVPictureInPictureController?
    @ObservationIgnored private weak var layer: AVPlayerLayer?
    @ObservationIgnored private var selection: String?
    @ObservationIgnored private var starting = false
    @ObservationIgnored private var generation = 0
    @ObservationIgnored private var audioToken: UUID?
    @ObservationIgnored private var startFailed = false
    @ObservationIgnored private var frameObservation: NSKeyValueObservation?

    func attach(_ layer: AVPlayerLayer) {
        guard self.layer !== layer else { return }
        self.layer = layer
        layer.player = player
        let sourceID = ObjectIdentifier(layer)
        frameObservation = layer.observe(\.isReadyForDisplay, options: [.initial, .new]) { [weak self] layer, _ in
            let ready = layer.isReadyForDisplay
            Task { @MainActor [weak self] in
                guard let self, let current = self.layer, ObjectIdentifier(current) == sourceID else { return }
                self.hasFrame = ready
            }
        }
        guard AVPictureInPictureController.isPictureInPictureSupported() else { return }
        pictureInPicture = AVPictureInPictureController(playerLayer: layer)
        pictureInPicture?.delegate = self
        // A ten-second jump would skip whole instructions in these short clips.
        pictureInPicture?.requiresLinearPlayback = true
        pictureInPicture?.canStartPictureInPictureAutomaticallyFromInline = true
    }

    func prepare(_ guide: SetupGuide, reduceMotion: Bool) async {
        let key = guide.rawValue + String(reduceMotion)
        guard selection != key else { return }
        stop()
        selection = key
        unavailable = false
        floatingUnavailable = false
        guard let url = guide.resourceURL(reduceMotion: reduceMotion) else {
            unavailable = true
            return
        }
        let item = AVPlayerItem(url: url)
        looper = AVPlayerLooper(player: player, templateItem: item)
        // A silent AAC track keeps AVKit's playback lifecycle consistent. It must
        // not interrupt music, VoiceOver, or another app's spoken instructions.
        let token = UUID()
        audioToken = token
        do {
            try await MessageAudioSession.shared.activate(token, videoGuide: true)
        } catch {
            floatingUnavailable = true
        }
        guard selection == key, audioToken == token, !Task.isCancelled else {
            await MessageAudioSession.shared.deactivate(token)
            return
        }
        player.play()
        isPlaying = true
    }

    func resumeForHandoff() {
        guard !unavailable, player.currentItem != nil else { return }
        player.seek(to: .zero, toleranceBefore: .zero, toleranceAfter: .zero)
        player.play()
        isPlaying = true
    }

    /// Bound readiness/startup. Failure never traps the person in Shield.
    @discardableResult
    func startFloating() async -> Bool {
        guard !starting else { return false }
        guard !unavailable, let pictureInPicture else {
            floatingUnavailable = true
            return false
        }
        if pictureInPicture.isPictureInPictureActive { return true }
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--setup-guide-unavailable") {
            floatingUnavailable = true
            return false
        }
        #endif
        starting = true
        let attemptGeneration = generation
        defer { if generation == attemptGeneration { starting = false } }
        floatingUnavailable = false
        startFailed = false
        // Start at the first instruction when the other app opens, even if the
        // person has already spent a while watching the inline preview.
        await player.seek(to: .zero, toleranceBefore: .zero, toleranceAfter: .zero)
        guard generation == attemptGeneration, !Task.isCancelled else { return false }
        player.play()
        isPlaying = true
        for _ in 0..<20 {
            guard generation == attemptGeneration, !Task.isCancelled else { return false }
            if player.currentItem?.status == .failed { unavailable = true; return false }
            if pictureInPicture.isPictureInPicturePossible { break }
            do { try await Task.sleep(for: .milliseconds(50)) } catch { return false }
        }
        guard pictureInPicture.isPictureInPicturePossible else {
            floatingUnavailable = true
            return false
        }
        guard generation == attemptGeneration, !Task.isCancelled else { return false }
        pictureInPicture.startPictureInPicture()
        for _ in 0..<30 {
            guard generation == attemptGeneration else { return false }
            if Task.isCancelled { pictureInPicture.stopPictureInPicture(); return false }
            if pictureInPicture.isPictureInPictureActive { return true }
            if startFailed { break }
            do { try await Task.sleep(for: .milliseconds(50)) } catch { break }
        }
        pictureInPicture.stopPictureInPicture()
        floatingUnavailable = true
        return false
    }

    func returnedToShield() {
        generation += 1
        starting = false
        pictureInPicture?.stopPictureInPicture()
        player.pause()
        isPlaying = false
    }

    func stop() {
        generation += 1
        starting = false
        pictureInPicture?.stopPictureInPicture()
        player.pause()
        looper?.disableLooping()
        looper = nil
        player.removeAllItems()
        selection = nil
        isPlaying = false
        isFloating = false
        hasFrame = false
        if let token = audioToken {
            audioToken = nil
            Task { await MessageAudioSession.shared.deactivate(token) }
        }
    }

    func pictureInPictureControllerWillStartPictureInPicture(_ pictureInPictureController: AVPictureInPictureController) {
        // Phone's native Open banner starts PiP automatically. Begin at the
        // first instruction even when the inline clip has been playing awhile.
        if !starting { resumeForHandoff() }
    }

    func pictureInPictureControllerDidStartPictureInPicture(_ pictureInPictureController: AVPictureInPictureController) {
        isFloating = true
    }

    func pictureInPictureControllerDidStopPictureInPicture(_ pictureInPictureController: AVPictureInPictureController) {
        isFloating = false
    }

    func pictureInPictureController(_ pictureInPictureController: AVPictureInPictureController,
                                    failedToStartPictureInPictureWithError error: any Error) {
        startFailed = true
        floatingUnavailable = true
        isFloating = false
    }

    func pictureInPictureController(_ pictureInPictureController: AVPictureInPictureController,
                                    restoreUserInterfaceForPictureInPictureStopWithCompletionHandler completionHandler: @escaping (Bool) -> Void) {
        // The setup page stays mounted at the same step while another app is open.
        completionHandler(true)
    }
}
