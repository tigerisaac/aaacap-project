import SwiftUI

struct TrialSetupView: View {
    let setup: SetupStatus
    let reload: () async -> Void
    @Environment(AppState.self) private var model
    @State private var working = false
    @State private var confirmDeletion = false

    var body: some View {
        Section {
            Label(setup.trial?.active == true ? "Trial ready" : "Trial session ended",
                  systemImage: setup.trial?.active == true ? "checkmark.circle.fill" : "clock.fill")
                .font(.headline).foregroundStyle(setup.trial?.active == true ? ShieldTheme.connected : ShieldTheme.held)
            Text("Call the test number from your verified phone. Your introduction is screened and the result appears in Calls.")
                .foregroundStyle(.secondary)
            LabeledContent("Test number", value: setup.shieldNumber)
            LabeledContent("Your phone", value: setup.phone)
            if let trial = setup.trial {
                LabeledContent("Calls left", value: trial.remainingCalls.formatted())
                if trial.active, let expires = trial.expiresAt {
                    LabeledContent("Session ends", value: expires.formatted(date: .omitted, time: .shortened))
                }
            }
        } header: { Text("Private trial") } footer: {
            Text("Your mobile’s other calls are unchanged. Transfers and voicemail are not enabled.")
        }
        Section {
            Button(setup.status == "paused" ? "Resume trial" : "Pause trial",
                   systemImage: setup.status == "paused" ? "play.circle" : "pause.circle", action: togglePause)
                .disabled(working)
        } footer: {
            Text("Resuming does not extend the session or reset its call limit.")
        }
        Section {
            Button("Delete trial data", role: .destructive) { confirmDeletion = true }
                .disabled(working)
                .confirmationDialog("Delete your trial data?", isPresented: $confirmDeletion, titleVisibility: .visible) {
                    Button("Delete trial data", role: .destructive, action: deleteData)
                } message: {
                    Text("This removes call history, saved numbers and sharing, then signs you out.")
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
