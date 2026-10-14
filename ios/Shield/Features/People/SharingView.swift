import SwiftUI

struct SharingView: View {
    @Environment(AppState.self) private var model
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.accessibilityVoiceOverEnabled) private var voiceOverEnabled
    @State private var grants: [SharingGrant] = []
    @State private var label = ""
    @State private var canListen = false
    @State private var creating = false
    @State private var inviteCode: String?
    @State private var confirmShare = false
    @State private var revokeID: UUID?
    @State private var loading = true
    @State private var loadError: String?
    @State private var loadAttempts = 0
    @FocusState private var editingName: Bool
    @AccessibilityFocusState private var invitationFocused: Bool
    @AccessibilityFocusState private var accessChoiceFocused: Bool
    private var usesAccessFixture: Bool { PreviewScenario.requested("sharing-access", preview: model.isPreview) }
    private var usesConfirmationFixture: Bool {
        #if DEBUG && targetEnvironment(simulator)
        model.isPreview && ProcessInfo.processInfo.arguments.contains("--uitesting-sharing-confirmations")
        #else
        false
        #endif
    }

    var body: some View {
        ScrollViewReader { proxy in
        Form {
            ShieldGroup {
                VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) {
                    Text("Your helper’s name").font(.headline)
                    TextField("Your helper’s name", text: $label, prompt: Text("Name of your helper").foregroundStyle(ShieldTheme.secondaryText), axis: .vertical)
                        .lineLimit(1...3).frame(minHeight: ShieldTheme.Layout.minimumTarget)
                        .textContentType(.givenName).focused($editingName).submitLabel(.done)
                        .accessibilityLabel("Your helper’s name")
                        .onSubmit { editingName = false }
                }.padding(.vertical, ShieldTheme.Spacing.compact)
                if editingName && (typeSize.isAccessibilitySize || voiceOverEnabled) {
                    Button { editingName = false; accessChoiceFocused = voiceOverEnabled } label: {
                        Text("Finish editing name")
                            .fixedSize(horizontal: false, vertical: true)
                            .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget, alignment: .leading)
                            .contentShape(.rect)
                    }.buttonStyle(.plain).foregroundStyle(ShieldTheme.action)
                }
                Toggle("Include messages", isOn: $canListen)
                    .accessibilityFocused($accessChoiceFocused)
            } footer: {
                Text(canListen ? "They can see your calls and read or listen to messages." : "They can see your call history, without messages.")
                    .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
            }
            .disabled(creating)
            ShieldGroup {
                Button { editingName = false; confirmShare = true } label: {
                    ShieldActionLabel(title: creating ? "Creating…" : "Make invitation", isWorking: creating)
                }
                    .shieldPrimaryButton()
                    .disabled(label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || creating || (model.isDemo && !usesConfirmationFixture))
                    .alert("Make an invitation for \(label.trimmingCharacters(in: .whitespacesAndNewlines))?", isPresented: $confirmShare) {
                        Button("Make invitation") { Task { await createInvite() } }
                        Button("Not now", role: .cancel) {}
                    } message: {
                        Text(canListen ? "They can see your calls and read or hear voicemail and saved notices. Send this only to the person you want to help." : "They can see your calls. Your messages stay private. Send this only to the person you want to help.")
                    }
                    .listRowInsets(EdgeInsets()).listRowBackground(Color.clear)
            }
            if let inviteCode {
                ShieldSection("Share this invitation") {
                    ShareLink(item: ShieldInvitation.shareText(code: inviteCode, isSample: model.isDemo)) {
                        ShieldActionLabel(title: "Share invitation")
                    }
                    .shieldPrimaryButton()
                    .id("new-invitation").accessibilityFocused($invitationFocused)
                    Text("It works once, within two days.").foregroundStyle(ShieldTheme.secondaryText)
                    ShieldDisclosure("See invitation code") {
                        Text(inviteCode).font(.body.monospaced()).textSelection(.enabled)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
            if model.isOwner, model.service?.notificationsAvailable == true, !model.isDemo {
                ShieldGroup {
                    HelperAlertsToggle()
                    ShieldDisclosure("When will they hear from Shield?") {
                        Text("When Shield ends a scam call, a blocked caller tries again, or call checks are paused. Alerts include your name, but no caller’s words or number.")
                    }
                }
            }
            ShieldSection("People helping you") {
                if let loadError {
                    ShieldLoadFailure(title: "Your helpers couldn’t load", detail: loadError) { Task { await load() } }
                } else if model.isDemo && !usesAccessFixture {
                    Text("Sign in to manage sharing.").foregroundStyle(ShieldTheme.secondaryText)
                } else if loading && grants.isEmpty {
                    ShieldLoadingView(title: "Getting your helpers…")
                } else if grants.isEmpty {
                    Text("No one has access yet.").foregroundStyle(ShieldTheme.secondaryText)
                }
                ForEach(grants) { grant in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(grant.label).font(.headline)
                        Text(grant.accepted ? grant.canListen ? "Calls and messages" : "Calls only" : "Waiting for them to join")
                            .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                        Button("Stop sharing", role: .destructive) { revokeID = grant.id }
                            .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                            .disabled(model.isDemo && !usesConfirmationFixture)
                            .accessibilityLabel("Stop sharing with \(grant.label)")
                    }
                    .alert("Stop sharing with \(grant.label)?", isPresented: Binding(
                        get: { revokeID == grant.id },
                        set: { if !$0 { revokeID = nil } }
                    )) {
                        Button("Stop sharing", role: .destructive) { Task { await revoke(grant.id) } }
                        Button("Keep sharing", role: .cancel) { revokeID = nil }
                    }
                }
            }
        }
        .shieldListStyle()
        .navigationTitle("Share with a helper")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .scrollDismissesKeyboard(.interactively)
        .onChange(of: inviteCode) { _, code in
            if code != nil { proxy.scrollTo("new-invitation", anchor: .top); invitationFocused = true }
        }
        .toolbar { ToolbarItemGroup(placement: .keyboard) {
            Spacer()
            Button("Done") { editingName = false }.accessibilityIdentifier("sharing-keyboard-done")
        } }
        }
    }

    private func load() async {
        loading = true
        loadError = nil
        defer { loading = false }
        #if DEBUG && targetEnvironment(simulator)
        if usesAccessFixture {
            grants = [SharingGrant(id: UUID(), label: "Jamie", canListen: true, accepted: true, expiresAt: .now.addingTimeInterval(172_800)),
                      SharingGrant(id: UUID(), label: "Morgan", canListen: false, accepted: false, expiresAt: .now.addingTimeInterval(172_800))]
            inviteCode = "SyntheticInvitationForPreviewOnlyNoRealAccess"
            return
        }
        #endif
        if let failure = PreviewScenario.loadFailure("sharing", attempt: loadAttempts, preview: model.isPreview) {
            loadAttempts += 1
            loadError = failure
            return
        }
        guard !model.isDemo else { return }
        do {
            let result: APIResponses.Sharing = try await model.api.send("/api/sharing", participantID: model.selectedPersonID)
            grants = result.grants
        } catch is CancellationError { return }
        catch { loadError = error.localizedDescription; model.handleSessionFailure(error) }
    }
    private func createInvite() async {
        guard !model.isPreview, !model.isDemo, !creating else { return }
        creating = true
        defer { creating = false }
        do {
            let result: APIResponses.Invitation = try await model.api.send("/api/sharing", method: "POST",
                body: APIClient.payload(["label": label.trimmingCharacters(in: .whitespacesAndNewlines), "canListen": canListen, "consent": true]), participantID: model.selectedPersonID)
            inviteCode = result.code
            label = ""
            await load()
        } catch { model.handle(error) }
    }
    private func revoke(_ id: UUID) async {
        guard !model.isPreview, !model.isDemo else { return }
        do {
            let _: APIResponses.Empty = try await model.api.send("/api/sharing/\(id)", method: "DELETE", participantID: model.selectedPersonID)
            revokeID = nil
            await load()
        } catch { model.handle(error) }
    }
}
