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
        static let minimumTarget: CGFloat = 52
        static let rowHeight: CGFloat = 60
        /// Between a row's symbol tile and its text.
        static let rowSymbolSpacing: CGFloat = 14
        static let cardRadius: CGFloat = 20
        /// App-icon corner radius as a fraction of the icon's width (continuous corners).
        static let iconCornerRatio: CGFloat = 0.2237
        static let readableWidth: CGFloat = 560
    }
    enum Typography {
        static let display = Font.system(.largeTitle, design: .serif)
        static let title = Font.system(.title, design: .serif)
        static let section = Font.system(.title3, design: .serif).weight(.medium)

        /// Style the native large title, keeping UIKit responsible for transitions,
        /// scrolling and Dynamic Type. Inline navigation and controls remain sans.
        /// Keep the background here too: per-page toolbarBackground overrides
        /// replace these title attributes when SwiftUI configures a destination.
        @MainActor static func configureNavigation() {
            let descriptor = UIFontDescriptor.preferredFontDescriptor(withTextStyle: .largeTitle)
            let font = UIFont(descriptor: descriptor.withDesign(.serif) ?? descriptor, size: 0)
            let appearance = UINavigationBarAppearance()
            appearance.configureWithDefaultBackground()
            appearance.backgroundColor = UIColor(named: "Surface")
            appearance.largeTitleTextAttributes = [.font: font, .kern: -0.7]
            let scrollEdge = UINavigationBarAppearance()
            scrollEdge.configureWithTransparentBackground()
            scrollEdge.largeTitleTextAttributes = appearance.largeTitleTextAttributes
            let bar = UINavigationBar.appearance()
            bar.standardAppearance = appearance
            bar.compactAppearance = appearance
            bar.scrollEdgeAppearance = scrollEdge
            bar.compactScrollEdgeAppearance = scrollEdge
        }
    }
    static let secondaryText = Color(uiColor: UIColor { traits in
        let highContrast = traits.accessibilityContrast == .high
        if traits.userInterfaceStyle == .dark {
            return highContrast ? UIColor(red: 0.85, green: 0.90, blue: 0.96, alpha: 1) : UIColor(red: 0.72, green: 0.77, blue: 0.84, alpha: 1)
        }
        return highContrast ? UIColor(red: 0.18, green: 0.23, blue: 0.30, alpha: 1) : UIColor(red: 0.32, green: 0.37, blue: 0.44, alpha: 1)
    })
    static let action = Color("Action")
    // Native Paste draws a white label, so its fill stays deep in both appearances.
    static let pasteFill = Color("PasteFill")
    static let held = Color("Held")
    static let connected = Color("Connected")
    static let message = Color("Message")
    static let surface = Color("Surface")
    static let card = Color("Card")
    static let ink = Color("Ink")
    static let quietSurface = Color("QuietSurface")
    static let fieldBorder = Color("FieldBorder")
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
