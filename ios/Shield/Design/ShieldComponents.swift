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
        // Footers default to the same supporting size used inside groups, not the smaller native footnote.
        Section { content } header: { header } footer: {
            footer.font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
        }
            .listRowBackground(background)
    }
}

extension View {
    /// Apply to a List, including pushed Settings screens, for one shared grouped surface.
    func shieldListStyle() -> some View {
        listStyle(.insetGrouped)
            .listSectionSpacing(ShieldTheme.Spacing.section)
            .environment(\.defaultMinListRowHeight, ShieldTheme.Layout.rowHeight)
            .scrollContentBackground(.hidden)
            .scrollEdgeEffectHidden(for: .all)
            .background(ShieldTheme.surface)
            .safeAreaPadding(.bottom, ShieldTheme.Spacing.content)
            // Keep the scroll view flush with the navigation bar so native large
            // titles participate in the push/pop transition. Space the content inside it.
            .contentMargins(.vertical, ShieldTheme.Spacing.compact, for: .scrollContent)
            .background(ShieldTheme.surface.ignoresSafeArea(.container, edges: .vertical))
    }

    /// Native button behavior and disabled feedback; labels remain free to wrap.
    func shieldPrimaryButton() -> some View {
        buttonStyle(.borderedProminent)
            .controlSize(.large)
            .buttonBorderShape(.capsule)
            .tint(ShieldTheme.action)
    }

    func shieldCard() -> some View {
        padding(ShieldTheme.Spacing.card)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(ShieldTheme.card, in: .rect(cornerRadius: ShieldTheme.Layout.cardRadius))
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

    /// Serif heading type with slightly tight tracking, scaled with Dynamic Type.
    func shieldHeading(_ level: ShieldHeadingLevel) -> some View {
        modifier(ShieldHeadingType(level: level))
    }

    func shieldSecondaryButton() -> some View {
        buttonStyle(.bordered)
            .labelStyle(ShieldWrappingLabelStyle())
            .controlSize(.large)
            .buttonBorderShape(.capsule)
            .tint(ShieldTheme.action)
    }

    /// The shared text-field surface: Card fill and a visible boundary that turns Action and
    /// thickens while focused, so the person can always see where typing goes.
    func shieldField(focused: Bool) -> some View {
        modifier(ShieldFieldSurface(focused: focused))
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

    func body(content: Content) -> some View {
        content
            .padding(ShieldTheme.Spacing.content)
            .background(ShieldTheme.card, in: .rect(cornerRadius: 14))
            .overlay {
                RoundedRectangle(cornerRadius: 14)
                    .strokeBorder(focused ? ShieldTheme.action : ShieldTheme.fieldBorder, lineWidth: focused || contrast == .increased ? 2 : 1)
            }
    }
}

enum ShieldHeadingLevel {
    /// The first screen's headline only: display, a step larger.
    case hero
    case display, title, section

    var font: Font {
        switch self {
        case .hero: ShieldTheme.Typography.display.scaled(by: 1.2)
        case .display: ShieldTheme.Typography.display
        case .title: ShieldTheme.Typography.title
        case .section: ShieldTheme.Typography.section
        }
    }
    fileprivate var textStyle: Font.TextStyle {
        switch self {
        case .hero, .display: .largeTitle
        case .title: .title
        case .section: .title3
        }
    }
    /// About 2% tighter than the font's own tracking at the default size.
    fileprivate var tracking: CGFloat {
        switch self {
        case .hero: -1.0
        case .display: -0.7
        case .title: -0.5
        case .section: -0.25
        }
    }
}

private struct ShieldHeadingType: ViewModifier {
    let level: ShieldHeadingLevel
    @ScaledMetric private var tracking: CGFloat

    init(level: ShieldHeadingLevel) {
        self.level = level
        _tracking = ScaledMetric(wrappedValue: level.tracking, relativeTo: level.textStyle)
    }

    func body(content: Content) -> some View {
        content.font(level.font).tracking(tracking)
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
        .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget)
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
