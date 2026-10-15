import Foundation

struct TrustedContact: Decodable, Identifiable, Sendable {
    let id: UUID
    let name: String
    let phone: String
    let status: String
    let textAlerts: Bool
    let appAlerts: Bool
    let requestDelivery: String

    var statusLabel: String {
        switch status {
        case "accepted": textAlerts && appAlerts ? "Text and app alerts" : textAlerts ? "Text alerts" : "App alerts"
        case "declined": "Declined"
        case "expired": "Request expired"
        default: "Waiting for confirmation"
        }
    }
}
