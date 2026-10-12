import SwiftUI

/// The person's choice to alert the helpers they share with. Helpers never see this switch.
struct HelperAlertsToggle: View {
    @Environment(AppState.self) private var model
    @State private var status: APIResponses.HelperAlerts?
    @State private var working = false

    var body: some View {
        Toggle(isOn: Binding(get: { status?.enabled == true }, set: { on in Task { await save(on) } })) {
            Label("Let my helpers know", systemImage: "person.2.badge.gearshape")
        }
        .disabled(working || model.isDemo || status?.available != true)
        .accessibilityIdentifier("helper-alerts-toggle")
        .task { await load() }
    }

    private func load() async {
        guard !model.isPreview, let id = model.selectedPersonID else { return }
        // A service without push alerts reads as unavailable here, not as an error.
        do { status = try await model.api.send("/api/helper-alerts", participantID: id) }
        catch is CancellationError { return } catch { status = nil }
    }

    private func save(_ enabled: Bool) async {
        guard let id = model.selectedPersonID, !working else { return }
        working = true
        defer { working = false }
        do {
            let _: APIResponses.Empty = try await model.api.send("/api/helper-alerts", method: "POST",
                body: APIClient.payload(["enabled": enabled]), participantID: id)
            await load()
        } catch { model.handle(error) }
    }
}
