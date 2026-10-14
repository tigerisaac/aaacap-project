import SwiftUI

struct JoinView: View {
    @Environment(AppState.self) private var model
    @State private var joining = false
    @State private var confirmSignOut = false

    var body: some View {
        NavigationStack {
            List {
                if model.isLoading {
                    ShieldGroup { ShieldLoadingView(title: "Getting your calls…") }
                } else if let error = model.contextError {
                    ShieldGroup {
                        ShieldNotice(title: "Your account couldn’t load", detail: error, symbol: "wifi.exclamationmark")
                        Button("Try again", systemImage: "arrow.clockwise") {
                            Task { await model.refresh() }
                        }.frame(minHeight: ShieldTheme.Layout.minimumTarget)
                    }
                } else {
                    ShieldGroup {
                        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.content) {
                            Text("Welcome to Shield").shieldPageHeading().accessibilityAddTraits(.isHeader)
                            Text("Ask your helper to set up your phone, or use an invitation someone sent you.")
                                .foregroundStyle(ShieldTheme.secondaryText).fixedSize(horizontal: false, vertical: true)
                        }.padding(.vertical, ShieldTheme.Spacing.regular)
                    }
                    ShieldGroup {
                        Button("Use an invitation", systemImage: "envelope.open") { joining = true }
                            .font(.headline).frame(minHeight: ShieldTheme.Layout.minimumTarget)
                        if let email = model.service?.supportEmail, let url = URL(string: "mailto:\(email)") {
                            Link(destination: url) { Label("Ask for setup help", systemImage: "phone.badge.plus") }
                                .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                        }
                    }
                }
                ShieldGroup {
                    Button("Sign out") { confirmSignOut = true }.frame(minHeight: ShieldTheme.Layout.minimumTarget)
                        .alert("Sign out?", isPresented: $confirmSignOut) {
                            Button("Sign out") { Task { await model.signOut() } }
                            Button("Cancel", role: .cancel) {}
                        }
                }
            }
            .navigationTitle(model.isLoading || model.contextError != nil ? "Your account" : "Get started")
            .shieldListStyle()
            .sheet(isPresented: $joining) { JoinInvitationView() }
            .refreshable { await model.refresh() }
        }
    }
}
