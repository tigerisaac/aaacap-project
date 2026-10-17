import Foundation

struct TestFailure: Error { let message: String }
func require(_ condition: Bool, _ message: String) throws { if !condition { throw TestFailure(message: message) } }

actor DeliveryStub: MessageDeliveryAPI {
    let value: MessageDelivery
    var downloads = 0
    var confirmations = 0
    var failConfirmation = false
    var paused = false
    var waiting: CheckedContinuation<Void, Never>?
    init(_ value: MessageDelivery) { self.value = value }
    func configure(fail: Bool = false, pause: Bool = false) { failConfirmation = fail; paused = pause }
    func downloadMessage(_ id: UUID, participantID: UUID) async throws -> MessageDelivery {
        downloads += 1
        if paused { await withCheckedContinuation { waiting = $0 } }
        return value
    }
    func release() { waiting?.resume(); waiting = nil }
    func confirmMessage(_ id: UUID, participantID: UUID, delivery: MessageDelivery) async throws {
        confirmations += 1
        if failConfirmation { throw URLError(.networkConnectionLost) }
    }
}

@main struct MessageAudioTests {
    static func main() async throws {
        let root = URL.temporaryDirectory.appending(path: "shield-audio-tests-\(UUID())")
        defer { try? FileManager.default.removeItem(at: root) }
        let account = "synthetic-owner", id = UUID()
        let person = Person(id: UUID(), name: "Synthetic owner", isOwner: true, canListen: true)
        let call = CallRecord(id: id, occurredAt: .now, callerNumber: "Synthetic", title: "Message", outcome: .voicemail,
            reasonCode: "uncertain", detail: "", nextStep: "", acceptedAt: nil, endedAt: .now,
            voicemail: Voicemail(id: id, duration: 2, status: "ready", heardAt: nil))
        let data = Data("synthetic audio bytes".utf8)
        let delivery = MessageDelivery(audio: data, sha256: MessageAudioStore.digest(data), receipt: "synthetic receipt")
        let store = MessageAudioStore(root: root.appending(path: "files")), api = DeliveryStub(delivery)
        let service = MessageAudioDelivery(api: api, store: store)
        await service.activate(account)
        await api.configure(fail: true)
        let received = try await service.receive(call: call, person: person, account: account)
        try require(received == data, "save survives confirmation failure")
        let saved = try await store.load(account: account, id: id)
        try require(saved?.acknowledged == false, "failed confirmation remains retryable")
        let url = root.appending(path: "files").appending(path: MessageAudioStore.digest(Data(account.utf8))).appending(path: id.uuidString.lowercased()+".json")
        try require(try url.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup == true, "excluded from backup")

        // A fresh actor simulates app relaunch with the network download unavailable.
        let reopened = MessageAudioStore(root: root.appending(path: "files"))
        let retry = MessageAudioDelivery(api: api, store: reopened)
        await retry.activate(account)
        await api.configure()
        let replay = try await retry.receive(call: call, person: person, account: account)
        try require(replay == data, "local replay after restart")
        try require(await api.downloads == 1, "acknowledgement retry must not redownload")
        try require(try await reopened.load(account: account, id: id)?.acknowledged == true, "successful retry persisted")

        await retry.activate("different-owner")
        try require(try await reopened.all(account: "different-owner").isEmpty, "account isolation")
        do { _ = try await reopened.load(account: account, id: id); throw TestFailure(message: "old account accessible") }
        catch is CancellationError { }
        await retry.activate(account)
        var corrupted = try Data(contentsOf: url)
        corrupted[0] = 0
        try corrupted.write(to: url)
        do { _ = try await retry.receive(call: call, person: person, account: account); throw TestFailure(message: "corrupt file accepted") }
        catch is TestFailure { throw TestFailure(message: "corrupt file accepted") }
        catch { }
        try require(await api.confirmations == 2, "corrupt file was acknowledged")
        try require(try await reopened.all(account: account).isEmpty, "corrupt file must not break the library")
        try await retry.removeAccount(account)
        await retry.activate(account)
        try require(try await reopened.all(account: account).isEmpty, "account deletion retained local files")

        // Wrong digest and an unwritable destination must never confirm delivery.
        for invalidDigest in [true, false] {
            let location = root.appending(path: invalidDigest ? "bad-digest" : "not-a-directory")
            if !invalidDigest { try Data("blocked".utf8).write(to: location) }
            let badAPI = DeliveryStub(invalidDigest ? MessageDelivery(audio: data, sha256: "wrong", receipt: "r") : delivery)
            let badService = MessageAudioDelivery(api: badAPI, store: MessageAudioStore(root: location))
            await badService.activate(account)
            do { _ = try await badService.receive(call: call, person: person, account: account); throw TestFailure(message: "invalid save accepted") }
            catch is TestFailure { throw TestFailure(message: "invalid save accepted") }
            catch { }
            try require(await badAPI.confirmations == 0, "failed save confirmed")
        }

        // A completed download cannot recreate audio after sign-out or deletion.
        for signOut in [true, false] {
            let raceStore = MessageAudioStore(root: root.appending(path: "race-\(signOut)")), raceAPI = DeliveryStub(delivery)
            await raceAPI.configure(pause: true)
            let race = MessageAudioDelivery(api: raceAPI, store: raceStore)
            await race.activate(account)
            let task = Task { try await race.receive(call: call, person: person, account: account) }
            while await raceAPI.waiting == nil { await Task.yield() }
            if signOut { await race.activate(nil); await race.activate(account) } else { try await race.forget(account: account, id: id) }
            await raceAPI.release()
            do { _ = try await task.value; throw TestFailure(message: "late download accepted") } catch is CancellationError { }
            try require(await raceAPI.confirmations == 0, "late download confirmed")
            await race.activate(account)
            try require(try await raceStore.all(account: account).isEmpty, "late download persisted")
        }
        print("PASS: durable save, restart, backup exclusion, confirmation retry, account isolation, corruption, invalid digest, disk failure, sign-out race, delete race")
    }
}
