import AVFoundation
import Foundation
import Observation

@MainActor
@Observable
final class VoicePlayer: NSObject, AVAudioPlayerDelegate {
    private var player: AVAudioPlayer?
    var playing = false
    var loading = false

    func play(data: Data) throws {
        try AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio)
        try AVAudioSession.sharedInstance().setActive(true)
        let audio = try AVAudioPlayer(data: data)
        audio.delegate = self
        audio.prepareToPlay()
        guard audio.play() else { throw APIError.invalidResponse }
        player = audio
        playing = true
    }

    func stop() {
        player?.stop()
        player = nil
        playing = false
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor [weak self] in self?.stop() }
    }
}
