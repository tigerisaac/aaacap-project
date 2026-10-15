import Foundation

enum SetupGuide: String, CaseIterable {
    case silence, voicemailOff, keypad, never, voicemailOn

    var instructions: String {
        switch self {
        case .silence: "In Phone settings, tap Screen Unknown Callers, then Silence. Return to Shield."
        case .voicemailOff: "In Phone settings, tap Live Voicemail. Turn Live Voicemail off, then return to Shield."
        case .keypad: "In Phone, tap Keypad. Tap the space above the numbers, then Paste. Tap the green Call button, wait for your carrier’s result, then return to Shield."
        case .never: "In Phone settings, tap Screen Unknown Callers, then Never. Return to Shield."
        case .voicemailOn: "In Phone settings, tap Live Voicemail. Turn Live Voicemail on, then return to Shield."
        }
    }

    func resourceURL(reduceMotion: Bool) -> URL? {
        Bundle.main.url(forResource: "setup-\(rawValue)\(reduceMotion ? "-still" : "")", withExtension: "mp4")
    }
}
