import Foundation

struct ContactInterventionAlert: Decodable, Identifiable, Sendable {
    let id: String
    let name: String
    let occurredAt: Date
}
