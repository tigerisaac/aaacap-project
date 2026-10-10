import SwiftUI

struct ProtectionOnboardingView: View {
    @Environment(AppState.self) private var model
    let monitoring: ForwardingStatus.Monitoring
    let participantID: UUID
    @State private var enabled = true
    @State private var working = false
    @State private var error: String?
    @State private var showingSaveError = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    Text("Protection while you talk").font(.largeTitle.bold())
                        .accessibilityAddTraits(.isHeader)
                    Text("Shield can keep checking for scam requests after you accept a screened call.").font(.title3)
                    Toggle("Protect connected calls", isOn: $enabled)
                        .font(.headline).frame(minHeight: 44)
                        .accessibilityIdentifier("onboarding-protection-toggle").disabled(working)
                    Text("Selected by default. You can turn it off here or change it later in Settings.")
                        .foregroundStyle(.secondary)
                    VStack(alignment: .leading, spacing: 20) {
                        Label("Calls you accept are transcribed by Telnyx and checked by OpenAI while you talk. The caller is told before your phone rings.", systemImage: "waveform")
                        Label("Shield may end a call it detects as a scam and tell you why. It can miss a scam or end an ordinary call.", systemImage: "phone.down")
                        Label("No audio is saved. The transcript is deleted when the call ends.", systemImage: "lock")
                    }
                    Text("Continue to save your choice.").foregroundStyle(.secondary)
                    Link("Privacy details", destination: URL(string: "https://shield-calls-isaac.web.app/privacy")!)
                        .frame(minHeight: 44)

                }
                .padding(28).frame(maxWidth: 560, alignment: .leading).frame(maxWidth: .infinity)
            }
            .background(ShieldTheme.surface)
            .safeAreaInset(edge: .bottom) {
                Button { Task { await save() } } label: {
                    HStack {
                        if working { ProgressView().tint(ShieldTheme.actionInk) }
                        Text("Continue").font(.headline)
                    }
                    .foregroundStyle(ShieldTheme.actionInk).frame(maxWidth: .infinity, minHeight: 38)
                }
                .buttonStyle(.borderedProminent).controlSize(.large)
                .buttonBorderShape(.roundedRectangle(radius: 16))
                .disabled(working).accessibilityIdentifier("onboarding-protection-continue")
                .padding(20).background(ShieldTheme.surface)
            }
            .navigationTitle("Your protection").navigationBarTitleDisplayMode(.inline)
            .alert("Couldn’t save your choice", isPresented: $showingSaveError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(error ?? "Please try again.")
            }
        }
    }

    private func save() async {
        working = true
        error = nil
        defer { working = false }
        do {
            try await model.completeProtectionOnboarding(enabled: enabled, participantID: participantID, version: monitoring.consentVersion)
        } catch { self.error = error.localizedDescription; showingSaveError = true }
    }
}
