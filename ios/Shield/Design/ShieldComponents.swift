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
        Section { content } header: { header } footer: { footer }
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
            .padding(.vertical, ShieldTheme.Spacing.compact)
            .background(ShieldTheme.surface.ignoresSafeArea(.container, edges: .vertical))
            .shieldNavigationSurface()
    }

    /// Use SwiftUI's native bar preferences so large titles retain their system layout.
    func shieldNavigationSurface() -> some View {
        toolbarBackground(ShieldTheme.surface, for: .navigationBar)
            .toolbarBackgroundVisibility(.automatic, for: .navigationBar)
    }

    /// A readable, full-size native toolbar action without a translucent button fill.
    func shieldToolbarAction() -> some View {
        buttonStyle(.plain)
            .foregroundStyle(ShieldTheme.action)
            .padding(.horizontal, ShieldTheme.Spacing.compact)
            .fixedSize()
            .frame(minWidth: 52, minHeight: 44)
            .background(ShieldTheme.card, in: .capsule)
            .contentShape(.rect)
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
        font(ShieldTheme.Typography.title)
            .foregroundStyle(ShieldTheme.ink)
            .fixedSize(horizontal: false, vertical: true)
    }

    func shieldSecondaryButton() -> some View {
        buttonStyle(.bordered)
            .controlSize(.large)
            .buttonBorderShape(.capsule)
            .tint(ShieldTheme.action)
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
