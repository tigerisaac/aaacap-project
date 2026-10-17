import Foundation

enum CallFilter: String, CaseIterable, Identifiable, Sendable {
    case all, held, connected, voicemail
    var id: Self { self }
    var label: String {
        switch self {
        case .all: "All"
        case .held: "Stopped"
        case .connected: "Answered"
        case .voicemail: "Messages"
        }
    }
    var emptyTitle: String {
        switch self {
        case .all: "No calls yet"
        case .held: "No stopped calls"
        case .connected: "No answered calls"
        case .voicemail: "No messages yet"
        }
    }
    func includes(_ call: CallRecord) -> Bool {
        switch self {
        case .all: true
        case .held: call.outcome == .held || call.outcome == .verification
        case .connected: call.outcome == .connected
        // Match /api/calls: stopped calls can retain removed-message metadata.
        case .voicemail: call.outcome == .voicemail
        }
    }
}
