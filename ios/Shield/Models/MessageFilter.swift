import Foundation

enum MessageFilter: String, CaseIterable, Identifiable {
    case all, voicemail, notices
    var id: Self { self }
    var label: String {
        switch self {
        case .all: "All"
        case .voicemail: "Voicemail"
        case .notices: "Notices"
        }
    }
    func includes(_ call: CallRecord) -> Bool {
        guard let message = call.voicemail else { return false }
        switch self {
        case .all: return true
        case .voicemail: return !message.isNotice
        case .notices: return message.isNotice
        }
    }
    var emptyTitle: String {
        switch self {
        case .all: "No messages yet"
        case .voicemail: "No voicemail yet"
        case .notices: "No saved notices yet"
        }
    }
}
