import Foundation
import Observation

@MainActor
@Observable
final class SharedContactsModel {
    var items: [SavedNumber] = []
    var working = false
    var message: String?

    private func key(_ person: UUID) -> String { "shared-phone-contacts-" + person.uuidString }
    func hasShared(_ person: UUID?) -> Bool { person.map { UserDefaults.standard.bool(forKey: key($0)) } ?? false }

    func load(_ app: AppState) async {
        if app.isPreview {
            items = [SavedNumber(id: UUID(), label: "Jamie", phone: "+13125550102", provenance: "contacts", createdAt: .now),
                     SavedNumber(id: UUID(), label: "My clinic", phone: "+13125550103", provenance: "contacts", createdAt: .now)]
            return
        }
        guard let person = app.selectedPersonID, !app.isPreview else { return }
        do { try await fetch(app, person) } catch { app.handle(error) }
    }
    private func fetch(_ app: AppState, _ person: UUID) async throws {
        let result: APIResponses.Numbers = try await app.api.send("/api/trusted-numbers", participantID: person)
        guard app.selectedPersonID == person else { throw CancellationError() }
        items = result.items.sorted { $0.label.localizedStandardCompare($1.label) == .orderedAscending }
    }
    func share(_ app: AppState) async {
        guard let person = app.selectedPersonID, app.isOwner, !app.isPreview, !working else { return }
        working = true; message = "Updating contacts…"
        defer { working = false }
        do {
            let contacts = try await PhoneContacts.shared.all()
            let body = try JSONEncoder().encode(["contacts": contacts])
            let result: APIResponses.ContactSync = try await app.api.send("/api/trusted-numbers/sync", method: "POST", body: body, participantID: person)
            guard app.selectedPersonID == person else { throw CancellationError() }
            UserDefaults.standard.set(true, forKey: key(person))
            try await fetch(app, person)
            message = "\(result.shared) contacts updated." + (result.skipped > 0 ? " \(result.skipped) couldn’t be added." : "")
        } catch { message = nil; app.handle(error) }
    }
    func change(_ enabled: Bool, item: SavedNumber, app: AppState) async -> Bool {
        guard let person = app.selectedPersonID, app.isOwner, !app.isPreview, !working else { return item.isEnabled }
        working = true; message = nil
        defer { working = false }
        do {
            try await PhoneContacts.shared.setEnabled(enabled, phone: item.phone, label: item.label, personID: person)
            do {
                let _: APIResponses.Empty = try await app.api.send("/api/trusted-numbers/\(item.id)", method: "PATCH",
                    body: APIClient.payload(["enabled": enabled]), participantID: person)
            } catch {
                // A failed API write must not silently leave Phone Contacts in the opposite state.
                do { try await PhoneContacts.shared.setEnabled(item.isEnabled, phone: item.phone, label: item.label, personID: person) }
                catch { throw APIError.service(code: "contact_sync_incomplete", status: 409) }
                throw error
            }
            try await fetch(app, person)
            message = enabled ? "\(item.label) can ring your phone." : "Calls from \(item.label) will be treated as unfamiliar."
            return enabled
        } catch { app.handle(error); await load(app); return items.first(where: { $0.id == item.id })?.isEnabled ?? item.isEnabled }
    }
    func restore(_ app: AppState) async {
        guard let person = app.selectedPersonID, !app.isPreview, !working else { return }
        working = true
        do { try await PhoneContacts.shared.restoreAll(personID: person) }
        catch { working = false; app.handle(error); return }
        working = false
        await share(app)
    }
    #if DEBUG
    /// Explicit developer launch command for this owner's supervised demonstration.
    func prepareDemo(_ action: String, phone: String, app: AppState) async {
        guard ["remove", "add"].contains(action), phone.hasPrefix("+1"), phone.count == 12,
              phone.dropFirst().allSatisfy(\.isNumber), let person = app.selectedPersonID,
              app.isOwner, !app.isPreview, !working else { return }
        working = true; message = "Preparing the contact list…"
        var wasSaved: Bool?
        do {
            wasSaved = try await PhoneContacts.shared.contains(phone)
            try await PhoneContacts.shared.setEnabled(action == "add", phone: phone, label: "Mom", personID: person)
            let contacts = try await PhoneContacts.shared.all()
            let _: APIResponses.ContactSync = try await app.api.send("/api/trusted-numbers/sync", method: "POST",
                body: JSONEncoder().encode(["contacts": contacts]), participantID: person)
            UserDefaults.standard.set(true, forKey: key(person))
            try await fetch(app, person)
            message = action == "add" ? "Demo caller is on the shared list." : "Demo caller is off the shared list."
        } catch {
            if let wasSaved {
                do { try await PhoneContacts.shared.setEnabled(wasSaved, phone: phone, label: "Mom", personID: person) }
                catch { app.handle(APIError.service(code: "contact_sync_incomplete", status: 409)) }
            }
            message = "The demo contact change did not finish."
            app.handle(error)
        }
        working = false
    }
    #endif

}
