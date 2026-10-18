import CryptoKit
import Foundation

/// Written before editing Contacts. A lost reply must not erase the user's intent.
struct PendingContactChange: Codable, Sendable, Equatable {
    var id = UUID()
    var item: SavedNumber
    var enabled: Bool
    var expectedRevision: Int
}

actor ContactChangeStore {
    static let shared = ContactChangeStore()
    private let root: URL
    private var leases: [String: UUID] = [:]
    private struct Record: Codable {
        let version: Int
        let accountHash: String
        let person: UUID
        let change: PendingContactChange
    }

    init(root: URL = URL.applicationSupportDirectory.appending(path: "ContactChanges", directoryHint: .isDirectory)) {
        self.root = root
    }
    private func hash(_ account: String) -> String {
        SHA256.hash(data: Data(account.utf8)).map { String(format: "%02x", $0) }.joined()
    }
    private func key(_ account: String, _ person: UUID) -> String { hash(account) + "/" + person.uuidString }
    private func url(_ account: String, _ person: UUID) -> URL {
        root.appending(path: hash(account), directoryHint: .isDirectory).appending(path: person.uuidString + ".json")
    }
    private func unavailable() -> APIError { .service(code: "contact_recovery_unavailable", status: 409) }

    func read(account: String, person: UUID) throws -> PendingContactChange? {
        let file = url(account, person)
        guard FileManager.default.fileExists(atPath: file.path) else { return nil }
        do {
            let size = try file.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
            guard size <= 128_000 else { throw unavailable() }
            let record = try JSONDecoder().decode(Record.self, from: Data(contentsOf: file))
            guard record.version == 1, record.accountHash == hash(account), record.person == person,
                  (0..<9_007_199_254_740_991).contains(record.change.expectedRevision) else { throw unavailable() }
            return record.change
        } catch { throw unavailable() }
    }

    /// Covers multiple view instances as well as repeated taps on one view.
    func beginWork(account: String, person: UUID) throws -> UUID {
        let scope = key(account, person)
        guard leases[scope] == nil else { throw APIError.service(code: "contacts_sync_busy", status: 409) }
        let lease = UUID(); leases[scope] = lease
        return lease
    }
    func finishWork(account: String, person: UUID, lease: UUID) {
        let scope = key(account, person)
        if leases[scope] == lease { leases.removeValue(forKey: scope) }
    }
    func save(_ change: PendingContactChange, account: String, person: UUID, lease: UUID) throws {
        guard leases[key(account, person)] == lease else { throw CancellationError() }
        let file = url(account, person)
        // Protect and exclude every directory before writing any contact data.
        for var directory in [root, file.deletingLastPathComponent()] {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true,
                attributes: [.protectionKey: FileProtectionType.complete, .posixPermissions: 0o700])
            var values = URLResourceValues(); values.isExcludedFromBackup = true
            try directory.setResourceValues(values)
        }
        let record = Record(version: 1, accountHash: hash(account), person: person, change: change)
        try JSONEncoder().encode(record).write(to: file, options: [.atomic, .completeFileProtection])
        try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: file.path)
    }
    @discardableResult
    func clear(_ id: UUID, account: String, person: UUID, lease: UUID? = nil) throws -> Bool {
        guard leases[key(account, person)] == lease else { return false }
        guard try read(account: account, person: person)?.id == id else { return false }
        try FileManager.default.removeItem(at: url(account, person))
        return true
    }
    func removeAccount(_ account: String) throws {
        let directory = root.appending(path: hash(account), directoryHint: .isDirectory)
        if FileManager.default.fileExists(atPath: directory.path) { try FileManager.default.removeItem(at: directory) }
        leases = leases.filter { !$0.key.hasPrefix(hash(account) + "/") }
    }
}
