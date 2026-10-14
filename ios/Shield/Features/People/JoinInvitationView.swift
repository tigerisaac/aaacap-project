import SwiftUI

struct JoinInvitationView: View {
    @Environment(AppState.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.accessibilityVoiceOverEnabled) private var voiceOverEnabled
    @State private var code = ""
    @State private var joining = false
    @State private var error: String?
    @State private var errorRevision = 0
    @State private var finishedEditingCode = false
    @FocusState private var editing: Bool
    @AccessibilityFocusState private var errorFocused: Bool
    @AccessibilityFocusState private var acceptFocused: Bool
    @AccessibilityFocusState private var codeFocused: Bool
    private var usesFixture: Bool { PreviewScenario.requested("invitation", preview: model.isPreview) }

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
                Form {
                    ShieldGroup {
                        Text("Paste the code from the person who invited you.")
                        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) {
                            Text("Invitation code").font(.headline).foregroundStyle(ShieldTheme.ink)
                            TextField("Invitation code", text: $code, prompt: Text("Code").foregroundStyle(ShieldTheme.secondaryText))
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .focused($editing).accessibilityLabel("Invitation code")
                                .accessibilityFocused($codeFocused)
                                .submitLabel(.done).onSubmit { editing = false; finishedEditingCode = true }
                                .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                            if inlineAction && !finishedEditingCode && !code.isEmpty {
                                Button {
                                    finishEntry(using: proxy)
                                } label: {
                                    Text("Finish editing code")
                                        .fixedSize(horizontal: false, vertical: true)
                                        .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget, alignment: .leading)
                                        .contentShape(.rect)
                                }.buttonStyle(.plain).foregroundStyle(ShieldTheme.action)
                            }
                        }.id("invitation-code")
                        if !code.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && code.trimmingCharacters(in: .whitespacesAndNewlines).count < 20 {
                            Text("That code looks incomplete. Paste the whole invitation.")
                                .font(.callout).foregroundStyle(ShieldTheme.secondaryText)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        PasteButton(payloadType: String.self) { values in code = ShieldInvitation.pastedCode(values.joined(separator: "\n")) }
                            .tint(ShieldTheme.pasteFill).buttonBorderShape(.capsule).controlSize(.extraLarge)
                            .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                    } footer: {
                        Text("You’ll see only what they choose to share with you.").foregroundStyle(ShieldTheme.secondaryText)
                    }
                    .disabled(joining)
                    if let error {
                        ShieldGroup {
                            ShieldNotice(title: "You couldn’t join yet", detail: error, symbol: "exclamationmark.circle")
                                .id("invitation-error").accessibilityFocused($errorFocused)
                            Button {
                                proxy.scrollTo("invitation-code", anchor: .top)
                                editing = true
                                finishedEditingCode = false
                                codeFocused = voiceOverEnabled
                            } label: {
                                Text("Edit code")
                                    .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget, alignment: .leading)
                                    .contentShape(.rect)
                            }.buttonStyle(.plain).foregroundStyle(ShieldTheme.action)
                        }
                    }
                    if inlineAction {
                        acceptButton.listRowInsets(EdgeInsets()).listRowBackground(ShieldTheme.surface)
                    }
                }
                .shieldListStyle()
                .safeAreaInset(edge: .bottom) {
                    if !inlineAction { acceptButton }
                }
                .scrollDismissesKeyboard(.immediately)
                .onChange(of: code) { _, value in
                    error = nil
                    finishedEditingCode = false
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
                    ToolbarItemGroup(placement: .keyboard) {
                        Spacer()
                        Button("Done") { editing = false; finishedEditingCode = true }
                            .accessibilityIdentifier("invitation-keyboard-done")
                    }
                }
            }
        }
    }

    private var inlineAction: Bool { typeSize.isAccessibilitySize || voiceOverEnabled }

    private func finishEntry(using proxy: ScrollViewProxy) {
        editing = false
        finishedEditingCode = true
        if inlineAction {
            proxy.scrollTo("accept-invitation", anchor: .bottom)
            acceptFocused = voiceOverEnabled
        }
    }

    private var acceptButton: some View {
        Button { editing = false; Task { await join() } } label: {
            ShieldActionLabel(title: joining ? "Accepting…" : "Accept invitation", isWorking: joining)
        }
        .shieldPrimaryButton().disabled(code.trimmingCharacters(in: .whitespacesAndNewlines).count < 20 || joining || (model.isDemo && !usesFixture))
        .id("accept-invitation").accessibilityFocused($acceptFocused)
        .padding(ShieldTheme.Spacing.content).background(ShieldTheme.surface)
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
