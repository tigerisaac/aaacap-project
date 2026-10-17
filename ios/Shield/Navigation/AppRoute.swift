import Foundation

enum AppRoute: Hashable {
    case callProtection, quietHours, messageAlerts, automaticTexts, deleteAccount, forwardingSetup
    case disconnect(UUID)
    case settings, setup, savedNumbers, trustedNumbers, sharing, help, blockedNumbers, people, check, trustedContacts, contactAlerts
}
