import SwiftUI

struct TrialSetupView: View {
    let setup: SetupStatus
    let reload: () async -> Void
    @Environment(AppState.self) private var model
    @State private var working = false
    @State private var confirmDeletion = false
    @State private var confirmPause = false

    var body: some View {
        ShieldGroup {
            NavigationLink {
                ForwardingSetupView()
            } label: {
                ActionRow(title: setup.status == "restoring" ? "Finish disconnecting" : setup.phoneVerified ? "Open phone setup" : "Set up my phone", symbol: "phone.arrow.right")
            }
        }
        if ["active", "paused"].contains(setup.status) {
        ShieldGroup {
            Button(setup.status == "paused" ? "Resume call checks" : "Pause call checks",
                   systemImage: setup.status == "paused" ? "play.circle" : "pause.circle") { confirmPause = true }
                .disabled(working || model.isDemo)
                .alert(setup.status == "paused" ? "Resume call checks?" : "Pause call checks?", isPresented: $confirmPause) {
                    Button(setup.status == "paused" ? "Resume call checks" : "Pause call checks", action: togglePause)
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text(setup.status == "paused" ? "Shield checks calls that reach it until the call test ends." : "Calls that reach Shield go to voicemail. Your phone still sends those calls to Shield.")
                }
        } footer: {
            Text("The call test still ends at the same time.").font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
        }
        }
        ShieldGroup {
            Button("Delete my information", role: .destructive) { confirmDeletion = true }
                .disabled(working || model.isDemo)
                .alert("Delete your information?", isPresented: $confirmDeletion) {
                    Button("Delete my information", role: .destructive, action: deleteData)
                    Button("Keep my information", role: .cancel) {}
                } message: {
                    Text("Your calls, saved numbers, and sharing will be deleted. You’ll be signed out.")
                }
        }
    }

    private func togglePause() {
        guard !model.isPreview, !model.isDemo, !working else { return }
        Task {
            working = true
            defer { working = false }
            do {
                let _: APIResponses.Empty = try await model.api.send("/api/setup/pause", method: "POST",
                    body: APIClient.payload(["paused": setup.status != "paused"]), participantID: setup.participantId)
                await reload()
                await model.loadContext()
            } catch { model.handle(error) }
        }
    }

    private func deleteData() {
        guard !model.isPreview, !model.isDemo, !working else { return }
        Task {
            working = true
            defer { working = false }
            do {
                let _: APIResponses.Empty = try await model.api.send("/api/account/delete", method: "POST", participantID: setup.participantId)
                await model.signOut()
            } catch { model.handle(error) }
        }
    }
}
