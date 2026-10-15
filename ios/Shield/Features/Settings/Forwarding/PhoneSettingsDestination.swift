import Foundation

enum PhoneSettingsDestination: String {
    case phone, phoneControls, callIdentification, shield, unavailable

    var directions: String {
        switch self {
        case .phone, .phoneControls: "Slide your finger down the screen to reveal the settings just above Call Filtering."
        case .callIdentification: "If Call Blocking & Identification opens, tap the back arrow to Phone. Then slide your finger down to the settings above Call Filtering."
        case .shield: "Tap Apps at the top left, then Phone. Slide your finger up until you see Live Voicemail and Screen Unknown Callers."
        case .unavailable: "Open iPhone Settings → Apps → Phone. Slide your finger up until you see Live Voicemail and Screen Unknown Callers."
        }
    }
}
