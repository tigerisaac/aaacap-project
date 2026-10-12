import SwiftUI
import UIKit
import UserNotifications

struct SettingsView: View {
    @Environment(AppState.self) private var model
    @State private var confirmSignOut = false

    var body: some View {
        List {
            if model.isOwner {
                ShieldSection("Your phone") {
                    NavigationLink(value: AppRoute.setup) { ActionRow(title: "Phone setup", detail: "Connect or disconnect Shield", symbol: "phone") }
                    NavigationLink { CallProtectionView() } label: { ActionRow(title: "Checks while you talk", symbol: "waveform") }
                    NavigationLink(value: AppRoute.blockedNumbers) { ActionRow(title: "Blocked numbers", symbol: "hand.raised") }
                }
                ShieldSection("People you trust") {
                    NavigationLink(value: AppRoute.trustedNumbers) { ActionRow(title: "Your contacts", symbol: "person.crop.square") }
                    NavigationLink(value: AppRoute.savedNumbers) { ActionRow(title: "Numbers you trust", symbol: "phone.badge.checkmark") }
                }
            } else {
                Section { NavigationLink(value: AppRoute.blockedNumbers) { ActionRow(title: "Blocked numbers", symbol: "hand.raised") } }
            }
            Section {
                if model.service?.notificationsAvailable == true, !model.isDemo {
                    Button { Task { await enableNotifications() } } label: { ActionRow(title: "Turn on message alerts", symbol: "bell") }
                }
                NavigationLink { MessageFilterSetupView() } label: { ActionRow(title: "Automatic text checks", symbol: "text.badge.checkmark") }
                if let origin = model.configuration.baseURL { Link("Privacy", destination: origin.appending(path: "privacy")) }
            }
            Section {
                let leavesSample = model.isDemo && !model.isTestAccount
                Button(leavesSample ? "Leave sample app" : "Sign out") { confirmSignOut = true }
                    .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                    .confirmationDialog(leavesSample ? "Leave the sample app?" : "Sign out?", isPresented: $confirmSignOut, titleVisibility: .visible) {
                        Button(leavesSample ? "Leave sample app" : "Sign out") { Task { await model.signOut() } }
                    } message: {
                        if !model.isDemo { Text("Your phone may still send calls to Shield. Use Phone setup to disconnect it.") }
                    }
            }
        }
        .shieldListStyle()
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
