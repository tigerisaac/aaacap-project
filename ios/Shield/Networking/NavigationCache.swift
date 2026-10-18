import Foundation

/// A bounded, session-only cache. Durable owner history and audio use their protected stores.
actor NavigationCache {
    struct Key: Hashable, Sendable {
        let path: String
        let participantID: UUID?
    }
    struct Response: Sendable { let data: Data; let fetchedAt: Date }
    private struct Entry { let response: Response; let expiresAt: Date }
    private struct Pending { let id: UUID; let task: Task<Response, Error> }
    private var entries: [Key: Entry] = [:]
    private var pending: [Key: Pending] = [:]
    private var generation = 0

    func invalidate(preservingConfiguration: Bool = false) {
        generation += 1
        entries = preservingConfiguration ? entries.filter { $0.key.path == "/public/config" } : [:]
        for request in pending.values { request.task.cancel() }
        pending.removeAll()
    }

    func data(for key: Key, lifetime: TimeInterval, now: Date = .now,
              fetch: @escaping @Sendable () async throws -> Data) async throws -> Data {
        try await response(for: key, lifetime: lifetime, now: now, fetch: fetch).data
    }

    func response(for key: Key, lifetime: TimeInterval, now: Date = .now,
                  fetch: @escaping @Sendable () async throws -> Data) async throws -> Response {
        if let entry = entries[key], entry.expiresAt > now { return entry.response }
        let version = generation
        let request: Pending
        if let existing = pending[key] { request = existing }
        else {
            request = Pending(id: UUID(), task: Task {
                let data = try await fetch()
                return Response(data: data, fetchedAt: .now)
            })
            pending[key] = request
        }
        do {
            let result = try await request.task.value
            guard version == generation else { throw CancellationError() }
            if pending[key]?.id == request.id {
                pending[key] = nil
                entries = entries.filter { $0.value.expiresAt > now }
                // Bound memory even when browsing many pages and call details.
                if entries.count >= 128 || entries.values.reduce(0, { $0 + $1.response.data.count }) + result.data.count > 8_000_000 {
                    entries.removeAll()
                }
                if result.data.count <= 1_000_000 {
                    entries[key] = Entry(response: result, expiresAt: now.addingTimeInterval(lifetime))
                }
            }
            return result
        } catch {
            if pending[key]?.id == request.id { pending[key] = nil }
            throw error
        }
    }

    nonisolated static func lifetime(path: String, owner: Bool, authenticated: Bool) -> TimeInterval? {
        if path == "/public/config", !authenticated { return 3600 }
        guard owner, authenticated else { return nil }
        if path == "/api/overview" || path.hasPrefix("/api/calls?") || path.hasPrefix("/api/calls/") { return 60 }
        if path == "/api/setup" { return 300 }
        if ["/api/trusted-numbers", "/api/destinations"].contains(path) { return 300 }
        // Blocking pages form one complete traversal; never mix a cached first page with fresh later pages.
        // Live protection, sharing permissions, setup actions and audio always use their own fresh checks.
        return nil
    }
}
