#if DEBUG && targetEnvironment(simulator)
import SwiftUI

struct ContactRecoveryCheckView: View {
    @State private var model: AppState?
    @State private var status = "Preparing synthetic contact"
    var body: some View {
        VStack(spacing: 0) {
            if let model {
                NavigationStack { SharedContactsView() }.environment(model)
                VStack {
                    Text(status).font(.caption).accessibilityIdentifier("contact-recovery-state")
                    HStack {
                        Button("Inspect contact state") { Task { status = await model.api.contactRecoveryFixture.status() } }
                        Button("Restore test connection") { Task { await model.api.contactRecoveryFixture.restoreConnection() } }
                    }
                }.dynamicTypeSize(.large).padding(8).background(.bar)
            } else { Text(status) }
        }
        .task {
            do {
                let value = AppState(configuration: BackendConfiguration(baseURL: nil))
                guard let account = await value.api.localAccountID else { throw APIError.invalidResponse }
                if !ProcessInfo.processInfo.arguments.contains("--contact-recovery-resume") {
                    try await PhoneContacts.shared.prepareRecoveryFixture()
                    try await ContactChangeStore.shared.removeAccount(account)
                }
                value.signedIn = true; value.isPreview = false; value.isDemo = false
                value.people = [Person(id: ContactRecoveryFixture.person, name: "Synthetic owner", isOwner: true, canListen: true)]
                value.selectedPersonID = ContactRecoveryFixture.person
                model = value; status = "Synthetic contact ready"
            } catch { status = "Synthetic contact setup failed: \(error.localizedDescription)" }
        }
    }
}
#endif
