import Foundation

extension AppState {
    /// Restore the status with the rest of the owner's local Home, before its first render.
    func restoreHomeStatus() async {
        let generation = sessionGeneration
        guard signedIn, !isPreview, isOwner, let id = selectedPersonID else { return }
        let saved: (value: ForwardingStatus, savedAt: Date, isFresh: Bool)? = await api.savedPhoneSetup("/api/forwarding", participantID: id)
        guard signedIn, generation == sessionGeneration, selectedPersonID == id else { return }
        if let saved, saved.value.participantId == id {
            restoredPhoneSetup = (saved.value, saved.savedAt)
        }
    }

    func loadOfflineHistory() async {
        let generation = sessionGeneration
        guard signedIn, !isPreview, let account = await api.localAccountID, signedIn, generation == sessionGeneration else { return }
        await historyStore.activate(account)
        let saved = (try? await historyStore.load(account: account)) ?? []
        guard signedIn, generation == sessionGeneration else { return }
        offlineHistories = saved
        people = saved.map(\.person)
        selectedPersonID = people.first?.id
        showOfflineHistory()
    }

    func showOfflineHistory() {
        guard let history = offlineHistories.first(where: { $0.person.id == selectedPersonID }) else { return }
        overview = history.overview
        calls = history.calls.filter(filter.includes)
        historySavedAt = history.updatedAt
        showingSavedHistory = true
        nextCursor = nil
    }

    func saveOfflineHistory(page: [CallRecord], overview: Overview? = nil) async {
        let generation = sessionGeneration
        guard signedIn, !isPreview, let person, person.isOwner, let account = await api.localAccountID,
              signedIn, generation == sessionGeneration, selectedPersonID == person.id else { return }
        let previous = offlineHistories.first { $0.person.id == person.id }
        let combined = Dictionary((page + (previous?.calls ?? [])).map { ($0.id, $0) }, uniquingKeysWith: { fresh, _ in fresh })
        let history = OfflineHistory(person: person, overview: overview ?? previous?.overview,
            calls: Array(combined.values), updatedAt: .now).retained(at: .now)
        offlineHistories.removeAll { $0.person.id == person.id }
        offlineHistories.append(history)
        do {
            try await historyStore.save(offlineHistories, account: account)
            if signedIn, generation == sessionGeneration, selectedPersonID == person.id { historySavedAt = history.updatedAt }
        } catch { /* History caching is best effort; audio delivery has its own strict durable-save checks. */ }
    }

    func removeFromOfflineHistory(_ id: UUID, personID: UUID, account: String) async throws {
        for index in offlineHistories.indices where offlineHistories[index].person.id == personID {
            offlineHistories[index].calls.removeAll { $0.id == id }
            if let old = offlineHistories[index].overview {
                offlineHistories[index].overview = Overview(name: old.name, status: old.status, lastTestAt: old.lastTestAt,
                    isDemo: old.isDemo, isOwner: old.isOwner, canListen: old.canListen, counts: old.counts,
                    recent: old.recent.filter { $0.id != id })
            }
        }
        calls.removeAll { $0.id == id }
        if selectedPersonID == personID { overview = offlineHistories.first { $0.person.id == personID }?.overview }
        try await historyStore.save(offlineHistories, account: account)
    }

    func reconcileOfflineOwners() async {
        let generation = sessionGeneration
        guard let account = await api.localAccountID, generation == sessionGeneration, signedIn else { return }
        let owners = Set(people.filter(\.isOwner).map(\.id))
        offlineHistories.removeAll { !owners.contains($0.person.id) }
        try? await historyStore.save(offlineHistories, account: account)
    }
}
