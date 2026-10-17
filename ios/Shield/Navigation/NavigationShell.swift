import SwiftUI

struct NavigationShell<Content: View>: View {
    @Environment(AppState.self) private var model
    @ViewBuilder let content: Content
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            content
                .environment(\.shieldNavigationRoot, true)
                .navigationDestination(for: CallRecord.self) { CallDetailView(initialCall: $0) }
                .navigationDestination(for: AppRoute.self) { route in
                    Group {
                    switch route {
                    case .callProtection: CallProtectionView()
                    case .quietHours: QuietHoursView()
                    case .messageAlerts: MessageAlertsView()
                    case .automaticTexts: MessageFilterSetupView()
                    case .deleteAccount: DeleteAccountView()
                    case .forwardingSetup: ForwardingSetupView()
                    case .disconnect(let id): DisconnectView(participantID: id)
                    case .settings: SettingsView()
                    case .phoneOptions: PhoneOptionsView()
                    case .savedNumbers: SavedNumbersView(kind: .destinations)
                    case .trustedNumbers: SharedContactsView()
                    case .sharing: SharingView()
                    case .trustedContacts: TrustedContactsView()
                    case .contactAlerts: ContactAlertsView()
                    case .help: HelpView()
                    case .blockedNumbers: BlockedNumbersView()
                    case .people: PeopleView()
                    case .check: CheckView()
                    }
                    }.id(model.selectedPersonID).environment(\.shieldNavigationRoot, false)
                }
        }
        .background(ShieldTheme.surface.ignoresSafeArea())
    }
}

extension EnvironmentValues {
    @Entry var shieldNavigationRoot = true
}
