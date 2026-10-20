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
        /// A large capsule button adds 15 points above and below its label; a 22-point label
        /// (the Headline line height) makes a one-line button exactly `minimumTarget`.
        static let capsuleLabelHeight: CGFloat = minimumTarget - 2 * 15
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
    /// Shield's voice is New York, Apple's serif, used the way Books and News use it: it names
    /// a place (a screen's title, a welcome heading, the wordmark) and sets the one figure Home
    /// leads with. Everything a person reads or taps stays SF Pro. Each serif style keeps the
    /// size and weight of the SF style it stands in for, so hierarchy is unchanged.
    enum Typography {
        static let display = Font.system(.largeTitle, design: .serif).bold()
        static let title = Font.system(.title, design: .serif).bold()
        /// Section headings stay SF, as native list headers are.
        static let section = Font.title3.weight(.semibold)

        /// Large navigation titles in New York. Only the font changes; the bar keeps its
        /// iOS 26 material, scroll-edge effect and inline SF title.
        @MainActor static func configureNavigation() {
            let base = UIFontDescriptor.preferredFontDescriptor(withTextStyle: .largeTitle)
            let serif = base.withDesign(.serif)?.withSymbolicTraits(.traitBold) ?? base
            UINavigationBar.appearance().largeTitleTextAttributes = [.font: UIFont(descriptor: serif, size: 0)]
        }
    }

    /// Tinted fills behind a colored symbol, like the circles in Phone and Contacts.
    static let tintFillOpacity = 0.14

    static let secondaryText = Color("SecondaryText")
    static let action = Color("Action")
    /// Shield navy. Filled buttons use it in Light; Dark lifts it one step so a white label keeps
    /// 5.6:1 and the button still reads against black.
    static let actionFill = Color("ActionFill")
    /// The one brand surface (Home's Calls stopped panel): navy in both appearances.
    static let brandPanel = Color("BrandPanel")
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
