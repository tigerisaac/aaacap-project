import Foundation

struct ContactAlertRequest: Decodable, Identifiable, Sendable {
    let id: UUID
    let name: String
    let status: String
    let textAlerts: Bool
    let appAlerts: Bool
    let ownerPaused: Bool
    var inAppAlerts: Bool? = nil
}
