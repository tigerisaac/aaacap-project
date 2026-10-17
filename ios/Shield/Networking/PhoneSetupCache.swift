import Foundation
import CryptoKit

/// Presentation-only owner snapshots. Never used to authorize or confirm a phone change.
struct PhoneSetupCache {
    struct Entry: Codable, Sendable {
        let data: Data
        let savedAt: Date
        var invalidated = false
    }
    let root: URL
    init(root: URL = URL.applicationSupportDirectory.appending(path: "PhoneSetup")) { self.root = root }
    static let paths: Set<String> = ["/api/setup", "/api/forwarding"]
    private func file(_ account: String) -> URL {
        let hash = SHA256.hash(data: Data(account.utf8)).map { String(format: "%02x", $0) }.joined()
        return root.appending(path: hash + ".json")
    }
    private func key(_ path: String, _ participant: UUID) -> String { participant.uuidString + path }
    private func entries(_ account: String) -> [String: Entry] {
        guard let data = try? Data(contentsOf: file(account)), data.count <= 4_000_000 else { return [:] }
        return (try? JSONDecoder().decode([String: Entry].self, from: data)) ?? [:]
    }
    func read(_ path: String, participant: UUID, account: String) -> Entry? {
        guard Self.paths.contains(path) else { return nil }
        return entries(account)[key(path, participant)]
    }
    func save(_ data: Data, path: String, participant: UUID, account: String, now: Date = .now) throws {
        guard Self.paths.contains(path), data.count <= 100_000 else { return }
        var values = entries(account)
        values[key(path, participant)] = Entry(data: data, savedAt: now)
        if values.count > 32 {
            values = Dictionary(uniqueKeysWithValues: values.sorted { $0.value.savedAt > $1.value.savedAt }.prefix(32).map { ($0.key, $0.value) })
        }
        try write(values, account: account)
    }
    /// Apply only acknowledged fields, retaining the original age of all other configuration.
    func applyCancellation(_ receipt: RestorationStatus.Cancellation, participant: UUID, account: String) throws {
        var values = entries(account)
        let entryKey = key("/api/forwarding", participant)
        guard let entry = values[entryKey],
              var object = try JSONSerialization.jsonObject(with: entry.data) as? [String: Any] else { return }
        object["restorationRequested"] = false
        object["setupReviewRequired"] = receipt.setupReviewRequired
        object["stage"] = receipt.stage
        values[entryKey] = Entry(data: try JSONSerialization.data(withJSONObject: object), savedAt: entry.savedAt, invalidated: true)
        try write(values, account: account)
    }
    func invalidate(account: String) throws {
        var values = entries(account)
        for key in values.keys { values[key]?.invalidated = true }
        try write(values, account: account)
    }
    func retain(participants: Set<UUID>, account: String) throws {
        let prefixes = participants.map { $0.uuidString }
        try write(entries(account).filter { key, _ in prefixes.contains { key.hasPrefix($0 + "/") } }, account: account)
    }
    func remove(account: String) throws {
        let path = file(account)
        if FileManager.default.fileExists(atPath: path.path) { try FileManager.default.removeItem(at: path) }
    }
    private func write(_ values: [String: Entry], account: String) throws {
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        try protect(root)
        let path = file(account)
        try JSONEncoder().encode(values).write(to: path, options: .atomic)
        try protect(path)
    }
    private func protect(_ url: URL) throws {
        var url = url
        var values = URLResourceValues(); values.isExcludedFromBackup = true
        try url.setResourceValues(values)
        #if os(iOS)
        try FileManager.default.setAttributes([.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication], ofItemAtPath: url.path)
        #endif
    }
}
