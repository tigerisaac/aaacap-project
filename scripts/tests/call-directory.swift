import Foundation

private struct Failure: Error { let message: String }
private func require(_ value: Bool, _ message: String) throws { if !value { throw Failure(message: message) } }

@MainActor private final class Clock {
    var date = Date(timeIntervalSince1970: 2_000_000_000)
}

@MainActor private final class Loader {
    let url: URL
    var attempts = 0
    var failures = 0
    var disabled = false
    var pauseNext = false
    var waiting: CheckedContinuation<Void, Never>?
    var installed: [Int64] = []
    var active = 0
    var maximumActive = 0
    let clock: Clock
    init(url: URL, clock: Clock) { self.url = url; self.clock = clock }
    func reload() async throws -> Bool {
        attempts += 1
        active += 1
        maximumActive = max(maximumActive, active)
        defer { active -= 1 }
        let numbers = CallDirectoryList.load(from: url)?.activeNumbers(at: clock.date) ?? []
        let fail = failures > 0
        if fail { failures -= 1 }
        if pauseNext {
            pauseNext = false
            await withCheckedContinuation { waiting = $0 }
        }
        if fail { throw Failure(message: "Synthetic reload failure") }
        if disabled { return false }
        installed = numbers
        return true
    }
    func release() { waiting?.resume(); waiting = nil }
}

@MainActor private func waitUntil(_ condition: () -> Bool) async throws {
    for _ in 0..<1000 {
        if condition() { return }
        try await Task.sleep(for: .milliseconds(1))
    }
    throw Failure(message: "Synthetic reload did not reach its barrier")
}

@main struct CallDirectoryTests {
    @MainActor static func main() async throws {
        let root = URL.temporaryDirectory.appending(path: "shield-directory-tests-\(UUID())")
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let clock = Clock(), owner = UUID()
        let first: Int64 = 100_000_001, second: Int64 = 100_000_002
        func entry(_ number: Int64, _ seconds: TimeInterval = 120) -> CallDirectoryList.Entry {
            .init(number: number, expiresAt: clock.date.addingTimeInterval(seconds))
        }
        var passed = 0
        func pass(_ label: String) { passed += 1; print("PASS: \(label)") }

        let normalized = CallDirectoryList(accountKey: "synthetic", participantID: owner,
            entries: [entry(second),entry(first,30),entry(first,90),entry(0),entry(-1)])
        try require(normalized.activeNumbers(at: clock.date) == [first,second], "numbers must be ascending, unique and valid")
        try require(normalized.activeNumbers(at: clock.date.addingTimeInterval(90)) == [second], "expiry boundary must exclude the entry")
        try require(CallDirectoryList.digits("+" + String(first)) == first && CallDirectoryList.digits("+01") == nil, "E.164 boundary")
        let encoded = try JSONEncoder().encode(normalized)
        let decoded = try JSONDecoder().decode(CallDirectoryList.self, from: encoded)
        try require(decoded == normalized, "snapshot round trip")
        let unknown = String(data: encoded, encoding: .utf8)!.replacingOccurrences(of: "\"version\":2", with: "\"version\":99")
        try require((try? JSONDecoder().decode(CallDirectoryList.self, from: Data(unknown.utf8))) == nil, "unknown snapshot version accepted")
        pass("normalization, expiry boundary and version validation")

        let url = root.appending(path: "directory.json"), loader = Loader(url: root.appending(path: "directory.json"), clock: clock)
        let coordinator = CallDirectoryCoordinator(fileURL: url, now: { clock.date }, reload: { try await loader.reload() })
        await coordinator.activate("owner-a")
        await coordinator.update(entries: [entry(first,30), entry(second)], account: "owner-a", participantID: owner)
        try require(loader.installed == [first,second] && !coordinator.needsReload, "successful replacement not acknowledged")
        try require(try url.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup == true, "backup exclusion missing")
        var mutableURL = url
        var attributes = URLResourceValues(); attributes.isExcludedFromBackup = false
        try mutableURL.setResourceValues(attributes)
        let unchangedAttempts = loader.attempts
        await coordinator.refresh()
        try require(loader.attempts == unchangedAttempts, "unchanged acknowledged list reloaded")
        try require(try url.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup == true, "unchanged file backup flag not repaired")
        pass("protected file write and metadata repair without redundant reload")

        clock.date.addTimeInterval(30)
        await coordinator.refresh()
        try require(loader.installed == [second] && CallDirectoryList.load(from: url)?.entries.count == 1, "offline expiry did not remove data")
        pass("offline foreground expiry prunes stored numbers and reloads")

        loader.failures = 1
        await coordinator.update(entries: [], account: "owner-a", participantID: owner)
        try require(coordinator.error != nil && coordinator.needsReload, "reload failure hidden")
        try require(loader.installed == [second] && CallDirectoryList.load(from: url)?.entries.isEmpty == true, "failed unblock not staged separately from installed list")
        try require(CallDirectoryList.load(from: url)?.needsReload == true, "pending retry not durable")
        let reopened = CallDirectoryCoordinator(fileURL: url, now: { clock.date }, reload: { try await loader.reload() })
        await reopened.activate("owner-a")
        try require(loader.installed.isEmpty && !reopened.needsReload && reopened.error == nil, "same-list retry after relaunch failed")
        pass("failed unblock retries after relaunch even when data is unchanged")

        await reopened.update(entries: [entry(first)], account: "owner-a", participantID: owner)
        loader.failures = 1
        await reopened.activate(nil)
        try require(CallDirectoryList.load(from: url)?.accountKey == nil && CallDirectoryList.load(from: url)?.entries.isEmpty == true, "sign-out kept owner payload")
        let beforeStale = loader.attempts
        await reopened.update(entries: [entry(second)], account: "owner-a", participantID: owner)
        try require(loader.attempts == beforeStale && CallDirectoryList.load(from: url)?.entries.isEmpty == true, "stale signed-out response republished data")
        await reopened.activate("owner-b")
        try require(loader.installed.isEmpty && reopened.error == nil, "account switch inherited old phone blocking")
        await reopened.update(entries: [entry(second)], account: "owner-a", participantID: owner)
        try require(loader.installed.isEmpty, "previous account response changed new account")
        pass("sign-out, failed clear, next-account retry and stale-account fencing")

        for failOld in [false,true] {
            await reopened.activate("owner-a")
            loader.pauseNext = true
            loader.failures = failOld ? 1 : 0
            let old = Task { await reopened.update(entries: [entry(first)], account: "owner-a", participantID: owner) }
            try await waitUntil { loader.waiting != nil }
            let clear = Task { await reopened.activate(nil) }
            try await waitUntil { CallDirectoryList.load(from: url)?.accountKey == nil }
            loader.release()
            await old.value; await clear.value
            try require(loader.installed.isEmpty && reopened.error == nil && !reopened.needsReload, "stale completion overrode sign-out")
            try require(loader.maximumActive == 1, "reloads overlapped")
        }
        pass("successful and failed stale reload completions cannot acknowledge logout")

        await reopened.activate("owner-a")
        await reopened.update(entries: [entry(first)], account: "owner-a", participantID: owner)
        reopened.retainOwners([])
        await reopened.refresh()
        try require(loader.installed.isEmpty && CallDirectoryList.load(from: url)?.entries.isEmpty == true, "revoked ownership kept numbers")
        pass("confirmed ownership loss clears local blocking")

        let revokedAttempts = loader.attempts
        await reopened.update(entries: [entry(first)], account: "owner-a", participantID: owner)
        try require(loader.attempts == revokedAttempts && loader.installed.isEmpty, "revoked owner response republished data")
        reopened.retainOwners([owner])
        await reopened.update(entries: [entry(first), entry(second)], account: "owner-a", participantID: owner)
        let staleRequest = reopened.requestGeneration
        await reopened.remove(number: first, account: "owner-a", participantID: owner)
        await reopened.update(entries: [entry(first)], account: "owner-a", participantID: owner, requestGeneration: staleRequest)
        try require(loader.installed == [second], "old GET undid unblock or removal discarded unrelated fresh entries")
        pass("ownership and mutation generations reject stale responses without losing unrelated blocks")

        loader.disabled = true
        await reopened.update(entries: [entry(first)], account: "owner-a", participantID: owner)
        try require(reopened.error == nil && reopened.needsReload, "disabled extension lost pending state or showed a failure")
        loader.disabled = false
        await reopened.refresh()
        try require(loader.installed == [first] && !reopened.needsReload, "enabled extension did not consume pending list")
        pass("disabled extension defers safely and retries when enabled")

        let legacyURL = root.appending(path: "legacy.json")
        try JSONSerialization.data(withJSONObject: ["blocked":[first]]).write(to: legacyURL)
        try require(CallDirectoryList.load(from: legacyURL) == nil, "legacy data without ownership/expiry was accepted")
        let legacyLoader = Loader(url: legacyURL, clock: clock)
        let migration = CallDirectoryCoordinator(fileURL: legacyURL, now: { clock.date }, reload: { try await legacyLoader.reload() })
        await migration.activate("owner-a")
        try require(legacyLoader.installed.isEmpty && CallDirectoryList.load(from: legacyURL)?.version == 2, "legacy file not safely replaced")
        pass("legacy number-only data is cleared until a fresh authorized list arrives")

        let missingParent = root.appending(path: "missing"), brokenURL = missingParent.appending(path: "directory.json")
        let brokenLoader = Loader(url: brokenURL, clock: clock)
        let broken = CallDirectoryCoordinator(fileURL: brokenURL, now: { clock.date }, reload: { try await brokenLoader.reload() })
        await broken.activate("owner-a")
        await broken.update(entries: [entry(first)], account: "owner-a", participantID: owner)
        try require(broken.error != nil && brokenLoader.attempts == 0, "failed write reloaded stale data")
        try FileManager.default.createDirectory(at: missingParent, withIntermediateDirectories: true)
        await broken.refresh()
        try require(broken.error == nil && brokenLoader.installed == [first], "latest intended data was lost after disk failure")
        pass("disk failure is visible, avoids reload and retains the intended update for retry")

        brokenLoader.pauseNext = true
        await broken.activate(nil, waitForReload: false)
        try await waitUntil { brokenLoader.waiting != nil }
        try require(CallDirectoryList.load(from: brokenURL)?.accountKey == nil && broken.needsReload,
                    "nonblocking account invalidation did not persist before returning")
        brokenLoader.release()
        await broken.refresh()
        try require(brokenLoader.installed.isEmpty && !broken.needsReload, "background reload did not finish")
        pass("auth and navigation can continue while durable cleanup waits for iOS")
        print("Call Directory checks passed: \(passed)")
    }
}
