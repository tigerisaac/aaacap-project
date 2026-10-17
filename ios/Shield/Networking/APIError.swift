import Foundation

enum APIError: LocalizedError {
    case unconfigured
    case invalidResponse
    case service(code: String, status: Int)

    var errorDescription: String? {
        switch self {
        case .unconfigured: "Shield isn’t ready yet. You can try the sample app."
        case .invalidResponse: "We couldn’t finish that. Please try again."
        case let .service(code, _):
            switch code {
            case "sign_in_required", "sign_in_failed": "Please sign in again."
            case "enrollment_required": "Your account needs phone setup. Contact Shield to arrange it."
            case "owner_required": "Only the person using this phone can change this."
            case "access_denied": "This person is no longer sharing with you."
            case "voicemail_not_shared": "Voicemail hasn’t been shared with you."
            case "recording_unavailable": "This recording isn’t available."
            case "phone_verification_unavailable": "Phone sign-in isn’t available right now. Try again later, or use email for an existing account."
            case "phone_code_incorrect": "That code didn’t match. Check the text and try again."
            case "phone_code_expired": "That code has expired or was already used. Request a new code."
            case "phone_code_wait": "Please wait a minute before requesting another code."
            case "phone_code_busy": "Your code is being checked. Please wait a moment."
            case "verified_phone_required": "Sign in with your mobile number to review trusted-contact requests."
            case "trusted_contacts_unavailable", "alert_channel_unavailable": "Trusted-contact alerts aren’t available yet. You can continue without them."
            case "trusted_contact_required": "Add a trusted contact before turning on alerts."
            case "trusted_contact_self": "Use your trusted contact’s number, rather than your own."
            case "trusted_contact_exists": "This number is already in your trusted contacts."
            case "trusted_contact_limit": "You can have up to five trusted contacts. Remove one before adding another."
            case "trusted_contact_unavailable": "This request is no longer available. Refresh to see current requests."
            case "texts_stopped": "You stopped Shield texts. Reply START to Shield’s text number to resume, or choose app alerts."
            case "alert_channel_required": "Choose text messages, app notifications, or both."
            case "invalid_phone": "Enter a valid US or Canadian phone number."
            case "routing_test_required", "setup_incomplete": "Check that your phone works with Shield before starting again."
            case "setup_not_ready": "Finish phone setup before trying again."
            case "restoration_in_progress", "restore_forwarding_before_deletion": "Disconnect Shield in Phone setup and check ordinary calls and voicemail before deleting your account. If you already disconnected, Shield needs to confirm the restoration."
            case "account_deletion_unavailable": "Account deletion hasn’t finished. Please try again. Some information may already have been removed."
            case "test_window_closed": "The call test ended. Start it again to continue."
            case "test_limit_reached": "Today’s call-test limit is reached. Restore your phone and try again tomorrow."
            case "call_still_active": "Wait for the current call to end, then try again."
            case "probe_unavailable": "Automatic call checks are not available on this phone service yet."
            case "voicemail_not_found": "This message has expired or was deleted."
            case "daily_limit_reached", "try_again_later": "Please try again later."
            case "sign_in_unavailable": "Sign-in isn’t ready yet. Please try again later."
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
