import Foundation

enum APIError: LocalizedError {
    case unconfigured
    case invalidResponse
    case service(code: String, status: Int)

    var errorDescription: String? {
        switch self {
        case .unconfigured: "Shield isn’t ready yet. You can try the sample app."
        case .invalidResponse: "Something didn’t load. Please try again."
        case let .service(code, _):
            switch code {
            case "sign_in_required", "sign_in_failed": "Please sign in again."
            case "enrollment_required": "Your phone needs setup. Ask your helper, or use an invitation someone sent you."
            case "owner_required": "Only the person using this phone can change this."
            case "access_denied": "This person is no longer sharing with you."
            case "voicemail_not_shared": "Voicemail hasn’t been shared with you."
            case "recording_unavailable": "This recording isn’t available."
            case "invite_unavailable": "This invitation has expired or was already used."
            case "invalid_phone": "Enter a valid US or Canadian phone number."
            case "routing_test_required", "setup_incomplete": "Check that your phone works with Shield before starting again."
            case "setup_not_ready": "Finish phone setup before trying again."
            case "restoration_in_progress", "restore_forwarding_before_deletion": "Ask your helper to check ordinary calls and voicemail first."
            case "test_window_closed": "The call test ended. Start it again to continue."
            case "test_limit_reached": "Today’s call-test limit is reached. Restore your phone and try again tomorrow."
            case "call_still_active": "Wait for the current call to end, then try again."
            case "probe_unavailable": "Automatic call checks are not available on this phone service yet."
            case "voicemail_not_found": "This message has expired or was deleted."
            case "daily_limit_reached", "try_again_later": "Please try again later."
            case "sign_in_unavailable": "Sign-in isn’t ready. Ask your helper."
            case "full_contacts_required": "Allow Full Access to Contacts in iPhone Settings to share your calling list with Shield."
            case "contact_share_limit": "There are too many contacts to update. Your contacts haven’t changed."
            case "contact_change_unconfirmed": "That number is still saved in iPhone Contacts. Check whether the contact is read-only before trying again."
            case "contacts_sync_busy": "Your contacts are still updating. Try again in a moment."
            case "contact_sync_incomplete": "We couldn’t update this contact. Refresh the list before checking calls."
            case "contact_permission": "Allow Contacts access in Settings to save the Shield number. You can also save it yourself."
            default: "We couldn’t finish that. Please try again."
            }
        }
    }
}
