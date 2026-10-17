import SwiftUI
import Combine

@main
struct ShieldApp: App {
    @UIApplicationDelegateAdaptor(NotificationDelegate.self) private var notificationDelegate
    @State private var model = AppState()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .tint(ShieldTheme.action)
                .task {
                    notificationDelegate.receiveMessages = {
                        guard model.signedIn, !model.isPreview else { return false }
                        let before = Set(model.localMessages.map { $0.call.id })
                        // A delivery notification is new evidence; do not reuse a pre-push call list.
                        await model.api.invalidateNavigationCache()
                        await model.syncMessageAudio()
                        return model.localMessages.contains { !before.contains($0.call.id) }
                    }
                    await model.restoreSession()
                }
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active, model.signedIn {
                        Task { await model.refresh() }
                    }
                }
                .onReceive(NotificationCenter.default.publisher(for: .shieldPushToken)) { notification in
                    guard let token = notification.object as? String, !model.isDemo else { return }
                    let participantID = model.selectedPersonID
                    // Debug builds register with Apple's sandbox, release builds with production.
                    let environment = Bundle.main.object(forInfoDictionaryKey: "ShieldAPNSEnvironment") as? String == "development" ? "development" : "production"
                    Task {
                        do {
                            let _: APIResponses.Empty = try await model.api.send("/api/devices", method: "POST",
                                body: APIClient.payload(["token": token, "environment": environment]), participantID: participantID)
                        } catch { model.handle(error) }
                    }
                }
        }
    }
}
