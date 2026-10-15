import Foundation

struct TrustedContactsResponse: Decodable, Sendable {
    let available: Bool
    let choiceRecorded: Bool
    let enabled: Bool
    let contacts: [TrustedContact]
}
