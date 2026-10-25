import SwiftUI

/// Caretaker alerts, deletion and sign-out for accounts that don't yet have the main tabs.
struct AccountActionsGroup: View {
    @Environment(AppState.self) private var model
    var showsAccess = true
    @State private var confirmSignOut = false

    var body: some View {
        ShieldGroup {
            NavigationLink { ContactAlertsView() } label: {
                ActionRow(title: "Alerts for others", symbol: "bell")
            }
        } footer: { Text("Someone added you as a caretaker? Review it here.") }
        ShieldGroup {
            if showsAccess && model.subscription.showsAccess {
                NavigationLink { SubscriptionView() } label: {
                    ActionRow(title: "Shield access", symbol: "checkmark.shield")
                }
            }
            NavigationLink { DeleteAccountView() } label: {
                ActionRow(title: "Delete account", symbol: "person.badge.minus")
            }
            Button { confirmSignOut = true } label: { ActionRow(title: "Sign out", symbol: "rectangle.portrait.and.arrow.right") }
                .alert("Sign out?", isPresented: $confirmSignOut) {
                    Button("Sign out") { Task { await model.signOut() } }
                    Button("Cancel", role: .cancel) {}
                }
        }
    }
}
