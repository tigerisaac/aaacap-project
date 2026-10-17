import SwiftUI

/// A native Section with an adaptive surface. Grouping, separators and accessibility
/// remain owned by List/Form; the wrapper only supplies Shield's background color.
struct ShieldGroup<Content: View, Header: View, Footer: View>: View {
    private let content: Content
    private let header: Header
    private let footer: Footer
    private let background: Color

    init(background: Color = ShieldTheme.card, @ViewBuilder content: () -> Content, @ViewBuilder header: () -> Header, @ViewBuilder footer: () -> Footer) {
        self.background = background
        self.content = content(); self.header = header(); self.footer = footer()
    }

    init(background: Color = ShieldTheme.card, @ViewBuilder content: () -> Content) where Header == EmptyView, Footer == EmptyView {
        self.background = background
        self.content = content(); header = EmptyView(); footer = EmptyView()
    }

    init(background: Color = ShieldTheme.card, @ViewBuilder content: () -> Content, @ViewBuilder header: () -> Header) where Footer == EmptyView {
        self.background = background
        self.content = content(); self.header = header(); footer = EmptyView()
    }

    init(background: Color = ShieldTheme.card, @ViewBuilder content: () -> Content, @ViewBuilder footer: () -> Footer) where Header == EmptyView {
        self.background = background
        self.content = content(); header = EmptyView(); self.footer = footer()
    }

    var body: some View {
        // Native section metrics with an adaptive, higher-contrast supporting color.
        Section { content } header: { header } footer: { footer.foregroundStyle(ShieldTheme.secondaryText) }
            .headerProminence(.increased)
            .listRowBackground(background)
    }
}

extension View {
    /// Inset groups with native backgrounds, separators, spacing and scroll edges.
    func shieldListStyle() -> some View {
        listStyle(.insetGrouped)
            .environment(\.defaultMinListRowHeight, ShieldTheme.Layout.systemTarget)
    }

    /// Native button behavior and disabled feedback; labels remain free to wrap.
    func shieldPrimaryButton() -> some View {
        buttonStyle(.borderedProminent)
            .controlSize(.large)
            .buttonBorderShape(.capsule)
            .tint(ShieldTheme.actionFill)
    }

    /// A standalone grouped container, shaped like an inset-grouped section.
    func shieldCard() -> some View {
        padding(ShieldTheme.Spacing.content)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(ShieldTheme.card, in: .rect(cornerRadius: ShieldTheme.Layout.cardRadius))
            .containerShape(.rect(cornerRadius: ShieldTheme.Layout.cardRadius))
    }

    /// A standalone text field, shaped like an inset-grouped row. The 26-point corner clamps
    /// to a capsule on a single line, as with the iOS 26 search field.
    func shieldField(focused: Bool = false, increasedContrast: Bool = false, fill: Color = ShieldTheme.card) -> some View {
        modifier(ShieldFieldSurface(focused: focused, increasedContrast: increasedContrast, fill: fill))
    }

    /// A bottom action tray: scene margins, one grid step above and below, and a backdrop that
    /// fades content out beneath the buttons, like the iOS 26 soft scroll edge.
    func shieldBottomTray(over page: Color = ShieldTheme.surface) -> some View {
        scenePadding(.horizontal)
            .padding(.vertical, ShieldTheme.Spacing.compact)
            .shieldTrayBackdrop(over: page)
    }

    /// The tray's fading backdrop alone, for trays that supply their own margins.
    func shieldTrayBackdrop(over page: Color = ShieldTheme.surface) -> some View {
        background {
            page
                .mask(LinearGradient(stops: [.init(color: .clear, location: 0), .init(color: .black, location: 0.4)],
                                     startPoint: .top, endPoint: .bottom))
                .padding(.top, -ShieldTheme.Spacing.content)
                .ignoresSafeArea(edges: .bottom)
                .allowsHitTesting(false)
        }
    }

    /// Welcome pages give their text and actions extra space inside the scene margins.
    func shieldWelcomeMargins() -> some View {
        scenePadding(.horizontal)
            .padding(.horizontal, ShieldTheme.Spacing.card)
    }

    /// A full-page scroll layout: system scene margins at the sides, grid steps above and below.
    func shieldPageMargins() -> some View {
        scenePadding(.horizontal)
            .padding(.vertical, ShieldTheme.Spacing.card)
    }

    func shieldPageHeading() -> some View {
        shieldHeading(.title)
            .foregroundStyle(ShieldTheme.ink)
            .fixedSize(horizontal: false, vertical: true)
    }

    /// Tab roots use native collapsing titles; pushed pages use native inline titles.
    func shieldLargeTitle(_ title: String) -> some View {
        modifier(ShieldNavigationTitle(title: title))
    }

    /// System heading type, scaled with Dynamic Type.
    func shieldHeading(_ level: ShieldHeadingLevel) -> some View {
        font(level.font)
    }

    func shieldSecondaryButton() -> some View {
        buttonStyle(.bordered)
            .labelStyle(ShieldWrappingLabelStyle())
            .controlSize(.large)
            .buttonBorderShape(.capsule)
            .tint(ShieldTheme.action)
    }

    /// For icon-and-title action labels that can wrap: see `ShieldWrappingLabelStyle`.
    func shieldWrappingLabel() -> some View {
        labelStyle(ShieldWrappingLabelStyle())
    }
}

/// Wrapped lines keep the title's left edge instead of starting under the icon. At accessibility
/// sizes the decorative icon gives its width to the words, as rows already do.
struct ShieldWrappingLabelStyle: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        WrappingLabel(configuration: configuration)
    }

    private struct WrappingLabel: View {
        @Environment(\.dynamicTypeSize) private var typeSize
        let configuration: LabelStyleConfiguration

        var body: some View {
            if typeSize.isAccessibilitySize {
                configuration.title.fixedSize(horizontal: false, vertical: true)
            } else {
                HStack(alignment: .firstTextBaseline, spacing: ShieldTheme.Spacing.compact) {
                    configuration.icon
                    configuration.title.fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }
}

private struct ShieldFieldSurface: ViewModifier {
    @Environment(\.colorSchemeContrast) private var contrast
    let focused: Bool
    let increasedContrast: Bool
    let fill: Color

    func body(content: Content) -> some View {
        content
            .padding(.horizontal, ShieldTheme.Spacing.content)
            .padding(.vertical, ShieldTheme.Spacing.regular)
            .frame(minHeight: ShieldTheme.Layout.minimumTarget)
            .background(fill, in: .rect(cornerRadius: ShieldTheme.Layout.cardRadius))
            .overlay {
                RoundedRectangle(cornerRadius: ShieldTheme.Layout.cardRadius, style: .continuous)
                    .strokeBorder(focused ? ShieldTheme.action : ShieldTheme.fieldBorder, lineWidth: focused || increasedContrast || contrast == .increased ? 2 : 1)
            }
    }
}

enum ShieldHeadingLevel {
    /// The first screen's headline, as on Apple's welcome screens.
    case hero
    case display, title, section

    var font: Font {
        switch self {
        case .hero, .display: ShieldTheme.Typography.display
        case .title: ShieldTheme.Typography.title
        case .section: ShieldTheme.Typography.section
        }
    }
}

/// A heading on the page ground above grouped content, aligned with the text inside the groups.
struct ShieldPageHeader<Content: View>: View {
    private let content: Content
    init(@ViewBuilder content: () -> Content) { self.content = content() }

    var body: some View {
        Section { content }
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
    }
}

/// A disclosure whose wrapped label keeps its left edge. Outside a List the native label
/// centers each wrapped line, which reads as two separate phrases at large text sizes.
struct ShieldDisclosure<Content: View>: View {
    private let title: String
    private let isExpanded: Binding<Bool>?
    private let content: Content
    @State private var expanded = false

    init(_ title: String, isExpanded: Binding<Bool>? = nil, @ViewBuilder content: () -> Content) {
        self.title = title; self.isExpanded = isExpanded; self.content = content()
    }

    var body: some View {
        DisclosureGroup(isExpanded: expansion) { content } label: { label }
            // List cells and long text must resize together; spring interpolation can
            // temporarily draw the expanded text outside its old cell bounds.
            .transaction { transaction in
                transaction.animation = nil
                transaction.disablesAnimations = true
            }
    }

    private var expansion: Binding<Bool> {
        let source = isExpanded ?? $expanded
        return Binding(get: { source.wrappedValue }, set: { value in
            var transaction = Transaction(animation: nil)
            transaction.disablesAnimations = true
            withTransaction(transaction) { source.wrappedValue = value }
        })
    }

    // Stacked disclosures outside a List keep a full touch target each.
    private var label: some View {
        Text(title).multilineTextAlignment(.leading)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget, alignment: .leading)
            .contentShape(.rect)
    }
}

/// Shared label for full-width primary buttons. The Button owns its action and disabled state.
struct ShieldActionLabel: View {
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.dynamicTypeSize) private var typeSize
    let title: String
    var isWorking = false

    var body: some View {
        Group {
            if isWorking && typeSize.isAccessibilitySize {
                VStack(spacing: ShieldTheme.Spacing.regular) { workingIndicator; titleText }
            } else {
                HStack(spacing: ShieldTheme.Spacing.regular) {
                    if isWorking { workingIndicator }
                    titleText
                }
            }
        }
        .font(.headline)
        .foregroundStyle(isEnabled ? ShieldTheme.actionInk : Color.primary)
        // The large control size supplies the height (50 pt, as Apple's Continue buttons measure).
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(title)
        .accessibilityValue(isWorking ? "In progress" : "")
    }

    private var titleText: some View {
        Text(title).fixedSize(horizontal: false, vertical: true).multilineTextAlignment(.center)
    }

    private var workingIndicator: some View {
        ProgressView().controlSize(.regular)
            .tint(isEnabled ? ShieldTheme.actionInk : Color.primary)
    }
}

/// Used for routine feedback near the affected content, not critical confirmations.
struct ShieldNotice: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    let title: String
    let detail: String
    var symbol = "info.circle"

    var body: some View {
        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) {
            if typeSize.isAccessibilitySize {
                Text(title).font(.headline)
            } else {
                Label(title, systemImage: symbol).font(.headline)
            }
            Text(detail).foregroundStyle(ShieldTheme.secondaryText)
        }
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityElement(children: .combine)
    }
}

struct ShieldLoadingView: View {
    let title: String

    var body: some View {
        VStack(spacing: ShieldTheme.Spacing.content) {
            ProgressView()
            Text(title).font(.body).foregroundStyle(ShieldTheme.secondaryText)
                .multilineTextAlignment(.center)
        }
        .padding(ShieldTheme.Spacing.card)
        .frame(maxWidth: .infinity, minHeight: 180)
        .accessibilityElement(children: .combine)
    }
}
