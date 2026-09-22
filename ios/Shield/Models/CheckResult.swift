import Foundation

struct CheckResult: Codable, Sendable {
    let decision: String
    let reasonCode: String
    let title: String
    let detail: String
    let nextStep: String
    let isDemo: Bool
}
