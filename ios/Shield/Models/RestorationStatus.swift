import Foundation

struct RestorationStatus: Codable, Sendable {
    struct Step: Codable, Identifiable, Sendable {
        let id: String
        let kind: String
        var code: String?
    }
    var id: UUID?
    var index: Int
    var completed: Bool
    var steps: [Step]
    var instructions: [String]
    var carrier: String
    var required: Bool
    var evidence: String?
    var current: Step? { steps.indices.contains(index) ? steps[index] : nil }
}
