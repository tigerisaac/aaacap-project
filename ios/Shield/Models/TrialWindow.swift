import Foundation

struct TrialWindow: Codable, Sendable {
    let active: Bool
    let expiresAt: Date?
    let remainingCalls: Int
}
