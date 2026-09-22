import Foundation

struct Overview: Codable, Sendable {
    struct Counts: Codable, Sendable {
        let total: Int
        let held: Int
        let connected: Int
        let messages: Int
    }
    let name: String
    let status: String
    let lastTestAt: Date?
    let isDemo: Bool
    let isOwner: Bool
    let canListen: Bool
    let counts: Counts
    let recent: [CallRecord]
}
