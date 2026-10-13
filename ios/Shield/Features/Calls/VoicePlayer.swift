import AVFoundation
import Foundation
import Observation

@MainActor
@Observable
final class VoicePlayer: NSObject, AVAudioPlayerDelegate {
    private var player: AVAudioPlayer?
    private var generation = 0
    private var sessionToken: UUID?
    var playing = false
    var loading = false
    var paused = false
    var failure: String?
    var hasAudio: Bool { player != nil }
    var elapsed: TimeInterval { player?.currentTime ?? 0 }
    var duration: TimeInterval { player?.duration ?? 0 }

    func play(data: Data) async throws {
        generation += 1
        let request = generation
        failure = nil
        loading = true
        defer { if generation == request { loading = false } }
        let token = UUID()
        sessionToken = token
        do {
            try await MessageAudioSession.shared.activate(token)
            guard generation == request else {
                await MessageAudioSession.shared.deactivate(token)
                throw CancellationError()
            }
            let audio = try AVAudioPlayer(data: data)
            audio.delegate = self
            audio.prepareToPlay()
            guard audio.play() else { throw APIError.invalidResponse }
            player = audio
            playing = true
            paused = false
        } catch {
            if generation == request { stop() }
            await MessageAudioSession.shared.deactivate(token)
            throw error
        }
    }

    func pause() {
        generation += 1
        player?.pause()
        playing = false
        paused = player != nil
        deactivateSession()
    }

    func resume() async throws {
        guard let player else { return }
        generation += 1
        let request = generation
        failure = nil
        loading = true
        defer { if generation == request { loading = false } }
        let token = UUID()
        sessionToken = token
        do {
            try await MessageAudioSession.shared.activate(token)
            guard generation == request else {
                await MessageAudioSession.shared.deactivate(token)
                throw CancellationError()
            }
            guard player.play() else { throw APIError.invalidResponse }
            playing = true
            paused = false
        } catch {
            if generation == request { stop() }
            await MessageAudioSession.shared.deactivate(token)
            throw error
        }
    }

    func restart() async throws {
        player?.currentTime = 0
        try await resume()
    }

    func stop() {
        generation += 1
        player?.stop()
        player = nil
        playing = false
        paused = false
        loading = false
        failure = nil
        deactivateSession()
    }

    private func deactivateSession() {
        guard let token = sessionToken else { return }
        sessionToken = nil
        Task { await MessageAudioSession.shared.deactivate(token) }
    }

    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        let identity = ObjectIdentifier(player)
        Task { @MainActor [weak self] in
            guard let self, let current = self.player, ObjectIdentifier(current) == identity, !current.isPlaying, !self.loading else { return }
            self.stop()
            if !flag { self.failure = "The message stopped before it finished. Please try again." }
        }
    }

    nonisolated func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: (any Error)?) {
        let identity = ObjectIdentifier(player)
        Task { @MainActor [weak self] in
            guard let self, let current = self.player, ObjectIdentifier(current) == identity else { return }
            self.stop()
            self.failure = "This message couldn’t play. Please try again."
        }
    }
}
