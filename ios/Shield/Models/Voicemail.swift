import Foundation

struct Voicemail: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let duration: Int
    let status: String
    let heardAt: Date?
    var removedAt: Date? = nil
    /// Until then, someone who can listen can restore a message Shield removed; after it, the audio is gone.
    var restorableUntil: Date? = nil
    var isRestorable: Bool { status == "removed" && (restorableUntil.map { $0 > .now } ?? false) }

    var durationLabel: String {
        Duration.seconds(duration).formatted(.time(pattern: .minuteSecond))
    }
}
