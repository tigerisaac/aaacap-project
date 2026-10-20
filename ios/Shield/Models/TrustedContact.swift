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

    var invitationDeliveryLabel: String? {
        switch requestDelivery {
        case "delivered": "Request text delivered"
        case "submitted": "Request text submitted; delivery isn’t confirmed yet"
        case "delivery_failed", "failed": "Request text couldn’t be delivered. Share the invitation instead."
        case "delivery_unconfirmed", "unknown", "sending": "Text delivery isn’t confirmed. Share the invitation if needed."
        default: nil
        }
    }

    var statusLabel: String {
        switch status {
        case "accepted": textAlerts && appAlerts ? "Text and notification alerts" : textAlerts ? "Text alerts" : appAlerts ? "Notification alerts" : inAppAlerts == true ? "Alerts when they open Shield" : "No alert channel selected"
        case "declined": "Declined"
        case "expired": "Request expired"
        default: "Waiting for confirmation"
        }
    }
}
