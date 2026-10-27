import SwiftUI

struct DemoGuideView: View {
    @Environment(AppState.self) private var model

    var body: some View {
        List {
            ShieldGroup {
                Text("Explore Shield with fictional calls, people and voice messages.")
                Text("No calls are screened, no alerts are sent, and nothing changes your phone settings. Changes last until you leave this demo.")
                    .foregroundStyle(ShieldTheme.secondaryText)
            }
            ShieldSection("Try it") {
                Button("Listen to a saved message") { model.selectedTab = 2 }
                NavigationLink(value: AppRoute.blockedNumbers) { ActionRow(title: "Manage blocked numbers", symbol: "hand.raised") }
                NavigationLink(value: AppRoute.trustedContacts) { ActionRow(title: "Explore caretakers", symbol: "person.badge.shield.checkmark") }
                NavigationLink(value: AppRoute.contactAlerts) { ActionRow(title: "See a caretaker alert", symbol: "bell") }
                NavigationLink(value: AppRoute.callProtection) { ActionRow(title: "Try connected-call protection", symbol: "waveform") }
            }
            ShieldSection("Live service") {
                Text("Live call screening requires a subscription, a supported US carrier and verified phone setup. This demo does not test carrier forwarding or Apple purchases.")
            }
            ShieldGroup {
                Button("Leave demo") { Task { await model.signOut() } }
                    .frame(minHeight: ShieldTheme.Layout.minimumTarget)
            }
        }.shieldListStyle().navigationTitle("About this demo").navigationBarTitleDisplayMode(.inline)
    }
}
