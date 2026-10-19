import Foundation

struct ServiceConfiguration: Codable, Sendable {
    let mode: String
    let signInMethod: String?
    let consentVersion: String
    let supportEmail: String?
    let messageFilteringAvailable: Bool
    let notificationsAvailable: Bool
    let privacyPath: String
    let termsPath: String
    var publicEnrollmentSupported: Bool? = nil
    var trustedContactTextsAvailable: Bool? = nil
    var trustedContactsInvitationURL: URL? = nil
}
