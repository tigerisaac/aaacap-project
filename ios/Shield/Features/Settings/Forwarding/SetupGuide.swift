import Foundation

enum SetupGuide: String, CaseIterable {
    case silence, voicemailOff, keypad, never, voicemailOn

    var instructions: String {
        switch self {
        case .silence: "Open Settings, then Apps, then Phone. Scroll to Screen Unknown Callers. Tap Silence and look for its checkmark. Return to Shield."
        case .voicemailOff: "In Phone settings, find the Live Voicemail switch. Turn it off if it is green. If it is already gray, leave it off. Return to Shield."
        case .keypad: "In Phone, tap Keypad. Tap the space above the numbers, then Paste. Tap the green Call button, wait for your carrier’s result, then return to Shield."
        case .never: "Open Settings, then Apps, then Phone. Scroll to Screen Unknown Callers. Tap Never and look for its checkmark. Return to Shield."
        case .voicemailOn: "In Phone settings, find the Live Voicemail switch. Turn it on if it is gray. If it is already green, leave it on. Return to Shield."
        }
    }

    func resourceURL(reduceMotion: Bool) -> URL? {
        Bundle.main.url(forResource: "setup-\(rawValue)\(reduceMotion ? "-still" : "")", withExtension: "mp4")
    }
}
