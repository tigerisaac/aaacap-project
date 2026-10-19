import SwiftUI

struct SettingsView: View {
    @Environment(AppState.self) private var model
    @State private var confirmSignOut = false

    var body: some View {
        List {
            if model.isOwner {
                ShieldSection("Call protection") {
                    NavigationLink(value: AppRoute.callProtection) { ActionRow(title: "Checks while you talk", symbol: "waveform") }
                    NavigationLink(value: AppRoute.quietHours) { ActionRow(title: "Quiet hours", symbol: "moon") }
                    NavigationLink(value: AppRoute.blockedNumbers) { ActionRow(title: "Blocked numbers", symbol: "hand.raised") }
                    NavigationLink(value: AppRoute.forwardingSetup) { ActionRow(title: "Phone setup", symbol: "phone") }
                }
                ShieldSection("Contacts & sharing") {
                    NavigationLink(value: AppRoute.trustedNumbers) { ActionRow(title: "Your contacts", symbol: "person.crop.square") }
                    NavigationLink(value: AppRoute.savedNumbers) { ActionRow(title: "Numbers you trust", symbol: "phone.badge.checkmark") }
                    NavigationLink(value: AppRoute.trustedContacts) { ActionRow(title: "Caretakers", detail: "Optional protection alerts", symbol: "person.badge.shield.checkmark") }
                        .accessibilityIdentifier("caretakers-settings")
                    NavigationLink(value: AppRoute.sharing) { ActionRow(title: "Call sharing", detail: "Who can see calls and messages", symbol: "person.2.badge.gearshape") }
                        .accessibilityIdentifier("call-sharing-settings")
                }
            } else {
                ShieldGroup { NavigationLink(value: AppRoute.blockedNumbers) { ActionRow(title: "Blocked numbers", symbol: "hand.raised") } }
            }
            ShieldSection("Alerts & messages") {
                NavigationLink(value: AppRoute.contactAlerts) { ActionRow(title: "Alerts for others", symbol: "bell") }
                if model.service?.notificationsAvailable == true, !model.isDemo {
                    NavigationLink(value: AppRoute.messageAlerts) { ActionRow(title: "Message alerts", symbol: "bell") }
                }
                NavigationLink(value: AppRoute.check) { ActionRow(title: "Check a text", symbol: "text.magnifyingglass") }
            }
            ShieldSection("Account") {
                let leavesSample = model.isDemo && !model.isTestAccount
                if !model.people.contains(where: \.isOwner), !model.isDemo, model.service?.publicEnrollmentSupported == true {
                    NavigationLink(value: AppRoute.publicEnrollment) {
                        ActionRow(title: "Connect my phone", symbol: "phone.badge.plus")
                    }
                }
                if model.subscription.showsAccess {
                    NavigationLink { SubscriptionView() } label: {
                        ActionRow(title: "Shield access", symbol: "checkmark.shield")
                    }
                    .accessibilityIdentifier("subscription-settings")
                }
                if let origin = model.configuration.baseURL {
                    Link(destination: origin.appending(path: "privacy")) { ActionRow(title: "Privacy", symbol: "lock.shield") }
                }
                if model.isOwner, let id = model.selectedPersonID {
                    NavigationLink(value: AppRoute.disconnect(id)) {
                        ActionRow(title: "Disconnect Shield", detail: "Restore ordinary calls", symbol: "arrow.uturn.backward")
                    }
                }
                NavigationLink(value: AppRoute.deleteAccount) {
                    ActionRow(title: "Delete account", symbol: "person.badge.minus")
                }
                Button { confirmSignOut = true } label: {
                    ActionRow(title: leavesSample ? "Leave sample app" : "Sign out", symbol: "rectangle.portrait.and.arrow.right")
                }
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
