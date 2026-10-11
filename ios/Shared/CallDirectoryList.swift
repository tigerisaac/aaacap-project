import Foundation

/// The numbers Shield blocks, handed from the app to the Call Directory extension through the shared App Group
/// container. The extension needs them as E.164 digits without "+", ascending and unique.
struct CallDirectoryList: Codable, Equatable, Sendable {
    var blocked: [Int64]

    static let fileName = "call-directory.json"
    static var fileURL: URL? {
        guard let group = Bundle.main.object(forInfoDictionaryKey: "ShieldAppGroup") as? String, !group.contains("$(") else { return nil }
        return FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)?.appending(path: fileName)
    }

    init(blocked: [Int64]) { self.blocked = Array(Set(blocked)).sorted() }
    init(phones: [String]) { self.init(blocked: phones.compactMap(Self.digits)) }

    /// "+15125550100" → 15125550100. Anything that isn't a plain E.164 number is skipped.
    static func digits(_ phone: String) -> Int64? {
        guard phone.hasPrefix("+"), (9...16).contains(phone.count) else { return nil }
        let digits = phone.dropFirst()
        guard digits.allSatisfy({ $0.isASCII && $0.isNumber }), digits.first != "0" else { return nil }
        return Int64(digits)
    }

    static func load() -> CallDirectoryList? {
        guard let url = fileURL, let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(CallDirectoryList.self, from: data)
    }

    /// Writes the list if it changed. Returns whether the extension needs reloading.
    func save() throws -> Bool {
        guard let url = Self.fileURL else { return false }
        if Self.load() == self { return false }
        try JSONEncoder().encode(self).write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        return true
    }
}
