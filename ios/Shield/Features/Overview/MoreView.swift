import SwiftUI

struct MoreView: View {
    @Environment(AppState.self) private var model

    var body: some View {
        NavigationShell {
            List {
                Section {
                    NavigationLink(value: AppRoute.check) {
                        ActionRow(title: "Check a text", symbol: "text.magnifyingglass")
                    }
                    NavigationLink(value: AppRoute.people) {
                        ActionRow(title: "Family & friends", symbol: "person.2")
                    }
                    NavigationLink(value: AppRoute.help) {
                        ActionRow(title: "Get help", symbol: "questionmark.circle")
                    }
                }
                Section {
                    NavigationLink(value: AppRoute.settings) {
                        ActionRow(title: "Settings", symbol: "gearshape")
                    }
                }
                if model.isDemo && !model.isTestAccount {
                    Section {
                        Button("Leave sample app") { Task { await model.signOut() } }
                            .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                    }
                }
            }
            .shieldListStyle()
            .navigationTitle("More")
        }
    }
}
