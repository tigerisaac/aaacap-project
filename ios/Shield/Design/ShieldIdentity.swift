import SwiftUI

/// The app icon and name, sized like the icon on Apple's welcome screens.
struct ShieldBrand: View {
    var compact = false
    @ScaledMetric(relativeTo: .largeTitle) private var iconSize = 64.0
    @ScaledMetric(relativeTo: .title2) private var compactIconSize = 32.0

    var body: some View {
        let size = compact ? compactIconSize : iconSize
        HStack(spacing: ShieldTheme.Spacing.regular) {
            Image("ShieldMark").resizable().scaledToFit()
                .frame(width: size, height: size)
                .clipShape(.rect(cornerRadius: size * ShieldTheme.Layout.iconCornerRatio, style: .continuous))
                .accessibilityHidden(true)
            Text("Shield").font(compact ? .title2.bold() : ShieldTheme.Typography.display)
                .foregroundStyle(ShieldTheme.ink)
        }
        .accessibilityElement(children: .combine)
    }
}

/// The top of an iOS 26 welcome screen, as in Health, Messages and Reminders: an icon, then a
/// Title 2 bold heading that runs straight into Title 2 secondary text, all on the leading edge.
struct ShieldWelcomeHeader: View {
    let title: String
    var detail = ""
    /// An SF Symbol in place of the app icon, for later onboarding pages.
    var symbol: String?
    @ScaledMetric(relativeTo: .title2) private var iconSize = 64.0
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        // The icon grows with the text up to half again its size, then holds, so the title stays in view.
        let iconSize = min(self.iconSize, 96)
        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.card) {
            // Decorative, so at accessibility sizes it gives its space to the content, as row symbols do.
            if typeSize.isAccessibilitySize {
                EmptyView()
            } else if let symbol {
                Image(systemName: symbol)
                    .font(.system(size: iconSize * 0.75, weight: .regular))
                    .foregroundStyle(ShieldTheme.action)
                    .frame(height: iconSize)
                    .accessibilityHidden(true)
            } else {
                Image("ShieldMark").resizable().scaledToFit()
                    .frame(width: iconSize, height: iconSize)
                    .clipShape(.rect(cornerRadius: iconSize * ShieldTheme.Layout.iconCornerRatio, style: .continuous))
                    .accessibilityHidden(true)
            }
            VStack(alignment: .leading, spacing: 0) {
                Text(title).font(.title2.bold()).foregroundStyle(ShieldTheme.ink)
                    .accessibilityAddTraits(.isHeader)
                if !detail.isEmpty {
                    Text(detail).font(.title2).foregroundStyle(ShieldTheme.secondaryText)
                }
            }
        }
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, ShieldTheme.Spacing.section)
    }
}

struct ScreenIntro: View {
    let title: String
    let detail: String
    let symbol: String
    var color: Color = ShieldTheme.action
    var body: some View {
        HStack(alignment: .top, spacing: ShieldTheme.Spacing.content) {
            ShieldRowSymbol(systemName: symbol, color: color, size: 44)
            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.tight) {
                Text(title).shieldHeading(.section).foregroundStyle(ShieldTheme.ink).accessibilityAddTraits(.isHeader)
                Text(detail).font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
            }
            .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.vertical, ShieldTheme.Spacing.compact)
        .accessibilityElement(children: .combine)
    }
}

/// The leading symbol of a row. `.tile` is the Settings icon: a white glyph on a filled,
/// continuous-cornered square whose corner is 7/30 of its side. `.avatar` is the circle
/// Phone and Messages use for people, tinted rather than filled so outcome colors stay calm.
struct ShieldRowSymbol: View {
    enum Style { case tile, avatar }
    let systemName: String
    var color: Color = ShieldTheme.action
    var style: Style = .tile
    @ScaledMetric(relativeTo: .body) private var size: CGFloat = ShieldTheme.Layout.symbolTile

    init(systemName: String, color: Color = ShieldTheme.action, style: Style = .tile, size: CGFloat? = nil) {
        self.systemName = systemName; self.color = color; self.style = style
        _size = ScaledMetric(wrappedValue: size ?? (style == .tile ? ShieldTheme.Layout.symbolTile : ShieldTheme.Layout.avatar), relativeTo: .body)
    }

    var body: some View {
        Group {
            switch style {
            case .tile:
                Image(systemName: systemName)
                    .font(.system(size: size * 0.6, weight: .medium))
                    .foregroundStyle(.white)
                    .frame(width: size, height: size)
                    .background(color.gradient, in: .rect(cornerRadius: size * ShieldTheme.Layout.symbolTileRadius / ShieldTheme.Layout.symbolTile, style: .continuous))
            case .avatar:
                Image(systemName: systemName)
                    .font(.system(size: size * 0.45, weight: .semibold))
                    .foregroundStyle(color)
                    .frame(width: size, height: size)
                    .background(color.opacity(ShieldTheme.tintFillOpacity), in: .circle)
            }
        }
        .accessibilityHidden(true)
    }
}

struct ActionRow: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.isEnabled) private var isEnabled
    let title: String
    var detail: String = ""
    let symbol: String
    var color: Color = ShieldTheme.action
    var body: some View {
        HStack(alignment: .center, spacing: ShieldTheme.Layout.rowSymbolSpacing) {
            if !typeSize.isAccessibilitySize {
                ShieldRowSymbol(systemName: symbol, color: color)
            }
            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.tight) {
                Text(title).font(.body).foregroundStyle(ShieldTheme.ink)
                if !detail.isEmpty {
                    Text(detail).font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                }
            }
            .fixedSize(horizontal: false, vertical: true)
        }
        // A one-line tile row is 52 points, as in Settings; a detail line adds grid steps.
        .padding(.vertical, detail.isEmpty ? (typeSize.isAccessibilitySize ? 0 : -ShieldTheme.Layout.rowInsetCorrection) : ShieldTheme.Spacing.tight)
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(.rect)
        .opacity(isEnabled ? 1 : 0.5)
        .accessibilityElement(children: .combine)
    }
}

struct FlowProgress: View {
    let title: String
    let current: Int
    let total: Int
    var body: some View {
        VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) {
            Text("Step \(current) of \(total)")
                .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
            ProgressView(value: Double(current), total: Double(total)).tint(ShieldTheme.action)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(title), step \(current) of \(total)")
    }
}

/// Native grouping with the system's prominent section header (title 3, semibold).
struct ShieldSection<Content: View, Footer: View>: View {
    let title: String
    let content: Content
    let footer: Footer
    init(_ title: String, @ViewBuilder content: () -> Content) where Footer == EmptyView {
        self.title = title; self.content = content(); footer = EmptyView()
    }
    init(_ title: String, @ViewBuilder content: () -> Content, @ViewBuilder footer: () -> Footer) {
        self.title = title; self.content = content(); self.footer = footer()
    }
    var body: some View {
        Section { content } header: { Text(title).textCase(nil).accessibilityAddTraits(.isHeader) }
            footer: { footer.foregroundStyle(ShieldTheme.secondaryText) }
            .headerProminence(.increased)
            .listRowBackground(ShieldTheme.card)
    }
}

extension View {
    /// Done above the keyboard while a field is focused, for screens without a navigation bar.
    /// SwiftUI's `.keyboard` toolbar placement reports "Invalid frame dimension", so this rides on the
    /// bottom safe area instead, which the keyboard raises. Screens with a bar put Done there.
    func shieldKeyboardDone(_ visible: Bool, done: @escaping () -> Void) -> some View {
        safeAreaInset(edge: .bottom, spacing: 0) {
            // The fade is scoped to the bar: animating the whole screen would carry focus
            // changes into the transaction and can leave the keyboard up after sending.
            ZStack {
                if visible {
                    HStack {
                        Spacer()
                        // Like the system bars, cap the size and offer the Large Content Viewer instead.
                        Button("Done", action: done).font(.headline).buttonStyle(.glass)
                            .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
                            .accessibilityShowsLargeContentViewer()
                    }
                    .padding(.horizontal, ShieldTheme.Spacing.content)
                    .padding(.vertical, ShieldTheme.Spacing.compact)
                    .transition(.opacity)
                }
            }
            .animation(.easeOut(duration: 0.2), value: visible)
        }
    }
}
