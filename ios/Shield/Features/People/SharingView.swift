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
                Label("Your circle. Your choice.", systemImage: "person.2.fill")
                    .font(.headline).foregroundStyle(ShieldTheme.message)
                TextField("Their name", text: $label)
                    .textContentType(.givenName)
                Toggle("Include voicemail", isOn: $canListen)
                Button(creating ? "Creating…" : "Create invitation") { confirmShare = true }
                    .disabled(label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || creating || model.isDemo)
                    .confirmationDialog("Share your call history?", isPresented: $confirmShare, titleVisibility: .visible) {
                        Button("Create invitation") { Task { await createInvite() } }
                    } message: {
                        Text(canListen ? "Whoever accepts this code can see your call history and listen to voicemail. Share it only with the person you intend." : "Whoever accepts this code can see your call history. Voicemail stays private.")
                    }
            } footer: {
                Text("Invitations expire in 2 days. Phone settings stay yours.")
            }
            if let inviteCode {
                Section("Share this invitation") {
                    Text(inviteCode).font(.body.monospaced()).textSelection(.enabled)
                    ShareLink(item: "I’d like to share my Shield call history with you. In Shield, open People → Join with an invitation and enter:\n\n\(inviteCode)") {
                        Label("Share invitation", systemImage: "square.and.arrow.up")
                    }
                    .frame(minHeight: 44)
                }
            }
            Section("People with access") {
                if model.isDemo {
                    Label("Sample shared person", systemImage: "person.crop.circle")
                    Text("Connect your account to manage sharing.").font(.subheadline).foregroundStyle(.secondary)
                } else if grants.isEmpty {
                    Text("No one has access yet.").foregroundStyle(.secondary)
                }
                ForEach(grants) { grant in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(grant.label).font(.headline)
                        Text(grant.accepted ? grant.canListen ? "History & voicemail" : "History only" : "Invitation pending")
                            .font(.subheadline).foregroundStyle(.secondary)
                        Button("Stop sharing", role: .destructive) { revokeID = grant.id }
                            .frame(minHeight: 44)
                    }
                    .confirmationDialog("Stop sharing this account?", isPresented: Binding(
                        get: { revokeID == grant.id },
                        set: { if !$0 { revokeID = nil } }
                    ), titleVisibility: .visible) {
                        Button("Stop sharing", role: .destructive) { Task { await revoke(grant.id) } }
                    }
                }
            }
        }
        .navigationTitle("Sharing")
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
