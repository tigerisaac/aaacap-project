import Foundation

protocol MessageDeliveryAPI: Sendable {
    func downloadMessage(_ id: UUID, participantID: UUID) async throws -> MessageDelivery
    func confirmMessage(_ id: UUID, participantID: UUID, delivery: MessageDelivery) async throws
}


actor MessageAudioDelivery {
    let store: MessageAudioStore
    private let api: any MessageDeliveryAPI
    private var account: String?
    private var generation = 0
    private var deletions: [UUID: Int] = [:]
    init(api: any MessageDeliveryAPI, store: MessageAudioStore = MessageAudioStore()) { self.api = api; self.store = store }
    func activate(_ account: String?) async {
        if self.account != account { generation += 1 }
        self.account = account
        await store.activate(account)
    }
    func removeAccount(_ account: String) async throws {
        guard self.account == account else { throw CancellationError() }
        generation += 1
        self.account = nil
        try await store.removeAccount(account)
    }
    func forget(account: String, id: UUID) async throws {
        guard self.account == account else { throw CancellationError() }
        deletions[id, default: 0] += 1
        try await store.remove(account: account, id: id)
    }

    func receive(call: CallRecord, person: Person, account: String) async throws -> Data {
        guard self.account == account, person.isOwner, person.canListen, call.voicemail?.status == "ready" else { throw CancellationError() }
        let deletion = deletions[call.id, default: 0]
        let generation = self.generation
        if var saved = try await store.load(account: account, id: call.id) {
            guard self.account == account, self.generation == generation, deletions[call.id, default: 0] == deletion else { throw CancellationError() }
            guard saved.person.id == person.id else { throw CancellationError() }
            if saved.call != call { saved.call = call; try await store.save(saved, account: account) }
            try await acknowledge(saved, account: account)
            return saved.delivery.audio
        }
        if call.voicemail?.audioDeliveredAt != nil || call.voicemail?.audioExpiredAt != nil
            || (call.voicemail?.audioExpiresAt.map { $0 <= .now } ?? false) { throw MessageAudioError.unavailable }
        let delivery = try await api.downloadMessage(call.id, participantID: person.id)
        guard self.account == account, self.generation == generation, deletions[call.id, default: 0] == deletion else { throw CancellationError() }
        try Task.checkCancellation()
        let saved = SavedMessageAudio(person: person, call: call, delivery: delivery, acknowledged: false)
        try await store.save(saved, account: account)
        // Read back the durable file. No acknowledgement is sent for a partial write or hash mismatch.
        guard let verified = try await store.load(account: account, id: call.id) else { throw MessageAudioError.invalidFile }
        guard self.account == account, self.generation == generation, deletions[call.id, default: 0] == deletion else { throw CancellationError() }
        try await acknowledge(verified, account: account)
        return verified.delivery.audio
    }
    private func acknowledge(_ saved: SavedMessageAudio, account: String) async throws {
        guard self.account == account else { throw CancellationError() }
        let deletion = deletions[saved.call.id, default: 0]
        let generation = self.generation
        if saved.acknowledged { return }
        let verified = try await store.verifiedForDelivery(account: account, id: saved.call.id)
        guard self.account == account, self.generation == generation, deletions[saved.call.id, default: 0] == deletion,
              verified.delivery.sha256 == saved.delivery.sha256 else { throw CancellationError() }
        do {
            try Task.checkCancellation()
            try await api.confirmMessage(saved.call.id, participantID: saved.person.id, delivery: verified.delivery)
            guard self.account == account, self.generation == generation else { throw CancellationError() }
            // Do not recreate a file removed while the confirmation was in flight.
            guard var current = try await store.load(account: account, id: saved.call.id) else { return }
            guard self.account == account, self.generation == generation, deletions[saved.call.id, default: 0] == deletion else { throw CancellationError() }
            current.acknowledged = true
            try await store.save(current, account: account)
        } catch is CancellationError { throw CancellationError() }
        catch {
            // The file is safe. Retry the acknowledgement on the next sync, even after app restart.
            if case let APIError.service(_, status) = error, status == 401 || status == 403 { throw error }
        }
    }
}
