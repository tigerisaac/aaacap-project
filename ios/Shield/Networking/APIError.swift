import Foundation

enum APIError: LocalizedError {
    case unconfigured
    case invalidResponse
    case service(code: String, status: Int)

    var errorDescription: String? {
        switch self {
        case .unconfigured: "The service connection isn’t set up yet. You can explore the demo."
        case .invalidResponse: "Something didn’t load. Please try again."
        case let .service(code, _):
            switch code {
            case "sign_in_required", "sign_in_failed": "Please sign in again."
            case "enrollment_required": "Your phone hasn’t been enrolled yet. You can still join a shared account."
            case "owner_required": "Only the participant can change this setting."
            case "access_denied": "This shared access is no longer available."
            case "voicemail_not_shared": "Voicemail hasn’t been shared with you."
            case "recording_unavailable": "This recording isn’t available."
            case "invite_unavailable": "This invitation has expired or was already used."
            case "invalid_phone": "Enter a valid US or Canadian phone number."
            case "routing_test_required", "setup_incomplete": "A phone routing test is needed before offers can resume."
            case "daily_limit_reached", "try_again_later": "Please try again later."
            case "sign_in_unavailable": "Sign-in is being set up. Please contact your pilot support person."
            case "contact_permission": "Allow Contacts access in Settings to save the Shield number. You can also save it yourself."
            default: "We couldn’t finish that. Please try again."
            }
        }
    }
}
