import SwiftUI

struct AddNumberView: View {
    let kind: SavedNumbersView.Kind
    @Environment(AppState.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var label = ""
    @State private var phone = ""
    @State private var provenance = "card"
    @State private var saving = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Number") {
                    TextField("Name", text: $label).textContentType(.name)
                    TextField("Phone", text: $phone).keyboardType(.phonePad).textContentType(.telephoneNumber)
                }
                if kind == .destinations {
                    Section {
                        Picker("Source", selection: $provenance) {
                            Text("A card").tag("card")
                            Text("A statement").tag("statement")
                            Text("Official website").tag("official_website")
                            Text("Someone I know").tag("known_person")
                        }
                    } header: { Text("Where you found it") } footer: { Text("Avoid numbers provided by an unexpected caller or message.") }
                }
            }
            .navigationTitle("Add number")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { await save() } }
                        .disabled(saving || label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || phone.count < 8)
                }
            }
        }
    }

    private func save() async {
        saving = true
        defer { saving = false }
        do {
            var body = ["label": label, "phone": phone]
            if kind == .destinations { body["provenance"] = provenance }
            if kind == .trusted, let person = model.selectedPersonID {
                try await PhoneContacts.shared.setEnabled(true, phone: phone, label: label, personID: person)
                let contacts = try await PhoneContacts.shared.all()
                let _: APIResponses.ContactSync = try await model.api.send("/api/trusted-numbers/sync", method: "POST",
                    body: JSONEncoder().encode(["contacts": contacts]), participantID: person)
            } else {
                let _: APIResponses.Empty = try await model.api.send(kind.path, method: "POST", body: APIClient.payload(body), participantID: model.selectedPersonID)
            }
            dismiss()
        } catch { model.handle(error) }
    }
}
