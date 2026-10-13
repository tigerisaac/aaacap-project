import Foundation

enum ForwardingStep: String, CaseIterable, Identifiable {
    case overview, consent, save, ring, settings, liveVoicemail, forward0, forward1, forward2, test, checks, restore
    var id: String { rawValue }
    var title: String {
        switch self {
        case .overview: "Set up your phone"
        case .consent: "Choose Shield for calls"
        case .save: "Save Shield in Contacts"
        case .ring: "Can you hear Shield?"
        case .settings: "Change two Phone settings"
        case .liveVoicemail: "Check the voicemail setting"
        case .forward0: "When you don’t answer"
        case .forward1: "When you’re on a call"
        case .forward2: "When there’s no signal"
        case .test: "Check that calls reach Shield"
        case .checks: "Your setup is done"
        case .restore: "Bring back ordinary calls"
        }
    }
    var next: Self {
        switch self {
        case .overview: .consent
        case .consent: .save
        case .save: .ring
        case .ring: .settings
        case .settings: .liveVoicemail
        case .liveVoicemail: .forward0
        case .forward0: .forward1
        case .forward1: .forward2
        case .forward2: .test
        case .test, .checks: .checks
        case .restore: .restore
        }
    }
    var previous: Self? {
        guard let index = Self.allCases.firstIndex(of: self), index > 0, self != .restore else { return nil }
        return Self.allCases[index - 1]
    }
    var codeIndex: Int? {
        switch self { case .forward0: 0; case .forward1: 1; case .forward2: 2; default: nil }
    }
    var progressIndex: Int {
        switch self {
        case .overview: 0
        case .consent: 1
        case .save: 2
        case .ring: 3
        case .settings: 4
        case .liveVoicemail: 5
        case .forward0: 6
        case .forward1: 7
        case .forward2: 8
        case .test: 9
        case .checks: 10
        case .restore: 0
        }
    }
    var progressTitle: String {
        switch self {
        case .overview: "Before you begin"
        case .consent: "Your choice"
        case .save, .ring: "Meet Shield"
        case .settings, .liveVoicemail: "Phone settings"
        case .forward0, .forward1, .forward2: "Connect your carrier"
        case .test, .checks: "Call checks"
        case .restore: "Phone recovery"
        }
    }
    var progress: String {
        switch self {
        case .overview: "Phone setup"
        case .consent: "1 of 5 · Your choice"
        case .save, .ring: "2 of 5 · Meet Shield"
        case .settings, .liveVoicemail: "3 of 5 · Phone settings"
        case .forward0, .forward1, .forward2: "4 of 5 · Connect your carrier"
        case .test, .checks: "5 of 5 · Call checks"
        case .restore: "Bring back ordinary calls"
        }
    }
}
