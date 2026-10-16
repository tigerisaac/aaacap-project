import Foundation

/// Public, authored instructions only. Never contains recognized user text.
enum LiveSetupInstruction: String, Sendable, CaseIterable {
    case waiting, slideUp, slowDown, slideDown, chooseSilence, stopped

    var title: String {
        switch self {
        case .waiting: "Opening Phone settings"
        case .slideUp: "Slide your finger up"
        case .slowDown: "A little farther up"
        case .slideDown: "Slide down a little"
        case .chooseSilence: "Stop here"
        case .stopped: "Guide stopped"
        }
    }

    var detail: String {
        switch self {
        case .waiting: "Keep this guide in a clear corner."
        case .slideUp: "Go slowly. I’ll tell you when to stop."
        case .slowDown: "You’re close. Move the page slowly."
        case .slideDown: "The setting is just above this section."
        case .chooseSilence: "Tap “Silence”. Then return to Shield."
        case .stopped: "Return to Shield to continue."
        }
    }

    var symbol: String {
        switch self {
        case .slideUp, .slowDown: "hand.draw.fill"
        case .slideDown: "arrow.down"
        case .chooseSilence: "hand.raised.fill"
        case .waiting: "gearshape"
        case .stopped: "checkmark.circle"
        }
    }
}
