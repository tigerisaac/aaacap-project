import SwiftUI

struct ProtectionOnboardingView: View {
    @Environment(AppState.self) private var model
    /// nil when the connected-call protection choice is already recorded.
    let monitoring: ForwardingStatus.Monitoring?
    var asksHelperAlerts = false
    let participantID: UUID
    @State private var enabled = true
    @State private var alertHelpers = true
    /// With both questions, one per screen: protection first, then helpers.
    @State private var onHelperStep = false
    private var showsProtection: Bool { monitoring != nil && !onHelperStep }
    private var showsHelpers: Bool { asksHelperAlerts && (monitoring == nil || onHelperStep) }
    @State private var working = false
    @State private var error: String?
    @State private var showingSaveError = false
    @AccessibilityFocusState private var headingFocused: Bool

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    if monitoring != nil && asksHelperAlerts {
                        FlowProgress(title: "Your choices", current: onHelperStep ? 2 : 1, total: 2)
                    }
                    Text(showsProtection ? "Help while you talk" : "Let a helper know")
                        .font(.title.bold()).accessibilityAddTraits(.isHeader)
                        .id("choice-heading").accessibilityFocused($headingFocused)
                    if showsProtection {
                        CallProtectionExplanation()
                        Toggle("Check calls while I talk", isOn: $enabled)
                            .font(.headline).frame(minHeight: ShieldTheme.Layout.minimumTarget)
                            .padding(ShieldTheme.Spacing.content)
                            .background(ShieldTheme.card, in: .rect(cornerRadius: 14))
                            .accessibilityIdentifier("onboarding-protection-toggle").disabled(working)
                    }
                    if showsHelpers {
                        Text("People you invite can get an alert when Shield stops a scam call or call checks are paused.")
                        Toggle("Let my helpers know", isOn: $alertHelpers)
                            .font(.headline).frame(minHeight: ShieldTheme.Layout.minimumTarget)
                            .padding(ShieldTheme.Spacing.content)
                            .background(ShieldTheme.card, in: .rect(cornerRadius: 14))
                            .accessibilityIdentifier("onboarding-helper-alerts-toggle").disabled(working)
                        DisclosureGroup("What does the alert say?") {
                            Text("It includes your name, but no caller’s words or number. Helpers can also be told when a blocked caller tries again.")
                                .foregroundStyle(ShieldTheme.secondaryText)
                        }
                    }
                }
                .id("choice-top")
                .padding(ShieldTheme.Spacing.page)
                .frame(maxWidth: ShieldTheme.Layout.readableWidth, alignment: .leading).frame(maxWidth: .infinity)
            }
            .id(onHelperStep)
            .onChange(of: onHelperStep) { _, _ in
                proxy.scrollTo("choice-top", anchor: .top)
                headingFocused = true
            }
            }
            .background(ShieldTheme.surface)
            .safeAreaInset(edge: .bottom) {
                Button { if showsProtection && asksHelperAlerts { onHelperStep = true } else { Task { await save() } } } label: {
                    ShieldActionLabel(title: working ? "Saving…" : showsProtection && asksHelperAlerts ? "Next" : "Save my choice", isWorking: working)
                }
                .shieldPrimaryButton().disabled(working).accessibilityIdentifier("onboarding-protection-continue")
                .padding(20).background(ShieldTheme.surface)
            }
            .navigationTitle("Your choices").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if onHelperStep { ToolbarItem(placement: .topBarLeading) { Button("Back") { onHelperStep = false }.disabled(working) } }
            }
            .alert("Couldn’t save your choice", isPresented: $showingSaveError) {
                Button("Try again") { Task { await save() } }
                Button("Cancel", role: .cancel) {}
            } message: { Text(error ?? "Please try again.") }
        }
    }

    private func save() async {
        working = true
        error = nil
        defer { working = false }
        do {
            try await model.completeProtectionOnboarding(enabled: monitoring == nil ? nil : enabled, helperAlerts: asksHelperAlerts ? alertHelpers : nil,
                participantID: participantID, version: monitoring?.consentVersion)
        } catch { self.error = error.localizedDescription; showingSaveError = true }
    }
}
