import Foundation

private struct Failure: Error { let message: String }
private func require(_ value: Bool, _ message: String) throws { if !value { throw Failure(message: message) } }

private actor Source {
    let pages: [BlockedNumberPage]
    var requests: [String?] = []
    let failureAt: Int?
    let pause: Bool
    var waiting: CheckedContinuation<Void, Never>?
    init(_ pages: [BlockedNumberPage], failureAt: Int? = nil, pause: Bool = false) {
        self.pages = pages; self.failureAt = failureAt; self.pause = pause
    }
    func fetch(_ cursor: String?) async throws -> BlockedNumberPage {
        let index = requests.count
        requests.append(cursor)
        if pause { await withCheckedContinuation { waiting = $0 } }
        if failureAt == index { throw URLError(.networkConnectionLost) }
        if pages.isEmpty { return BlockedNumberPage(items: [], nextCursor: "page-\(index)", paginationVersion: 1) }
        guard pages.indices.contains(index) else { throw Failure(message: "Unexpected extra request") }
        return pages[index]
    }
    func release() { waiting?.resume(); waiting = nil }
}

@main struct BlockedNumbersTests {
    static func main() async throws {
        let date = Date(timeIntervalSince1970: 2_000_000_000)
        func item(_ index: Int, at: Date? = nil) -> BlockedNumber {
            BlockedNumber(id: String(index), phone: "+10000000001", reason: "scam", blockedAt: at ?? date,
                          expiresAt: date.addingTimeInterval(1000), attempts: 0, lastAttemptAt: nil)
        }
        func page(_ items: [BlockedNumber], _ cursor: String? = nil, version: Int? = 1) -> BlockedNumberPage {
            BlockedNumberPage(items: items, nextCursor: cursor, paginationVersion: version)
        }
        var passed = 0
        func pass(_ name: String) { passed += 1; print("PASS: \(name)") }

        let all = (0..<401).map { item($0) }
        let large = Source([page(Array(all[0..<200]), "second"), page(Array(all[200..<400]), "third"), page([all[400]])])
        let result = try await BlockedNumbersLoader.load { try await large.fetch($0) }
        try require(result.count == 401 && Set(result.map(\.id)).count == 401, "full list not returned")
        try require(result.map(\.id) == all.map(\.id).sorted(by: >), "stable equal-time order")
        try require(await large.requests == [nil,"second","third"], "cursor sequence")
        pass("all 401 entries traverse three pages with stable ordering")

        let empty = Source([page([], "after-expired"), page([], "after-more-expired"), page([item(1)])])
        try require(try await BlockedNumbersLoader.load { try await empty.fetch($0) }.map(\.id) == ["1"], "empty page ended traversal")
        let clear = Source([page([])])
        try require(try await BlockedNumbersLoader.load { try await clear.fetch($0) }.isEmpty, "complete empty result")
        pass("empty intermediate pages continue; only a terminal empty result can clear")

        let interrupted = Source([page([item(1)], "second"), page([item(2)])], failureAt: 1)
        var published = [item(99)]
        do {
            published = try await BlockedNumbersLoader.load { try await interrupted.fetch($0) }
            throw Failure(message: "network failure returned partial list")
        } catch is URLError { }
        try require(published.map(\.id) == ["99"], "failure replaced the previous complete list")
        let retry = Source([page([item(1)], "second"), page([item(2)])])
        published = try await BlockedNumbersLoader.load { try await retry.fetch($0) }
        let retriedRequests = await retry.requests
        try require(published.map(\.id) == ["2","1"] && retriedRequests == [nil,"second"], "retry did not restart completely")
        pass("later-page failure publishes nothing and retry starts from the beginning")

        for version: Int? in [nil,0,2] {
            let unsupported = Source([page([item(1)], version: version)])
            do {
                _ = try await BlockedNumbersLoader.load { try await unsupported.fetch($0) }
                throw Failure(message: "legacy or unknown server treated as complete")
            } catch APIError.blockedNumbersUnsupported { }
        }
        pass("legacy and unsupported server contracts cannot publish truncated lists")

        for cursor in ["", "bad&other=value", String(repeating: "a", count: 501)] {
            let invalid = Source([page([item(1)], cursor)])
            do {
                _ = try await BlockedNumbersLoader.load { try await invalid.fetch($0) }
                throw Failure(message: "invalid cursor accepted")
            } catch APIError.invalidResponse { }
            try require(await invalid.requests.count == 1, "invalid cursor reached transport")
        }
        let cycle = Source([page([], "second"), page([], "third"), page([], "second")])
        do {
            _ = try await BlockedNumbersLoader.load { try await cycle.fetch($0) }
            throw Failure(message: "cursor cycle accepted")
        } catch APIError.invalidResponse { }
        pass("malformed cursors and multi-page cycles stop before another request")

        let oversized = Source([page(Array(all[0..<201]))])
        do {
            _ = try await BlockedNumbersLoader.load { try await oversized.fetch($0) }
            throw Failure(message: "oversized page accepted")
        } catch APIError.invalidResponse { }
        let endless = Source([])
        do {
            _ = try await BlockedNumbersLoader.load { try await endless.fetch($0) }
            throw Failure(message: "endless pagination returned success")
        } catch APIError.incompleteBlockedNumbers { }
        try require(await endless.requests.count == 1000, "request safety bound")
        pass("oversized and endless responses fail without publishing partial data")

        let newest = item(1, at: date.addingTimeInterval(1))
        let duplicates = Source([page([newest, item(2)], "second"), page([item(1)])])
        let unique = try await BlockedNumbersLoader.load { try await duplicates.fetch($0) }
        try require(unique == [newest,item(2)], "duplicate replaced newer block or changed order")
        pass("overlapping pages deduplicate and preserve the newer block")

        let paused = Source([page([item(1)])], pause: true)
        let task = Task { try await BlockedNumbersLoader.load { try await paused.fetch($0) } }
        for _ in 0..<1000 {
            if await paused.waiting != nil { break }
            try await Task.sleep(for: .milliseconds(1))
        }
        try require(await paused.waiting != nil, "cancellation test never reached transport")
        task.cancel()
        await paused.release()
        do { _ = try await task.value; throw Failure(message: "cancelled load returned data") }
        catch is CancellationError { }
        pass("cancellation fences a transport that returns successfully afterward")
        print("Blocked-number pagination checks passed: \(passed)")
    }
}
