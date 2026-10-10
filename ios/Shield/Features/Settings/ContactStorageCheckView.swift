#if DEBUG && targetEnvironment(simulator)
import SwiftUI

struct ContactStorageCheckView: View {
    @State private var result = "Checking contact restore…"
    var body: some View {
        Text(result).accessibilityIdentifier("contact-storage-result")
            .task {
                do { result = try await PhoneContacts.shared.verifyStorageRoundTrip() ? "Contact restore passed" : "Contact restore failed" }
                catch { result = error.localizedDescription }
            }
    }
}
#endif
