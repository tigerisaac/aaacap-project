import SwiftUI

struct TrustedContactsView: View {
    @Environment(AppState.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var response: TrustedContactsResponse?
    @State private var error: String?
    @State private var loadingVisible = false
    @State private var loading = false
    @State private var loadRevision = 0
    @State private var working = false
    @State private var removing: TrustedContact?
    @State private var confirmRemoval = false
    @AccessibilityFocusState private var errorFocused: Bool
    #if DEBUG && targetEnvironment(simulator)
    @State private var previewChangeFailed = false
    private var usesChangeFailureFixture: Bool {
        model.isPreview && ProcessInfo.processInfo.arguments.contains("--uitesting-caretaker-change-fails")
    }
    #endif

    var body: some View {
        ScrollViewReader { proxy in
            List {
                #if DEBUG && targetEnvironment(simulator)
                if ProcessInfo.processInfo.arguments.contains("--uitesting-caretaker-refresh") {
                    Button("Start held refresh") { Task { await load() } }
                }
                #endif
                if let response {
                    if !response.supportsRequests {
                        ShieldGroup {
                            ContentUnavailableView {
                                Label {
                                    Text("Caretaker alerts aren’t available yet")
                                        .lineLimit(nil).fixedSize(horizontal: false, vertical: true)
                                } icon: { Image(systemName: "person.badge.shield.checkmark") }
                            } description: {
                                Text("You can keep using Shield without a caretaker.")
                                    .foregroundStyle(ShieldTheme.secondaryText)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            Button(loading ? "Checking…" : "Check again") { Task { await load() } }
                                .frame(minHeight: ShieldTheme.Layout.minimumTarget).disabled(loading)
                            Button("Done") { dismiss() }.frame(minHeight: ShieldTheme.Layout.minimumTarget)
                        }
                    }
                    if response.supportsRequests, response.contacts.isEmpty {
                        ShieldGroup { Text("Alert someone you trust when checks while you talk detect a possible scam request and intervene.") }
                    }
                    if !response.contacts.isEmpty {
                        ShieldGroup {
                            Toggle("Send protection alerts", isOn: Binding(get: { response.enabled }, set: { value in Task { await setEnabled(value) } }))
                                .disabled(working || !response.supportsRequests || (!response.enabled && !response.contacts.contains { ["pending", "accepted"].contains($0.status) }))
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
                            if contact.status == "pending", let label = contact.invitationDeliveryLabel {
                                Text(label).font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                            } else if contact.status == "pending" {
                                Text(response.textAvailable == false ? "Share the invitation with them. They sign in with this mobile number to review it." : "The request text wasn’t confirmed. They can sign in to Shield with this number to review it.").font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                            }
                            if contact.status == "pending", let url = response.invitationURL {
                                ShareLink(item: url, message: Text("Please review my caretaker request in Shield. Sign in with the mobile number I used for your invitation.")) {
                                    Label("Share invitation", systemImage: "square.and.arrow.up").shieldWrappingLabel()
                                        .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                                }
                            }
                            Button("Remove contact", role: .destructive) { removing = contact; confirmRemoval = true }.frame(minHeight: ShieldTheme.Layout.minimumTarget).disabled(working)
                        }
                    }
                    if response.supportsRequests, let id = model.selectedPersonID {
                        ShieldGroup {
                            NavigationLink { AddTrustedContactView(participantID: id, textAvailable: response.textAvailable != false) { contact in
                                if model.isPreview {
                                    self.response = .init(available: true, choiceRecorded: true, enabled: true, contacts: response.contacts + [contact])
                                } else { Task { await load() } }
                            } } label: {
                                ActionRow(title: "Add caretaker", symbol: "person.badge.plus")
                            }
                        } footer: { Text("They must accept first. Calls and messages stay private.") }
                    }
                    if response.supportsRequests {
                        ShieldGroup {
                            ShieldDisclosure("When are alerts sent?") {
                                Text("Only when checks while you talk detect a possible scam request and intervene. Those checks must be on.")
                                Text("They can save alerts to see when they open Shield, and choose texts or notifications when available. You can pause alerts or remove a caretaker here.")
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
                        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.content) {
                            ShieldNotice(title: response == nil ? "Caretakers couldn’t load" : "Change not confirmed",
                                detail: error, symbol: "wifi.exclamationmark")
                                .accessibilityIdentifier("caretaker-error-feedback")
                                .accessibilityFocused($errorFocused)
                            Button { Task { await load() } } label: {
                                Label(response == nil ? "Try again" : "Check current status", systemImage: "arrow.clockwise")
                                    .shieldWrappingLabel()
                                    .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget)
                            }.shieldSecondaryButton()
                        }.padding(.vertical, ShieldTheme.Spacing.compact)
                    }
                    .id("caretaker-error")
                }
            }.deferredLoading(loading && response == nil && error == nil, visible: $loadingVisible)
                .shieldListStyle().navigationTitle("Caretakers").navigationBarTitleDisplayMode(.inline)
                .task { await load() }.refreshable { await load() }
                .alert("Remove this caretaker?", isPresented: $confirmRemoval) {
                    Button("Remove contact", role: .destructive) { Task { await remove() } }
                    Button("Cancel", role: .cancel) { removing = nil }
                } message: { Text("They will stop receiving alerts about your protection.") }
                .onChange(of: error) { _, error in
                    if error != nil {
                        proxy.scrollTo("caretaker-error", anchor: .top)
                        errorFocused = true
                    }
                }
        }
    }
    private func load() async {
        loadRevision += 1
        let revision = loadRevision
        loading = true
        error = nil
        defer { if revision == loadRevision { loading = false } }
        if model.isPreview {
            #if DEBUG && targetEnvironment(simulator)
            if response == nil {
                let deliveryFixture = ProcessInfo.processInfo.arguments.contains("--uitesting-caretaker-delivery")
                let contacts: [TrustedContact] = usesChangeFailureFixture || deliveryFixture ? ["Jamie", "Morgan", "Alex"].enumerated().map { index, name in
                    TrustedContact(id: UUID(uuidString: "00000000-0000-4000-8000-00000000000\(index + 1)")!, name: name,
                        phone: "+1202555010\(index + 1)", status: deliveryFixture ? "pending" : "accepted", textAlerts: !deliveryFixture, appAlerts: false,
                        requestDelivery: deliveryFixture ? ["delivered", "delivery_failed", "unknown"][index] : "submitted")
                } : []
                response = .init(available: !ProcessInfo.processInfo.arguments.contains("--uitesting-caretakers-unavailable"),
                    choiceRecorded: usesChangeFailureFixture || deliveryFixture, enabled: usesChangeFailureFixture || deliveryFixture, contacts: contacts,
                    textAvailable: true, invitationURL: URL(string: "https://shield-calls-isaac.web.app/trusted-contacts.html"))
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
            guard revision == loadRevision, generation == model.sessionGeneration, model.selectedPersonID == id else { return }
            response = loaded
        } catch is CancellationError { return }
        catch {
            guard revision == loadRevision, generation == model.sessionGeneration, model.selectedPersonID == id else { return }
            showFailure(error)
        }
    }
    private func setEnabled(_ enabled: Bool) async {
        guard !working, model.isOwner, let id = model.selectedPersonID else { return }
        let generation = model.sessionGeneration
        invalidateOlderLoads()
        working = true; error = nil; defer { working = false }
        do {
            try failPreviewChangeIfRequested()
            if !model.isPreview { let _: APIResponses.Empty = try await model.api.send("/api/trusted-contacts/choice", method: "POST", body: APIClient.payload(["enabled": enabled]), participantID: id) }
            guard generation == model.sessionGeneration, model.selectedPersonID == id else { return }
            if model.isPreview, let response { self.response = .init(available: true, choiceRecorded: true, enabled: enabled, contacts: response.contacts) }
            await load()
        } catch is CancellationError { return }
        catch {
            guard generation == model.sessionGeneration, model.selectedPersonID == id else { return }
            showFailure(error)
        }
    }
    private func remove() async {
        guard let removing, !working, model.isOwner, let id = model.selectedPersonID else { return }
        let generation = model.sessionGeneration
        invalidateOlderLoads()
        working = true; error = nil; defer { working = false; self.removing = nil }
        do {
            try failPreviewChangeIfRequested()
            if !model.isPreview { let _: APIResponses.Empty = try await model.api.send("/api/trusted-contacts/\(removing.id.uuidString.lowercased())", method: "DELETE", participantID: id) }
            guard generation == model.sessionGeneration, model.selectedPersonID == id else { return }
            if model.isPreview, let response { self.response = .init(available: true, choiceRecorded: true, enabled: response.enabled, contacts: response.contacts.filter { $0.id != removing.id }) }
            await load()
        } catch is CancellationError { return }
        catch {
            guard generation == model.sessionGeneration, model.selectedPersonID == id else { return }
            showFailure(error)
        }
    }

    private func invalidateOlderLoads() {
        // A pre-change read must not replace the status or error confirmed by a later action.
        loadRevision += 1
        loading = false
    }

    private func showFailure(_ failure: Error) {
        error = failure is URLError ? "Your connection was interrupted. Check your internet connection." : failure.localizedDescription
        model.handleSessionFailure(failure)
    }

    private func failPreviewChangeIfRequested() throws {
        #if DEBUG && targetEnvironment(simulator)
        if usesChangeFailureFixture, !previewChangeFailed {
            previewChangeFailed = true
            throw URLError(.notConnectedToInternet)
        }
        #endif
    }
}
