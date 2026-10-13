import SwiftUI
import UIKit
import UserNotifications

struct MessageAlertsView: View {
    @Environment(AppState.self) private var model
    @Environment(\.openURL) private var openURL
    @Environment(\.scenePhase) private var scenePhase
    @State private var authorization: UNAuthorizationStatus?
    @State private var working = false
    @State private var error: String?

    private var allowed: Bool { authorization == .authorized || authorization == .provisional || authorization == .ephemeral }

    var body: some View {
        List {
            ShieldGroup {
                if authorization == nil {
                    ShieldLoadingView(title: "Checking message alerts…")
                } else {
                    Label(authorization == .provisional ? "Quiet alerts are on" : allowed ? "Message alerts are on" : "Message alerts are off", systemImage: allowed ? "bell.badge" : "bell.slash")
                        .font(.headline).accessibilityAddTraits(.isHeader)
                    Text("Shield can tell you about new messages and phone setup problems.")
                    Text("Alerts don’t include a caller’s words or number.").foregroundStyle(ShieldTheme.secondaryText)
                    if authorization == .provisional { Text("Your iPhone delivers these quietly. You can change sounds in Notifications settings.").foregroundStyle(ShieldTheme.secondaryText) }
                }
            }
            if authorization == .notDetermined {
                ShieldGroup {
                    Button { Task { await request() } } label: {
                        ShieldActionLabel(title: working ? "Turning on…" : "Turn on alerts", isWorking: working)
                    }
                    .shieldPrimaryButton().disabled(working || model.isDemo)
                    .listRowInsets(EdgeInsets()).listRowBackground(Color.clear)
                }
            } else if authorization != nil {
                ShieldGroup {
                    Button("Open iPhone settings", systemImage: "gearshape") {
                        if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                    }.frame(minHeight: ShieldTheme.Layout.minimumTarget).disabled(model.isDemo)
                    if !allowed { Text("Open Notifications, then turn on Allow Notifications.").foregroundStyle(ShieldTheme.secondaryText) }
                }
            }
            if let error { ShieldGroup { ShieldNotice(title: "Alerts couldn’t be changed", detail: error, symbol: "exclamationmark.circle") } }
        }
        .shieldListStyle()
        .navigationTitle("Message alerts").navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .onChange(of: scenePhase) { _, phase in if phase == .active { Task { await load() } } }
    }

    private func load() async {
        #if DEBUG && targetEnvironment(simulator)
        if PreviewScenario.requested("alerts-on", preview: model.isPreview) { authorization = .authorized; return }
        if PreviewScenario.requested("alerts-off", preview: model.isPreview) { authorization = .denied; return }
        if PreviewScenario.requested("quiet-alerts", preview: model.isPreview) { authorization = .provisional; return }
        #endif
        authorization = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
    }

    private func request() async {
        guard !model.isPreview, !model.isDemo, !working else { return }
        working = true
        error = nil
        defer { working = false }
        do {
            if try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) {
                UIApplication.shared.registerForRemoteNotifications()
            }
            await load()
        } catch { self.error = error.localizedDescription }
    }
}
