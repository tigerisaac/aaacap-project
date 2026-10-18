import SwiftUI

struct ContactAlertsView: View {
    @Environment(AppState.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var response: ContactAlertsResponse?
    @State private var error: String?
    @State private var loadingVisible = false
    @State private var loadRevision = 0
    @AccessibilityFocusState private var errorFocused: Bool

    var body: some View {
        ScrollViewReader { proxy in
            List {
                #if DEBUG && targetEnvironment(simulator)
                if ProcessInfo.processInfo.arguments.contains("--uitesting-caretaker-refresh") {
                    Button("Start held refresh") { Task { await load() } }
                }
                #endif
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
                    ShieldGroup {
                        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.content) {
                            ShieldNotice(title: response == nil ? "Requests couldn’t load" : "Status not confirmed",
                                detail: error, symbol: "wifi.exclamationmark")
                                .accessibilityIdentifier("contact-alert-load-error")
                                .accessibilityFocused($errorFocused)
                            Button { Task { await load() } } label: {
                                Label(response == nil ? "Try again" : "Check current status", systemImage: "arrow.clockwise")
                                    .shieldWrappingLabel()
                                    .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget)
                            }.shieldSecondaryButton()
                        }.padding(.vertical, ShieldTheme.Spacing.compact)
                    }
                    .id("contact-alert-load-error")
                }
            }.deferredLoading(response == nil && error == nil, visible: $loadingVisible)
                .shieldListStyle().navigationTitle("Alerts for others").navigationBarTitleDisplayMode(.inline)
                .task { await load() }.refreshable { await load() }
                .onChange(of: error) { _, error in
                    if error != nil {
                        proxy.scrollTo("contact-alert-load-error", anchor: .top)
                        errorFocused = true
                    }
                }
        }
    }
    private func load() async {
        loadRevision += 1
        let revision = loadRevision
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
            guard revision == loadRevision, generation == model.sessionGeneration else { return }
            response = loaded
        } catch is CancellationError { return }
        catch {
            guard revision == loadRevision, generation == model.sessionGeneration else { return }
            self.error = error is URLError ? "Your connection was interrupted. Check your internet connection." : error.localizedDescription
            model.handleSessionFailure(error)
        }
    }
}
