import Foundation

enum PhoneSettingsDestination: String {
    case phone, callIdentification, shield, unavailable

    var directions: String {
        switch self {
        case .phone: "In Phone settings, find the setting shown above."
        case .callIdentification: "Tap the back arrow to Phone, then find the setting shown above."
        case .shield: "Tap Apps at the top left, then choose Phone."
        case .unavailable: "Open iPhone Settings → Apps → Phone."
        }
    }
}
