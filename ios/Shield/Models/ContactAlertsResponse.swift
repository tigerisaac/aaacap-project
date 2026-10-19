import Foundation

struct ContactAlertsResponse: Decodable, Sendable {
    let requests: [ContactAlertRequest]
    let textAvailable: Bool
    let appAvailable: Bool
    let textsStopped: Bool
    var inboxAvailable: Bool? = nil
    var events: [ContactInterventionAlert]? = nil
}
