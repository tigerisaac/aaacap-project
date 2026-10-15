import SwiftUI

struct ProtectionOnboardingView: View {
    @Environment(AppState.self) private var model
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
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
    @AccessibilityFocusState private var focusedChoice: Choice?
    private enum Choice { case protection, helpers }
    private var choice: Choice { showsProtection ? .protection : .helpers }

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: ShieldTheme.Spacing.section) {
                    if monitoring != nil && asksHelperAlerts {
                        FlowProgress(title: "Your choices", current: onHelperStep ? 2 : 1, total: 2)
                    }
                    // Both choices read the same way: heading, explanation, more detail, then the switch.
                    VStack(alignment: .leading, spacing: ShieldTheme.Spacing.card) {
                        Text(showsProtection ? "Help while you talk" : "Let a helper know")
                            .shieldPageHeading().accessibilityAddTraits(.isHeader)
                            .id("choice-heading").accessibilityFocused($focusedChoice, equals: choice)
                            .task(id: choice) { focusedChoice = choice }
                        if showsProtection {
                            CallProtectionExplanation()
                            choiceToggle("Check calls while I talk", isOn: $enabled, identifier: "onboarding-protection-toggle")
                        }
                        if showsHelpers {
                            VStack(alignment: .leading, spacing: 16) {
                                Text("Shield can alert family or friends who help you when it stops a scam call or call checks are paused.")
                                ShieldDisclosure("What does the alert say?") {
                                    Text("It includes your name, but no caller’s words or number. Helpers can also be told when a blocked caller tries again.")
                                        .foregroundStyle(ShieldTheme.secondaryText).padding(.vertical, 8)
                                }
                            }.fixedSize(horizontal: false, vertical: true)
                            choiceToggle("Let my helpers know", isOn: $alertHelpers, identifier: "onboarding-helper-alerts-toggle")
                        }
                        if dynamicTypeSize.isAccessibilitySize {
                            completionButton
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
            }
            }
            .background(ShieldTheme.surface)
            .shieldNavigationSurface()
            .safeAreaInset(edge: .bottom) {
                if !dynamicTypeSize.isAccessibilitySize {
                    completionButton
                        .id(choice)
                        .padding(.horizontal, ShieldTheme.Spacing.page).padding(.vertical, 20)
                        .background(ShieldTheme.surface)
                }
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

    private func choiceToggle(_ title: String, isOn: Binding<Bool>, identifier: String) -> some View {
        Toggle(title, isOn: isOn)
            .font(.headline).frame(minHeight: ShieldTheme.Layout.minimumTarget)
            .padding(ShieldTheme.Spacing.content)
            .background(ShieldTheme.card, in: .rect(cornerRadius: ShieldTheme.Layout.cardRadius))
            .accessibilityIdentifier(identifier).disabled(working)
    }

    private var completionButton: some View {
        Button {
            if showsProtection && asksHelperAlerts { onHelperStep = true }
            else { Task { await save() } }
        } label: {
            ShieldActionLabel(title: working ? "Saving…" : showsProtection && asksHelperAlerts ? "Next" : "Save my choice", isWorking: working)
        }
        .shieldPrimaryButton().disabled(working)
        .accessibilityIdentifier("onboarding-protection-continue")
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
