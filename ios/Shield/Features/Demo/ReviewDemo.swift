import Foundation
import Observation

/// A disposable local account. It never owns a participant, subscription or phone route.
@MainActor
@Observable
final class ReviewDemo {
    var blockedNumbers = [BlockedNumber(id: String(repeating: "a", count: 64), phone: "+13125550199", reason: "scam",
        blockedAt: .now.addingTimeInterval(-86400), expiresAt: .now.addingTimeInterval(179 * 86400), attempts: 2, lastAttemptAt: .now)]
    var monitoringEnabled = false
    var caretakers = TrustedContactsResponse(available: false, choiceRecorded: true, enabled: true,
        contacts: ["Jamie", "Morgan"].enumerated().map { index, name in
            TrustedContact(id: UUID(uuidString: "00000000-0000-4000-8000-00000000000\(index + 1)")!, name: name,
                phone: "+1202555010\(index + 1)", status: "accepted", textAlerts: false, appAlerts: false,
                requestDelivery: "not_requested", inAppAlerts: true)
        }, textAvailable: false, appAvailable: false, inboxAvailable: true)

    let calls: [CallRecord] = {
        let time = Date.now.addingTimeInterval(-3600)
        let intervention = CallRecord(id: UUID(), occurredAt: time, callerNumber: "+15125550131",
            title: "Call ended after a warning", outcome: .held, reasonCode: "monitor_intervened",
            detail: "In this fictional example, the caller asked Pat to transfer money. Connected-call protection ended the call and played a warning.",
            nextStep: "Check independently using a number you already trust.", acceptedAt: time.addingTimeInterval(30),
            endedAt: time.addingTimeInterval(90), voicemail: nil, monitored: true)
        let messages = DemoData.calls.map { call -> CallRecord in
            guard let message = call.voicemail, message.status != "removed" else { return call }
            let audio = Voicemail(id: message.id, duration: 13, status: "sample", heardAt: nil,
                kind: message.kind, summary: message.summary, summaryStatus: message.summaryStatus, decision: message.decision)
            return CallRecord(id: call.id, occurredAt: call.occurredAt, callerNumber: call.callerNumber,
                title: call.title, outcome: call.outcome, reasonCode: call.reasonCode, detail: call.detail,
                nextStep: call.nextStep, acceptedAt: call.acceptedAt, endedAt: call.endedAt, voicemail: audio, monitored: call.monitored)
        }
        return (messages + [intervention]).sorted { $0.occurredAt > $1.occurredAt }
    }()

    var overview: Overview {
        Overview(name: DemoData.participant.name, status: "demo", lastTestAt: nil, isDemo: true, isOwner: true, canListen: true,
            counts: .init(total: calls.count, held: calls.filter { CallFilter.held.includes($0) }.count,
                connected: calls.filter { $0.outcome == .connected }.count,
                messages: calls.filter { $0.voicemail != nil && $0.voicemail?.status != "removed" }.count,
                stoppedTotal: calls.filter { CallFilter.held.includes($0) }.count), recent: calls)
    }

    func setCaretakers(enabled: Bool? = nil, contacts: [TrustedContact]? = nil) {
        caretakers = .init(available: false, choiceRecorded: true, enabled: enabled ?? caretakers.enabled,
            contacts: contacts ?? caretakers.contacts, textAvailable: false, appAvailable: false, inboxAvailable: true)
    }

    static func audio(for call: CallRecord) throws -> Data {
        let name = call.voicemail?.isNotice == true ? "DemoAccountNotice"
            : call.reasonCode == "known_missed" ? "DemoAppointment" : "DemoCallback"
        return try audio(named: name)
    }

    static func audio(named name: String) throws -> Data {
        guard let url = Bundle.main.url(forResource: name, withExtension: "m4a") else { throw APIError.invalidResponse }
        return try Data(contentsOf: url)
    }
}
