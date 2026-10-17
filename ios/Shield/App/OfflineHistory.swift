import Foundation
import CryptoKit

/// Owner history is a bounded local copy; shared access always needs a fresh server check.
struct OfflineHistory: Codable, Sendable {
    let person: Person
    var overview: Overview?
    var calls: [CallRecord]
    var updatedAt: Date

    func retained(at now: Date) -> Self {
        var copy = self
        let cutoff = now.addingTimeInterval(-30 * 24 * 60 * 60)
        copy.calls = Array(calls.filter { $0.occurredAt > cutoff }.sorted { $0.occurredAt > $1.occurredAt }.prefix(500))
        if let overview {
            copy.overview = Overview(name: overview.name, status: overview.status, lastTestAt: overview.lastTestAt,
                isDemo: overview.isDemo, isOwner: overview.isOwner, canListen: overview.canListen,
                counts: overview.counts, recent: overview.recent.filter { $0.occurredAt > cutoff })
        }
        return copy
    }
}

actor OfflineHistoryStore {
    private let root: URL
    private var account: String?
    init(root: URL = URL.applicationSupportDirectory.appending(path: "OfflineHistory")) { self.root = root }

    func activate(_ account: String?) { self.account = account }
    private func file(_ account: String) throws -> URL {
        guard self.account == account else { throw CancellationError() }
        let key = SHA256.hash(data: Data(account.utf8)).map { String(format: "%02x", $0) }.joined()
        return root.appending(path: key + ".json")
    }
    private func protect(_ path: URL) throws {
        var path = path
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try path.setResourceValues(values)
        #if os(iOS)
        try FileManager.default.setAttributes([.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication], ofItemAtPath: path.path)
        #endif
    }
    func load(account: String, now: Date = .now) throws -> [OfflineHistory] {
        let path = try file(account)
        guard FileManager.default.fileExists(atPath: path.path) else { return [] }
        try protect(path)
        return try JSONDecoder().decode([OfflineHistory].self, from: Data(contentsOf: path))
            .filter { $0.person.isOwner && now.timeIntervalSince($0.updatedAt) < 30 * 24 * 60 * 60 }
            .map { $0.retained(at: now) }
    }
    func save(_ histories: [OfflineHistory], account: String, now: Date = .now) throws {
        let path = try file(account)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        try protect(root)
        let owners = histories.filter { $0.person.isOwner }.map { $0.retained(at: now) }
        try JSONEncoder().encode(owners).write(to: path, options: .atomic)
        try protect(path)
    }
    func remove(account: String) throws {
        let path = try file(account)
        if FileManager.default.fileExists(atPath: path.path) { try FileManager.default.removeItem(at: path) }
    }
}
