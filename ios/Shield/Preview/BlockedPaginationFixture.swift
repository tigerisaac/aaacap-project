#if DEBUG && targetEnvironment(simulator)
import Foundation

/// Two active entries separated by a page boundary; only the synthetic nil-backend client can use this.
struct BlockedPaginationFixture {
    private var failures = ProcessInfo.processInfo.arguments.contains("--fail-blocked-page") ? 1 : 0
    private var cancellations = ProcessInfo.processInfo.arguments.contains("--cancel-blocked-page") ? 1 : 0
    private var removed: Set<String> = []
    private let createdAt = Date.now

    mutating func response(path: String, method: String) throws -> Data? {
        guard path.hasPrefix("/api/blocked-numbers") else { return nil }
        if method == "DELETE" {
            let id = String(path.dropFirst("/api/blocked-numbers/".count))
            guard [String(repeating: "a", count: 64), String(repeating: "b", count: 64)].contains(id) else { throw APIError.invalidResponse }
            removed.insert(id)
            return Data(#"{"unblocked":true}"#.utf8)
        }
        guard method == "GET" else { throw APIError.invalidResponse }
        let later = path == "/api/blocked-numbers?cursor=older-page"
        guard later || path == "/api/blocked-numbers" else { throw APIError.invalidResponse }
        if later, failures > 0 { failures -= 1; throw URLError(.networkConnectionLost) }
        if later, cancellations > 0 { cancellations -= 1; throw CancellationError() }
        let id = String(repeating: later ? "b" : "a", count: 64)
        let item: [String: Any] = ["id": id, "phone": later ? "+10000000002" : "+10000000001", "reason": "scam",
                                  "blockedAt": createdAt.addingTimeInterval(later ? -1800 : 0).ISO8601Format(),
                                  "expiresAt": createdAt.addingTimeInterval(86400).ISO8601Format(), "attempts": 0]
        let nextCursor: Any = later ? NSNull() : "older-page"
        return try JSONSerialization.data(withJSONObject: ["paginationVersion": 1, "nextCursor": nextCursor,
                                                          "items": removed.contains(id) ? [] : [item]])
    }
}
#endif
