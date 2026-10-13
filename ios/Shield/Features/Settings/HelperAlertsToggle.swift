import SwiftUI

/// The person's choice to alert the helpers they share with. Helpers never see this switch.
struct HelperAlertsToggle: View {
    @Environment(AppState.self) private var model
    @State private var status: APIResponses.HelperAlerts?
    @State private var working = false
    @State private var loading = true
    @State private var loadError: String?

    var body: some View {
        Group {
            if loading && status == nil {
                ShieldLoadingView(title: "Checking helper alerts…")
            } else if let loadError {
                ShieldLoadFailure(title: "Helper alerts couldn’t load", detail: loadError) { Task { await load() } }
            } else if status?.available == true {
                Toggle("Let my helpers know", isOn: Binding(get: { status?.enabled == true }, set: { on in Task { await save(on) } }))
                    .disabled(working || model.isDemo)
                    .accessibilityIdentifier("helper-alerts-toggle")
                if working { ProgressView("Saving helper alerts…") }
            } else {
                Text("Helper alerts aren’t available yet.").foregroundStyle(ShieldTheme.secondaryText)
            }
        }
        .task { await load() }
    }

    private func load() async {
        loading = true
        loadError = nil
        defer { loading = false }
        guard !model.isPreview, let id = model.selectedPersonID else { return }
        do { status = try await model.api.send("/api/helper-alerts", participantID: id) }
        catch is CancellationError { return }
        catch {
            if case let APIError.service(_, code) = error, code == 404 { status = nil }
            else { loadError = error.localizedDescription; model.handleSessionFailure(error) }
        }
    }

    private func save(_ enabled: Bool) async {
        guard let id = model.selectedPersonID, !working else { return }
        working = true
        defer { working = false }
        do {
            let _: APIResponses.Empty = try await model.api.send("/api/helper-alerts", method: "POST",
                body: APIClient.payload(["enabled": enabled]), participantID: id)
            await load()
        } catch { await load(); model.handle(error) }
    }
}
