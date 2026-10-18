import Foundation

enum APIError: LocalizedError {
    case unconfigured
    case invalidResponse
    case blockedNumbersUnsupported
    case incompleteBlockedNumbers
    case connectionInterrupted
    case service(code: String, status: Int)

    var errorDescription: String? {
        switch self {
        case .unconfigured: "Shield isn’t ready yet. Please try again later."
        case .invalidResponse: "We couldn’t finish that. Please try again."
        case .blockedNumbersUnsupported: "Shield’s service needs an update before all blocked numbers can load. Please try again later."
        case .incompleteBlockedNumbers: "The full blocked list couldn’t load. Please try again."
        case .connectionInterrupted: "Your connection was interrupted. Check your internet connection and try again."
        case let .service(code, _):
            switch code {
            case "sign_in_required", "sign_in_failed": "Please sign in again."
            case "enrollment_required": "Your account needs phone setup. Contact Shield to arrange it."
            case "owner_required": "Only the person using this phone can change this."
            case "service_access_required": "Check your Shield access in Settings before starting phone service. Contact Shield if you need help."
            case "subscription_check_in_progress": "Your access is already being checked. Try again in a moment."
            case "subscription_verification_unavailable", "subscriptions_unavailable": "Subscriptions aren’t available right now. Your phone settings haven’t changed. Please try again later."
            case "subscription_configuration_changed": "Close and reopen Shield to refresh its subscription settings."
            case "subscription_other_account": "This purchase belongs to another Shield account. Sign in to that account or contact support."
            case "subscription_store_unavailable": "The App Store couldn’t finish that. You can try again or restore a purchase."
            case "access_denied": "This person is no longer sharing with you."
            case "voicemail_not_shared": "Voicemail hasn’t been shared with you."
            case "recording_unavailable": "This recording isn’t available."
            case "phone_verification_unavailable": "Phone sign-in isn’t available right now. Please try again later."
            case "phone_code_incorrect": "That code didn’t match. Check the text and try again."
            case "phone_code_expired": "That code has expired or was already used. Request a new code."
            case "phone_code_wait": "Please wait a minute before requesting another code."
            case "phone_code_busy": "Your code is being checked. Please wait a moment."
            case "verified_phone_required": "Sign in with your mobile number to review caretaker requests."
            case "trusted_contacts_unavailable", "alert_channel_unavailable": "Caretaker alerts aren’t available yet. You can continue without them."
            case "trusted_contact_required": "Add a caretaker before turning on alerts."
            case "trusted_contact_self": "Use your caretaker’s number, rather than your own."
            case "trusted_contact_exists": "This number is already in your caretakers."
            case "trusted_contact_limit": "You can have up to five caretakers. Remove one before adding another."
            case "trusted_contact_unavailable": "This request is no longer available. Refresh to see current requests."
            case "texts_stopped": "You stopped Shield texts. Reply START to Shield’s text number to resume, or choose app alerts."
            case "alert_channel_required": "Choose text messages, app notifications, or both."
            case "invalid_phone": "Enter a valid US or Canadian phone number."
            case "routing_test_required", "setup_incomplete": "Check that your phone works with Shield before starting again."
            case "setup_not_ready": "Finish phone setup before trying again."
            case "restoration_in_progress", "restore_forwarding_before_deletion": "Disconnect Shield in Phone setup and check ordinary calls and voicemail before deleting your account. If you already disconnected, Shield needs to confirm the restoration."
            case "restoration_changed": "Your saved progress changed. Refresh this guide before continuing."
            case "forwarding_still_arriving": "A call still reached Shield during these checks. Review the carrier steps, then check ordinary calls and voicemail again."
            case "account_deletion_pending": "Your account is being deleted. Check the deletion screen for progress."
            case "deletion_receipt_unavailable": "This progress receipt is no longer available. Completed receipts are kept for seven days."
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
