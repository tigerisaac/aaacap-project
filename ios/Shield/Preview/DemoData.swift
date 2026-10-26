import Foundation

enum DemoData {
    static let participant = Person(id: UUID(uuidString: "11111111-1111-4111-8111-111111111111")!, name: "Pat", isOwner: true, canListen: true)
    static let sharedPerson = Person(id: UUID(uuidString: "22222222-2222-4222-8222-222222222222")!, name: "Alex", isOwner: false, canListen: false)
    static let people = [participant, sharedPerson]

    static let calls: [CallRecord] = [
        make(minutes: 12, title: "Saved account notice", outcome: .voicemail, reason: "automated_notice",
             detail: "Shield saved an automated notice without connecting the call. The sender is unverified.",
             next: "Check your bank’s app or use the number on your card.", suffix: "0130", message: true),
        make(minutes: 24, title: "Call held for review", outcome: .held, reason: "prohibited_request",
             detail: "The caller asked for a secret code. Shield didn’t connect the call.",
             next: "Use a number from your card or bill to check.", suffix: "0123"),
        make(minutes: 108, title: PreviewScenario.appStoreCapture ? "Refill reminder" : "Prescription notification", outcome: .connected, reason: "routine",
             detail: "You chose to answer. Shield can’t prove who called.",
             next: "Don’t share secret codes or send money because a caller asks.", suffix: "0124"),
        make(minutes: 196, title: "Appointment message", outcome: .voicemail, reason: "known_missed",
             detail: "A caller left an appointment reminder.",
             next: "Listen before calling back.", suffix: "0125", message: true),
        make(minutes: 380, title: "Verify independently", outcome: .verification, reason: "sensitive_issue",
             detail: "The caller said there was an account problem. Shield stopped the call so you could check.",
             next: "Use a number from your card or bill.", suffix: "0126"),
        make(minutes: 640, title: "Scam voicemail removed", outcome: .held, reason: "voicemail_removed_scam",
             detail: "Shield discarded a message with a clear scam request. Its audio and text weren’t kept.",
             next: "Use a trusted number if you need to check with the organization.", suffix: "0129", removedMessage: true),
        make(minutes: 1520, title: "Appointment reminder", outcome: .connected, reason: "routine",
             detail: "You chose to answer. Shield can’t prove who called.",
             next: "Check with your usual clinic if anything seems unusual.", suffix: "0127"),
        make(minutes: 1880, title: "Not enough information", outcome: .voicemail, reason: "uncertain",
             detail: "Shield couldn’t tell what the caller wanted. They could leave a message.",
             next: "Review the message when convenient.", suffix: "0128", message: true)
    ]

    static func overview(for person: Person) -> Overview {
        let activity = person.isOwner ? calls : Array(calls.suffix(3))
        return Overview(name: person.name, status: "demo", lastTestAt: nil, isDemo: true,
                        isOwner: person.isOwner, canListen: person.canListen,
                        counts: .init(total: activity.count,
                                      held: activity.filter { CallFilter.held.includes($0) }.count,
                                      connected: activity.filter { $0.outcome == .connected }.count,
                                      messages: activity.filter { $0.voicemail != nil && $0.voicemail?.status != "removed" }.count,
                                      stoppedTotal: activity.filter { CallFilter.held.includes($0) }.count),
                        recent: activity)
    }

    private static func make(minutes: Int, title: String, outcome: CallOutcome, reason: String, detail: String, next: String, suffix: String,
                             message: Bool = false, removedMessage: Bool = false) -> CallRecord {
        let clock = PreviewScenario.appStoreCapture
            ? Calendar.current.date(bySettingHour: 9, minute: 41, second: 0, of: .now) ?? .now : .now
        let time = clock.addingTimeInterval(Double(-minutes * 60))
        return CallRecord(id: UUID(), occurredAt: time, callerNumber: "+1512555\(suffix)",
                          title: title, outcome: outcome, reasonCode: reason, detail: detail, nextStep: next,
                          acceptedAt: outcome == .connected ? time.addingTimeInterval(30) : nil,
                          endedAt: time.addingTimeInterval(80),
                          voicemail: removedMessage ? Voicemail(id: UUID(), duration: 31, status: "removed", heardAt: nil,
                                                                removedAt: time.addingTimeInterval(120))
                            : message ? Voicemail(id: UUID(), duration: 28, status: "sample", heardAt: nil,
                                kind: reason == "automated_notice" ? "notice" : "voicemail",
                                summary: reason == "automated_notice" ? "An automated caller reported unusual card activity. The sender hasn’t been verified."
                                    : reason == "known_missed" ? "The caller left an appointment reminder for Thursday at 10 a.m." : "The caller asked Pat to get in touch.",
                                summaryStatus: "ready", decision: "keep") : nil)
    }
}
