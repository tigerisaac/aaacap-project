import AVFoundation
import Observation

@MainActor
@Observable
final class SampleMessagePlayer: NSObject, AVSpeechSynthesizerDelegate {
    private let speaker = AVSpeechSynthesizer()
    var playing = false

    override init() {
        super.init()
        speaker.delegate = self
    }

    func play(_ text: String) {
        speaker.stopSpeaking(at: .immediate)
        let speech = AVSpeechUtterance(string: text)
        speech.voice = AVSpeechSynthesisVoice(language: "en-US")
        speech.rate = AVSpeechUtteranceDefaultSpeechRate * 0.85
        playing = true
        speaker.speak(speech)
    }

    func stop() { speaker.stopSpeaking(at: .immediate); playing = false }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        Task { @MainActor [weak self] in self?.playing = false }
    }
}
