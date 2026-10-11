import Foundation

/// A number Shield ends calls from after it stopped a scam from it. The id is the server's keyed hash, not the number.
struct BlockedNumber: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let phone: String
    let reason: String
    let blockedAt: Date
    let expiresAt: Date
    let attempts: Int
    let lastAttemptAt: Date?

    var reasonText: String {
        reason == "monitor_intervened" ? "Shield ended a call with this number" : "Shield stopped a scam call from this number"
    }
}
