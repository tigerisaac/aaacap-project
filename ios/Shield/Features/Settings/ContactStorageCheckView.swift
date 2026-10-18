#if DEBUG && targetEnvironment(simulator)
import SwiftUI

struct ContactStorageCheckView: View {
    @State private var result = "Checking contact restore…"
    @State private var identityReport = ""
    var body: some View {
        Text(result).accessibilityIdentifier("contact-storage-result")
            .task {
                do {
                    if ProcessInfo.processInfo.arguments.contains("--uitesting-contact-number-identity") {
                        identityReport = try await ContactNumberIdentityCheck.run()
                        result = "Contact identity check finished"
                    } else if ProcessInfo.processInfo.arguments.contains("--uitesting-contact-sharing") {
                        result = try await PhoneContacts.shared.verifySharingPreparation() ? "Contact sharing passed" : "Contact sharing failed"
                    } else {
                        result = try await PhoneContacts.shared.verifyStorageRoundTrip() ? "Contact restore passed" : "Contact restore failed"
                    }
                }
                catch { result = error.localizedDescription }
            }
        if !identityReport.isEmpty {
            Text(identityReport).accessibilityIdentifier("contact-identity-report")
        }
    }
}
#endif
