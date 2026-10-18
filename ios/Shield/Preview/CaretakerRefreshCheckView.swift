#if DEBUG && targetEnvironment(simulator)
import SwiftUI

struct CaretakerRefreshCheckView: View {
    @State private var model: AppState?
    @State private var status = "Not checked"

    var body: some View {
        Group {
            if let model {
                // Give diagnostics their own layout space so they cannot cover the screen's controls.
                VStack(spacing: 0) {
                    NavigationStack {
                        if ProcessInfo.processInfo.arguments.contains("--caretaker-refresh-recipient") {
                            ContactAlertsView()
                        } else { TrustedContactsView() }
                    }
                    .environment(model)
                    VStack {
                        Text(status).font(.caption).accessibilityIdentifier("caretaker-fixture-state")
                        HStack {
                            Button("Inspect requests") { Task { status = await model.api.caretakerRefreshFixture.status() } }
                            Button("Release older response") { Task {
                                await model.api.caretakerRefreshFixture.release()
                                status = await model.api.caretakerRefreshFixture.status()
                            } }
                        }
                    }
                    // Keep test controls compact while the actual screen uses the requested text size.
                    .dynamicTypeSize(.large)
                    .padding(8).background(.bar)
                }
            } else { ProgressView() }
        }
        .task {
            let value = AppState(configuration: BackendConfiguration(baseURL: nil))
            value.signedIn = true
            value.isPreview = false
            let owner = Person(id: UUID(), name: "Synthetic owner", isOwner: true, canListen: true)
            value.people = [owner]
            value.selectedPersonID = owner.id
            model = value
        }
    }
}
#endif
