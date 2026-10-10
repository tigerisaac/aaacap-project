import SwiftUI

struct NavigationShell<Content: View>: View {
    @ViewBuilder let content: () -> Content

    var body: some View {
        NavigationStack {
            content()
                .navigationDestination(for: CallRecord.self) { CallDetailView(initialCall: $0) }
                .navigationDestination(for: AppRoute.self) { route in
                    switch route {
                    case .settings: SettingsView()
                    case .setup: SetupView()
                    case .savedNumbers: SavedNumbersView(kind: .destinations)
                    case .trustedNumbers: SharedContactsView()
                    case .sharing: SharingView()
                    case .help: HelpView()
                    }
                }
        }
    }
}
