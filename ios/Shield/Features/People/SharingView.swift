import SwiftUI

struct SharingView: View {
    @Environment(AppState.self) private var model
    @State private var grants: [SharingGrant] = []
    @State private var revokeID: UUID?
    @State private var loading = true
    @State private var loadError: String?
    @State private var loadAttempts = 0
    private var usesAccessFixture: Bool { PreviewScenario.requested("sharing-access", preview: model.isPreview) }
    private var usesConfirmationFixture: Bool {
        #if DEBUG && targetEnvironment(simulator)
        model.isPreview && ProcessInfo.processInfo.arguments.contains("--uitesting-sharing-confirmations")
        #else
        false
        #endif
    }

    var body: some View {
        Form {
            if model.isOwner, model.service?.notificationsAvailable == true, !model.isDemo {
                ShieldGroup {
                    HelperAlertsToggle()
                    ShieldDisclosure("When will they hear from Shield?") {
                        Text("When Shield ends a scam call, a blocked caller tries again, or call checks are paused. Alerts include your name, but no caller’s words or number.")
                    }
                }
            }
            ShieldSection("Who has access") {
                if let loadError {
                    ShieldLoadFailure(title: "Your helpers couldn’t load", detail: loadError) { Task { await load() } }
                } else if model.isDemo && !usesAccessFixture {
                    Text("Sign in to manage sharing.").foregroundStyle(ShieldTheme.secondaryText)
                } else if loading && grants.isEmpty {
                    ShieldLoadingView(title: "Getting your helpers…")
                } else if grants.isEmpty {
                    Text("No one has access yet.").foregroundStyle(ShieldTheme.secondaryText)
                }
                ForEach(grants) { grant in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(grant.label).font(.headline)
                        Text(grant.accepted ? grant.canListen ? "Calls and messages" : "Calls only" : "Waiting for them to join")
                            .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                        Button("Stop sharing", role: .destructive) { revokeID = grant.id }
                            .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                            .disabled(model.isDemo && !usesConfirmationFixture)
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
        }
        .shieldListStyle()
        .navigationTitle("Your helpers")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
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
        do {
            let result: APIResponses.Sharing = try await model.api.send("/api/sharing", participantID: model.selectedPersonID)
            grants = result.grants
        } catch is CancellationError { return }
        catch { loadError = error.localizedDescription; model.handleSessionFailure(error) }
    }
    private func revoke(_ id: UUID) async {
        guard !model.isPreview, !model.isDemo else { return }
        do {
            let _: APIResponses.Empty = try await model.api.send("/api/sharing/\(id)", method: "DELETE", participantID: model.selectedPersonID)
            revokeID = nil
            await load()
        } catch { model.handle(error) }
    }
}
