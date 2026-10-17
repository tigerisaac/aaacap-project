import SwiftUI

struct ProtectionOnboardingView: View {
    @Environment(AppState.self) private var model
    @Environment(\.dynamicTypeSize) private var typeSize
    let monitoring: ForwardingStatus.Monitoring?
    let participantID: UUID
    @State private var enabled = false
    @State private var working = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: ShieldTheme.Spacing.section) {
                    ShieldWelcomeHeader(title: "Help while you talk", symbol: "phone.badge.waveform")
                    CallProtectionExplanation(includesConsentDetails: true)
                    Toggle("Check calls while I talk", isOn: $enabled)
                        .font(.headline).padding(.horizontal, ShieldTheme.Spacing.content)
                        .padding(.vertical, ShieldTheme.Spacing.tight)
                        .background(ShieldTheme.welcomeElement, in: .rect(cornerRadius: ShieldTheme.Layout.cardRadius))
                        .accessibilityIdentifier("onboarding-protection-toggle").disabled(working)
                    if let error { ShieldNotice(title: "Couldn’t save your choice", detail: error, symbol: "exclamationmark.circle") }
                    if typeSize.isAccessibilitySize { saveButton }
                }.shieldWelcomeMargins().padding(.vertical, ShieldTheme.Spacing.card)
                    .frame(maxWidth: ShieldTheme.Layout.readableWidth, alignment: .leading).frame(maxWidth: .infinity)
            }
            // At accessibility sizes the tray would cover the page, so the action scrolls inline.
            .safeAreaInset(edge: .bottom) {
                if !typeSize.isAccessibilitySize {
                    saveButton.frame(maxWidth: ShieldTheme.Layout.readableWidth)
                        .padding(.horizontal, ShieldTheme.Spacing.card).shieldBottomTray(over: ShieldTheme.welcomePage)
                }
            }
            .background(ShieldTheme.welcomePage)
                .toolbar(.hidden, for: .navigationBar)
        }
    }
    private var saveButton: some View {
        Button { Task { await save() } } label: {
            ShieldActionLabel(title: working ? "Saving…" : "Save my choice", isWorking: working)
        }.shieldPrimaryButton().disabled(working).accessibilityIdentifier("onboarding-protection-continue")
    }

    private func save() async {
        guard let monitoring else { return }
        working = true; error = nil
        defer { working = false }
        do { try await model.completeProtectionOnboarding(enabled: enabled, participantID: participantID, version: monitoring.consentVersion) }
        catch { self.error = error.localizedDescription }
    }
}
