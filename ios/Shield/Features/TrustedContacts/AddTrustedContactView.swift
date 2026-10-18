import SwiftUI

struct AddTrustedContactView: View {
    @Environment(AppState.self) private var model
    @Environment(\.dismiss) private var dismiss
    let participantID: UUID
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
    @AccessibilityFocusState private var errorFocused: Bool
    @FocusState private var field: Field?
    private enum Field { case name, phone }
    private var nameProblem: String? { ContactName.problem(name, disallowControls: true) }
    private var canSend: Bool { !working && (!requestUnconfirmed || retryAvailable) && nameProblem == nil && MobileNumber.normalized(phone) != nil }

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
                        ShieldActionLabel(title: requestUnconfirmed ? "Try sending again" : "Send request", isWorking: working && !checkingStatus)
                    }.shieldPrimaryButton().disabled(!canSend)
                        .accessibilityIdentifier("trusted-contact-send")
                    ShieldDisclosure("What is shared?") {
                        Text("They hear only when checks while you talk detect a possible scam request and intervene. Those checks must be on. Alerts include your name; calls, recordings, and messages stay private. Message and data rates may apply.")
                            .foregroundStyle(ShieldTheme.secondaryText)
                    }
                }.padding(ShieldTheme.Spacing.page)
                    .frame(maxWidth: ShieldTheme.Layout.readableWidth, alignment: .leading).frame(maxWidth: .infinity)
            }.background(ShieldTheme.surface).scrollDismissesKeyboard(.interactively)
                .navigationTitle("Add caretaker").navigationBarTitleDisplayMode(.inline)
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
                let response: TrustedContactCreated = try await model.api.send("/api/trusted-contacts", method: "POST", body: APIClient.payload([
                    "id": requestID.uuidString.lowercased(), "name": savedName, "phone": phone, "consent": true
                ]), participantID: participantID)
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
