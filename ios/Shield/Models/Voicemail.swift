import Foundation

struct Voicemail: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let duration: Int
    let status: String
    let heardAt: Date?

    var durationLabel: String {
        Duration.seconds(duration).formatted(.time(pattern: .minuteSecond))
    }
}
