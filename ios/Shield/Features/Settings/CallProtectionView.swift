import SwiftUI

/// Owner opt-in for checking accepted calls while they happen. Off unless turned on here.
struct CallProtectionView: View {
    @Environment(AppState.self) private var model
    @State private var status: ForwardingStatus?
    @State private var working = false
    @State private var confirmEnable = false
    @State private var loaded = false

    private var monitoring: ForwardingStatus.Monitoring? { status?.monitoring }

    var body: some View {
        Form {
            Section {
                Toggle("Protect connected calls", isOn: Binding(
                    get: { monitoring?.enabled == true },
                    set: { on in
                        if on { confirmEnable = true } else { Task { await save(enabled: false) } }
                    }))
                    .disabled(working || model.isPreview || model.isDemo || monitoring?.available != true)
            } footer: {
                Text(footer)
            }
            Section("How it works") {
                Label("Before your phone rings, the caller hears that an AI assistant will transcribe the call.", systemImage: "speaker.wave.2")
                Label("After you press 1, both sides are transcribed and checked for scam requests.", systemImage: "waveform")
                Label("If the caller asks for a code, a payment, access to your computer, or secrecy, Shield ends the call and tells you why.", systemImage: "phone.down")
                Label("No audio is saved. The transcript is deleted when the call ends.", systemImage: "lock")
            }
            Section {
                Text("Shield can miss a scam, and it can end a call that was not one. If that happens, call the person back on a number you trust.")
                    .font(.subheadline).foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Connected-call protection")
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("Turn on connected-call protection?", isPresented: $confirmEnable, titleVisibility: .visible) {
            Button("Turn on") { Task { await save(enabled: true) } }
        } message: {
            Text("Calls you accept will be transcribed by Telnyx and checked by OpenAI’s AI model while you talk. Callers are told before your phone rings. Shield may end a call it thinks is a scam. You can turn this off at any time.")
        }
        .task { await load() }
    }

    private var footer: String {
        if model.isPreview || model.isDemo { return "Not available in the demo." }
        guard let monitoring else { return loaded ? "Connected-call protection isn’t available for your phone service yet." : "Checking availability…" }
        if !monitoring.available { return "Connected-call protection isn’t available for your phone service yet." }
        return monitoring.enabled ? "On for calls you accept." : "Off. Screening still runs before calls reach you."
    }

    private func load() async {
        guard !model.isPreview, let id = model.selectedPersonID else { return }
        // A service that does not offer protection reads as unavailable here, not as an error.
        do { status = try await model.api.send("/api/forwarding", participantID: id) }
        catch is CancellationError { return } catch { status = nil }
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
        } catch { model.handle(error) }
    }
}
