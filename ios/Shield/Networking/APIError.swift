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
            case "setup_not_ready": "Phone setup is not ready yet. Check the service connection and your consent before trying again."
            case "restoration_in_progress", "restore_forwarding_before_deletion": "Restore and verify ordinary calls and carrier voicemail with your helper first."
            case "test_window_closed": "The test window ended. Restart the call test to continue."
            case "test_limit_reached": "Today’s call-test limit is reached. Restore your phone and try again tomorrow."
            case "call_still_active": "Wait for the current call to end, then try again."
            case "probe_unavailable": "Automatic call checks are not available on this phone service yet."
            case "voicemail_not_found": "This message has expired or was deleted."
            case "daily_limit_reached", "try_again_later": "Please try again later."
            case "sign_in_unavailable": "Sign-in is being set up. Please contact your pilot support person."
            case "full_contacts_required": "Allow Full Access to Contacts in iPhone Settings to share your calling list with Shield."
            case "contact_share_limit": "This demo supports up to 5,000 phone numbers. Your contacts have not been changed."
            case "contact_change_unconfirmed": "That number is still saved in iPhone Contacts. Check whether the contact is read-only before trying again."
            case "contacts_sync_busy": "Your contacts are still syncing. Please try again in a moment."
            case "contact_sync_incomplete": "The contact change could not be completed. Refresh the list before making a test call."
            case "contact_permission": "Allow Contacts access in Settings to save the Shield number. You can also save it yourself."
            default: "We couldn’t finish that. Please try again."
            }
        }
    }
}
