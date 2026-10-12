import Foundation

enum CallFilter: String, CaseIterable, Identifiable, Sendable {
    case all, held, connected, voicemail
    var id: Self { self }
    var label: String {
        switch self {
        case .all: "All"
        case .held: "Stopped"
        case .connected: "Answered"
        case .voicemail: "Voicemail"
        }
    }
    func includes(_ call: CallRecord) -> Bool {
        switch self {
        case .all: true
        case .held: call.outcome == .held || call.outcome == .verification
        case .connected: call.outcome == .connected
        case .voicemail: call.voicemail != nil
        }
    }
}
