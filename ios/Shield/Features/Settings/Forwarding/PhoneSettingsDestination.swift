import Foundation

enum PhoneSettingsDestination: String {
    case phone, unavailable

    var directions: String {
        self == .phone ? "Slide your finger up past Announce Calls." : "Open iPhone Settings → Apps → Phone. Then slide your finger up."
    }
}
