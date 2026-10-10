import SwiftUI

enum ForwardingStyle {
    // Opaque secondary text keeps instructions readable on the Calm surfaces.
    static let secondaryText = Color(uiColor: UIColor { traits in
        UIColor(white: traits.userInterfaceStyle == .dark ? 0.74 : 0.35, alpha: 1)
    })
}
