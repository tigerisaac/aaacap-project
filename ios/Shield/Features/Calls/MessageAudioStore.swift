import Foundation
import CryptoKit

struct MessageDelivery: Codable, Sendable {
    let audio: Data
    let sha256: String
    let receipt: String
}

struct SavedMessageAudio: Codable, Sendable {
    let person: Person
    var call: CallRecord
    let delivery: MessageDelivery
    var acknowledged: Bool
}

struct SavedMessageInfo: Sendable {
    let person: Person
    let call: CallRecord
}

enum MessageAudioError: LocalizedError {
    case invalidFile, unavailable
    var errorDescription: String? {
        switch self {
        case .invalidFile: "The recording couldn’t be saved safely. Free up space on your iPhone and try again."
        case .unavailable: "This recording isn’t saved on this iPhone. Its delivery copy has expired or was saved on another phone."
        }
    }
}

/// Durable, account-scoped files. No audio goes in caches, shared containers, or device backups.
actor MessageAudioStore {
    private let root: URL
    private var account: String?
    init(root: URL = URL.applicationSupportDirectory.appending(path: "MessageAudio")) { self.root = root }

    func activate(_ account: String?) { self.account = account }
    static func digest(_ data: Data) -> String { SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined() }

    private func directory(_ account: String) throws -> URL {
        guard self.account == account else { throw CancellationError() }
        return root.appending(path: Self.digest(Data(account.utf8)), directoryHint: .isDirectory)
    }
    private func file(_ account: String, _ id: UUID) throws -> URL {
        try directory(account).appending(path: id.uuidString.lowercased() + ".json")
    }
    private func protect(_ url: URL) throws {
        var url = url
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try url.setResourceValues(values)
        #if os(iOS)
        try FileManager.default.setAttributes([.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication], ofItemAtPath: url.path)
        #endif
        guard try url.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup == true else { throw MessageAudioError.invalidFile }
    }
    func load(account: String, id: UUID) throws -> SavedMessageAudio? {
        let url = try file(account, id)
        guard FileManager.default.fileExists(atPath: url.path) else { return nil }
        // An earlier save may have stopped after the atomic write but before its attributes
        // were set. Re-establish protection before a recovered file can be acknowledged.
        try protect(url)
        let saved = try JSONDecoder().decode(SavedMessageAudio.self, from: Data(contentsOf: url))
        guard saved.call.id == id, saved.person.isOwner, saved.person.canListen,
              !saved.delivery.audio.isEmpty, saved.delivery.audio.count <= 2_000_000,
              Self.digest(saved.delivery.audio) == saved.delivery.sha256 else { throw MessageAudioError.invalidFile }
        return saved
    }
    func save(_ saved: SavedMessageAudio, account: String) throws {
        guard saved.person.isOwner, saved.person.canListen,
              !saved.delivery.audio.isEmpty, saved.delivery.audio.count <= 2_000_000,
              Self.digest(saved.delivery.audio) == saved.delivery.sha256 else { throw MessageAudioError.invalidFile }
        let folder = try directory(account)
        // Protect the parent before creating any file, including the atomic write's temporary file.
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        try protect(root)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        try protect(folder)
        let url = try file(account, saved.call.id)
        try JSONEncoder().encode(saved).write(to: url, options: .atomic)
        try protect(url)
        let handle = try FileHandle(forWritingTo: url)
        defer { try? handle.close() }
        try handle.synchronize()
        guard try load(account: account, id: saved.call.id)?.delivery.sha256 == saved.delivery.sha256 else { throw MessageAudioError.invalidFile }
    }
    func verifiedForDelivery(account: String, id: UUID) throws -> SavedMessageAudio {
        guard let saved = try load(account: account, id: id) else { throw MessageAudioError.invalidFile }
        // Also flush recovered files: the app could have stopped between atomic write and flush.
        let handle = try FileHandle(forWritingTo: file(account, id))
        defer { try? handle.close() }
        try handle.synchronize()
        return saved
    }
    func all(account: String) throws -> [SavedMessageInfo] {
        let folder = try directory(account)
        guard FileManager.default.fileExists(atPath: folder.path) else { return [] }
        return try FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)
            .filter { $0.pathExtension == "json" }
            .compactMap { url in
                guard let id = UUID(uuidString: url.deletingPathExtension().lastPathComponent) else { return nil }
                guard let saved = try? load(account: account, id: id) else { return nil }
                return SavedMessageInfo(person: saved.person, call: saved.call)
            }
    }
    func remove(account: String, id: UUID) throws {
        let url = try file(account, id)
        if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
    }
    func removeAccount(_ account: String) throws {
        let folder = try directory(account)
        if FileManager.default.fileExists(atPath: folder.path) { try FileManager.default.removeItem(at: folder) }
        self.account = nil
    }
}
