import SwiftUI

struct JoinView: View {
    @Environment(AppState.self) private var model
    @State private var joining = false

    var body: some View {
        NavigationStack {
            List {
                if model.isLoading {
                    Section { ShieldLoadingView(title: "Loading your account…") }
                } else if let error = model.contextError {
                    Section {
                        ShieldNotice(title: "Your account couldn’t load", detail: error, symbol: "wifi.exclamationmark")
                        Button("Try Again", systemImage: "arrow.clockwise") {
                            Task { await model.refresh() }
                        }.frame(minHeight: 44)
                    }
                } else {
                    Section {
                        ContentUnavailableView("Welcome to Shield", systemImage: "person.2.circle",
                            description: Text("Join someone who shared with you, or ask your pilot support person to set up your phone."))
                    }
                    Section {
                        Button("Join with an invitation", systemImage: "envelope.open") { joining = true }
                            .font(.headline).frame(minHeight: 44)
                        if let email = model.service?.supportEmail, let url = URL(string: "mailto:\(email)") {
                            Link(destination: url) { Label("Arrange phone setup", systemImage: "phone.badge.plus") }
                                .frame(minHeight: 44)
                        }
                    }
                }
                Section {
                    Button("Sign out") { Task { await model.signOut() } }.frame(minHeight: 44)
                }
            }
            .navigationTitle(model.isLoading || model.contextError != nil ? "Your account" : "Get started")
            .shieldListStyle()
            .sheet(isPresented: $joining) { JoinInvitationView() }
            .refreshable { await model.refresh() }
        }
    }
}
