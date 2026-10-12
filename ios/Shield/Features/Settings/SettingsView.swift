import SwiftUI
import UIKit
import UserNotifications

struct SettingsView: View {
    @Environment(AppState.self) private var model
    @State private var confirmSignOut = false

    var body: some View {
        List {
            Section {
                HStack(spacing: 16) {
                    Image(systemName: "person.crop.circle.fill").font(.largeTitle).foregroundStyle(ShieldTheme.action).accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(model.person?.name ?? "Your account").font(.title2.bold())
                        Text(model.isOwner ? "Your account" : "Shared access")
                            .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                    }.fixedSize(horizontal: false, vertical: true)
                }.padding(.vertical, 12)
            }
            if model.isOwner {
                ShieldSection("Your phone") {
                    NavigationLink(value: AppRoute.setup) { ActionRow(title: "Phone setup", detail: "Connect, check, or restore your phone", symbol: "phone.circle") }
                    NavigationLink(value: AppRoute.trustedNumbers) { ActionRow(title: "Shared contacts", detail: "Manage numbers synced from iPhone Contacts", symbol: "person.crop.square") }
                    NavigationLink(value: AppRoute.savedNumbers) { ActionRow(title: "Trusted callback numbers", detail: "For independent checks", symbol: "building.2.crop.circle") }
                    NavigationLink(value: AppRoute.sharing) { ActionRow(title: "Sharing", symbol: "person.2") }
                    NavigationLink { CallProtectionView() } label: { ActionRow(title: "Connected-call protection", symbol: "waveform.badge.magnifyingglass") }
                }
            }
            Section {
                NavigationLink(value: AppRoute.blockedNumbers) { ActionRow(title: "Blocked numbers", symbol: "hand.raised") }
            } footer: {
                Text("Numbers Shield stopped a scam from. Their calls end without screening.").foregroundStyle(ShieldTheme.secondaryText)
            }
            Section {
                if model.service?.notificationsAvailable == true, !model.isDemo {
                    Button { Task { await enableNotifications() } } label: {
                        ActionRow(title: "Notifications", detail: "Call alerts", symbol: "bell.badge")
                    }
                } else {
                    ActionRow(title: "Notifications", detail: "Unavailable", symbol: "bell.slash", color: .secondary)
                }
                if model.isOwner { HelperAlertsToggle() }
                NavigationLink { MessageFilterSetupView() } label: {
                    ActionRow(title: "Message filtering", symbol: "line.3.horizontal.decrease.circle")
                }
            } header: { Text("Messages and alerts").foregroundStyle(ShieldTheme.secondaryText) } footer: {
                Text(model.isOwner
                     ? "Notifications contain no caller or message details. With Alert my helpers on, people you share with are told when Shield ends a call, blocks a caller who tries again, or is paused."
                     : "Notifications contain no caller or message details.")
                    .foregroundStyle(ShieldTheme.secondaryText)
            }
            ShieldSection("About Shield") {
                NavigationLink(value: AppRoute.help) { Label("Help & recovery", systemImage: "lifepreserver") }
                if let origin = model.configuration.baseURL {
                    Link("Privacy", destination: origin.appending(path: "privacy"))
                    Link("How the service works", destination: origin.appending(path: "service-info"))
                }
                Text("Screened calls are not verified identities.")
                    .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
            }
            Section {
                // The simulator test account behaves like a real account here.
                let leavesDemo = model.isDemo && !model.isTestAccount
                Button(leavesDemo ? "Leave demo" : "Sign out", role: .destructive) { confirmSignOut = true }
                    .confirmationDialog(leavesDemo ? "Leave the demo?" : "Sign out of Shield?", isPresented: $confirmSignOut, titleVisibility: .visible) {
                        Button(leavesDemo ? "Leave demo" : "Sign out", role: .destructive) { Task { await model.signOut() } }
                    } message: {
                        if !leavesDemo { Text("Signing out does not change call forwarding.") }
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
