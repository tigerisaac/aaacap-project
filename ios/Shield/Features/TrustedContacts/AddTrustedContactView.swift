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

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.section) {
                Button { showingPicker = true } label: {
                    Label("Choose from Contacts", systemImage: "person.text.rectangle").shieldWrappingLabel()
                        .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget)
                }
                .shieldSecondaryButton().disabled(working)
                VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) {
                    Text("Their name").font(.headline)
                    TextField("Name", text: $name, prompt: Text("Name").foregroundStyle(ShieldTheme.secondaryText)).textContentType(.name).focused($field, equals: .name)
                        .shieldField(focused: field == .name).accessibilityIdentifier("trusted-contact-name")
                    Text("Their mobile number").font(.headline).padding(.top, ShieldTheme.Spacing.regular)
                    TextField("Mobile number", text: $phone, prompt: Text("Mobile number").foregroundStyle(ShieldTheme.secondaryText)).textContentType(.telephoneNumber).keyboardType(.phonePad).focused($field, equals: .phone)
                        .shieldField(focused: field == .phone).accessibilityIdentifier("trusted-contact-phone")
                }.disabled(working)
                Text("With their permission, send a request. They choose texts, app alerts, or both.")
                    .foregroundStyle(ShieldTheme.secondaryText)
                if let error { ShieldNotice(title: "Couldn’t add this contact", detail: error, symbol: "exclamationmark.circle") }
                Button { Task { await save() } } label: {
                    ShieldActionLabel(title: working ? "Sending…" : "Send request", isWorking: working)
                }.shieldPrimaryButton().disabled(working || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || name.count > 60 || MobileNumber.normalized(phone) == nil)
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
        guard let phone = MobileNumber.normalized(phone), !working,
              model.isOwner, model.selectedPersonID == participantID else { return }
        let generation = model.sessionGeneration
        let details = name.trimmingCharacters(in: .whitespacesAndNewlines) + "\u{0}" + phone
        if let requestedDetails, requestedDetails != details { requestID = UUID() }
        requestedDetails = details
        working = true; error = nil; field = nil
        defer { working = false }
        do {
            let contact: TrustedContact
            if model.isPreview {
                contact = TrustedContact(id: requestID, name: name, phone: phone, status: "pending", textAlerts: false, appAlerts: false, requestDelivery: "submitted")
            } else {
                let response: TrustedContactCreated = try await model.api.send("/api/trusted-contacts", method: "POST", body: APIClient.payload([
                    "id": requestID.uuidString.lowercased(), "name": name.trimmingCharacters(in: .whitespacesAndNewlines), "phone": phone, "consent": true
                ]), participantID: participantID)
                contact = response.contact
            }
            guard generation == model.sessionGeneration, model.selectedPersonID == participantID else { return }
            onSaved(contact); dismiss()
        } catch is CancellationError { return }
        catch { self.error = error.localizedDescription; model.handleSessionFailure(error) }
    }
}
