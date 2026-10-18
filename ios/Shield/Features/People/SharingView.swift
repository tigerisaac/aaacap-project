import SwiftUI

struct SharingView: View {
    @Environment(AppState.self) private var model
    @State private var grants: [SharingGrant] = []
    @State private var revokeID: UUID?
    @State private var loading = true
    @State private var loadingVisible = false
    @State private var loadError: String?
    @State private var loadAttempts = 0
    @State private var revoking = false
    @State private var actionError: String?
    @AccessibilityFocusState private var actionErrorFocused: Bool
    private var usesAccessFixture: Bool { PreviewScenario.requested("sharing-access", preview: model.isPreview) }
    private var usesConfirmationFixture: Bool {
        #if DEBUG && targetEnvironment(simulator)
        model.isPreview && ProcessInfo.processInfo.arguments.contains("--uitesting-sharing-confirmations")
        #else
        false
        #endif
    }
    private var usesRevokeFailureFixture: Bool {
        #if DEBUG && targetEnvironment(simulator)
        model.isPreview && ProcessInfo.processInfo.arguments.contains("--uitesting-sharing-revoke-fails")
        #else
        false
        #endif
    }

    var body: some View {
        ScrollViewReader { proxy in
        Form {
            if model.isOwner, model.service?.notificationsAvailable == true, !model.isDemo {
                ShieldGroup {
                    HelperAlertsToggle()
                    ShieldDisclosure("When will they hear from Shield?") {
                        Text("Only when checks while you talk detect a possible scam request and intervene. Alerts include your name, but no caller’s words or number.")
                    }
                }
            }
            ShieldSection("Who has access") {
                if let loadError {
                    ShieldLoadFailure(title: "Call sharing couldn’t load", detail: loadError) { Task { await load() } }
                } else if loading && grants.isEmpty {
                    if loadingVisible { ShieldLoadingView(title: "Getting shared access…") }
                } else if grants.isEmpty {
                    ContentUnavailableView {
                        Label {
                            Text("Your calls are private").lineLimit(nil).fixedSize(horizontal: false, vertical: true)
                        } icon: { Image(systemName: "lock.shield") }
                    } description: {
                        Text("No one has shared access to your calls or messages.")
                            .fixedSize(horizontal: false, vertical: true)
                    }
                        .accessibilityIdentifier("sharing-empty")
                }
                ForEach(grants) { grant in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(grant.label).font(.headline)
                        Text(grant.accepted ? grant.canListen ? "Calls and messages" : "Calls only" : "Waiting for them to join")
                            .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                        Button("Stop sharing", role: .destructive) { revokeID = grant.id }
                            .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                            .disabled(revoking || (model.isDemo && !usesConfirmationFixture))
                            .accessibilityLabel("Stop sharing with \(grant.label)")
                    }
                    .alert("Stop sharing with \(grant.label)?", isPresented: Binding(
                        get: { revokeID == grant.id },
                        set: { if !$0 { revokeID = nil } }
                    )) {
                        Button("Stop sharing", role: .destructive) { Task { await revoke(grant.id) } }
                        Button("Keep sharing", role: .cancel) { revokeID = nil }
                    }
                }
            }
            if let actionError {
                ShieldGroup {
                    ShieldNotice(title: "Change not confirmed", detail: actionError, symbol: "exclamationmark.circle")
                        .id("sharing-action-error").accessibilityFocused($actionErrorFocused)
                }
            }
            ShieldGroup {
                ShieldDisclosure("About call access") {
                    Text("Calls only shares call history. Calls and messages also allows listening to saved messages.")
                    Text("You can stop sharing at any time. New call access is arranged with your setup helper.")
                        .foregroundStyle(ShieldTheme.secondaryText)
                }
                if model.isOwner {
                    NavigationLink(value: AppRoute.trustedContacts) {
                        ActionRow(title: "Caretaker alerts", detail: "Alerts without call or message access", symbol: "person.badge.shield.checkmark")
                    }
                }
            }
        }
        .deferredLoading(loading && grants.isEmpty, visible: $loadingVisible)
        .shieldListStyle()
        .navigationTitle("Call sharing")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }.refreshable { await load() }
        .onChange(of: actionError) { _, error in
            if error != nil {
                proxy.scrollTo("sharing-action-error", anchor: .top)
                actionErrorFocused = true
            }
        }
        }
    }

    private func load() async {
        loading = true
        loadError = nil
        defer { loading = false }
        #if DEBUG && targetEnvironment(simulator)
        if usesAccessFixture {
            grants = [SharingGrant(id: UUID(), label: "Jamie", canListen: true, accepted: true, expiresAt: .now.addingTimeInterval(172_800)),
                      SharingGrant(id: UUID(), label: "Morgan", canListen: false, accepted: false, expiresAt: .now.addingTimeInterval(172_800))]
            return
        }
        #endif
        if let failure = PreviewScenario.loadFailure("sharing", attempt: loadAttempts, preview: model.isPreview) {
            loadAttempts += 1
            loadError = failure
            return
        }
        guard !model.isDemo else { return }
        guard let person = model.selectedPersonID else {
            loadError = "Open Home, then return here to review shared access."
            return
        }
        let generation = model.sessionGeneration
        do {
            let result: APIResponses.Sharing = try await model.api.send("/api/sharing", participantID: person)
            guard generation == model.sessionGeneration, model.selectedPersonID == person else { return }
            grants = result.grants
        } catch is CancellationError { return }
        catch { loadError = error.localizedDescription; model.handleSessionFailure(error) }
    }
    private func revoke(_ id: UUID) async {
        guard (!model.isPreview && !model.isDemo) || usesRevokeFailureFixture,
              !revoking, let person = model.selectedPersonID else { return }
        let generation = model.sessionGeneration
        revoking = true; actionError = nil
        defer { revoking = false }
        do {
            if usesRevokeFailureFixture { throw APIError.invalidResponse }
            let _: APIResponses.Empty = try await model.api.send("/api/sharing/\(id)", method: "DELETE", participantID: person)
            guard generation == model.sessionGeneration, model.selectedPersonID == person else { return }
            revokeID = nil
            await load()
        } catch is CancellationError { return }
        catch {
            guard generation == model.sessionGeneration, model.selectedPersonID == person else { return }
            actionError = "We couldn’t confirm the change. Check your connection, then try Stop sharing again."
            model.handleSessionFailure(error)
        }
    }
}
