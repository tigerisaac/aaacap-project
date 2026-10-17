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
    static func localGuide(instructions: [String], carrier: String) -> Self {
        .init(index: 0, completed: false,
              steps: [.init(id: "carrier", kind: "carrier"), .init(id: "settings", kind: "settings"),
                      .init(id: "voicemail-settings", kind: "voicemailSettings"), .init(id: "call", kind: "call"),
                      .init(id: "voicemail", kind: "voicemail")],
              instructions: instructions, carrier: carrier, required: true)
    }
    var current: Step? { steps.indices.contains(index) ? steps[index] : nil }
}
