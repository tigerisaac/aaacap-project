import Foundation

enum CallPresentation {
    static func title(_ call: CallRecord) -> String {
        let title = call.title.trimmingCharacters(in: .whitespacesAndNewlines)
        switch title.lowercased() {
        case "call held for review": return "Call stopped"
        case "verify independently": return "Check this call"
        case "prescription notification": return "Prescription reminder"
        case "missed contact call": return "A caller left a message"
        case "scam voicemail removed": return "Suspicious message removed"
        case "not enough information", "": return PhoneDisplay.format(call.callerNumber)
        default: return title
        }
    }

    static func explanation(_ call: CallRecord) -> String {
        switch call.outcome {
        case .held: "Shield stopped this call from reaching you."
        case .verification: "Shield couldn’t tell whether this call was genuine."
        case .connected: "You chose to answer this call."
        case .voicemail: "The caller left you a message."
        case .missed: "You didn’t answer this call."
        case .offered: "Shield rang your phone."
        case .screening: "Shield is asking what this call is about."
        }
    }
}
