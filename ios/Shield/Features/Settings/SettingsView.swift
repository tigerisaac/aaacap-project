import SwiftUI
import UIKit
import UserNotifications

struct SettingsView: View {
    @Environment(AppState.self) private var model
    @State private var confirmSignOut = false

    var body: some View {
        List {
            if model.isOwner {
                Section("Your phone") {
                    NavigationLink(value: AppRoute.setup) { Label("Setup & call offers", systemImage: "phone.circle") }
                    NavigationLink(value: AppRoute.trustedNumbers) { Label("Saved contacts", systemImage: "person.crop.square") }
                    NavigationLink(value: AppRoute.savedNumbers) { Label("Independent numbers", systemImage: "building.2.crop.circle") }
                    NavigationLink(value: AppRoute.sharing) { Label("Sharing", systemImage: "person.2") }
                }
            }
            Section {
                Button("Enable notifications", systemImage: "bell.badge") { Task { await enableNotifications() } }
                    .disabled(model.isDemo || model.service?.notificationsAvailable != true)
                NavigationLink { MessageFilterSetupView() } label: { Label("Message filtering", systemImage: "line.3.horizontal.decrease.circle") }
            } header: { Text("Stay in the loop") } footer: {
                Text("Notifications contain no caller or message details.")
            }
            Section("About Shield") {
                NavigationLink(value: AppRoute.help) { Label("Help & recovery", systemImage: "lifepreserver") }
                if let origin = model.configuration.baseURL {
                    Link("Privacy", destination: origin.appending(path: "privacy"))
                    Link("How the service works", destination: origin.appending(path: "service-info"))
                }
                Text("Screened calls are not verified identities.")
                    .font(.subheadline).foregroundStyle(.secondary)
            }
            Section {
                Button(model.isDemo ? "Leave demo" : "Sign out", role: .destructive) { confirmSignOut = true }
                    .confirmationDialog(model.isDemo ? "Leave the demo?" : "Sign out of Shield?", isPresented: $confirmSignOut, titleVisibility: .visible) {
                        Button(model.isDemo ? "Leave demo" : "Sign out", role: .destructive) { Task { await model.signOut() } }
                    } message: {
                        if !model.isDemo { Text("Signing out does not change call forwarding.") }
                    }
            }
        }
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func enableNotifications() async {
        do {
            let allowed = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
            if allowed { UIApplication.shared.registerForRemoteNotifications() }
        } catch { model.handle(error) }
    }
}
