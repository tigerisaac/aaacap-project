import SwiftUI

struct TrustedContactsView: View {
    @Environment(AppState.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var response: TrustedContactsResponse?
    @State private var error: String?
    @State private var loadingVisible = false
    @State private var loading = false
    @State private var working = false
    @State private var removing: TrustedContact?
    @State private var confirmRemoval = false

    var body: some View {
        List {
            if let response {
                if !response.available {
                    ShieldGroup {
                        ContentUnavailableView {
                            Label {
                                Text("Caretaker alerts aren’t available yet")
                                    .lineLimit(nil).fixedSize(horizontal: false, vertical: true)
                            } icon: { Image(systemName: "person.badge.shield.checkmark") }
                        } description: {
                            Text("You can keep using Shield without a caretaker.")
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        Button(loading ? "Checking…" : "Check again") { Task { await load() } }
                            .frame(minHeight: ShieldTheme.Layout.minimumTarget).disabled(loading)
                        Button("Done") { dismiss() }.frame(minHeight: ShieldTheme.Layout.minimumTarget)
                    }
                }
                if response.available, response.contacts.isEmpty {
                    ShieldGroup { Text("Alert someone you trust when checks while you talk detect a possible scam request and intervene.") }
                }
                if !response.contacts.isEmpty {
                    ShieldGroup {
                        Toggle("Send protection alerts", isOn: Binding(get: { response.enabled }, set: { value in Task { await setEnabled(value) } }))
                            .disabled(working || !response.available || (!response.enabled && !response.contacts.contains { ["pending", "accepted"].contains($0.status) }))
                    }
                }
                ForEach(response.contacts) { contact in
                    ShieldSection(contact.name) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(PhoneDisplay.format(contact.phone)).monospacedDigit()
                            Text(contact.statusLabel).font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                            if contact.status == "accepted" {
                                Text("Protection alerts only").font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                            }
                        }.padding(.vertical, 4)
                        if contact.status == "pending", contact.requestDelivery != "submitted" {
                            Text("The request text wasn’t confirmed. They can sign in to Shield with this number to review it.").font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                        }
                        Button("Remove contact", role: .destructive) { removing = contact; confirmRemoval = true }.frame(minHeight: ShieldTheme.Layout.minimumTarget).disabled(working)
                    }
                }
                if response.available, let id = model.selectedPersonID {
                    ShieldGroup {
                        NavigationLink { AddTrustedContactView(participantID: id) { contact in
                            if model.isPreview {
                                self.response = .init(available: true, choiceRecorded: true, enabled: true, contacts: response.contacts + [contact])
                            } else { Task { await load() } }
                        } } label: {
                            ActionRow(title: "Add caretaker", symbol: "person.badge.plus")
                        }
                    } footer: { Text("They must accept first. Calls and messages stay private.") }
                }
                if response.available {
                    ShieldGroup {
                        ShieldDisclosure("When are alerts sent?") {
                            Text("Only when checks while you talk detect a possible scam request and intervene. Those checks must be on.")
                            Text("They choose texts, app alerts, or both. You can pause alerts or remove a caretaker here.")
                                .foregroundStyle(ShieldTheme.secondaryText)
                        }
                        NavigationLink(value: AppRoute.callProtection) {
                            ActionRow(title: "Checks while you talk", symbol: "waveform")
                        }
                    }
                }
            } else if error == nil, loadingVisible { ShieldGroup { ShieldLoadingView(title: "Getting your caretakers…") } }
            if let error {
                ShieldGroup {
                    ShieldLoadFailure(title: response == nil ? "Caretakers couldn’t load" : "That didn’t finish", detail: error) { Task { await load() } }
                }
            }
        }.deferredLoading(loading && response == nil && error == nil, visible: $loadingVisible)
            .shieldListStyle().navigationTitle("Caretakers").navigationBarTitleDisplayMode(.inline)
            .task { await load() }.refreshable { await load() }
            .alert("Remove this caretaker?", isPresented: $confirmRemoval) {
                Button("Remove contact", role: .destructive) { Task { await remove() } }
                Button("Cancel", role: .cancel) { removing = nil }
            } message: { Text("They will stop receiving alerts about your protection.") }
    }
    private func load() async {
        guard !loading else { return }
        loading = true
        error = nil
        defer { loading = false }
        if model.isPreview {
            #if DEBUG && targetEnvironment(simulator)
            if response == nil {
                response = .init(available: !ProcessInfo.processInfo.arguments.contains("--uitesting-caretakers-unavailable"), choiceRecorded: false, enabled: false, contacts: [])
            }
            #endif
            return
        }
        guard let id = model.selectedPersonID, model.isOwner else {
            error = "Caretakers are managed by the person using the protected phone. Return to Settings to continue."
            return
        }
        let generation = model.sessionGeneration
        do {
            let loaded: TrustedContactsResponse = try await model.api.send("/api/trusted-contacts", participantID: id)
            guard generation == model.sessionGeneration, model.selectedPersonID == id else { return }
            response = loaded
        } catch is CancellationError { return }
        catch { self.error = error.localizedDescription; model.handleSessionFailure(error) }
    }
    private func setEnabled(_ enabled: Bool) async {
        guard !working, model.isOwner, let id = model.selectedPersonID else { return }
        working = true; error = nil; defer { working = false }
        do {
            if !model.isPreview { let _: APIResponses.Empty = try await model.api.send("/api/trusted-contacts/choice", method: "POST", body: APIClient.payload(["enabled": enabled]), participantID: id) }
            if model.isPreview, let response { self.response = .init(available: true, choiceRecorded: true, enabled: enabled, contacts: response.contacts) }
            await load()
        } catch is CancellationError { return }
        catch { self.error = error.localizedDescription; model.handleSessionFailure(error) }
    }
    private func remove() async {
        guard let removing, !working, model.isOwner, let id = model.selectedPersonID else { return }
        working = true; error = nil; defer { working = false; self.removing = nil }
        do {
            if !model.isPreview { let _: APIResponses.Empty = try await model.api.send("/api/trusted-contacts/\(removing.id.uuidString.lowercased())", method: "DELETE", participantID: id) }
            if model.isPreview, let response { self.response = .init(available: true, choiceRecorded: true, enabled: response.enabled, contacts: response.contacts.filter { $0.id != removing.id }) }
            await load()
        } catch is CancellationError { return }
        catch { self.error = error.localizedDescription; model.handleSessionFailure(error) }
    }
}
