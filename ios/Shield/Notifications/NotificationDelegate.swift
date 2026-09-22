import UIKit
import UserNotifications

@MainActor
final class NotificationDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        NotificationCenter.default.post(name: .shieldPushToken, object: token)
    }
}

extension Notification.Name {
    static let shieldPushToken = Notification.Name("shieldPushToken")
}
