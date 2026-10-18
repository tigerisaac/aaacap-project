#if DEBUG && targetEnvironment(simulator)
import SwiftUI

struct OnboardingRecoveryCheckView: View {
    @State private var model: AppState?
    @State private var status = "Not checked"

    var body: some View {
        Group {
            if let model, let participantID = model.selectedPersonID {
                VStack(spacing: 0) {
                    Group {
                        if model.protectionOnboarding != nil {
                            ProtectionOnboardingView(monitoring: model.protectionOnboarding, participantID: participantID)
                        } else if model.trustedContactsOnboarding {
                            NavigationStack { TrustedContactOnboardingView(participantID: participantID) }
                        } else {
                            Text("Choice confirmed").accessibilityIdentifier("onboarding-fixture-complete")
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                        }
                    }.environment(model).id(model.sessionGeneration)
                    VStack {
                        Text(status).font(.caption).accessibilityIdentifier("onboarding-fixture-state")
                        Button("Inspect saved choice") { Task { status = await model.api.onboardingRecoveryFixture.status() } }
                        if ProcessInfo.processInfo.arguments.contains("--onboarding-session-race") {
                            Text(model.onboardingFixtureRequestPending ? "Earlier save pending" : "No earlier save")
                                .accessibilityIdentifier("onboarding-client-operation")
                            HStack {
                                Button("Start a new session") { startNewSession(model, participantID: participantID) }
                                Button("Refresh setup choices") { Task { await model.refreshOnboardingFixture() } }
                            }
                            HStack {
                                Button("Release earlier save") { Task { await model.api.onboardingRecoveryFixture.releaseSave() } }
                                Button("Release setup refresh") { Task { await model.api.onboardingRecoveryFixture.releaseRefresh() } }
                            }
                        }
                    }.dynamicTypeSize(.large).padding(8).background(.bar)
                }
            } else { ProgressView() }
        }
        .task {
            let value = AppState(configuration: BackendConfiguration(baseURL: nil))
            value.signedIn = true; value.isPreview = false
            let owner = Person(id: UUID(), name: "Synthetic owner", isOwner: true, canListen: true)
            value.people = [owner]; value.selectedPersonID = owner.id
            value.protectionParticipantID = owner.id
            if ProcessInfo.processInfo.arguments.contains("--onboarding-caretaker") {
                value.trustedContactsOnboarding = true
            } else {
                value.protectionOnboarding = .init(available: true, enabled: false, consentVersion: "ui-test", choiceRecorded: false)
            }
            model = value
        }
    }

    private func startNewSession(_ value: AppState, participantID: UUID) {
        value.exploreDemo() // Advances the real AppState session generation without authentication or network traffic.
        value.isPreview = false; value.isDemo = false
        value.people = [Person(id: participantID, name: "Synthetic owner", isOwner: true, canListen: true)]
        value.selectedPersonID = participantID; value.protectionParticipantID = participantID
        value.trustedContactsOnboarding = false
        value.protectionOnboarding = .init(available: true, enabled: false, consentVersion: "ui-test", choiceRecorded: false)
    }
}
#endif
