import Foundation

actor NavigationSource {
    var requests = 0
    var waiting: CheckedContinuation<Void, Never>?
    func read(pause: Bool = false, fail: Bool = false) async throws -> Data {
        requests += 1
        if pause { await withCheckedContinuation { waiting = $0 } }
        if fail { throw URLError(.notConnectedToInternet) }
        return Data("response-\(requests)".utf8)
    }
    func release() { waiting?.resume(); waiting = nil }
}

func testNavigationCache() async throws {
    let cache = NavigationCache(), source = NavigationSource()
    let owner = UUID(), now = Date.now
    let key = NavigationCache.Key(path: "/api/calls?filter=all", participantID: owner)
    let fetch: @Sendable () async throws -> Data = { try await source.read() }
    let first = try await cache.data(for: key, lifetime: 60, now: now, fetch: fetch)
    let repeated = try await cache.data(for: key, lifetime: 60, now: now.addingTimeInterval(59), fetch: fetch)
    try require(await source.requests == 1 && first == repeated, "navigation must reuse a fresh response")
    _ = try await cache.data(for: key, lifetime: 60, now: now.addingTimeInterval(61), fetch: fetch)
    try require(await source.requests == 2, "expired calls must refresh")
    _ = try await cache.data(for: .init(path: key.path, participantID: UUID()), lifetime: 60, fetch: fetch)
    _ = try await cache.data(for: .init(path: "/api/calls?filter=held", participantID: owner), lifetime: 60, fetch: fetch)
    try require(await source.requests == 4, "people and filters must not share values")
    await cache.invalidate()
    _ = try await cache.data(for: key, lifetime: 60, fetch: fetch)
    try require(await source.requests == 5, "refresh and mutations must invalidate values")

    await cache.invalidate()
    let sharedSource = NavigationSource()
    let one = Task { try await cache.data(for: key, lifetime: 60) { try await sharedSource.read(pause: true) } }
    while await sharedSource.waiting == nil { await Task.yield() }
    let two = Task { try await cache.data(for: key, lifetime: 60) { try await sharedSource.read() } }
    await sharedSource.release()
    let values = try await (one.value, two.value)
    try require(await sharedSource.requests == 1 && values.0 == values.1, "overlapping navigation must share a request")

    // A transport that ignores cancellation cannot repopulate a cleared session cache.
    await cache.invalidate()
    let stale = Task { try await cache.data(for: key, lifetime: 60) { try await sharedSource.read(pause: true) } }
    while await sharedSource.waiting == nil { await Task.yield() }
    await cache.invalidate()
    let fresh = try await cache.data(for: key, lifetime: 60, fetch: fetch)
    await sharedSource.release()
    do { _ = try await stale.value; throw TestFailure(message: "invalidated request returned stale data") }
    catch is CancellationError { }
    let after = try await cache.data(for: key, lifetime: 60, fetch: fetch)
    try require(after == fresh, "late request overwrote refreshed data")

    await cache.invalidate()
    do {
        _ = try await cache.data(for: key, lifetime: 60) { try await source.read(fail: true) }
        throw TestFailure(message: "failed request succeeded")
    } catch is URLError { }
    _ = try await cache.data(for: key, lifetime: 60, fetch: fetch)
    try require(await source.requests == 8, "failed reads must remain retryable")
    try require(NavigationCache.lifetime(path: key.path, owner: false, authenticated: true) == nil, "helper access must stay fresh")
    for path in ["/api/forwarding", "/api/people", "/api/sharing", "/api/voicemails/123/audio", "/api/forwarding/restore"] {
        try require(NavigationCache.lifetime(path: path, owner: true, authenticated: true) == nil, "sensitive endpoint cached: \(path)")
    }
    try require(NavigationCache.lifetime(path: "/public/config", owner: false, authenticated: false) == 3600, "public configuration cache")
    let publicKey = NavigationCache.Key(path: "/public/config", participantID: nil)
    let snapshot = try await cache.response(for: publicKey, lifetime: 3600, fetch: fetch)
    await cache.invalidate(preservingConfiguration: true)
    let reused = try await cache.response(for: publicKey, lifetime: 3600, fetch: fetch)
    try require(snapshot.fetchedAt == reused.fetchedAt && snapshot.data == reused.data, "cached status must retain the original check time")
    await cache.invalidate()
    let newSession = try await cache.response(for: publicKey, lifetime: 3600, fetch: fetch)
    try require(newSession.data != snapshot.data, "sign-out must clear even public cached responses")
    print("Navigation reuse, expiry, isolation, coalescing, invalidation races, retry and fresh-access rules passed.")
}
