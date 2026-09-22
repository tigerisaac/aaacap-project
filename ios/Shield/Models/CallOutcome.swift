import Foundation

enum CallOutcome: String, Codable, Sendable {
    case screening, offered, connected, held, verification, voicemail, missed

    var label: String {
        switch self {
        case .screening: "Screening"
        case .offered: "Offered"
        case .connected: "Connected"
        case .held: "Held"
        case .verification: "Check first"
        case .voicemail: "Message"
        case .missed: "Missed"
        }
    }

    var symbol: String {
        switch self {
        case .held, .verification: "hand.raised.fill"
        case .connected: "phone.arrow.up.right.fill"
        case .voicemail: "waveform"
        case .missed: "phone.down.fill"
        case .offered, .screening: "phone.badge.waveform.fill"
        }
    }
}
