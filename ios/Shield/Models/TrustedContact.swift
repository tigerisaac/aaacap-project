import Foundation

struct TrustedContact: Decodable, Identifiable, Sendable {
    let id: UUID
    let name: String
    let phone: String
    let status: String
    let textAlerts: Bool
    let appAlerts: Bool
    let requestDelivery: String
    var inAppAlerts: Bool? = nil

    var statusLabel: String {
        switch status {
        case "accepted": textAlerts && appAlerts ? "Text and notification alerts" : textAlerts ? "Text alerts" : appAlerts ? "Notification alerts" : inAppAlerts == true ? "Alerts when they open Shield" : "No alert channel selected"
        case "declined": "Declined"
        case "expired": "Request expired"
        default: "Waiting for confirmation"
        }
    }
}
