import Foundation

struct SavedNumber: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let label: String
    let phone: String
    let provenance: String?
    let createdAt: Date
}
