import Foundation

func testOfflineHistory(root: URL, person: Person, call: CallRecord) async throws {
    let folder = root.appending(path: "history")
    let store = OfflineHistoryStore(root: folder), account = "owner-history"
    await store.activate(account)
    let helper = Person(id: UUID(), name: "Helper", isOwner: false, canListen: true)
    let now = Date.now
    let history = OfflineHistory(person: person, overview: nil, calls: [call], updatedAt: now)
    try await store.save([history, OfflineHistory(person: helper, overview: nil, calls: [call], updatedAt: now)], account: account)
    let reopened = OfflineHistoryStore(root: folder)
    await reopened.activate(account)
    let saved = try await reopened.load(account: account)
    try require(saved.count == 1 && saved.first?.calls.first?.id == call.id, "offline history survives restart and excludes helper data")
    let path = folder.appending(path: MessageAudioStore.digest(Data(account.utf8)) + ".json")
    try require(try path.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup == true, "history excluded from backup")
    try require(try await reopened.load(account: account, now: now.addingTimeInterval(31 * 86400)).isEmpty, "history expires after 30 days")
    await reopened.activate("another-owner")
    try require(try await reopened.load(account: "another-owner").isEmpty, "history account isolation")
    do { try await reopened.save([history], account: account); throw TestFailure(message: "stale account write accepted") }
    catch is CancellationError { }
    await reopened.activate(account)
    try await reopened.remove(account: account)
    try require(try await reopened.load(account: account).isEmpty, "history account deletion")
    try await reopened.save([history], account: account)
    try Data("broken".utf8).write(to: path)
    do { _ = try await reopened.load(account: account); throw TestFailure(message: "corrupt history accepted") }
    catch is DecodingError { }
    print("Offline history restart, isolation, backup exclusion, expiry, stale writes, deletion and corruption passed.")
}
