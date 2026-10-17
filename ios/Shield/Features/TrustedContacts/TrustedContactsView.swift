import SwiftUI

struct TrustedContactsView: View {
    @Environment(AppState.self) private var model
    @State private var response: TrustedContactsResponse?
    @State private var error: String?
    @State private var loadingVisible = false
    @State private var working = false
    @State private var removing: TrustedContact?
    @State private var confirmRemoval = false

    var body: some View {
        List {
            if let response {
                if !response.available { ShieldGroup { Text("Trusted-contact alerts aren’t available yet. You can use Shield without them.") } }
                if !response.contacts.isEmpty {
                    ShieldGroup {
                        Toggle("Send alerts to my trusted contacts", isOn: Binding(get: { response.enabled }, set: { value in Task { await setEnabled(value) } }))
                            .disabled(working || (!response.enabled && !response.contacts.contains { ["pending", "accepted"].contains($0.status) }))
                    }
                }
                ForEach(response.contacts) { contact in
                    ShieldSection(contact.name) {
                        Text(PhoneDisplay.format(contact.phone))
                        Text(contact.statusLabel).foregroundStyle(ShieldTheme.secondaryText)
                        if contact.status == "pending", contact.requestDelivery != "submitted" {
                            Text("The request text wasn’t confirmed. They can sign in to Shield with this number to review it.").font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                        }
                        Button("Remove contact", role: .destructive) { removing = contact; confirmRemoval = true }.frame(minHeight: 44).disabled(working)
                    }
                }
                if response.available, let id = model.selectedPersonID {
                    ShieldGroup {
                        NavigationLink { AddTrustedContactView(participantID: id) { contact in
                            if model.isPreview {
                                self.response = .init(available: true, choiceRecorded: true, enabled: true, contacts: response.contacts + [contact])
                            } else { Task { await load() } }
                        } } label: {
                            ActionRow(title: "Add trusted contact", symbol: "person.badge.plus")
                        }
                    } footer: { Text("They get alerts only after they accept. Your calls and messages stay private.") }
                }
            } else if error == nil, loadingVisible { ShieldGroup { ProgressView("Loading contacts…") } }
            if let error { ShieldGroup { Text(error); Button("Try again") { Task { await load() } }.frame(minHeight: 44) } }
        }.deferredLoading(response == nil && error == nil, visible: $loadingVisible)
            .shieldListStyle().shieldLargeTitle("Trusted contacts")
            .task { await load() }.refreshable { await load() }
            .alert("Remove this trusted contact?", isPresented: $confirmRemoval) {
                Button("Remove contact", role: .destructive) { Task { await remove() } }
                Button("Cancel", role: .cancel) { removing = nil }
            } message: { Text("They will stop receiving alerts about your protection.") }
    }
    private func load() async {
        error = nil
        if model.isPreview { if response == nil { response = .init(available: true, choiceRecorded: false, enabled: false, contacts: []) }; return }
        do { response = try await model.api.send("/api/trusted-contacts", participantID: model.selectedPersonID) }
        catch { self.error = error.localizedDescription }
    }
    private func setEnabled(_ enabled: Bool) async {
        working = true; defer { working = false }
        do {
            if !model.isPreview { let _: APIResponses.Empty = try await model.api.send("/api/trusted-contacts/choice", method: "POST", body: APIClient.payload(["enabled": enabled]), participantID: model.selectedPersonID) }
            if model.isPreview, let response { self.response = .init(available: true, choiceRecorded: true, enabled: enabled, contacts: response.contacts) }
            await load()
        } catch { self.error = error.localizedDescription }
    }
    private func remove() async {
        guard let removing else { return }; working = true; defer { working = false }
        do {
            if !model.isPreview { let _: APIResponses.Empty = try await model.api.send("/api/trusted-contacts/\(removing.id.uuidString.lowercased())", method: "DELETE", participantID: model.selectedPersonID) }
            if model.isPreview, let response { self.response = .init(available: true, choiceRecorded: true, enabled: response.enabled, contacts: response.contacts.filter { $0.id != removing.id }) }
            await load()
        } catch { self.error = error.localizedDescription }
    }
}
