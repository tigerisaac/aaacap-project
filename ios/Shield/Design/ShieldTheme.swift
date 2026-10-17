import SwiftUI

/// Dynamic Type, semantic system colors and shared spacing for Shield's custom views.
/// Native controls retain their own metrics.
enum ShieldTheme {
    /// Shared steps of a 4-point grid.
    enum Spacing {
        /// Between a label and the line that belongs to it.
        static let tight: CGFloat = 4
        static let compact: CGFloat = 8
        static let regular: CGFloat = 12
        static let content: CGFloat = 16
        static let card: CGFloat = 20
        static let page: CGFloat = 24
        static let section: CGFloat = 32
    }
    enum Layout {
        /// Comfortable targets for rows, fields and in-page controls.
        static let minimumTarget: CGFloat = 52
        /// Apple's minimum hit target for secondary controls.
        static let systemTarget: CGFloat = 44
        /// Settings-style symbol tile and continuous corner.
        static let symbolTile: CGFloat = 30
        static let symbolTileRadius: CGFloat = 7
        /// Bring symbol rows closer to the density of Settings while keeping the target above.
        static let rowInsetCorrection: CGFloat = 15 - 11
        /// Between a row's leading symbol and its text.
        static let rowSymbolSpacing: CGFloat = 12
        /// Avatar-style leading symbol for call and message rows, as in Phone and Messages.
        static let avatar: CGFloat = 40
        /// Standalone containers outside a List match the iOS 26 grouped-list corner; anything
        /// nested inside derives its corner concentrically from this one.
        static let cardRadius: CGFloat = 26
        /// Concentric with a card: its corner less the card's 16-point inset.
        static let innerRadius: CGFloat = cardRadius - Spacing.content
        /// The app icon as it appears on a contact card preview.
        static let contactIcon: CGFloat = 56
        /// App-icon corner radius as a fraction of the icon's width (continuous corners).
        static let iconCornerRatio: CGFloat = 0.2237
        static let readableWidth: CGFloat = 560
    }
    /// Dynamic Type text styles only; SF Pro supplies its own optical tracking.
    enum Typography {
        static let display = Font.largeTitle.bold()
        static let title = Font.title.bold()
        static let section = Font.title3.weight(.semibold)
    }

    /// Tinted fills behind a colored symbol, like the circles in Phone and Contacts.
    static let tintFillOpacity = 0.14

    static let secondaryText = Color("SecondaryText")
    static let action = Color("Action")
    /// Fill for prominent buttons; a step deeper than the tint in Dark Mode so white labels keep 4.5:1.
    static let actionFill = Color("ActionFill")
    // Native Paste draws a white label, so its fill stays deep in both appearances.
    static let pasteFill = Color("ActionFill")
    static let held = Color("Held")
    static let connected = Color("Connected")
    static let message = Color("Message")
    static let surface = Color(uiColor: .systemGroupedBackground)
    static let card = Color(uiColor: .secondarySystemGroupedBackground)
    /// Welcome and onboarding pages sit on the plain system background, as Apple's welcome screens do,
    /// with gray grouped elements on top.
    static let welcomePage = Color(uiColor: .systemBackground)
    static let welcomeElement = Color(uiColor: .secondarySystemBackground)
    static let ink = Color(uiColor: .label)
    static let quietSurface = Color(uiColor: .tertiarySystemFill)
    static let fieldBorder = Color("FieldBorder")
    static let actionInk = Color.white

    static func color(for outcome: CallOutcome) -> Color {
        switch outcome {
        case .held, .verification: held
        case .connected: connected
        case .voicemail: message
        case .missed: Color(uiColor: .systemGray)
        case .screening, .offered: action
        }
    }
}
