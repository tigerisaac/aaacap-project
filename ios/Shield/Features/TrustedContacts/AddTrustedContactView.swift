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
    @State private var error: String?
    @FocusState private var field: Field?
    private enum Field { case name, phone }
    private var nameProblem: String? { ContactName.problem(name, disallowControls: true) }
    private var canSend: Bool { !working && nameProblem == nil && MobileNumber.normalized(phone) != nil }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.content) {
                Button { showingPicker = true } label: {
                    Label("Choose from Contacts", systemImage: "person.text.rectangle").shieldWrappingLabel()
                        .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget)
                }
                .shieldSecondaryButton().disabled(working)
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
                }.disabled(working)
                Text("Ask them first. They choose how to receive alerts.")
                    .foregroundStyle(ShieldTheme.secondaryText)
                if let error { ShieldNotice(title: "Couldn’t add this contact", detail: error, symbol: "exclamationmark.circle") }
                Button { Task { await save() } } label: {
                    ShieldActionLabel(title: working ? "Sending…" : "Send request", isWorking: working)
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
    }
    private func save() async {
        guard canSend, let phone = MobileNumber.normalized(phone),
              model.isOwner, model.selectedPersonID == participantID else { return }
        let generation = model.sessionGeneration
        let savedName = ContactName.cleaned(name)
        let details = savedName + "\u{0}" + phone
        if let requestedDetails, requestedDetails != details { requestID = UUID() }
        requestedDetails = details
        working = true; error = nil; field = nil
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
        catch { self.error = error.localizedDescription; model.handleSessionFailure(error) }
    }
}
