import UIKit

@MainActor
enum PhoneAppLink {
    static func copy(code: String) {
        UIPasteboard.general.setItems([[UIPasteboard.typeAutomatic: code]], options: [
            .localOnly: true, .expirationDate: Date.now.addingTimeInterval(1800)
        ])
    }
}
