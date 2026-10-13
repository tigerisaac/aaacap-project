import SwiftUI

struct JoinView: View {
    @Environment(AppState.self) private var model
    @State private var joining = false
    @State private var confirmSignOut = false

    var body: some View {
        NavigationStack {
            List {
                if model.isLoading {
                    Section { ShieldLoadingView(title: "Getting your calls…") }
                } else if let error = model.contextError {
                    Section {
                        ShieldNotice(title: "Your account couldn’t load", detail: error, symbol: "wifi.exclamationmark")
                        Button("Try Again", systemImage: "arrow.clockwise") {
                            Task { await model.refresh() }
                        }.frame(minHeight: ShieldTheme.Layout.minimumTarget)
                    }
                } else {
                    Section {
                        ContentUnavailableView("Welcome to Shield", systemImage: "person.2.circle",
                            description: Text("Ask your helper to set up your phone, or use an invitation someone sent you."))
                    }
                    Section {
                        Button("Use an invitation", systemImage: "envelope.open") { joining = true }
                            .font(.headline).frame(minHeight: ShieldTheme.Layout.minimumTarget)
                        if let email = model.service?.supportEmail, let url = URL(string: "mailto:\(email)") {
                            Link(destination: url) { Label("Ask for setup help", systemImage: "phone.badge.plus") }
                                .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                        }
                    }
                }
                Section {
                    Button("Sign out") { confirmSignOut = true }.frame(minHeight: ShieldTheme.Layout.minimumTarget)
                        .confirmationDialog("Sign out?", isPresented: $confirmSignOut, titleVisibility: .visible) {
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
