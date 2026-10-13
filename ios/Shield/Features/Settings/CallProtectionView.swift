import SwiftUI

/// Change the owner’s saved onboarding choice for checking accepted calls while they happen.
struct CallProtectionView: View {
    @Environment(AppState.self) private var model
    @State private var status: ForwardingStatus?
    @State private var working = false
    @State private var confirmEnable = false
    @State private var loaded = false
    @State private var loadFailed = false
    @State private var loadAttempts = 0

    private var monitoring: ForwardingStatus.Monitoring? { status?.monitoring }

    var body: some View {
        Form {
            ShieldGroup {
                if loadFailed {
                    Text("Couldn’t check this setting.")
                    Button("Try again") { Task { await load() } }
                } else if !loaded, !model.isPreview, !model.isDemo {
                    ProgressView("Checking your setting…")
                } else {
                Toggle("Check calls while I talk", isOn: Binding(
                    get: { monitoring?.enabled == true },
                    set: { on in
                        if on { confirmEnable = true } else { Task { await save(enabled: false) } }
                    }))
                    .disabled(working || model.isPreview || model.isDemo || monitoring?.available != true)
                if working { ProgressView("Saving your choice…") }
                }
            } footer: {
                Text(footer).font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
            }
            ShieldGroup { CallProtectionExplanation() }
        }
        .shieldListStyle()
        .navigationTitle("Checks while you talk")
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("Check calls while you talk?", isPresented: $confirmEnable, titleVisibility: .visible) {
            Button("Turn on") { Task { await save(enabled: true) } }
        } message: {
            Text("Shield will read both people’s words and may end a scam call. Checks can be wrong. The caller is told first.")
        }
        .task { await load() }
    }

    private var footer: String {
        if model.isPreview || model.isDemo { return "This setting doesn’t change in the sample app." }
        if loadFailed { return "Your saved choice couldn’t be checked." }
        guard let monitoring else { return loaded ? "This isn’t ready for your phone yet." : "" }
        if !monitoring.available { return "This isn’t ready for your phone yet." }
        return monitoring.enabled ? "On for calls you answer through Shield." : "Off. Shield can still check calls before your phone rings."
    }

    private func load() async {
        loadFailed = false
        if PreviewScenario.loadFailure("protection", attempt: loadAttempts, preview: model.isPreview) != nil {
            loadAttempts += 1
            loadFailed = true
            loaded = true
            return
        }
        guard !model.isPreview, let id = model.selectedPersonID else { return }
        do {
            let response: ForwardingStatus = try await model.api.send("/api/forwarding", participantID: id)
            guard model.selectedPersonID == id else { return }
            status = response
        } catch is CancellationError { return }
        catch {
            guard model.selectedPersonID == id else { return }
            loadFailed = true
            if case let APIError.service(_, code) = error, code == 401 || code == 403 { model.handle(error) }
        }
        loaded = true
    }

    private func save(enabled: Bool) async {
        guard let id = model.selectedPersonID, let monitoring, !working else { return }
        working = true
        defer { working = false }
        do {
            let body = enabled ? ["enabled": true, "version": monitoring.consentVersion] as [String: Any] : ["enabled": false]
            let _: APIResponses.Empty = try await model.api.send("/api/forwarding/monitoring", method: "POST",
                body: APIClient.payload(body), participantID: id)
            await load()
        } catch { await load(); model.handle(error) }
    }
}
