import Foundation

struct SharingGrant: Codable, Identifiable, Sendable {
    let id: UUID
    let label: String
    let canListen: Bool
    let accepted: Bool
    let expiresAt: Date
}
