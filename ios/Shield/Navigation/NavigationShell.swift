import SwiftUI

struct NavigationShell<Content: View>: View {
    @Environment(AppState.self) private var model
    @ViewBuilder let content: Content

    var body: some View {
        NavigationStack {
            content
                .navigationDestination(for: CallRecord.self) { CallDetailView(initialCall: $0) }
                .navigationDestination(for: AppRoute.self) { route in
                    Group {
                    switch route {
                    case .settings: SettingsView()
                    case .setup: SetupView()
                    case .savedNumbers: SavedNumbersView(kind: .destinations)
                    case .trustedNumbers: SharedContactsView()
                    case .sharing: SharingView()
                    case .help: HelpView()
                    case .blockedNumbers: BlockedNumbersView()
                    case .people: PeopleView()
                    case .check: CheckView()
                    }
                    }.id(model.selectedPersonID)
                }
        }
    }
}
