import SwiftUI

struct ProtectionOnboardingView: View {
    @Environment(AppState.self) private var model
    let monitoring: ForwardingStatus.Monitoring?
    let participantID: UUID
    @State private var enabled = false
    @State private var working = false
    @State private var error: String?
    @State private var choiceUnconfirmed = false
    @State private var retryAvailable = false
    @State private var checkingStatus = false
    @State private var feedbackRevision = 0
    @AccessibilityFocusState private var errorFocused: Bool

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: ShieldTheme.Spacing.section) {
                        Text("Help while you talk").shieldPageHeading().accessibilityAddTraits(.isHeader)
                        CallProtectionExplanation(includesConsentDetails: true)
                        Toggle("Check calls while I talk", isOn: $enabled)
                            .font(.headline).padding(ShieldTheme.Spacing.content)
                            .background(ShieldTheme.card, in: .rect(cornerRadius: ShieldTheme.Layout.cardRadius))
                            .accessibilityIdentifier("onboarding-protection-toggle").disabled(working || choiceUnconfirmed)
                        if let error {
                            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.content) {
                                ShieldNotice(title: "Choice not confirmed", detail: error, symbol: "exclamationmark.circle")
                                    .accessibilityIdentifier("onboarding-choice-error").accessibilityFocused($errorFocused)
                                if choiceUnconfirmed {
                                    Button { Task { await checkStatus() } } label: {
                                        Label(checkingStatus ? "Checking…" : "Check current status", systemImage: "arrow.clockwise")
                                            .shieldWrappingLabel().frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget)
                                    }.shieldSecondaryButton().disabled(working)
                                }
                            }.id("onboarding-choice-error")
                        }
                        Button { Task { await save() } } label: {
                            ShieldActionLabel(title: choiceUnconfirmed ? "Try saving again" : "Save my choice", isWorking: working && !checkingStatus)
                        }.shieldPrimaryButton().disabled(working || (choiceUnconfirmed && !retryAvailable) || monitoring == nil)
                            .accessibilityIdentifier("onboarding-protection-continue")
                    }.padding(ShieldTheme.Spacing.page)
                        .frame(maxWidth: ShieldTheme.Layout.readableWidth, alignment: .leading).frame(maxWidth: .infinity)
                }.background(ShieldTheme.surface)
                    .navigationTitle("Your choices").navigationBarTitleDisplayMode(.inline)
                    .onChange(of: feedbackRevision) { _, _ in
                        proxy.scrollTo("onboarding-choice-error", anchor: .top)
                        errorFocused = true
                    }
            }
        }
    }
    private func save() async {
        guard let monitoring, !working, !choiceUnconfirmed || retryAvailable else { return }
        let generation = model.sessionGeneration
        working = true; error = nil; retryAvailable = false
        defer { working = false }
        do { try await model.completeProtectionOnboarding(enabled: enabled, participantID: participantID, version: monitoring.consentVersion) }
        catch is CancellationError { return }
        catch {
            guard generation == model.sessionGeneration, model.selectedPersonID == participantID else { return }
            switch error {
            case APIError.service(_, let status) where (400..<500).contains(status): break
            default: choiceUnconfirmed = true
            }
            showFailure(error)
        }
    }

    private func checkStatus() async {
        guard choiceUnconfirmed, !working else { return }
        let generation = model.sessionGeneration
        working = true; checkingStatus = true; retryAvailable = false
        defer { working = false; checkingStatus = false }
        do {
            if try await model.confirmProtectionOnboarding(enabled: enabled, participantID: participantID) { return }
            guard generation == model.sessionGeneration, model.selectedPersonID == participantID else { return }
            retryAvailable = true
            error = "Your choice isn’t confirmed yet. You can try saving the same choice again."
            feedbackRevision += 1
        } catch is CancellationError { return }
        catch {
            guard generation == model.sessionGeneration, model.selectedPersonID == participantID else { return }
            showFailure(error)
        }
    }

    private func showFailure(_ failure: Error) {
        error = failure is URLError ? "Your connection was interrupted. Check your internet connection, then check the current status." : failure.localizedDescription
        feedbackRevision += 1
        model.handleSessionFailure(failure)
    }
}
