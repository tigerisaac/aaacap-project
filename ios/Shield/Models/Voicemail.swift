import Foundation

struct Voicemail: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let duration: Int
    let status: String
    let heardAt: Date?
    var removedAt: Date? = nil
    /// Until then, someone who can listen can restore a message Shield removed; after it, the audio is gone.
    var restorableUntil: Date? = nil
    var kind: String? = nil
    var summary: String? = nil
    var summaryStatus: String? = nil
    var decision: String? = nil
    var audioExpiresAt: Date? = nil
    var audioDeliveredAt: Date? = nil
    var audioExpiredAt: Date? = nil
    var isNotice: Bool { kind == "notice" }
    var kindLabel: String { isNotice ? "Saved notice" : "Voicemail" }
    var isRestorable: Bool { status == "removed" && (restorableUntil.map { $0 > .now } ?? false) }

    var durationLabel: String {
        Duration.seconds(duration).formatted(.units(allowed: [.minutes, .seconds], width: .wide))
    }
}
