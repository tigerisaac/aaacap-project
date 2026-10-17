import SwiftUI

struct SettingsView: View {
    @Environment(AppState.self) private var model
    @State private var confirmSignOut = false

    var body: some View {
        List {
            if model.isOwner {
                ShieldSection("Your phone") {
                    if let id = model.selectedPersonID {
                        NavigationLink { DisconnectView(participantID: id) } label: { ActionRow(title: "Disconnect Shield", symbol: "arrow.uturn.backward") }
                    }
                    NavigationLink(value: AppRoute.setup) { ActionRow(title: "Phone setup", symbol: "phone") }
                    NavigationLink { CallProtectionView() } label: { ActionRow(title: "Checks while you talk", symbol: "waveform") }
                    NavigationLink { QuietHoursView() } label: { ActionRow(title: "Quiet hours", symbol: "moon") }
                    NavigationLink(value: AppRoute.blockedNumbers) { ActionRow(title: "Blocked numbers", symbol: "hand.raised") }
                }
                ShieldSection("People you trust") {
                    NavigationLink(value: AppRoute.trustedNumbers) { ActionRow(title: "Your contacts", symbol: "person.crop.square") }
                    NavigationLink(value: AppRoute.savedNumbers) { ActionRow(title: "Numbers you trust", symbol: "phone.badge.checkmark") }
                }
            } else {
                ShieldGroup { NavigationLink(value: AppRoute.blockedNumbers) { ActionRow(title: "Blocked numbers", symbol: "hand.raised") } }
            }
            ShieldGroup {
                if model.service?.notificationsAvailable == true, !model.isDemo {
                    NavigationLink { MessageAlertsView() } label: { ActionRow(title: "Message alerts", symbol: "bell") }
                }
                NavigationLink { MessageFilterSetupView() } label: { ActionRow(title: "Automatic text checks", symbol: "text.badge.checkmark") }
                if let origin = model.configuration.baseURL {
                    Link(destination: origin.appending(path: "privacy")) { ActionRow(title: "Privacy", symbol: "lock.shield") }
                }
            }
            ShieldGroup {
                let leavesSample = model.isDemo && !model.isTestAccount
                NavigationLink { DeleteAccountView() } label: {
                    ActionRow(title: "Delete account", symbol: "person.crop.circle.badge.minus")
                }
                Button(leavesSample ? "Leave sample app" : "Sign out") { confirmSignOut = true }
                    .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                    .alert(leavesSample ? "Leave the sample app?" : "Sign out?", isPresented: $confirmSignOut) {
                        Button(leavesSample ? "Leave sample app" : "Sign out") { Task { await model.signOut() } }
                        Button("Cancel", role: .cancel) {}
                    } message: {
                        if !model.isDemo { Text("Your phone may still send calls to Shield. Use Phone setup to disconnect it.") }
                    }
            }
        }
        .shieldListStyle()
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
    }

}
