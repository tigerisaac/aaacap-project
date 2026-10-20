import SwiftUI
import UIKit
import UserNotifications

struct MessageAlertsView: View {
    @Environment(AppState.self) private var model
    @Environment(\.openURL) private var openURL
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var authorization: UNAuthorizationStatus?
    @State private var loadingVisible = false
    @State private var working = false
    @State private var error: String?

    private var allowed: Bool { authorization == .authorized || authorization == .provisional || authorization == .ephemeral }

    var body: some View {
        List {
            ShieldGroup {
                if authorization == nil {
                    if loadingVisible { ShieldLoadingView(title: "Checking message alerts…") }
                } else {
                    status
                }
            } footer: {
                if authorization != nil { Text("Alerts don’t include a caller’s words or number.") }
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
                    Button {
                        if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                    } label: { ActionRow(title: "Open iPhone settings", symbol: "gearshape") }
                    .disabled(model.isDemo)
                } footer: {
                    if !allowed { Text("Open Notifications, then turn on Allow Notifications.") }
                }
            }
            if let error { ShieldGroup { ShieldNotice(title: "Alerts couldn’t be changed", detail: error, symbol: "exclamationmark.circle") } }
        }
        .deferredLoading(authorization == nil, visible: $loadingVisible)
        .shieldListStyle()
        .navigationTitle("Message alerts").navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .onChange(of: scenePhase) { _, phase in if phase == .active { Task { await load() } } }
    }

    @ViewBuilder private var status: some View {
        let title = authorization == .provisional ? "Quiet alerts are on" : allowed ? "Message alerts are on" : "Message alerts are off"
        let detail = authorization == .provisional ? "They arrive without a sound." : allowed ? "For new messages and phone setup problems." : "Turn them on to hear about new messages."
        HStack(spacing: ShieldTheme.Layout.rowSymbolSpacing) {
            if !typeSize.isAccessibilitySize {
                ShieldRowSymbol(systemName: allowed ? "bell.badge" : "bell.slash", color: allowed ? ShieldTheme.action : ShieldTheme.secondaryText)
            }
            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.tight) {
                Text(title).font(.headline).foregroundStyle(ShieldTheme.ink).accessibilityAddTraits(.isHeader)
                Text(detail).font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
            }.fixedSize(horizontal: false, vertical: true)
        }
        .padding(.vertical, ShieldTheme.Spacing.compact)
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
