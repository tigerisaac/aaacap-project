import Foundation

/// A versioned, expiring handoff to CallKit. Legacy number-only files cannot establish ownership or expiry.
struct CallDirectoryList: Codable, Equatable, Sendable {
    struct Entry: Codable, Equatable, Sendable {
        let number: Int64
        let expiresAt: Date
    }

    let version: Int
    let accountKey: String?
    let participantID: UUID?
    let entries: [Entry]
    let revision: UUID
    var needsReload: Bool

    static let fileName = "call-directory.json"
    static var fileURL: URL? {
        guard let group = Bundle.main.object(forInfoDictionaryKey: "ShieldAppGroup") as? String, !group.contains("$(") else { return nil }
        return FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)?.appending(path: fileName)
    }

    init(accountKey: String?, participantID: UUID?, entries: [Entry], revision: UUID = UUID(), needsReload: Bool = true) {
        version = 2
        self.accountKey = accountKey
        self.participantID = participantID
        self.entries = accountKey != nil && participantID != nil ? Self.normalized(entries) : []
        self.revision = revision
        self.needsReload = needsReload
    }

    private enum CodingKeys: String, CodingKey { case version, accountKey, participantID, entries, revision, needsReload }

    init(from decoder: any Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        guard try values.decode(Int.self, forKey: .version) == 2 else {
            throw DecodingError.dataCorruptedError(forKey: .version, in: values, debugDescription: "Unsupported blocking-list version")
        }
        self.init(accountKey: try values.decodeIfPresent(String.self, forKey: .accountKey),
                  participantID: try values.decodeIfPresent(UUID.self, forKey: .participantID),
                  entries: try values.decode([Entry].self, forKey: .entries),
                  revision: try values.decode(UUID.self, forKey: .revision),
                  needsReload: try values.decode(Bool.self, forKey: .needsReload))
    }

    static func digits(_ phone: String) -> Int64? {
        guard phone.hasPrefix("+"), (9...16).contains(phone.count) else { return nil }
        let digits = phone.dropFirst()
        guard digits.allSatisfy({ $0.isASCII && $0.isNumber }), digits.first != "0" else { return nil }
        return Int64(digits)
    }

    private static func normalized(_ entries: [Entry]) -> [Entry] {
        var expiryByNumber: [Int64: Date] = [:]
        for entry in entries where (10_000_000...999_999_999_999_999).contains(entry.number)
            && entry.expiresAt.timeIntervalSinceReferenceDate.isFinite {
            expiryByNumber[entry.number] = max(expiryByNumber[entry.number] ?? entry.expiresAt, entry.expiresAt)
        }
        return expiryByNumber.map { Entry(number: $0.key, expiresAt: $0.value) }.sorted { $0.number < $1.number }
    }

    func activeEntries(at date: Date) -> [Entry] { entries.filter { $0.expiresAt > date } }
    func activeNumbers(at date: Date) -> [Int64] { activeEntries(at: date).map(\.number) }

    func hasSameContents(as other: Self) -> Bool {
        accountKey == other.accountKey && participantID == other.participantID && entries == other.entries
    }

    static func load(from url: URL? = fileURL) -> CallDirectoryList? {
        guard let url, let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(CallDirectoryList.self, from: data)
    }

    func save(to url: URL) throws {
        try JSONEncoder().encode(self).write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        try Self.protect(url)
    }

    /// Repair metadata even when an unchanged file was written by an earlier app version.
    static func protect(_ url: URL) throws {
        var url = url
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try url.setResourceValues(values)
        #if os(iOS)
        try FileManager.default.setAttributes([.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication], ofItemAtPath: url.path)
        #endif
    }
}
