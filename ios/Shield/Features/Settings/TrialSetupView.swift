import SwiftUI

struct TrialSetupView: View {
    let setup: SetupStatus
    let reload: () async -> Void
    @Environment(AppState.self) private var model
    @State private var working = false
    @State private var confirmDeletion = false

    var body: some View {
        Section {
            NavigationLink {
                ForwardingSetupView()
            } label: {
                Label("Set up my phone", systemImage: "phone.arrow.right")
            }
            Text("We’ll help you one step at a time.")
                .foregroundStyle(.secondary)
        } header: { Text("Phone setup") }
        Section {
            Button(setup.status == "paused" ? "Resume call checks" : "Pause call checks",
                   systemImage: setup.status == "paused" ? "play.circle" : "pause.circle", action: togglePause)
                .disabled(working)
        } footer: {
            Text("This keeps the same end time and call limit.").foregroundStyle(ShieldTheme.secondaryText)
        }
        Section {
            Button("Delete my information", role: .destructive) { confirmDeletion = true }
                .disabled(working)
                .confirmationDialog("Delete your information?", isPresented: $confirmDeletion, titleVisibility: .visible) {
                    Button("Delete my information", role: .destructive, action: deleteData)
                } message: {
                    Text("Your calls, saved numbers, and sharing will be deleted. You’ll be signed out.")
                }
        }
    }

    private func togglePause() {
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
