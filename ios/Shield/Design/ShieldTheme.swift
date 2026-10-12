import SwiftUI

enum ShieldTheme {
    // Shared layout values. Text uses semantic SwiftUI fonts so it scales with Dynamic Type.
    enum Spacing {
        static let compact: CGFloat = 8
        static let regular: CGFloat = 12
        static let content: CGFloat = 16
        static let card: CGFloat = 20
        static let page: CGFloat = 24
        static let section: CGFloat = 28
    }
    enum Layout {
        static let minimumTarget: CGFloat = 44
        static let rowHeight: CGFloat = 52
        static let cardRadius: CGFloat = 26
        /// App-icon corner radius as a fraction of the icon's width (continuous corners).
        static let iconCornerRatio: CGFloat = 0.2237
        static let readableWidth: CGFloat = 560
    }
    static let secondaryText = Color(uiColor: UIColor { traits in
        let highContrast = traits.accessibilityContrast == .high
        let white = traits.userInterfaceStyle == .dark ? (highContrast ? 0.86 : 0.76) : (highContrast ? 0.20 : 0.34)
        return UIColor(white: white, alpha: 1)
    })
    static let action = Color("Action")
    // Native Paste draws a white label, so its fill stays deep in both appearances.
    static let pasteFill = Color("PasteFill")
    static let held = Color("Held")
    static let connected = Color("Connected")
    static let message = Color("Message")
    // Matches the system grouped background so Shield sits in the same visual family as Settings and Phone.
    static let surface = Color(uiColor: .systemGroupedBackground)
    static let card = Color(uiColor: .secondarySystemGroupedBackground)
    static let actionInk = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark ? UIColor(red: 0.08, green: 0.12, blue: 0.22, alpha: 1) : .white
    })

    static func color(for outcome: CallOutcome) -> Color {
        switch outcome {
        case .held, .verification: held
        case .connected: connected
        case .voicemail: message
        case .missed: .secondary
        case .screening, .offered: action
        }
    }
}
