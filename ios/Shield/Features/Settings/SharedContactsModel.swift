import Foundation
import Observation

@MainActor
@Observable
final class SharedContactsModel {
    var items: [SavedNumber] = []
    var working = false
    var message: String?
    var loading = false
    var loadError: String?
    var sharedAt: Date?
    private(set) var pending: PendingContactChange?
    private(set) var recoveryError: String?
    private(set) var missingPendingContact = false
    private var loaded = false
    private var loadAttempts = 0
    private var request = UUID()
    private struct Context: Equatable { let session: Int; let person: UUID }
    private var context: Context?
    private let changes: ContactChangeStore

    init(changes: ContactChangeStore = .shared) { self.changes = changes }
    var canEdit: Bool { loaded && !working && pending == nil && loadError == nil }
    private func key(_ person: UUID) -> String { "shared-phone-contacts-" + person.uuidString }
    func hasShared(_ person: UUID?) -> Bool { sharedAt != nil || (person.map { UserDefaults.standard.bool(forKey: key($0)) } ?? false) }

    private func select(_ app: AppState) -> Context? {
        let next = (app.isPreview || (app.signedIn && app.isOwner))
            ? app.selectedPersonID.map { Context(session: app.sessionGeneration, person: $0) } : nil
        if context != next {
            request = UUID(); context = next
            items = []; pending = nil; sharedAt = nil; message = nil; loadError = nil; recoveryError = nil
            loaded = false; working = false; loading = false; missingPendingContact = false
        }
        return next
    }
    private func current(_ scope: Context, _ ticket: UUID, _ app: AppState) -> Bool {
        request == ticket && context == scope && app.sessionGeneration == scope.session &&
        app.selectedPersonID == scope.person && app.signedIn && app.isOwner && !app.isDeletingAccount && !Task.isCancelled
    }
    private func requireCurrent(_ scope: Context, _ ticket: UUID, _ app: AppState) throws {
        guard current(scope, ticket, app) else { throw CancellationError() }
    }
    private func explanation(_ error: Error) -> String {
        if error is URLError { return APIError.connectionInterrupted.localizedDescription }
        if let known = error as? APIError { return known.localizedDescription }
        return "Shield couldn’t confirm the contact update. Check the saved change or try again."
    }
    private func publish(_ result: APIResponses.Numbers) {
        items = result.items.sorted { $0.label.localizedStandardCompare($1.label) == .orderedAscending }
        sharedAt = result.sharedAt; loaded = true
        loadError = result.supportsContactChanges ? nil
            : APIError.service(code: "contact_changes_unavailable", status: 503).localizedDescription
        missingPendingContact = pending.map { change in !items.contains { $0.id == change.item.id } } ?? false
    }
    private func snapshot(_ app: AppState, scope: Context, ticket: UUID) async throws -> APIResponses.Numbers {
        let result: APIResponses.Numbers = try await app.api.send("/api/trusted-numbers", participantID: scope.person)
        try requireCurrent(scope, ticket, app)
        publish(result)
        return result
    }
    private func revision(_ result: APIResponses.Numbers) throws -> Int {
        guard result.supportsContactChanges, let value = result.revision else {
            throw APIError.service(code: "contact_changes_unavailable", status: 503)
        }
        return value
    }

    func load(_ app: AppState) async {
        let scope = select(app)
        guard !working else { return }
        request = UUID(); let ticket = request
        loading = true; loadError = nil
        defer { if request == ticket { loading = false } }
        if let failure = PreviewScenario.loadFailure("contacts", attempt: loadAttempts, preview: app.isPreview) {
            loadAttempts += 1; loadError = failure; return
        }
        if app.isPreview {
            items = PreviewScenario.emptyData("contacts", preview: true) ? [] : [SavedNumber(id: UUID(), label: "Jamie", phone: "+13125550102", provenance: "contacts", createdAt: .now),
                SavedNumber(id: UUID(), label: "My clinic", phone: "+13125550103", provenance: "contacts", createdAt: .now)]
            loaded = true; return
        }
        guard let scope, current(scope, ticket, app) else { return }
        do {
            guard let account = await app.api.localAccountID else { throw APIError.invalidResponse }
            try requireCurrent(scope, ticket, app)
            let saved = try await changes.read(account: account, person: scope.person)
            try requireCurrent(scope, ticket, app)
            pending = saved
            let result = try await snapshot(app, scope: scope, ticket: ticket)
            try await reconcile(result, app: app, scope: scope, ticket: ticket, account: account)
        } catch is CancellationError { return }
        catch {
            guard current(scope, ticket, app) else { return }
            loadError = explanation(error); app.handleSessionFailure(error)
        }
    }

    /// A read can confirm a completed change; it never edits Contacts or submits a write.
    private func reconcile(_ result: APIResponses.Numbers, app: AppState, scope: Context, ticket: UUID,
                           account: String, lease: UUID? = nil) async throws {
        guard let change = pending else { return }
        let remote = result.items.first { $0.id == change.item.id }
        guard try revision(result) > change.expectedRevision,
              (remote?.isEnabled ?? false) == change.enabled else { return }
        let local = try await PhoneContacts.shared.containsIfAuthorized(change.item.phone)
        try requireCurrent(scope, ticket, app)
        guard local == change.enabled else { return }
        let cleared = try await changes.clear(change.id, account: account, person: scope.person, lease: lease)
        try requireCurrent(scope, ticket, app)
        guard cleared else { return }
        pending = nil; recoveryError = nil; missingPendingContact = false
        message = change.enabled ? "\(change.item.label) is back in Contacts and on your shared list."
            : "\(change.item.label) was removed from Contacts and your shared list."
    }

    func share(_ app: AppState) async {
        guard let scope = select(app), canEdit, app.isOwner, !app.isPreview, !app.isDemo else { return }
        request = UUID(); let ticket = request
        working = true; loading = false; message = "Sharing contacts…"; loadError = nil
        defer { if request == ticket { working = false } }
        var lease: UUID?; var account: String?
        var savedMessage: String?
        do {
            guard let identity = await app.api.localAccountID else { throw APIError.invalidResponse }; account = identity
            try requireCurrent(scope, ticket, app)
            let work = try await changes.beginWork(account: identity, person: scope.person); lease = work
            let saved = try await changes.read(account: identity, person: scope.person)
            try requireCurrent(scope, ticket, app)
            pending = saved
            guard saved == nil else { throw APIError.service(code: "contacts_sync_busy", status: 409) }
            let before = try await snapshot(app, scope: scope, ticket: ticket)
            let expectedRevision = try revision(before)
            let contacts = try await PhoneContacts.shared.all()
            try requireCurrent(scope, ticket, app)
            struct Share: Encodable { let contacts: [SharedContact]; let expectedRevision: Int }
            let body = try JSONEncoder().encode(Share(contacts: contacts.contacts, expectedRevision: expectedRevision))
            let result: APIResponses.ContactSync = try await app.api.send("/api/trusted-numbers/sync", method: "POST", body: body, participantID: scope.person)
            try requireCurrent(scope, ticket, app)
            UserDefaults.standard.set(true, forKey: key(scope.person))
            let skipped = contacts.skipped + result.skipped
            savedMessage = "\(result.shared) contacts shared." + (skipped > 0 ? " \(skipped) couldn’t be added." : "")
            _ = try await snapshot(app, scope: scope, ticket: ticket)
            message = savedMessage
        } catch {
            if current(scope, ticket, app) {
                message = savedMessage.map { $0 + " Refresh to see the updated list." }
                    ?? "Shield couldn’t confirm the update. Refresh to check your shared list."
                loadError = explanation(error); app.handleSessionFailure(error)
            }
        }
        if let account, let lease { await changes.finishWork(account: account, person: scope.person, lease: lease) }
    }

    func change(_ enabled: Bool, item: SavedNumber, app: AppState) async -> Bool {
        guard canEdit else { return item.isEnabled }
        await performChange(enabled, item: item, retry: false, app: app)
        return items.first { $0.id == item.id }?.isEnabled ?? item.isEnabled
    }
    func retry(_ app: AppState, keepRemoved: Bool = false) async {
        guard let pending else { return }
        await performChange(keepRemoved ? false : pending.enabled, item: pending.item, retry: true, app: app)
    }

    private func performChange(_ enabled: Bool, item: SavedNumber, retry: Bool, app: AppState) async {
        guard let scope = select(app), app.isOwner, !app.isPreview, !app.isDemo, !working else { return }
        request = UUID(); let ticket = request
        working = true; loading = false; message = nil; recoveryError = nil
        defer { if request == ticket { working = false } }
        var lease: UUID?; var account: String?
        do {
            guard let identity = await app.api.localAccountID else { throw APIError.invalidResponse }; account = identity
            try requireCurrent(scope, ticket, app)
            let work = try await changes.beginWork(account: identity, person: scope.person); lease = work
            let saved = try await changes.read(account: identity, person: scope.person)
            try requireCurrent(scope, ticket, app)
            pending = saved
            guard retry ? saved?.item.id == item.id : saved == nil else {
                throw APIError.service(code: "contacts_sync_busy", status: 409)
            }
            let before = try await snapshot(app, scope: scope, ticket: ticket)
            let freshRevision = try revision(before)
            if retry, saved?.enabled == enabled {
                try await reconcile(before, app: app, scope: scope, ticket: ticket, account: identity, lease: work)
                if pending == nil { await changes.finishWork(account: identity, person: scope.person, lease: work); return }
            }
            let row = before.items.first { $0.id == item.id }
            if row == nil {
                guard let saved, freshRevision > saved.expectedRevision else { throw APIError.service(code: "contact_not_found", status: 404) }
                if enabled {
                    message = "This contact is no longer on your shared list. Keep it removed to finish, then add it again if you choose."
                    await changes.finishWork(account: identity, person: scope.person, lease: work); return
                }
            }
            // Preserve the original receipt while access is revoked. Replacing it
            // first would discard proof of a saved change when the retry cannot edit.
            if saved != nil {
                try await PhoneContacts.shared.authorizeChange()
                try requireCurrent(scope, ticket, app)
            }
            var change = saved ?? PendingContactChange(item: row ?? item, enabled: enabled, expectedRevision: freshRevision)
            if row != nil, change.expectedRevision != freshRevision || change.enabled != enabled {
                change = PendingContactChange(item: row ?? item, enabled: enabled, expectedRevision: freshRevision)
            } else { change.enabled = enabled }
            try await changes.save(change, account: identity, person: scope.person, lease: work)
            try requireCurrent(scope, ticket, app)
            pending = change
            try await PhoneContacts.shared.setEnabled(enabled, phone: change.item.phone, label: change.item.label, personID: scope.person)
            try requireCurrent(scope, ticket, app)
            if row != nil {
                let receipt: APIResponses.ContactChange = try await app.api.send("/api/trusted-numbers/\(change.item.id)", method: "PATCH",
                    body: APIClient.payload(["enabled": enabled, "changeId": change.id.uuidString, "expectedRevision": change.expectedRevision]), participantID: scope.person)
                try requireCurrent(scope, ticket, app)
                guard receipt.saved, receipt.changeId == change.id, receipt.revision == change.expectedRevision + 1 else { throw APIError.invalidResponse }
            }
            let after = try await snapshot(app, scope: scope, ticket: ticket)
            try await reconcile(after, app: app, scope: scope, ticket: ticket, account: identity, lease: work)
        } catch {
            if current(scope, ticket, app) {
                recoveryError = explanation(error)
                app.handleSessionFailure(error)
                // A timeout may be a saved write. Check once, retaining the journal
                // on uncertainty; never invert only the native contact state.
                if pending != nil, let account, let lease, current(scope, ticket, app) {
                    do {
                        let result = try await snapshot(app, scope: scope, ticket: ticket)
                        try await reconcile(result, app: app, scope: scope, ticket: ticket, account: account, lease: lease)
                    } catch { /* The durable recovery remains visible on the next visit. */ }
                } else if current(scope, ticket, app) { loadError = explanation(error) }
            }
        }
        if let account, let lease { await changes.finishWork(account: account, person: scope.person, lease: lease) }
    }

    #if DEBUG
    func prepareDemo(_ action: String, phone: String, app: AppState) async {
        guard ["remove", "add"].contains(action), canEdit,
              let item = items.first(where: { PhoneContacts.canonical($0.phone) == PhoneContacts.canonical(phone) }) else { return }
        _ = await change(action == "add", item: item, app: app)
    }
    #endif
}
