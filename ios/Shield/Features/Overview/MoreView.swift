import SwiftUI

struct MoreView: View {
    @Environment(AppState.self) private var model

    var body: some View {
        NavigationShell {
            List {
                ShieldGroup {
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
                ShieldGroup {
                    NavigationLink(value: AppRoute.settings) {
                        ActionRow(title: "Settings", symbol: "gearshape")
                    }
                }
                if model.isDemo && !model.isTestAccount {
                    ShieldGroup {
                        Button { Task { await model.signOut() } } label: {
                            ActionRow(title: "Leave sample app", symbol: "rectangle.portrait.and.arrow.right")
                        }
                    }
                }
            }
            .shieldListStyle()
            .shieldLargeTitle("More")
        }
    }
}
