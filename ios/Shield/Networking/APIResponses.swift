import Foundation

enum APIResponses {
    struct People: Decodable, Sendable { let people: [Person]; let isDemo: Bool }
    struct Calls: Decodable, Sendable { let calls: [CallRecord]; let nextCursor: String? }
    struct CallDetail: Decodable, Sendable { let call: CallRecord; let events: [CallEvent] }
    struct ContactSync: Decodable, Sendable { let shared: Int; let skipped: Int }
    struct Numbers: Decodable, Sendable { let items: [SavedNumber] }
    struct BlockedNumbers: Decodable, Sendable { let items: [BlockedNumber] }
    struct HelperAlerts: Decodable, Sendable { let available: Bool; let enabled: Bool; let choiceRecorded: Bool }
    struct Sharing: Decodable, Sendable { let grants: [SharingGrant] }
    struct Empty: Decodable, Sendable {}
    struct ErrorEnvelope: Decodable, Sendable {
        struct Detail: Decodable, Sendable { let code: String }
        let error: Detail
    }
}
