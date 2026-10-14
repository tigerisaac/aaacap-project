import Foundation

struct ForwardingStatus: Decodable, Sendable {
    struct Event: Decodable, Sendable { let kind: String; let at: Date }
    struct Probe: Decodable, Sendable {
        let id: String
        let kind: String
        let state: String
        let expiresAt: Date
    }
    struct Monitoring: Decodable, Sendable {
        let available: Bool
        let enabled: Bool
        let consentVersion: String
        var choiceRecorded: Bool? = nil
    }
    struct QuietHours: Codable, Equatable, Sendable { var enabled: Bool; var start: Int; var end: Int }
    var quietHours: QuietHours? = nil
    var monitoring: Monitoring? = nil
    var probe: Probe? = nil
    var ringTestAt: Date? = nil
    var forwardingTestAt: Date? = nil
    var contactsSyncedAt: Date? = nil
    let participantId: UUID
    let carrier: String
    let phone: String
    let shieldNumber: String
    var liveScreening: Bool? = nil
    var alwaysOn: Bool? = nil
    var voiceProvider: String? = nil
    let prepared: Bool
    let active: Bool
    let expiresAt: Date?
    let remainingCalls: Int
    let consentVersion: String
    let consented: Bool
    let phoneVerified: Bool
    let stage: String
    let restorationRequested: Bool
    let lastTestAt: Date?
    let activationCodes: [String]
    let restorationSteps: [String]
    let readiness: String
    let latestEvents: [Event]
}
