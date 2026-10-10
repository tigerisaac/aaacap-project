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
        // Open Phone directly, without a user-installed shortcut or a dial request.
        // The carrier code stays only on the local pasteboard; it is never a URL payload.
        // This system-app scheme is best effort: keep the manual paste instructions
        // available if an OS version does not accept it.
        guard let url = URL(string: "mobilephone://") else { return false }
        return await UIApplication.shared.open(url)
    }
}
