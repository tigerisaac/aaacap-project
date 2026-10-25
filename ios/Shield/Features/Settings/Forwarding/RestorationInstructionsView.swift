import SwiftUI

/// Public setup saves the owner's original carrier settings here, before the first forwarding change.
struct RestorationInstructionsView: View {
    @Environment(AppState.self) private var app
    let participantID: UUID
    let saved: () async -> Void
    @State private var unanswered = ""
    @State private var busy = ""
    @State private var unreachable = ""
    @State private var confirmed = false
    @State private var working = false
    @State private var error: String?

    private var instructions: [String] {
        [unanswered, busy, unreachable].map { $0.split(whereSeparator: \.isWhitespace).joined(separator: " ") }
    }
    private var canSave: Bool { !working && confirmed && instructions.allSatisfy { (10...1000).contains($0.count) } }

    var body: some View {
        List {
            ShieldSection("Save your current carrier settings") {
                Text("Before Shield changes forwarding, ask your carrier how to restore your current voicemail or forwarding for each situation. Save their instructions below. Don’t guess reset codes.")
                    .fixedSize(horizontal: false, vertical: true)
                TextField("Restore unanswered calls", text: $unanswered, axis: .vertical).lineLimit(3...8)
                TextField("Restore busy calls", text: $busy, axis: .vertical).lineLimit(3...8)
                TextField("Restore calls with no signal", text: $unreachable, axis: .vertical).lineLimit(3...8)
                Toggle("These instructions restore my original settings", isOn: $confirmed)
                Text("Use 10–1,000 characters for each instruction. Shield saves them privately with your setup.")
                    .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
            }.disabled(working)
            ShieldGroup {
                Button { Task { await save() } } label: {
                    ShieldActionLabel(title: "Save and continue", isWorking: working)
                }.shieldPrimaryButton().disabled(!canSave)
            }
            if let error {
                ShieldGroup {
                    ShieldNotice(title: "Settings not confirmed", detail: error, symbol: "exclamationmark.circle")
                    Button("Check current status") { Task { await saved() } }
                        .frame(minHeight: ShieldTheme.Layout.minimumTarget).disabled(working)
                }
            }
        }
        .shieldListStyle().navigationTitle("Phone setup").navigationBarTitleDisplayMode(.inline)
        .scrollDismissesKeyboard(.interactively)
    }

    private func save() async {
        guard canSave, app.signedIn, !app.isPreview else { return }
        let generation = app.sessionGeneration
        working = true; error = nil
        defer { working = false }
        do {
            let _: APIResponses.Empty = try await app.api.send("/api/enrollment/restoration", method: "POST", body: APIClient.payload([
                "participantId": participantID.uuidString.lowercased(), "originalSettingsRecorded": true,
                "restorationInstructions": instructions,
            ]))
            guard generation == app.sessionGeneration else { return }
            await saved()
        } catch {
            guard generation == app.sessionGeneration else { return }
            // A lost reply may still have saved; the status check shows which.
            self.error = "Your settings weren’t confirmed. Check the current status before trying again. " + error.localizedDescription
            app.handleSessionFailure(error)
        }
    }
}
