import SwiftUI

struct QuietHoursView: View {
    @Environment(AppState.self) private var model
    @State private var hours = ForwardingStatus.QuietHours(enabled: false, start: 21, end: 8)
    @State private var loaded = false
    @State private var working = false
    @State private var savedHours: ForwardingStatus.QuietHours?
    @State private var loading = true
    @State private var loadError: String?
    @State private var saveError: String?
    @State private var errorRevision = 0
    @State private var loadAttempts = 0
    @AccessibilityFocusState private var errorFocused: Bool
    private var usesFixture: Bool { PreviewScenario.requested("quiet", preview: model.isPreview) }
    private var changed: Bool { loaded && savedHours != hours }

    var body: some View {
        ScrollViewReader { proxy in
            Form {
                if let loadError {
                    ShieldGroup {
                        ShieldLoadFailure(title: "Quiet hours couldn’t load", detail: loadError) { Task { await load() } }
                    }
                } else if model.isDemo && !usesFixture {
                    ShieldGroup { Text("Quiet hours don’t change in the sample app.").foregroundStyle(ShieldTheme.secondaryText) }
                } else if loading {
                    ShieldGroup { ShieldLoadingView(title: "Getting your quiet hours…") }
                }
                if loaded || (model.isDemo && !usesFixture) {
                    ShieldGroup {
                        Toggle("Quiet hours", isOn: $hours.enabled)
                        if hours.enabled {
                            Picker("From", selection: $hours.start) {
                                ForEach(0..<24, id: \.self) { Text(label($0)).tag($0) }
                            }
                            Picker("Until", selection: $hours.end) {
                                ForEach(0..<24, id: \.self) { Text(label($0)).tag($0) }
                            }
                        }
                    }.disabled(working || (model.isDemo && !usesFixture) || !loaded)
                    ShieldGroup {
                        Text("Calls that reach Shield go to voicemail during these hours.")
                        Text("Times are Central time.").foregroundStyle(ShieldTheme.secondaryText)
                        if changed { Text("Save below to use these hours.").foregroundStyle(ShieldTheme.secondaryText) }
                    }
                }
                if let saveError {
                    ShieldGroup {
                        ShieldNotice(title: "Hours not confirmed", detail: saveError, symbol: "exclamationmark.circle")
                            .id("quiet-save-error").accessibilityFocused($errorFocused)
                    }
                }
            }
            .shieldListStyle()
            .safeAreaInset(edge: .bottom) {
                if loaded && (!model.isDemo || usesFixture) {
                    Button { Task { await save() } } label: {
                        ShieldActionLabel(title: working ? "Saving…" : changed ? "Save quiet hours" : "Saved", isWorking: working)
                    }
                    .shieldPrimaryButton().disabled(working || !changed)
                    .padding(ShieldTheme.Spacing.content).background(ShieldTheme.surface)
                }
            }
            .navigationTitle("Quiet hours")
            .navigationBarTitleDisplayMode(.inline)
            .onChange(of: hours) { _, _ in saveError = nil }
            .onChange(of: errorRevision) { _, _ in
                guard saveError != nil else { return }
                proxy.scrollTo("quiet-save-error", anchor: .top)
                errorFocused = true
            }
            .task { await load() }
        }
    }
    private func label(_ hour: Int) -> String { "\(hour % 12 == 0 ? 12 : hour % 12) \(hour < 12 ? "AM" : "PM")" }
    private func load() async {
        loading = true
        loadError = nil
        defer { loading = false }
        if let failure = PreviewScenario.loadFailure("quiet", attempt: loadAttempts, preview: model.isPreview) {
            loadAttempts += 1
            loadError = failure
            return
        }
        if usesFixture {
            savedHours = hours
            loaded = true
            return
        }
        guard !model.isDemo, let id = model.selectedPersonID else { return }
        do {
            let status: ForwardingStatus = try await model.api.send("/api/forwarding", participantID: id)
            if let value = status.quietHours { hours = value }
            savedHours = hours
            loaded = true
        } catch is CancellationError { return }
        catch { loadError = error.localizedDescription; model.handleSessionFailure(error) }
    }
    private func save() async {
        guard let id = model.selectedPersonID, loaded, !working else { return }
        working = true
        saveError = nil
        defer { working = false }
        do {
            if model.isPreview { throw APIError.invalidResponse }
            let _: APIResponses.Empty = try await model.api.send("/api/forwarding/quiet-hours", method: "POST",
                body: APIClient.payload(["enabled": hours.enabled, "start": hours.start, "end": hours.end]), participantID: id)
            savedHours = hours
        } catch {
            saveError = error.localizedDescription
            errorRevision += 1
            model.handleSessionFailure(error)
        }
    }
}
