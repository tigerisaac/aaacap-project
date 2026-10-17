import Foundation

enum AppRoute: Hashable {
    case callProtection, quietHours, messageAlerts, automaticTexts, deleteAccount, forwardingSetup
    case disconnect(UUID)
    case settings, phoneOptions, savedNumbers, trustedNumbers, sharing, help, blockedNumbers, people, check, trustedContacts, contactAlerts
}
