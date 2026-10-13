import SwiftUI

struct SharingView: View {
    @Environment(AppState.self) private var model
    @State private var grants: [SharingGrant] = []
    @State private var label = ""
    @State private var canListen = false
    @State private var creating = false
    @State private var inviteCode: String?
    @State private var confirmShare = false
    @State private var revokeID: UUID?

    var body: some View {
        Form {
            Section {
                TextField("Their name", text: $label, prompt: Text("Their name").foregroundStyle(ShieldTheme.secondaryText))
                    .textContentType(.givenName)
                Toggle("Include messages", isOn: $canListen)
                Button { confirmShare = true } label: {
                    Text(creating ? "Creating…" : "Make invitation")
                        .foregroundStyle(creating || model.isDemo || label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? ShieldTheme.secondaryText : ShieldTheme.action)
                }
                    .disabled(label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || creating || model.isDemo)
                    .confirmationDialog("Share your call history?", isPresented: $confirmShare, titleVisibility: .visible) {
                        Button("Make invitation") { Task { await createInvite() } }
                    } message: {
                        Text(canListen ? "They can see your calls and read or hear voicemail and saved notices. Send this only to the person you want to help." : "They can see your calls. Your messages stay private. Send this only to the person you want to help.")
                    }
            } header: { Text("Invite someone to help").foregroundStyle(ShieldTheme.secondaryText) } footer: {
                Text("This invitation works for two days.").foregroundStyle(ShieldTheme.secondaryText)
            }
            if let inviteCode {
                ShieldSection("Share this invitation") {
                    Text(inviteCode).font(.body.monospaced()).textSelection(.enabled)
                    ShareLink(item: "I’d like to share my Shield call history with you. In Shield, open More → Family & friends → Use an invitation and enter:\n\n\(inviteCode)") {
                        Label("Share invitation", systemImage: "square.and.arrow.up")
                    }
                    .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                }
            }
            if model.isOwner, model.service?.notificationsAvailable == true, !model.isDemo {
                Section {
                    HelperAlertsToggle()
                    DisclosureGroup("When will they hear from Shield?") {
                        Text("When Shield ends a scam call, a blocked caller tries again, or call checks are paused. Alerts include your name, but no caller’s words or number.")
                    }
                }
            }
            ShieldSection(model.isDemo ? "Sample app" : "People helping you") {
                if model.isDemo {
                    Text("Sign in to manage sharing.").foregroundStyle(ShieldTheme.secondaryText)
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
                    }
                    .confirmationDialog("Stop sharing with this person?", isPresented: Binding(
                        get: { revokeID == grant.id },
                        set: { if !$0 { revokeID = nil } }
                    ), titleVisibility: .visible) {
                        Button("Stop sharing", role: .destructive) { Task { await revoke(grant.id) } }
                    }
                }
            }
        }
        .shieldListStyle()
        .navigationTitle("Share with a helper")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private func load() async {
        guard !model.isDemo else { return }
        do {
            let result: APIResponses.Sharing = try await model.api.send("/api/sharing", participantID: model.selectedPersonID)
            grants = result.grants
        } catch { model.handle(error) }
    }
    private func createInvite() async {
        creating = true
        defer { creating = false }
        do {
            let result: APIResponses.Invitation = try await model.api.send("/api/sharing", method: "POST",
                body: APIClient.payload(["label": label, "canListen": canListen, "consent": true]), participantID: model.selectedPersonID)
            inviteCode = result.code
            label = ""
            await load()
        } catch { model.handle(error) }
    }
    private func revoke(_ id: UUID) async {
        do {
            let _: APIResponses.Empty = try await model.api.send("/api/sharing/\(id)", method: "DELETE", participantID: model.selectedPersonID)
            revokeID = nil
            await load()
        } catch { model.handle(error) }
    }
}
