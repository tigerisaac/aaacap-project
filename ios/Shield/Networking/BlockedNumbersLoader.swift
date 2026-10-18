import Foundation

enum BlockedNumbersLoader {
    /// Publish only a complete traversal. An empty page can still precede active entries.
    static func load(fetch: @Sendable (String?) async throws -> BlockedNumberPage) async throws -> [BlockedNumber] {
        var cursor: String?
        var seen: Set<String> = []
        var items: [String: BlockedNumber] = [:]
        // Bound malformed or endlessly changing responses without treating a partial list as complete.
        for _ in 0..<1000 {
            try Task.checkCancellation()
            let page = try await fetch(cursor)
            try Task.checkCancellation()
            guard page.paginationVersion == 1 else { throw APIError.blockedNumbersUnsupported }
            guard page.items.count <= 200 else { throw APIError.invalidResponse }
            for item in page.items {
                if let prior = items[item.id], prior.blockedAt > item.blockedAt { continue }
                items[item.id] = item
            }
            guard let next = page.nextCursor else {
                return items.values.sorted {
                    $0.blockedAt == $1.blockedAt ? $0.id > $1.id : $0.blockedAt > $1.blockedAt
                }
            }
            guard !next.isEmpty, next.utf8.count <= 500,
                  next.allSatisfy({ $0.isASCII && ($0.isLetter || $0.isNumber || $0 == "-" || $0 == "_") }),
                  seen.insert(next).inserted else { throw APIError.invalidResponse }
            cursor = next
        }
        throw APIError.incompleteBlockedNumbers
    }
}
