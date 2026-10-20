import SwiftUI

struct AddTrustedContactView: View {
    @Environment(AppState.self) private var model
    @Environment(\.dismiss) private var dismiss
    let participantID: UUID
    var textAvailable = true
    let onSaved: (TrustedContact) -> Void
    @State private var requestID = UUID()
    @State private var requestedDetails: String?
    @State private var name = ""
    @State private var phone = ""
    @State private var showingPicker = false
    @State private var working = false
    @State private var checkingStatus = false
    @State private var error: String?
    @State private var requestUnconfirmed = false
    @State private var retryAvailable = false
    @State private var feedbackRevision = 0
    @State private var invitationPreview: TrustedContactsResponse.InvitationPreview?
    @State private var previewLoading = false
    @State private var previewFailed = false
    @AccessibilityFocusState private var errorFocused: Bool
    @FocusState private var field: Field?
    private enum Field { case name, phone }
    private var nameProblem: String? { ContactName.problem(name, disallowControls: true) }
    private var canSend: Bool { !working && (!requestUnconfirmed || retryAvailable) && nameProblem == nil && MobileNumber.normalized(phone) != nil
        && (!textAvailable || invitationPreview != nil) }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: ShieldTheme.Spacing.content) {
                    Button { showingPicker = true } label: {
                        Label("Choose from Contacts", systemImage: "person.text.rectangle").shieldWrappingLabel()
                            .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.capsuleLabelHeight)
                    }
                    .shieldSecondaryButton().disabled(working || requestUnconfirmed)
                    VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) {
                        Text("Name").font(.headline)
                        TextField("Name", text: $name, prompt: Text("Name").foregroundStyle(ShieldTheme.secondaryText)).textContentType(.name).focused($field, equals: .name)
                            .shieldField(focused: field == .name).accessibilityIdentifier("trusted-contact-name")
                        if !name.isEmpty, let nameProblem {
                            Text(nameProblem).font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                        }
                        ShieldPhoneEntry(text: $phone, focus: $field, field: .phone,
                                         title: "Mobile number", identifier: "trusted-contact-phone", mobileOnly: true)
                            .padding(.top, ShieldTheme.Spacing.regular)
                    }.disabled(working || requestUnconfirmed)
                    Text("Ask them first. They choose how to receive alerts.")
                        .foregroundStyle(ShieldTheme.secondaryText)
                    if !textAvailable {
                        Text("After creating the request, share its invitation from Caretakers. No request text will be sent.")
                            .foregroundStyle(ShieldTheme.secondaryText)
                    } else {
                        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.regular) {
                            Text("Request text").font(.headline).accessibilityAddTraits(.isHeader)
                            if let invitationPreview {
                                Text("From \(invitationPreview.sender)’s text-message number, not your phone.")
                                    .foregroundStyle(ShieldTheme.secondaryText)
                                // Set apart as the message itself, not more of the form's instructions.
                                Text(invitationPreview.message)
                                    .fixedSize(horizontal: false, vertical: true)
                                    .shieldCard()
                                    .accessibilityIdentifier("caretaker-invitation-preview")
                                Text("Your name and phone number aren’t included.")
                                    .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                            } else if previewFailed {
                                Text("The request text couldn’t be loaded. Check it before sending.")
                                Button { Task { await loadInvitationPreview() } } label: {
                                    Label(previewLoading ? "Loading…" : "Try preview again", systemImage: "arrow.clockwise")
                                        .shieldWrappingLabel()
                                        .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.capsuleLabelHeight)
                                }
                                .shieldSecondaryButton().disabled(previewLoading)
                            } else {
                                // Inline: the full-page loading block would leave a tall gap in the form.
                                Label { Text("Loading request text…") } icon: { ProgressView() }
                                    .foregroundStyle(ShieldTheme.secondaryText)
                            }
                        }
                    }
                    if let error {
                        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.content) {
                            ShieldNotice(title: "Request not confirmed", detail: error, symbol: "exclamationmark.circle")
                                .accessibilityIdentifier("trusted-contact-create-error")
                                .accessibilityFocused($errorFocused)
                            if requestUnconfirmed {
                                Button { Task { await checkStatus() } } label: {
                                Label(checkingStatus ? "Checking…" : "Check current status", systemImage: "arrow.clockwise")
                                    .shieldWrappingLabel()
                                    .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.capsuleLabelHeight)
                                }.shieldSecondaryButton().disabled(working)
                            }
                        }.id("trusted-contact-create-error")
                    }
                    Button { Task { await save() } } label: {
                        ShieldActionLabel(title: requestUnconfirmed ? textAvailable ? "Try sending again" : "Try creating again" : textAvailable ? "Send request" : "Create request", isWorking: working && !checkingStatus)
                    }.shieldPrimaryButton().disabled(!canSend)
                        .accessibilityIdentifier("trusted-contact-send")
                    ShieldDisclosure("What is shared?") {
                        Text("They hear only when checks while you talk detect a possible scam request and intervene. Those checks must be on. Alerts include your name; calls, recordings, and messages stay private. Message and data rates may apply.")
                            .foregroundStyle(ShieldTheme.secondaryText)
                    }
                }.shieldPageMargins()
                    .frame(maxWidth: ShieldTheme.Layout.readableWidth, alignment: .leading).frame(maxWidth: .infinity)
            }.background(ShieldTheme.surface).scrollDismissesKeyboard(.interactively)
                .navigationTitle("Add caretaker").navigationBarTitleDisplayMode(.inline)
                .task { await loadInvitationPreview() }
                .navigationBarBackButtonHidden(working).interactiveDismissDisabled(working)
                .toolbar {
                    if field != nil { ToolbarItem(placement: .confirmationAction) { Button("Done") { field = nil } } }
                }
                .sheet(isPresented: $showingPicker) {
                    TrustedContactPicker(onSelect: { selectedName, selectedPhone in name = selectedName; phone = selectedPhone; showingPicker = false }, onCancel: { showingPicker = false })
                }
                .onChange(of: feedbackRevision) { _, _ in
                    proxy.scrollTo("trusted-contact-create-error", anchor: .top)
                    errorFocused = true
                }
        }
    }

    private func loadInvitationPreview() async {
        guard textAvailable, !previewLoading else { return }
        #if DEBUG && targetEnvironment(simulator)
        if model.isPreview || model.configuration.baseURL == nil {
            if ProcessInfo.processInfo.arguments.contains("--uitesting-invitation-preview-fails") {
                previewFailed = true
                return
            }
            invitationPreview = .init(sender: "Shield",
                message: "Someone added you as a caretaker in Shield. Choose whether to receive alerts: https://shield-calls-isaac.web.app/trusted-contacts.html Reply STOP to stop texts.", version: "preview-only")
            return
        }
        #endif
        let generation = model.sessionGeneration
        previewLoading = true; previewFailed = false
        defer { previewLoading = false }
        do {
            let response: TrustedContactsResponse = try await model.api.send("/api/trusted-contacts", participantID: participantID)
            guard generation == model.sessionGeneration, model.selectedPersonID == participantID else { return }
            invitationPreview = response.invitationPreview
            previewFailed = invitationPreview == nil
        } catch is CancellationError { return }
        catch {
            guard generation == model.sessionGeneration, model.selectedPersonID == participantID else { return }
            previewFailed = true
            model.handleSessionFailure(error)
        }
    }
    private func save() async {
        guard canSend, let phone = MobileNumber.normalized(phone),
              model.isOwner, model.selectedPersonID == participantID else { return }
        let generation = model.sessionGeneration
        let savedName = ContactName.cleaned(name)
        let details = savedName + "\u{0}" + phone
        if let requestedDetails, requestedDetails != details { requestID = UUID() }
        requestedDetails = details
        working = true; error = nil; retryAvailable = false; field = nil
        defer { working = false }
        do {
            let contact: TrustedContact
            if model.isPreview {
                contact = TrustedContact(id: requestID, name: savedName, phone: phone, status: "pending", textAlerts: false, appAlerts: false, requestDelivery: "submitted")
            } else {
                var payload: [String: Any] = [
                    "id": requestID.uuidString.lowercased(), "name": savedName, "phone": phone, "consent": true
                ]
                if model.service?.trustedContactsInvitationURL != nil { payload["sendText"] = textAvailable }
                if textAvailable, let invitationPreview { payload["invitationPreviewVersion"] = invitationPreview.version }
                let response: TrustedContactCreated = try await model.api.send("/api/trusted-contacts", method: "POST",
                    body: APIClient.payload(payload), participantID: participantID)
                contact = response.contact
            }
            guard generation == model.sessionGeneration, model.selectedPersonID == participantID else { return }
            onSaved(contact); dismiss()
        } catch is CancellationError { return }
        catch {
            guard generation == model.sessionGeneration, model.selectedPersonID == participantID else { return }
            // A server rejection can be corrected in the form. A missing/invalid response
            // must first be reconciled, keeping the submitted details and request ID stable.
            switch error {
            case APIError.service(let code, _) where code == "invitation_preview_required":
                invitationPreview = nil
                await loadInvitationPreview()
            case APIError.service(_, let status) where (400..<500).contains(status): break
            default: requestUnconfirmed = true
            }
            showFailure(error)
        }
    }

    private func checkStatus() async {
        guard requestUnconfirmed, !working, model.isOwner, model.selectedPersonID == participantID else { return }
        let generation = model.sessionGeneration
        working = true; checkingStatus = true; retryAvailable = false
        defer { working = false; checkingStatus = false }
        do {
            let response: TrustedContactsResponse = try await model.api.send("/api/trusted-contacts", participantID: participantID)
            guard generation == model.sessionGeneration, model.selectedPersonID == participantID else { return }
            if let contact = response.contacts.first(where: { $0.id == requestID }) {
                onSaved(contact); dismiss()
            } else {
                // This is a current read, not proof that an earlier request cannot still finish.
                // Any deliberate retry therefore keeps the same identity and submitted details.
                retryAvailable = true
                error = "We couldn’t find this request yet. You can try sending it again with the same details."
                feedbackRevision += 1
            }
        } catch is CancellationError { return }
        catch {
            guard generation == model.sessionGeneration, model.selectedPersonID == participantID else { return }
            showFailure(error)
        }
    }

    private func showFailure(_ failure: Error) {
        error = failure is URLError ? "Your connection was interrupted. Check your internet connection, then check the current status." : failure.localizedDescription
        feedbackRevision += 1
        model.handleSessionFailure(failure)
    }
}
