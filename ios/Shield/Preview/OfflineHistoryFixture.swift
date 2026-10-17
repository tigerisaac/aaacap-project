#if DEBUG && targetEnvironment(simulator)
import Foundation

extension AppState {
    func seedOfflineHistoryFixture() async {
        guard ProcessInfo.processInfo.arguments.contains("--seed-offline-history"), let account = await api.localAccountID else { return }
        let person = Person(id: UUID(uuidString: "73e226c8-fb94-4fa1-9848-2c290e6b9712")!, name: "Synthetic owner", isOwner: true, canListen: true)
        let call = CallRecord(id: UUID(uuidString: "824f9abb-773a-4299-9c54-629bb1cc5222")!, occurredAt: .now,
            callerNumber: "Synthetic", title: "Offline saved call", outcome: .held, reasonCode: "likely_scam", detail: "Synthetic offline test", nextStep: "", acceptedAt: nil, endedAt: .now, voicemail: nil)
        let calls = ProcessInfo.processInfo.arguments.contains("--uitesting-call-filter-parity") ? CallFilterFixture.calls : [call]
        let summary = Overview(name: person.name, status: "active", lastTestAt: nil, isDemo: false, isOwner: true, canListen: true,
            counts: .init(total: 1, held: 1, connected: 0, messages: 0, stoppedTotal: 1), recent: [call])
        await historyStore.activate(account)
        try? await historyStore.save([OfflineHistory(person: person, overview: summary, calls: calls, updatedAt: .now)], account: account)
        if ProcessInfo.processInfo.arguments.contains("--uitesting-cold-launch") {
            let status = try? APIClient.payload([
                "participantId": person.id.uuidString, "carrier": "Synthetic", "phone": "Synthetic", "shieldNumber": "Synthetic",
                "liveScreening": true, "alwaysOn": true, "prepared": true, "active": true, "remainingCalls": 0,
                "consentVersion": "fixture", "consented": true, "phoneVerified": true, "stage": "checks",
                "restorationRequested": false, "activationCodes": [], "restorationSteps": [], "readiness": "Synthetic", "latestEvents": []
            ])
            if let status { try? PhoneSetupCache().save(status, path: "/api/forwarding", participant: person.id, account: account) }
        }
    }
}

enum CallFilterFixture {
    static var calls: [CallRecord] {
        [CallOutcome.held, .voicemail].enumerated().map { index, outcome in
            let id = UUID(uuidString: index == 0 ? "824f9abb-773a-4299-9c54-629bb1cc5222" : "824f9abb-773a-4299-9c54-629bb1cc5233")!
            return CallRecord(id: id, occurredAt: Date(timeIntervalSince1970: 1_792_200_000 - Double(index * 60)), callerNumber: "Synthetic",
                              title: index == 0 ? "Removed synthetic message" : "Saved synthetic voicemail", outcome: outcome,
                              reasonCode: "synthetic", detail: "", nextStep: "", acceptedAt: nil, endedAt: nil,
                              voicemail: .init(id: id, duration: 1, status: index == 0 ? "removed" : "ready", heardAt: nil))
        }
    }
    static func page(_ filter: CallFilter) throws -> Data {
        struct Page: Encodable { let calls: [CallRecord]; let nextCursor: String? = nil }
        let encoder = JSONEncoder(); encoder.dateEncodingStrategy = .iso8601
        return try encoder.encode(Page(calls: calls.filter(filter.includes)))
    }
}
#endif
