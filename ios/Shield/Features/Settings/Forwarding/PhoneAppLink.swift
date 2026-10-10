import UIKit

@MainActor
enum PhoneAppLink {
    static func copyAndOpen(code: String) async -> Bool {
        UIPasteboard.general.setItems([[UIPasteboard.typeAutomatic: code]], options: [
            .localOnly: true, .expirationDate: Date.now.addingTimeInterval(1800)
        ])
        #if DEBUG
        let arguments = ProcessInfo.processInfo.arguments
        if arguments.contains("--uitesting-forwarding") && !arguments.contains("--uitesting-system-phone") {
            return !arguments.contains("--phone-link-fails")
        }
        #endif
        // The installed Shield Open Phone shortcut contains only Apple's Open App action.
        // No phone number, carrier code or clipboard contents are passed to Shortcuts.
        guard let url = URL(string: "shortcuts://run-shortcut?name=Shield%20Open%20Phone") else { return false }
        return await UIApplication.shared.open(url)
    }
}
