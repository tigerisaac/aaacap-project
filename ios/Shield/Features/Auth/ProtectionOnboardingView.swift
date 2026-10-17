import SwiftUI

struct ProtectionOnboardingView: View {
    @Environment(AppState.self) private var model
    let monitoring: ForwardingStatus.Monitoring?
    let participantID: UUID
    @State private var enabled = false
    @State private var working = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: ShieldTheme.Spacing.section) {
                    Text("Help while you talk").shieldPageHeading().accessibilityAddTraits(.isHeader)
                    CallProtectionExplanation()
                    Toggle("Check calls while I talk", isOn: $enabled)
                        .font(.headline).padding(ShieldTheme.Spacing.content)
                        .background(ShieldTheme.card, in: .rect(cornerRadius: ShieldTheme.Layout.cardRadius))
                        .accessibilityIdentifier("onboarding-protection-toggle").disabled(working)
                    if let error { ShieldNotice(title: "Couldn’t save your choice", detail: error, symbol: "exclamationmark.circle") }
                    Button { Task { await save() } } label: {
                        ShieldActionLabel(title: working ? "Saving…" : "Save my choice", isWorking: working)
                    }.shieldPrimaryButton().disabled(working).accessibilityIdentifier("onboarding-protection-continue")
                }.padding(ShieldTheme.Spacing.page)
                    .frame(maxWidth: ShieldTheme.Layout.readableWidth, alignment: .leading).frame(maxWidth: .infinity)
            }.background(ShieldTheme.surface).shieldNavigationSurface()
                .navigationTitle("Your choices").navigationBarTitleDisplayMode(.inline)
        }
    }
    private func save() async {
        guard let monitoring else { return }
        working = true; error = nil
        defer { working = false }
        do { try await model.completeProtectionOnboarding(enabled: enabled, participantID: participantID, version: monitoring.consentVersion) }
        catch { self.error = error.localizedDescription }
    }
}
