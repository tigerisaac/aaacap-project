import Foundation

enum ForwardingStep: String, CaseIterable, Identifiable {
    case overview, consent, save, ring, settings, liveVoicemail, forward0, forward1, forward2, test, checks, restore
    var id: String { rawValue }
    var title: String {
        switch self {
        case .overview: "Set Up Call Screening"
        case .consent: "You’re in control"
        case .save: "Know when Shield calls"
        case .ring: "First, a sound check"
        case .settings: "Send unknown calls to Shield"
        case .liveVoicemail: "Let Shield take messages"
        case .forward0: "When you don’t answer"
        case .forward1: "When your line is busy"
        case .forward2: "When you have no signal"
        case .test: "Check your forwarding"
        case .checks: "Setup complete"
        case .restore: "Restore your phone"
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
        case .save, .ring: 2
        case .settings, .liveVoicemail: 3
        case .forward0, .forward1, .forward2: 4
        case .test, .checks: 5
        case .restore: 0
        }
    }
    var progressTitle: String {
        switch self {
        case .overview: "Before you begin"
        case .consent: "Your choice"
        case .save, .ring: "Meet Shield"
        case .settings, .liveVoicemail: "Phone settings"
        case .forward0, .forward1, .forward2: "Connect Tello"
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
        case .forward0, .forward1, .forward2: "4 of 5 · Connect Tello"
        case .test, .checks: "5 of 5 · Call checks"
        case .restore: "Restore your phone"
        }
    }
}
