import Foundation

struct Person: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let name: String
    let isOwner: Bool
    let canListen: Bool
}
