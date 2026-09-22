import Foundation

struct SetupStatus: Codable, Sendable {
    struct CarrierProfile: Codable, Sendable {
        let id: String
        let name: String
        let configuration: String
        let validatedAt: Date?
        let activationSteps: [String]
        let restorationSteps: [String]
    }
    let participantId: UUID
    let name: String
    let phone: String
    let shieldNumber: String
    let status: String
    let isOwner: Bool
    let consentVersion: String
    let consented: Bool
    let phoneVerified: Bool
    let lastTestAt: Date?
    let restoredAt: Date?
    let routingTestUntil: Date?
    let liveServiceEnabled: Bool
    let carrierProfile: CarrierProfile?
    let supportEmail: String?
    let isTrial: Bool?
    let trial: TrialWindow?
}
