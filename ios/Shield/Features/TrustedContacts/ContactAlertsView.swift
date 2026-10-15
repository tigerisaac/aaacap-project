import SwiftUI

struct ContactAlertsView: View {
    @Environment(AppState.self) private var model
    @State private var response: ContactAlertsResponse?
    @State private var error: String?

    var body: some View {
        List {
            if let response {
                if response.textsStopped { ShieldGroup { Text("You stopped Shield texts. Reply START to Shield’s text number to resume them. App notifications can stay on.") } }
                if response.requests.isEmpty { ShieldGroup { Text("No requests for this mobile number.") } }
                ForEach(response.requests) { request in
                    ContactAlertChoiceView(request: request, textAvailable: response.textAvailable && !response.textsStopped, appAvailable: response.appAvailable) { accept, texts, appAlerts in
                        if model.isPreview {
                            self.response = .init(requests: accept ? [.init(id: request.id, name: request.name, status: "accepted", textAlerts: texts, appAlerts: appAlerts, ownerPaused: false)] : [], textAvailable: true, appAvailable: true, textsStopped: false)
                        } else { await load() }
                    }
                        .id("\(request.id)-\(request.status)-\(request.textAlerts)-\(request.appAlerts)")
                }
            } else if error == nil { ShieldGroup { ProgressView("Loading requests…") } }
            if let error { ShieldGroup { Text(error); Button("Try again") { Task { await load() } }.frame(minHeight: 44) } }
        }.shieldListStyle().navigationTitle("Alerts for others").navigationBarTitleDisplayMode(.inline)
            .task { await load() }.refreshable { await load() }
    }
    private func load() async {
        error = nil
        if model.isPreview {
            response = .init(requests: [.init(id: UUID(uuidString: "00000000-0000-4000-8000-000000000001")!, name: "Margaret", status: "pending", textAlerts: false, appAlerts: false, ownerPaused: false)], textAvailable: true, appAvailable: true, textsStopped: false)
            return
        }
        do { response = try await model.api.send("/api/contact-alerts") }
        catch { self.error = error.localizedDescription }
    }
}
