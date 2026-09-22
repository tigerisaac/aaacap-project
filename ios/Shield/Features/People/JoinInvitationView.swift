import SwiftUI

struct JoinInvitationView: View {
    @Environment(AppState.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var code = ""
    @State private var joining = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Paste the code", text: $code, axis: .vertical)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                } header: { Text("Invitation code") } footer: {
                    Text("Ask the participant to create an invitation in People → Share with someone.")
                }
                Section {
                    Button(joining ? "Joining…" : "Accept shared access") { Task { await join() } }
                        .font(.headline).frame(minHeight: 44)
                        .disabled(code.trimmingCharacters(in: .whitespacesAndNewlines).count < 20 || joining)
                }
            }
            .navigationTitle("Join someone")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
        }
    }

    private func join() async {
        joining = true
        defer { joining = false }
        do {
            let response: APIResponses.Joined = try await model.api.send("/api/sharing/accept", method: "POST",
                body: APIClient.payload(["code": code.trimmingCharacters(in: .whitespacesAndNewlines)]))
            await model.refresh()
            if let person = model.people.first(where: { $0.id == response.participantId }) {
                await model.select(person)
            }
            dismiss()
        } catch { model.handle(error) }
    }
}
