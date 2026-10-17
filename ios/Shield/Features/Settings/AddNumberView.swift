import SwiftUI
import UIKit

struct AddNumberView: View {
    let kind: SavedNumbersView.Kind
    @Environment(AppState.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var label = ""
    @State private var phone = ""
    @State private var provenance = "card"
    @State private var saving = false
    @State private var error: String?
    @State private var errorRevision = 0
    @State private var savedToContacts = false
    @State private var problemDetail: String?
    @FocusState private var field: Field?
    @AccessibilityFocusState private var errorFocused: Bool
    private enum Field { case name, phone }
    private var validPhone: Bool {
        let number = PhoneContacts.canonical(phone)
        return number.hasPrefix("+1") && number.count == 12 && number.dropFirst().unicodeScalars.allSatisfy { (48...57).contains($0.value) }
    }
    private var canSave: Bool { !saving && !label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && validPhone }
    private var usesFixture: Bool { PreviewScenario.requested(kind == .trusted ? "add-contact" : "add-number", preview: model.isPreview) }

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: ShieldTheme.Spacing.content) {
                        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.regular) {
                            Text("Name").font(.headline)
                            TextField("Name", text: $label, prompt: Text("For example, My clinic").foregroundStyle(ShieldTheme.secondaryText), axis: .vertical)
                                .lineLimit(1...3).textContentType(.name).focused($field, equals: .name)
                                .shieldField(focused: field == .name)
                                .accessibilityLabel("Name")
                                .submitLabel(.next).onSubmit { field = .phone }
                        }
                        ShieldPhoneEntry(text: $phone, focus: $field, field: .phone,
                                         title: "Phone number", identifier: "saved-number-phone", allowsClear: true)
                        if kind == .destinations {
                            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.regular) {
                                Text("Number from").font(.headline)
                                Picker("Number from", selection: $provenance) {
                                    Text("A card").tag("card")
                                    Text("A bill or statement").tag("statement")
                                    Text("Official website").tag("official_website")
                                    Text("Someone I know").tag("known_person")
                                }.tint(ShieldTheme.action).frame(minHeight: ShieldTheme.Layout.minimumTarget)
                                Text("Don’t use a number from an unexpected call or text.")
                                    .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                            }
                        }
                        if let error {
                            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.regular) {
                                ShieldNotice(title: "Save not confirmed", detail: error, symbol: "exclamationmark.circle")
                                    .id("number-save-error").accessibilityFocused($errorFocused)
                                if let problemDetail {
                                    ShieldDisclosure("More about this problem") {
                                        Text(problemDetail).foregroundStyle(ShieldTheme.secondaryText)
                                    }
                                }
                            }
                        }
                        Button { finishEditing(); Task { await save() } } label: {
                            ShieldActionLabel(title: saving ? "Saving…" : "Save number", isWorking: saving)
                        }
                        .shieldPrimaryButton()
                        .disabled(!canSave || (model.isDemo && !usesFixture))
                    }
                    .padding(ShieldTheme.Spacing.page)
                    .frame(maxWidth: ShieldTheme.Layout.readableWidth, alignment: .leading).frame(maxWidth: .infinity)
                }
                .disabled(saving)
                .background(ShieldTheme.surface)
                .scrollDismissesKeyboard(.interactively)
                .onChange(of: label) { _, _ in error = nil }
                .onChange(of: phone) { old, new in
                    if PhoneContacts.canonical(old) != PhoneContacts.canonical(new) {
                        error = nil; savedToContacts = false
                    }
                }
                .onChange(of: provenance) { _, _ in error = nil }
                .onChange(of: errorRevision) { _, _ in
                    guard error != nil else { return }
                    proxy.scrollTo("number-save-error", anchor: .top)
                    errorFocused = true
                }
                .navigationTitle("Add number")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    if field != nil {
                        ToolbarItem(placement: .confirmationAction) { Button("Done") { finishEditing() } }
                    }
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() }.disabled(saving) }
                }
            }
        }
    }

    private func finishEditing() {
        field = nil
        // Also dismiss UIKit's active editor if a growing Form field retains its responder.
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }

    private func save() async {
        guard canSave, model.isOwner, let person = model.selectedPersonID else { return }
        let generation = model.sessionGeneration
        saving = true
        error = nil
        defer { saving = false }
        do {
            if model.isPreview {
                #if DEBUG && targetEnvironment(simulator)
                if usesFixture, kind == .trusted, ProcessInfo.processInfo.arguments.contains("--uitesting-contact-save-sync-fails") { savedToContacts = true }
                #endif
                throw APIError.invalidResponse
            }
            var body = ["label": label.trimmingCharacters(in: .whitespacesAndNewlines), "phone": phone]
            if kind == .destinations { body["provenance"] = provenance }
            if kind == .trusted {
                try await PhoneContacts.shared.setEnabled(true, phone: phone, label: label, personID: person)
                savedToContacts = true
                guard generation == model.sessionGeneration, model.selectedPersonID == person else { throw CancellationError() }
                // Adding one person must not share the rest of the address book.
                // The server upserts by number so a lost response is safe to retry.
                let _: APIResponses.Empty = try await model.api.send("/api/trusted-numbers", method: "POST",
                    body: APIClient.payload(body), participantID: person)
            } else {
                let _: APIResponses.Empty = try await model.api.send(kind.path, method: "POST", body: APIClient.payload(body), participantID: person)
            }
            dismiss()
        } catch {
            problemDetail = savedToContacts ? error.localizedDescription : nil
            self.error = savedToContacts
                ? "The number is in iPhone Contacts. Try saving again to update Shield."
                : error.localizedDescription
            errorRevision += 1
            model.handleSessionFailure(error)
        }
    }
}
