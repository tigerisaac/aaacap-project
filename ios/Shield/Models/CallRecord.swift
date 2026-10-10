import Foundation

struct CallRecord: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let occurredAt: Date
    let callerNumber: String
    let title: String
    let outcome: CallOutcome
    let reasonCode: String
    let detail: String
    let nextStep: String
    let acceptedAt: Date?
    let endedAt: Date?
    let voicemail: Voicemail?
    var monitored: Bool? = nil
}
