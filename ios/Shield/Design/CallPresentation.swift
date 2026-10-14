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
        if call.outcome == .held, call.acceptedAt != nil { return "Shield ended this call after you answered." }
        return switch call.outcome {
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

/// Calls on one calendar day, newest first, for a dated history list.
struct CallDay: Identifiable {
    let id: Date
    let calls: [CallRecord]

    var title: String {
        let calendar = Calendar.current
        if calendar.isDateInToday(id) { return "Today" }
        if calendar.isDateInYesterday(id) { return "Yesterday" }
        let sameYear = calendar.isDate(id, equalTo: .now, toGranularity: .year)
        return id.formatted(sameYear ? .dateTime.weekday(.wide).month(.wide).day() : .dateTime.weekday(.wide).month(.wide).day().year())
    }

    /// Keeps the incoming order, so paging appends to the last day instead of reshuffling.
    static func group(_ calls: [CallRecord]) -> [CallDay] {
        var days: [CallDay] = []
        for call in calls {
            let day = Calendar.current.startOfDay(for: call.occurredAt)
            if let last = days.last, last.id == day {
                days[days.count - 1] = CallDay(id: day, calls: last.calls + [call])
            } else {
                days.append(CallDay(id: day, calls: [call]))
            }
        }
        return days
    }
}
