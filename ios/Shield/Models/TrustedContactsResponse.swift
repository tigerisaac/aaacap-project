import Foundation

struct TrustedContactsResponse: Decodable, Sendable {
    let available: Bool
    let choiceRecorded: Bool
    let enabled: Bool
    let contacts: [TrustedContact]
    var textAvailable: Bool? = nil
    var appAvailable: Bool? = nil
    var invitationURL: URL? = nil
    var inboxAvailable: Bool? = nil
    var invitationPreview: InvitationPreview? = nil
    var supportsRequests: Bool { available || inboxAvailable == true }

    struct InvitationPreview: Decodable, Sendable {
        let sender: String
        let message: String
        let version: String
    }
}
