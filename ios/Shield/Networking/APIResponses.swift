import Foundation

enum APIResponses {
    struct People: Decodable, Sendable { let people: [Person]; let isDemo: Bool }
    struct Calls: Decodable, Sendable { let calls: [CallRecord]; let nextCursor: String? }
    struct CallDetail: Decodable, Sendable { let call: CallRecord; let events: [CallEvent] }
    struct Numbers: Decodable, Sendable { let items: [SavedNumber] }
    struct Sharing: Decodable, Sendable { let grants: [SharingGrant] }
    struct Invitation: Decodable, Sendable { let id: UUID; let code: String }
    struct Joined: Decodable, Sendable { let participantId: UUID }
    struct Empty: Decodable, Sendable {}
    struct ErrorEnvelope: Decodable, Sendable {
        struct Detail: Decodable, Sendable { let code: String }
        let error: Detail
    }
}
