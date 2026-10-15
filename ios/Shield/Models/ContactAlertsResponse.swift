import Foundation

struct ContactAlertsResponse: Decodable, Sendable {
    let requests: [ContactAlertRequest]
    let textAvailable: Bool
    let appAvailable: Bool
    let textsStopped: Bool
}
