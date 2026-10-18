import CryptoKit
import Foundation
import Observation

/// Serializes full replacements. A durable pending bit survives failed reloads and app termination.
@MainActor
@Observable
final class CallDirectoryCoordinator {
    private(set) var error: String?
    private(set) var isReloading = false
    private(set) var needsReload = false
    private(set) var requestGeneration = 0
    @ObservationIgnored private let fileURL: URL?
    @ObservationIgnored private let reload: @MainActor () async throws -> Bool
    @ObservationIgnored private let now: @MainActor () -> Date
    @ObservationIgnored private var accountKey: String?
    @ObservationIgnored private var activated = false
    @ObservationIgnored private var allowedOwners: Set<UUID>?
    @ObservationIgnored private var list: CallDirectoryList?
    @ObservationIgnored private var needsWrite = false
    @ObservationIgnored private var waiters: [CheckedContinuation<Void, Never>] = []

    init(fileURL: URL?, now: @escaping @MainActor () -> Date = { .now }, reload: @escaping @MainActor () async throws -> Bool) {
        self.fileURL = fileURL
        self.now = now
        self.reload = reload
        list = CallDirectoryList.load(from: fileURL)
    }

    private static func key(_ account: String) -> String {
        SHA256.hash(data: Data(account.utf8)).map { String(format: "%02x", $0) }.joined()
    }

    func activate(_ account: String?, waitForReload: Bool = true) async {
        activated = true
        let nextAccount = account.map(Self.key)
        if nextAccount != accountKey { allowedOwners = nil }
        accountKey = nextAccount
        invalidateRequests()
        let retained = list?.accountKey == accountKey && accountKey != nil ? list : nil
        stage(participantID: retained?.participantID, entries: retained?.activeEntries(at: now()) ?? [])
        await finishUpdate(waitForReload: waitForReload)
    }

    /// Immediate invalidation fences responses already in flight, before an asynchronous sign-out finishes.
    func reset() {
        activated = true
        accountKey = nil
        allowedOwners = []
        invalidateRequests()
        stage(participantID: nil, entries: [])
        Task { await reloadPending() }
    }

    func update(entries: [CallDirectoryList.Entry], account: String, participantID: UUID, requestGeneration: Int? = nil, waitForReload: Bool = true) async {
        guard activated, accountKey == Self.key(account), allowedOwners?.contains(participantID) != false,
              requestGeneration == nil || requestGeneration == self.requestGeneration else { return }
        stage(participantID: participantID, entries: entries.filter { $0.expiresAt > now() })
        await finishUpdate(waitForReload: waitForReload)
    }

    func invalidateRequests() { requestGeneration += 1 }

    func remove(number: Int64, account: String, participantID: UUID, waitForReload: Bool = true) async {
        guard activated, accountKey == Self.key(account), allowedOwners?.contains(participantID) != false else { return }
        invalidateRequests()
        guard list?.participantID == participantID else { return }
        stage(participantID: participantID, entries: list?.activeEntries(at: now()).filter { $0.number != number } ?? [])
        await finishUpdate(waitForReload: waitForReload)
    }

    /// Runs before networking too, so an offline foreground refresh can remove expired entries and retry CallKit.
    func refresh(waitForReload: Bool = true) async {
        guard activated else { return }
        let retained = list?.accountKey == accountKey && accountKey != nil ? list : nil
        stage(participantID: retained?.participantID, entries: retained?.activeEntries(at: now()) ?? [])
        await finishUpdate(waitForReload: waitForReload)
    }

    func retainOwners(_ owners: Set<UUID>) {
        if allowedOwners != owners { invalidateRequests() }
        allowedOwners = owners
        guard let owner = list?.participantID, !owners.contains(owner) else { return }
        stage(participantID: nil, entries: [])
        Task { await reloadPending() }
    }

    private func stage(participantID: UUID?, entries: [CallDirectoryList.Entry]) {
        do {
            let replacement = CallDirectoryList(accountKey: accountKey, participantID: participantID, entries: entries)
            if list?.hasSameContents(as: replacement) != true {
                list = replacement
                needsWrite = true
            }
            guard let fileURL, let list else { throw CocoaError(.fileNoSuchFile) }
            if needsWrite { try list.save(to: fileURL) }
            else { try CallDirectoryList.protect(fileURL) }
            needsWrite = false
            needsReload = list.needsReload
            error = nil
        } catch {
            // Never claim a disk-write failure updated iOS, and never reload the previous account's payload.
            needsReload = true
            needsWrite = true
            self.error = "The blocked numbers couldn’t be saved on this iPhone. Try updating the list again."
        }
    }

    /// Auth, navigation and server deletion can proceed once the local intent is durable; the status view observes the reload result.
    private func finishUpdate(waitForReload: Bool) async {
        if waitForReload { await reloadPending() }
        else { Task { await reloadPending() } }
    }

    private func reloadPending() async {
        if isReloading {
            await withCheckedContinuation { waiters.append($0) }
            return
        }
        guard error == nil else { return }
        isReloading = true
        defer {
            isReloading = false
            let completed = waiters
            waiters.removeAll()
            for waiter in completed { waiter.resume() }
        }
        while error == nil, let pending = list, pending.needsReload {
            do {
                let applied = try await reload()
                // A logout, newer response or unblock may have replaced the payload while CallKit ran.
                guard list?.revision == pending.revision else { continue }
                guard error == nil, !needsWrite else { return }
                guard applied else { return } // Disabled extensions load the saved file when enabled.
                guard let fileURL else { throw CocoaError(.fileNoSuchFile) }
                var acknowledged = pending
                acknowledged.needsReload = false
                try acknowledged.save(to: fileURL)
                list = acknowledged
                needsReload = false
            } catch {
                if list?.revision != pending.revision { continue }
                needsReload = true
                self.error = "Your iPhone hasn’t updated its blocked numbers. Try again. To allow calls now, turn off Shield in Phone settings under Call Blocking & Identification."
                return
            }
        }
    }
}
