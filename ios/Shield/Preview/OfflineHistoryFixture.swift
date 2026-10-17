#if DEBUG && targetEnvironment(simulator)
import Foundation

extension AppState {
    func seedOfflineHistoryFixture() async {
        guard ProcessInfo.processInfo.arguments.contains("--seed-offline-history"), let account = await api.localAccountID else { return }
        let person = Person(id: UUID(uuidString: "73e226c8-fb94-4fa1-9848-2c290e6b9712")!, name: "Synthetic owner", isOwner: true, canListen: true)
        let call = CallRecord(id: UUID(uuidString: "824f9abb-773a-4299-9c54-629bb1cc5222")!, occurredAt: .now,
            callerNumber: "Synthetic", title: "Offline saved call", outcome: .held, reasonCode: "likely_scam", detail: "Synthetic offline test", nextStep: "", acceptedAt: nil, endedAt: .now, voicemail: nil)
        let summary = Overview(name: person.name, status: "active", lastTestAt: nil, isDemo: false, isOwner: true, canListen: true,
            counts: .init(total: 1, held: 1, connected: 0, messages: 0, stoppedTotal: 1), recent: [call])
        await historyStore.activate(account)
        try? await historyStore.save([OfflineHistory(person: person, overview: summary, calls: [call], updatedAt: .now)], account: account)
    }
}
#endif
