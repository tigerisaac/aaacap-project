import SwiftUI

struct JoinView: View {
    @Environment(AppState.self) private var model
    @State private var confirmSignOut = false

    var body: some View {
        NavigationStack {
            List {
                if model.isLoading {
                    ShieldGroup { ShieldLoadingView(title: "Getting your calls…") }
                } else if let error = model.contextError {
                    ShieldGroup {
                        ShieldLoadFailure(title: "Your account couldn’t load", detail: error) { Task { await model.refresh() } }
                    }
                } else {
                    ShieldPageHeader {
                        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) {
                            Text("Welcome to Shield").shieldPageHeading().accessibilityAddTraits(.isHeader)
                            Text("Your phone isn’t connected yet. Contact Shield to set it up.")
                                .foregroundStyle(ShieldTheme.secondaryText).fixedSize(horizontal: false, vertical: true)
                        }.padding(.vertical, ShieldTheme.Spacing.compact)
                    }
                    if let email = model.service?.supportEmail, let url = URL(string: "mailto:\(email)") {
                        ShieldGroup {
                            Link(destination: url) { ActionRow(title: "Arrange phone setup", symbol: "phone.badge.plus") }
                        }
                    }
                }
                ShieldGroup {
                    NavigationLink { ContactAlertsView() } label: {
                        ActionRow(title: "Alerts for others", symbol: "bell")
                    }
                } footer: { Text("Someone added you as a caretaker? Review it here.") }
                ShieldGroup {
                    if model.subscription.showsAccess {
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
            .navigationTitle(model.isLoading || model.contextError != nil ? "Your account" : "Get started")
            .navigationBarTitleDisplayMode(.inline)
            .shieldListStyle()
            .contentMargins(.top, 0, for: .scrollContent)
            .refreshable { await model.refresh() }
        }
    }
}
