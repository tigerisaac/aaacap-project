import Foundation

enum DemoData {
    static let participant = Person(id: UUID(uuidString: "11111111-1111-4111-8111-111111111111")!, name: "Pat", isOwner: true, canListen: true)
    static let sharedPerson = Person(id: UUID(uuidString: "22222222-2222-4222-8222-222222222222")!, name: "Alex", isOwner: false, canListen: false)
    static let people = [participant, sharedPerson]

    static let calls: [CallRecord] = [
        make(minutes: 24, title: "Call held for review", outcome: .held, reason: "prohibited_request",
             detail: "The introduction included a request for a security code. This call was not connected.",
             next: "Contact the organization using a number from your card or statement.", suffix: "0123"),
        make(minutes: 108, title: "Prescription notification", outcome: .connected, reason: "routine",
             detail: "You accepted this call after a private summary. The caller’s identity was not verified.",
             next: "Never share secret codes or move money at a caller’s request.", suffix: "0124"),
        make(minutes: 196, title: "Missed contact call", outcome: .voicemail, reason: "known_missed",
             detail: "The displayed number matched a saved contact. The caller left a message.",
             next: "Review the message before following up.", suffix: "0125", message: true),
        make(minutes: 380, title: "Verify independently", outcome: .verification, reason: "sensitive_issue",
             detail: "The caller described an account problem. The call was held for independent verification.",
             next: "Use a number from your card or statement.", suffix: "0126"),
        make(minutes: 1520, title: "Appointment reminder", outcome: .connected, reason: "routine",
             detail: "You accepted this call after a private summary. The caller’s identity was not verified.",
             next: "Ask your provider directly if anything seems unusual.", suffix: "0127"),
        make(minutes: 1880, title: "Not enough information", outcome: .voicemail, reason: "uncertain",
             detail: "The introduction wasn’t clear enough to screen. The caller was offered a message.",
             next: "Review the message when convenient.", suffix: "0128", message: true)
    ]

    static func overview(for person: Person) -> Overview {
        let activity = person.isOwner ? calls : Array(calls.suffix(3))
        return Overview(name: person.name, status: "demo", lastTestAt: nil, isDemo: true,
                        isOwner: person.isOwner, canListen: person.canListen,
                        counts: .init(total: activity.count,
                                      held: activity.filter { CallFilter.held.includes($0) }.count,
                                      connected: activity.filter { $0.outcome == .connected }.count,
                                      messages: activity.filter { $0.voicemail != nil }.count),
                        recent: activity)
    }

    private static func make(minutes: Int, title: String, outcome: CallOutcome, reason: String, detail: String, next: String, suffix: String, message: Bool = false) -> CallRecord {
        let time = Date.now.addingTimeInterval(Double(-minutes * 60))
        return CallRecord(id: UUID(), occurredAt: time, callerNumber: "+1512555\(suffix)",
                          title: title, outcome: outcome, reasonCode: reason, detail: detail, nextStep: next,
                          acceptedAt: outcome == .connected ? time.addingTimeInterval(30) : nil,
                          endedAt: time.addingTimeInterval(80),
                          voicemail: message ? Voicemail(id: UUID(), duration: 28, status: "sample", heardAt: nil) : nil)
    }
}
