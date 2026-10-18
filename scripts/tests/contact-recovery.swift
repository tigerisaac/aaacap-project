import Foundation

// Synthetic transport and address book; the model, DTOs and durable store are production sources.
struct Person: Decodable, Sendable {}
struct CallRecord: Decodable, Sendable {}
struct CallEvent: Decodable, Sendable {}
struct SharingGrant: Decodable, Sendable {}
struct BackendConfiguration { let baseURL: URL? }
struct AccountDeletionStatus: Decodable { let restorationRequired: Bool }
actor MessageAudio { func activate(_ account: String) {} }
actor CallDirectory { func activate(_ account: String?, waitForReload: Bool) {} }
@MainActor final class AppState {
    let api = APIClient()
    let configuration = BackendConfiguration(baseURL: URL(string: "https://example.invalid/" + UUID().uuidString))
    let contactChanges: ContactChangeStore
    let messageAudio = MessageAudio()
    let callDirectory = CallDirectory()
    var deletionReceipt: String?
    var deletionSubmitted = false
    var sessionGeneration = 0
    var signedIn = true
    var selectedPersonID: UUID? = UUID()
    var isOwner = true
    var isPreview = false
    var isDemo = false
    var isDeletingAccount = false
    var errors = 0
    init(changes: ContactChangeStore) { contactChanges = changes }
    func invalidateAccountLoads() { sessionGeneration += 1 }
    func deleteLocalMessageLibrary() async throws {}
    func signOut() async { signedIn = false; sessionGeneration += 1 }
    func handleSessionFailure(_ error: Error) { errors += 1 }
}
enum PreviewScenario {
    static func loadFailure(_ key: String, attempt: Int, preview: Bool) -> String? { nil }
    static func emptyData(_ key: String, preview: Bool) -> Bool { false }
}
actor PhoneContacts {
    static let shared = PhoneContacts()
    private var enabled = true
    private var authorized = true
    private(set) var writes = 0
    private var holdNext = false
    private var held: CheckedContinuation<Void, Never>?
    func reset(enabled: Bool = true) { self.enabled = enabled; authorized = true; writes = 0; holdNext = false }
    func setAccess(_ value: Bool) { authorized = value }
    func state() -> Bool { enabled }
    func all() throws -> (contacts: [SharedContact], skipped: Int) {
        guard authorized else { throw APIError.service(code: "full_contacts_required", status: 403) }
        return ([], 0)
    }
    func containsIfAuthorized(_ phone: String) throws -> Bool? { authorized ? enabled : nil }
    func authorizeChange() throws { if !authorized { throw APIError.service(code: "full_contacts_required", status: 403) } }
    func restoreAll(personID: UUID) async throws {}
    func removeRestoreCopies(personID: UUID) throws {}
    func holdNextWrite() { holdNext = true }
    func isHeld() -> Bool { held != nil }
    func releaseWrite() { held?.resume(); held = nil }
    func setEnabled(_ enabled: Bool, phone: String, label: String, personID: UUID) async throws {
        if holdNext { holdNext = false; await withCheckedContinuation { held = $0 } }
        guard authorized else { throw APIError.service(code: "full_contacts_required", status: 403) }
        writes += 1; self.enabled = enabled
    }
}
actor APIClient {
    enum Mode: Sendable { case good, lostReply, savedOffline, beforeSave, refreshFails }
    static let rowID = UUID(uuidString: "00000000-0000-4000-8000-000000000001")!
    var localAccountID: String? { account }
    private var account = "synthetic-account"
    private var enabled = true
    private var missing = false
    private var revision = 0
    private var contract = true
    private var mode = Mode.good
    private var failedReads = 0
    private var holdNext = false
    private var heldError = false
    private var held: CheckedContinuation<Void, Never>?
    private(set) var patches = 0
    private(set) var shares = 0
    private var receipt: (id: String, from: Int, enabled: Bool)?
    private var deletionReceipt: String?
    private var needsRestoration = false
    private(set) var deletions = 0
    func requireRestoration() { needsRestoration = true }
    func configure(_ mode: Mode) { self.mode = mode; failedReads = 0 }
    func legacy() { contract = false }
    func switchAccount() { account = "another-synthetic-account" }
    func externalChange(_ enabled: Bool, missing: Bool = false) { self.enabled = enabled; self.missing = missing; revision += 1; receipt = nil }
    func failReads(_ count: Int) { failedReads = count }
    func holdNextRead(error: Bool = false) { holdNext = true; heldError = error }
    func isHeld() -> Bool { held != nil }
    func releaseRead() { held?.resume(); held = nil }
    func state() -> Bool { enabled }
    nonisolated static func payload(_ value: [String: Any]) throws -> Data { try JSONSerialization.data(withJSONObject: value) }
    func send<T: Decodable & Sendable>(_ path: String, method: String = "GET", body: Data? = nil, participantID: UUID? = nil, authenticated: Bool = true) async throws -> T {
        if path == "/api/account/deletion" {
            return try JSONDecoder().decode(T.self, from: Self.payload(["restorationRequired": needsRestoration]))
        }
        if path == "/api/account/delete" {
            deletions += 1
            if mode == .beforeSave { throw URLError(.networkConnectionLost) }
            let value = try JSONSerialization.jsonObject(with: body!) as! [String: String]
            deletionReceipt = value["receipt"]
            if mode == .lostReply { throw URLError(.networkConnectionLost) }
            return try JSONDecoder().decode(T.self, from: Self.payload(["receipt": deletionReceipt!]))
        }
        if path == "/api/account/deletion/receipt" {
            guard deletionReceipt != nil else { throw APIError.service(code: "deletion_receipt_unavailable", status: 404) }
            return try JSONDecoder().decode(T.self, from: Self.payload(["state": "pending"]))
        }
        if method == "PATCH" {
            patches += 1
            guard !missing else { throw APIError.service(code: "contact_not_found", status: 404) }
            if mode == .beforeSave { throw URLError(.networkConnectionLost) }
            let value = try JSONSerialization.jsonObject(with: body!) as! [String: Any]
            let target = value["enabled"] as! Bool, expected = value["expectedRevision"] as! Int, id = value["changeId"] as! String
            if receipt?.id != id {
                guard expected == revision else { throw APIError.service(code: "contacts_changed", status: 409) }
                enabled = target; revision += 1; receipt = (id, expected, target)
            }
            if mode == .savedOffline { failedReads = 1; throw URLError(.networkConnectionLost) }
            if mode == .lostReply { throw URLError(.networkConnectionLost) }
            if mode == .refreshFails { failedReads = 2 }
            return try JSONDecoder().decode(T.self, from: Self.payload(["saved": true, "changeId": id, "revision": revision]))
        }
        if method == "POST" {
            shares += 1
            let value = try JSONSerialization.jsonObject(with: body!) as! [String: Any]
            guard value["expectedRevision"] as? Int == revision else { throw APIError.service(code: "contacts_changed", status: 409) }
            revision += 1
            if mode == .refreshFails { failedReads = 1 }
            return try JSONDecoder().decode(T.self, from: Self.payload(["shared": 0, "skipped": 0]))
        }
        if failedReads > 0 { failedReads -= 1; throw URLError(.notConnectedToInternet) }
        var value: [String: Any] = ["items": missing ? [] : [["id": Self.rowID.uuidString, "label": "Synthetic contact", "phone": "+12025550111", "createdAt": 0, "enabled": enabled]], "sharedAt": NSNull()]
        if contract { value["revision"] = revision; value["changeContract"] = "revision-v1" }
        let snapshot = try Self.payload(value)
        if holdNext {
            let fail = heldError; holdNext = false
            await withCheckedContinuation { held = $0 }
            if fail { throw URLError(.timedOut) }
        }
        return try JSONDecoder().decode(T.self, from: snapshot)
    }
}
struct CheckFailure: Error {}
@main struct Verify {
    @MainActor static func main() async throws {
        let root = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
        var passed = 0, failed = 0
        func check(_ value: Bool) throws { if !value { throw CheckFailure() } }
        func fixture() async -> (AppState, SharedContactsModel, ContactChangeStore) {
            await PhoneContacts.shared.reset()
            let store = ContactChangeStore(root: root.appending(path: UUID().uuidString)), app = AppState(changes: store)
            let model = SharedContactsModel(changes: store); await model.load(app)
            return (app, model, store)
        }
        func run(_ name: String, _ body: @MainActor () async throws -> Void) async {
            do { try await body(); passed += 1; print("PASS \(name)") }
            catch { failed += 1; print("FAIL \(name): \(type(of: error))") }
        }
        func wait(_ predicate: () async -> Bool) async throws {
            for _ in 0..<1000 { if await predicate() { return }; try await Task.sleep(for: .milliseconds(2)) }
            throw CheckFailure()
        }
        await run("confirmed removal and restoration align all three states") {
            let (app, model, _) = await fixture(); let item = model.items[0]
            _ = await model.change(false, item: item, app: app)
            try check(!(await PhoneContacts.shared.state())); try check(!(await app.api.state()))
            try check(model.items[0].isEnabled == false && model.pending == nil)
            _ = await model.change(true, item: model.items[0], app: app)
            try check(await PhoneContacts.shared.state()); try check(await app.api.state()); try check(model.items[0].isEnabled && model.pending == nil)
        }
        await run("saved write with lost reply never rolls back only the phone") {
            let (app, model, _) = await fixture(); await app.api.configure(.lostReply)
            _ = await model.change(false, item: model.items[0], app: app)
            try check(!(await PhoneContacts.shared.state())); try check(!(await app.api.state())); try check(model.pending == nil && model.items[0].isEnabled == false)
            try check(await PhoneContacts.shared.writes == 1)
        }
        for failure in [false, true] {
            await run("older \(failure ? "failed" : "successful") refresh cannot undo confirmed change") {
                let (app, model, _) = await fixture(); let item = model.items[0]
                await app.api.holdNextRead(error: failure)
                let older = Task { await model.load(app) }; try await wait { await app.api.isHeld() }
                _ = await model.change(false, item: item, app: app)
                await app.api.releaseRead(); await older.value
                try check(!model.items[0].isEnabled && model.loadError == nil && model.pending == nil && !model.loading)
            }
        }
        await run("pending saved write survives relaunch and settles by reads alone") {
            let (app, model, store) = await fixture(); await app.api.configure(.savedOffline)
            _ = await model.change(false, item: model.items[0], app: app)
            try check(model.pending != nil && !model.canEdit)
            try check(model.recoveryError == APIError.connectionInterrupted.localizedDescription)
            await app.api.configure(.good)
            let reopened = SharedContactsModel(changes: store); await reopened.load(app)
            try check(reopened.pending == nil && !reopened.items[0].isEnabled)
            try check(await app.api.patches == 1); try check(await app.api.shares == 0); try check(await PhoneContacts.shared.writes == 1)
        }
        await run("unsent write remains pending across refresh and retries only explicitly") {
            let (app, model, store) = await fixture(); await app.api.configure(.beforeSave)
            _ = await model.change(false, item: model.items[0], app: app)
            let id = model.pending?.id; try check(id != nil)
            let reopened = SharedContactsModel(changes: store); await reopened.load(app); await reopened.load(app)
            try check(reopened.pending?.id == id); try check(await app.api.patches == 1); try check(await PhoneContacts.shared.writes == 1)
            await app.api.configure(.good); await reopened.retry(app)
            try check(reopened.pending == nil && !reopened.items[0].isEnabled); try check(await app.api.patches == 2)
        }
        await run("confirmed save with failed refresh remains accurately recoverable") {
            let (app, model, store) = await fixture(); await app.api.configure(.refreshFails)
            _ = await model.change(false, item: model.items[0], app: app)
            try check(model.pending != nil); try check(!(await PhoneContacts.shared.state()))
            await app.api.configure(.good); let reopened = SharedContactsModel(changes: store); await reopened.load(app)
            try check(reopened.pending == nil && !reopened.items[0].isEnabled); try check(await app.api.patches == 1)
        }
        await run("newer conflicting choice requires a fresh explicit retry") {
            let (app, model, _) = await fixture(); await app.api.configure(.beforeSave)
            _ = await model.change(false, item: model.items[0], app: app); let prior = model.pending!.id
            await app.api.externalChange(true); await model.load(app)
            try check(model.pending?.id == prior); try check(await app.api.patches == 1)
            await app.api.configure(.savedOffline); await model.retry(app)
            try check(model.pending?.id != prior); try check(model.pending?.expectedRevision == 1)
            await app.api.configure(.good); await model.load(app); try check(model.pending == nil && !model.items[0].isEnabled)
        }
        await run("permission revocation keeps recovery without prompting or editing on refresh") {
            let (app, model, _) = await fixture(); await app.api.configure(.savedOffline)
            _ = await model.change(false, item: model.items[0], app: app)
            await PhoneContacts.shared.setAccess(false); await app.api.configure(.good); await model.load(app)
            try check(model.pending != nil); try check(await PhoneContacts.shared.writes == 1)
            await model.retry(app); try check(model.pending != nil); try check(await app.api.patches == 1)
            await PhoneContacts.shared.setAccess(true); await model.load(app); try check(model.pending == nil)
        }
        await run("denied native edit never submits a cloud write; explicit retry recovers") {
            let (app, model, _) = await fixture(); await PhoneContacts.shared.setAccess(false)
            _ = await model.change(false, item: model.items[0], app: app)
            try check(model.pending != nil); try check(await app.api.patches == 0)
            await PhoneContacts.shared.setAccess(true); await model.retry(app)
            try check(model.pending == nil); try check(await app.api.patches == 1)
        }
        await run("opening with a different account never reveals or resumes the pending contact") {
            let (app, model, store) = await fixture(); await app.api.configure(.beforeSave)
            _ = await model.change(false, item: model.items[0], app: app)
            await app.api.switchAccount(); app.sessionGeneration += 1
            let reopened = SharedContactsModel(changes: store); await reopened.load(app)
            try check(reopened.pending == nil); try check(await app.api.patches == 1)
            try check(try await store.read(account: "synthetic-account", person: app.selectedPersonID!) != nil)
        }
        await run("session change during native edit preserves recovery without posting or leaking errors") {
            let (app, model, store) = await fixture(); await PhoneContacts.shared.holdNextWrite()
            let work = Task { _ = await model.change(false, item: model.items[0], app: app) }
            try await wait { await PhoneContacts.shared.isHeld() }
            let person = app.selectedPersonID!; app.sessionGeneration += 1; app.signedIn = false; app.selectedPersonID = nil
            await model.load(app); await PhoneContacts.shared.releaseWrite(); await work.value
            try check(model.items.isEmpty && model.pending == nil && model.loadError == nil && !model.working && app.errors == 0)
            try check(await app.api.patches == 0); try check(try await store.read(account: "synthetic-account", person: person) != nil)
        }
        await run("a deleted restore target offers a recoverable removal without recreating a cloud row") {
            let (app, model, _) = await fixture(); await app.api.externalChange(false); await PhoneContacts.shared.reset(enabled: false); await model.load(app)
            await app.api.configure(.beforeSave); _ = await model.change(true, item: model.items[0], app: app)
            await app.api.externalChange(false, missing: true); await model.load(app)
            try check(model.pending?.enabled == true && model.missingPendingContact)
            await model.retry(app); try check(await app.api.patches == 1); try check(await PhoneContacts.shared.state())
            await model.retry(app, keepRemoved: true)
            try check(model.pending == nil && model.items.isEmpty); try check(!(await PhoneContacts.shared.state())); try check(await app.api.patches == 1)
        }
        await run("an unavailable backend contract fails before modifying the address book") {
            let (app, model, _) = await fixture(); await app.api.legacy()
            _ = await model.change(false, item: model.items[0], app: app)
            try check(model.pending == nil && model.loadError != nil); try check(await PhoneContacts.shared.writes == 0); try check(await app.api.patches == 0)
        }
        await run("full share is explicit, revision checked, and blocked by an unfinished edit") {
            let (app, model, _) = await fixture(); await model.load(app); try check(await app.api.shares == 0)
            await model.share(app); try check(await app.api.shares == 1)
            await app.api.configure(.beforeSave); _ = await model.change(false, item: model.items[0], app: app)
            await model.share(app); try check(await app.api.shares == 1)
        }
        await run("a confirmed full share with failed refresh reports saved contacts") {
            let (app, model, _) = await fixture(); await app.api.configure(.refreshFails); await model.share(app)
            try check(model.message?.contains("0 contacts shared.") == true && model.message?.contains("Refresh") == true)
            try check(model.loadError != nil); try check(await app.api.shares == 1); try check(await PhoneContacts.shared.writes == 0)
        }
        await run("concurrent model instances cannot start a second native edit") {
            let (app, model, store) = await fixture(), other = SharedContactsModel(changes: store); await other.load(app)
            await PhoneContacts.shared.holdNextWrite()
            let work = Task { _ = await model.change(false, item: model.items[0], app: app) }
            try await wait { await PhoneContacts.shared.isHeld() }
            _ = await other.change(false, item: other.items[0], app: app)
            await PhoneContacts.shared.releaseWrite(); await work.value
            try check(await PhoneContacts.shared.writes == 1); try check(await app.api.patches == 1)
        }
        await run("durable recovery is account scoped, protected, backup excluded and removable") {
            let (app, model, store) = await fixture(); await app.api.configure(.beforeSave)
            _ = await model.change(false, item: model.items[0], app: app)
            let person = app.selectedPersonID!, saved = try await store.read(account: "synthetic-account", person: person)
            try check(saved == model.pending); try check(try await store.read(account: "different", person: person) == nil)
            let files = FileManager.default.enumerator(at: root, includingPropertiesForKeys: nil)!.allObjects.compactMap { $0 as? URL }.filter { $0.pathExtension == "json" }
            let file = try files.first { try Data(contentsOf: $0).contains(Data(saved!.id.uuidString.utf8)) }!
            let values = try file.deletingLastPathComponent().resourceValues(forKeys: [.isExcludedFromBackupKey])
            try check(values.isExcludedFromBackup == true)
            let permissions = try FileManager.default.attributesOfItem(atPath: file.path)[.posixPermissions] as? Int
            try check(permissions == 0o600)
            try await store.removeAccount("synthetic-account"); try check(try await store.read(account: "synthetic-account", person: person) == nil)
        }
        await run("damaged durable recovery fails closed before any contact edits") {
            let (app, model, store) = await fixture(); await app.api.configure(.beforeSave)
            _ = await model.change(false, item: model.items[0], app: app); let id = model.pending!.id
            let files = FileManager.default.enumerator(at: root, includingPropertiesForKeys: nil)!.allObjects.compactMap { $0 as? URL }.filter { $0.pathExtension == "json" }
            let file = try files.first { try Data(contentsOf: $0).contains(Data(id.uuidString.utf8)) }!
            try Data("invalid".utf8).write(to: file)
            let reopened = SharedContactsModel(changes: store); await reopened.load(app)
            try check(reopened.loadError != nil && !reopened.canEdit && reopened.items.isEmpty)
            try check(await PhoneContacts.shared.writes == 1); try check(await app.api.patches == 1)
        }
        await run("rejected deletion retains unfinished contact recovery") {
            let (app, model, store) = await fixture(); await app.api.configure(.beforeSave)
            _ = await model.change(false, item: model.items[0], app: app)
            await app.api.requireRestoration()
            do { try await app.deleteAccount(); throw CheckFailure() }
            catch APIError.service(let code, _) { try check(code == "restore_forwarding_before_deletion") }
            try check(app.deletionReceipt == nil)
            try check(try await store.read(account: "synthetic-account", person: app.selectedPersonID!) != nil)
        }
        await run("unsent deletion retains recovery until same-account retry is accepted") {
            let (app, model, store) = await fixture(); await app.api.configure(.beforeSave)
            _ = await model.change(false, item: model.items[0], app: app); let person = app.selectedPersonID!
            do { try await app.deleteAccount(); throw CheckFailure() } catch is URLError {}
            try check(app.deletionReceipt != nil && !app.deletionSubmitted)
            try check(try await store.read(account: "synthetic-account", person: person) != nil)
            await app.api.configure(.good); _ = try await app.checkAccountDeletion()
            try check(app.deletionSubmitted && !app.signedIn)
            try check(try await store.read(account: "synthetic-account", person: person) == nil)
            app.clearDeletionReceipt()
        }
        await run("lost deletion response clears recovery only after its status is confirmed") {
            let (app, model, store) = await fixture(); await app.api.configure(.beforeSave)
            _ = await model.change(false, item: model.items[0], app: app); let person = app.selectedPersonID!
            await app.api.configure(.lostReply)
            do { try await app.deleteAccount(); throw CheckFailure() } catch is URLError {}
            try check(try await store.read(account: "synthetic-account", person: person) != nil)
            _ = try await app.checkAccountDeletion()
            try check(app.deletionSubmitted); try check(await app.api.deletions == 1)
            try check(try await store.read(account: "synthetic-account", person: person) == nil)
            app.clearDeletionReceipt()
        }
        await run("deletion recovery cannot submit from a different account or erase its journal") {
            let (app, model, store) = await fixture(); await app.api.configure(.beforeSave)
            _ = await model.change(false, item: model.items[0], app: app); let person = app.selectedPersonID!
            do { try await app.deleteAccount(); throw CheckFailure() } catch is URLError {}
            await app.api.switchAccount(); await app.api.configure(.good)
            do { _ = try await app.checkAccountDeletion(); throw CheckFailure() }
            catch APIError.service(let code, _) { try check(code == "deletion_receipt_unavailable") }
            try check(try await store.read(account: "synthetic-account", person: person) != nil)
            try check(await app.api.deletions == 1); app.clearDeletionReceipt()
        }
        print("Contact recovery: \(passed) passed, \(failed) failed")
        exit(failed == 0 ? 0 : 1)
    }
}
