import Foundation

enum SetupGuide: String, CaseIterable {
    case phoneSettings, silence, voicemailOff, keypad, never, voicemailOn
    static let animationFrameRate = 30.0

    var settingHeading: String {
        switch self {
        case .silence, .never: "Screen Unknown Callers"
        case .phoneSettings, .voicemailOff, .voicemailOn: "Live Voicemail"
        case .keypad: "Keypad"
        }
    }

    var instructions: String {
        switch self {
        case .phoneSettings: "Find Live Voicemail. Leave its switch gray (off). Just below it, find Screen Unknown Callers and tap Silence. Look for the checkmark, then return to Shield. You will confirm each change separately."
        case .silence: "Find Screen Unknown Callers, just above Call Filtering. Tap Silence and look for its checkmark. Return to Shield."
        case .voicemailOff: "Find Live Voicemail, just above Screen Unknown Callers. Turn it off if it is green. If it is already gray, leave it off. Return to Shield."
        case .keypad: "In Phone, tap Keypad. Tap the space above the numbers, then Paste. Tap the green Call button, wait for your carrier’s result, then return to Shield."
        case .never: "Find Screen Unknown Callers, just above Call Filtering. Tap Never and look for its checkmark. Return to Shield."
        case .voicemailOn: "Find Live Voicemail, just above Screen Unknown Callers. Turn it on if it is gray. If it is already green, leave it on. Return to Shield."
        }
    }

    func resourceURL(reduceMotion: Bool) -> URL? {
        Bundle.main.url(forResource: "setup-\(rawValue)\(reduceMotion ? "-still" : "")", withExtension: "mp4")
    }
}
