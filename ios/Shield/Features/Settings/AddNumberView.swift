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
                Form {
                    ShieldGroup {
                        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) {
                            Text("Name").font(.headline)
                            TextField("Name", text: $label, prompt: Text("For example, My clinic").foregroundStyle(ShieldTheme.secondaryText), axis: .vertical)
                                .lineLimit(1...3).frame(minHeight: ShieldTheme.Layout.minimumTarget)
                                .textContentType(.name).focused($field, equals: .name)
                                .accessibilityLabel("Name")
                                .submitLabel(.next).onSubmit { field = .phone }
                        }.padding(.vertical, ShieldTheme.Spacing.compact)
                        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) {
                            Text("Phone number").font(.headline)
                            HStack(spacing: ShieldTheme.Spacing.regular) {
                                TextField("Phone number", text: $phone, prompt: Text("Area code and number").foregroundStyle(ShieldTheme.secondaryText), axis: .vertical)
                                    .lineLimit(1...2).frame(minHeight: ShieldTheme.Layout.minimumTarget)
                                    .keyboardType(.phonePad).textContentType(.telephoneNumber)
                                    .focused($field, equals: .phone)
                                    .accessibilityLabel("Phone number")
                                if !phone.isEmpty && field == .phone {
                                    Button("Clear") { phone = "" }
                                        .font(.subheadline).frame(minWidth: 52, minHeight: ShieldTheme.Layout.minimumTarget)
                                        .accessibilityLabel("Clear phone number").accessibilityInputLabels(["Clear", "Clear phone number"])
                                }
                            }
                        }.padding(.vertical, ShieldTheme.Spacing.compact)
                    } footer: {
                        Text("Include the area code. US and Canadian numbers only.").font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                    }
                    if kind == .destinations {
                        ShieldGroup {
                            Picker("Found on", selection: $provenance) {
                                Text("A card").tag("card")
                                Text("A bill or statement").tag("statement")
                                Text("Official website").tag("official_website")
                                Text("Someone I know").tag("known_person")
                            }
                        } footer: { Text("Don’t use a number from an unexpected call or text.").font(.subheadline).foregroundStyle(ShieldTheme.secondaryText) }
                    }
                    if let error {
                        ShieldGroup {
                            ShieldNotice(title: "Save not confirmed", detail: error, symbol: "exclamationmark.circle")
                                .id("number-save-error").accessibilityFocused($errorFocused)
                            if let problemDetail {
                                DisclosureGroup("More about this problem") {
                                    Text(problemDetail).foregroundStyle(ShieldTheme.secondaryText)
                                }
                            }
                        }
                    }
                }
                .disabled(saving)
                .shieldListStyle()
                .scrollDismissesKeyboard(.interactively)
                .onChange(of: label) { _, _ in error = nil }
                .onChange(of: phone) { _, _ in error = nil; savedToContacts = false }
                .onChange(of: provenance) { _, _ in error = nil }
                .onChange(of: errorRevision) { _, _ in
                    guard error != nil else { return }
                    proxy.scrollTo("number-save-error", anchor: .top)
                    errorFocused = true
                }
                .safeAreaInset(edge: .bottom) {
                    Button {
                        if field != nil { finishEditing() }
                        else { Task { await save() } }
                    } label: {
                        ShieldActionLabel(title: field != nil ? "Done" : saving ? "Saving…" : "Save number", isWorking: saving)
                    }
                    .shieldPrimaryButton()
                    .disabled(saving || (field == nil && (!canSave || (model.isDemo && !usesFixture))))
                    .accessibilityHint(field != nil ? "Closes the keyboard" : "")
                    .padding(ShieldTheme.Spacing.content).background(ShieldTheme.surface)
                }
                .navigationTitle("Add number")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() }.shieldToolbarAction().disabled(saving) }
                        .sharedBackgroundVisibility(.hidden)
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
            if kind == .trusted, let person = model.selectedPersonID {
                try await PhoneContacts.shared.setEnabled(true, phone: phone, label: label, personID: person)
                savedToContacts = true
                let contacts = try await PhoneContacts.shared.all()
                let _: APIResponses.ContactSync = try await model.api.send("/api/trusted-numbers/sync", method: "POST",
                    body: JSONEncoder().encode(["contacts": contacts]), participantID: person)
            } else {
                let _: APIResponses.Empty = try await model.api.send(kind.path, method: "POST", body: APIClient.payload(body), participantID: model.selectedPersonID)
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
