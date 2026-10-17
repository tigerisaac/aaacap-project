import SwiftUI

struct ContactAlertsView: View {
    @Environment(AppState.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var response: ContactAlertsResponse?
    @State private var error: String?
    @State private var loadingVisible = false

    var body: some View {
        List {
            if let response {
                if response.textsStopped { ShieldGroup { Text("You stopped Shield texts. Reply START to Shield’s text number to resume them. App notifications can stay on.") } }
                if response.requests.isEmpty {
                    ShieldGroup {
                        ContentUnavailableView {
                            Label {
                                Text("No requests").lineLimit(nil).fixedSize(horizontal: false, vertical: true)
                            } icon: { Image(systemName: "bell") }
                        } description: {
                            Text("When someone adds you as a caretaker, their request appears here. They need the mobile number you use to sign in.")
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        Button("Done") { dismiss() }.frame(minHeight: ShieldTheme.Layout.minimumTarget)
                    }
                }
                ForEach(response.requests) { request in
                    ContactAlertChoiceView(request: request, textAvailable: response.textAvailable && !response.textsStopped, appAvailable: response.appAvailable) { accept, texts, appAlerts in
                        if model.isPreview {
                            self.response = .init(requests: accept ? [.init(id: request.id, name: request.name, status: "accepted", textAlerts: texts, appAlerts: appAlerts, ownerPaused: false)] : [], textAvailable: true, appAvailable: true, textsStopped: false)
                        } else { await load() }
                    }
                        .id("\(request.id)-\(request.status)-\(request.textAlerts)-\(request.appAlerts)")
                }
            } else if error == nil, loadingVisible { ShieldGroup { ShieldLoadingView(title: "Getting your requests…") } }
            if let error {
                ShieldGroup { ShieldLoadFailure(title: "Requests couldn’t load", detail: error) { Task { await load() } } }
            }
        }.deferredLoading(response == nil && error == nil, visible: $loadingVisible)
            .shieldListStyle().navigationTitle("Alerts for others").navigationBarTitleDisplayMode(.inline)
            .task { await load() }.refreshable { await load() }
    }
    private func load() async {
        error = nil
        if model.isPreview {
            #if DEBUG && targetEnvironment(simulator)
            if ProcessInfo.processInfo.arguments.contains("--uitesting-alert-requests-empty") {
                response = .init(requests: [], textAvailable: true, appAvailable: true, textsStopped: false)
                return
            }
            #endif
            response = .init(requests: [.init(id: UUID(uuidString: "00000000-0000-4000-8000-000000000001")!, name: "Margaret", status: "pending", textAlerts: false, appAlerts: false, ownerPaused: false)], textAvailable: true, appAvailable: true, textsStopped: false)
            return
        }
        let generation = model.sessionGeneration
        do {
            let loaded: ContactAlertsResponse = try await model.api.send("/api/contact-alerts")
            guard generation == model.sessionGeneration else { return }
            response = loaded
        } catch is CancellationError { return }
        catch { self.error = error.localizedDescription; model.handleSessionFailure(error) }
    }
}
