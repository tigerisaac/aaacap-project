import SwiftUI

struct QuietHoursView: View {
    @Environment(AppState.self) private var model
    @State private var hours = ForwardingStatus.QuietHours(enabled: false, start: 21, end: 8)
    @State private var loaded = false
    @State private var working = false
    @State private var saved = false

    var body: some View {
        Form {
            Section {
                Toggle("Quiet hours", isOn: $hours.enabled)
                if hours.enabled {
                    Picker("From", selection: $hours.start) {
                        ForEach(0..<24, id: \.self) { Text(label($0)).tag($0) }
                    }
                    Picker("Until", selection: $hours.end) {
                        ForEach(0..<24, id: \.self) { Text(label($0)).tag($0) }
                    }
                }
            } footer: {
                Text("During quiet hours, Shield offers screened callers voicemail instead of ringing you. Times are Central. This affects calls forwarded to Shield.")
            }
            Section {
                Button(saved ? "Saved" : "Save quiet hours") { Task { await save() } }
            }
        }
        .disabled(working || model.isDemo || !loaded)
        .navigationTitle("Quiet hours")
        .navigationBarTitleDisplayMode(.inline)
        .onChange(of: hours) { _, _ in saved = false }
        .task { await load() }
    }
    private func label(_ hour: Int) -> String { "\(hour % 12 == 0 ? 12 : hour % 12) \(hour < 12 ? "AM" : "PM")" }
    private func load() async {
        guard !model.isDemo, let id = model.selectedPersonID else { return }
        do {
            let status: ForwardingStatus = try await model.api.send("/api/forwarding", participantID: id)
            if let value = status.quietHours { hours = value }
            loaded = true
        } catch { model.handle(error) }
    }
    private func save() async {
        guard let id = model.selectedPersonID, loaded, !working else { return }
        working = true
        defer { working = false }
        do {
            let _: APIResponses.Empty = try await model.api.send("/api/forwarding/quiet-hours", method: "POST",
                body: APIClient.payload(["enabled": hours.enabled, "start": hours.start, "end": hours.end]), participantID: id)
            saved = true
        } catch { model.handle(error) }
    }
}
