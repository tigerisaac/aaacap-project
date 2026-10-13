import SwiftUI

struct JoinInvitationView: View {
    @Environment(AppState.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var code = ""
    @State private var joining = false
    @State private var error: String?
    @State private var errorRevision = 0
    @FocusState private var editing: Bool
    @AccessibilityFocusState private var errorFocused: Bool
    private var usesFixture: Bool { PreviewScenario.requested("invitation", preview: model.isPreview) }

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
                Form {
                    Section {
                        Text("Paste the code from the person who invited you.")
                        TextField("Invitation code", text: $code, axis: .vertical)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .focused($editing).accessibilityLabel("Invitation code")
                            .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                        PasteButton(payloadType: String.self) { values in code = ShieldInvitation.pastedCode(values.joined(separator: "\n")) }
                            .tint(ShieldTheme.pasteFill).buttonBorderShape(.capsule).controlSize(.large)
                    }.disabled(joining)
                    if let error {
                        Section {
                            ShieldNotice(title: "You couldn’t join yet", detail: error, symbol: "exclamationmark.circle")
                                .id("invitation-error").accessibilityFocused($errorFocused)
                        }
                    }
                    Section {
                        Text("You’ll see only what they choose to share with you.").foregroundStyle(ShieldTheme.secondaryText)
                    }
                }
                .safeAreaInset(edge: .bottom) {
                    Button { editing = false; Task { await join() } } label: {
                        ShieldActionLabel(title: joining ? "Joining…" : "Join them", isWorking: joining)
                    }
                    .shieldPrimaryButton().disabled(code.trimmingCharacters(in: .whitespacesAndNewlines).count < 20 || joining || (model.isDemo && !usesFixture))
                    .padding(ShieldTheme.Spacing.content).background(ShieldTheme.surface)
                }
                .shieldListStyle()
                .scrollDismissesKeyboard(.interactively)
                .onChange(of: code) { _, value in
                    error = nil
                    let normalized = ShieldInvitation.pastedCode(value)
                    if normalized != value { code = normalized }
                }
                .onChange(of: errorRevision) { _, _ in
                    guard error != nil else { return }
                    proxy.scrollTo("invitation-error", anchor: .top)
                    errorFocused = true
                }
                .navigationTitle("Use an invitation")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() }.disabled(joining) }
                    ToolbarItemGroup(placement: .keyboard) { Spacer(); Button("Done") { editing = false } }
                }
            }
        }
    }

    private func join() async {
        joining = true
        error = nil
        defer { joining = false }
        do {
            if model.isPreview { throw APIError.service(code: "invite_unavailable", status: 410) }
            let response: APIResponses.Joined = try await model.api.send("/api/sharing/accept", method: "POST",
                    body: APIClient.payload(["code": ShieldInvitation.pastedCode(code)]))
            await model.refresh()
            if let person = model.people.first(where: { $0.id == response.participantId }) {
                await model.select(person)
            }
            dismiss()
        } catch {
            self.error = error.localizedDescription
            errorRevision += 1
            model.handleSessionFailure(error)
        }
    }
}
