import UIKit
import UserNotifications

@MainActor
final class NotificationDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    var receiveMessages: (@MainActor @Sendable () async -> Bool)?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        if let receiveMessages = await receiveMessages { Task { await receiveMessages() } }
        return [.banner, .sound, .list]
    }

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        let receiveMessages = await receiveMessages
        _ = await receiveMessages?()
    }

    func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any]) async -> UIBackgroundFetchResult {
        guard let receiveMessages else { return .noData }
        // iOS may decline background delivery. Foreground refresh is the reliable retry path.
        let received = await withTaskGroup(of: Bool.self) { group in
            group.addTask { await receiveMessages() }
            group.addTask { try? await Task.sleep(for: .seconds(20)); return false }
            let received = await group.next() ?? false
            group.cancelAll()
            return received
        }
        return received ? .newData : .noData
    }
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        NotificationCenter.default.post(name: .shieldPushToken, object: token)
    }
}

extension Notification.Name {
    static let shieldPushToken = Notification.Name("shieldPushToken")
}
