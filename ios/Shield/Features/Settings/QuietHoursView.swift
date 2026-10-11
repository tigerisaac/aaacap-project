import SwiftUI

/// Overnight, Shield sends callers it would put through to voicemail instead of ringing. Contacts still ring as usual.
struct QuietHoursView: View {
    @Environment(AppState.self) private var model
    @State private var hours = ForwardingStatus.QuietHours(enabled: true, start: 21, end: 8)
    @State private var loaded = false
    @State private var working = false

    var body: some View {
        Form {
            Section {
                Toggle("Quiet hours", isOn: Binding(get: { hours.enabled }, set: { hours.enabled = $0; Task { await save() } }))
                    .accessibilityIdentifier("quiet-hours-toggle")
                if hours.enabled {
                    Picker("From", selection: Binding(get: { hours.start }, set: { hours.start = $0; Task { await save() } })) {
                        ForEach(0..<24, id: \.self) { Text(label($0)).tag($0) }
                    }
                    Picker("Until", selection: Binding(get: { hours.end }, set: { hours.end = $0; Task { await save() } })) {
                        ForEach(0..<24, id: \.self) { Text(label($0)).tag($0) }
                    }
                }
            } footer: {
                Text(model.isDemo ? "Not available in the demo."
                     : "During quiet hours, a caller Shield would put through is offered voicemail instead, so your phone doesn’t ring overnight. People in your contacts still ring as usual. Times are Central.")
            }
        }
        .disabled(working || model.isDemo || !loaded)
        .navigationTitle("Quiet hours")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private func label(_ hour: Int) -> String {
        Calendar.current.date(bySettingHour: hour, minute: 0, second: 0, of: .now)?.formatted(date: .omitted, time: .shortened) ?? "\(hour):00"
    }

    private func load() async {
        guard !model.isPreview, let id = model.selectedPersonID,
              let status: ForwardingStatus = try? await model.api.send("/api/forwarding", participantID: id) else { return }
        if let saved = status.quietHours { hours = saved }
        loaded = true
    }

    private func save() async {
        guard let id = model.selectedPersonID, loaded, !working else { return }
        working = true
        defer { working = false }
        do {
            let _: APIResponses.Empty = try await model.api.send("/api/forwarding/quiet-hours", method: "POST",
                body: APIClient.payload(["enabled": hours.enabled, "start": hours.start, "end": hours.end]), participantID: id)
        } catch { model.handle(error) }
    }
}
