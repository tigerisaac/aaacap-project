import Foundation

struct PublicEnrollmentStatus: Decodable, Sendable {
    struct Carrier: Decodable, Identifiable, Sendable {
        let id: String
        let name: String
    }
    let status: String
    let reason: String?
    let participantId: UUID?
    let phone: String
    let country: String?
    let carriers: [Carrier]
    let consentVersion: String
    let supportEmail: String

    var unavailableMessage: String {
        switch reason {
        case "carrier_not_supported": "Shield hasn’t verified a carrier for this phone’s country yet. Keep your current phone settings."
        case "enrollment_full": "Shield is at its current service capacity. Contact us before changing your phone settings."
        case "subscriptions_unavailable": "Public subscriptions aren’t available yet. You can still use caretaker features or contact Shield about assisted setup."
        case "enrollment_already_assigned": "Your account already has a setup arrangement. Contact Shield to continue it."
        default: "New phone setup isn’t available right now. Keep your current phone settings and contact Shield for help."
        }
    }
}
