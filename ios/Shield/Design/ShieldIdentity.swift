import SwiftUI

struct ShieldBrand: View {
    var compact = false
    var body: some View {
        HStack(spacing: 12) {
            Image("ShieldMark").resizable().scaledToFit()
                .frame(width: compact ? 32 : 60, height: compact ? 32 : 60)
                .clipShape(.rect(cornerRadius: (compact ? 32 : 60) * ShieldTheme.Layout.iconCornerRatio, style: .continuous))
                .accessibilityHidden(true)
            Text("Shield").font(compact ? .system(.title2, design: .serif) : ShieldTheme.Typography.display)
                .foregroundStyle(ShieldTheme.ink)
        }
        .accessibilityElement(children: .combine)
    }
}

struct ScreenIntro: View {
    let title: String
    let detail: String
    let symbol: String
    var color: Color = ShieldTheme.action
    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: symbol).font(.title2.weight(.semibold))
                .foregroundStyle(color).frame(width: 48, height: 48)
                .background(color.opacity(0.10), in: .rect(cornerRadius: 14))
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 6) {
                Text(title).shieldHeading(.section).foregroundStyle(ShieldTheme.ink).accessibilityAddTraits(.isHeader)
                Text(detail).font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
            }
            .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.vertical, 8)
        .accessibilityElement(children: .combine)
    }
}

/// The quiet symbol tile that leads call, message, action and status rows, so their text
/// starts on one shared column.
struct ShieldRowSymbol: View {
    let systemName: String
    var color: Color = ShieldTheme.action
    @ScaledMetric(relativeTo: .body) private var size = 36.0

    var body: some View {
        Image(systemName: systemName)
            .font(.body.weight(.medium)).foregroundStyle(color)
            .frame(width: size, height: size)
            .background(ShieldTheme.quietSurface, in: .rect(cornerRadius: 10))
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
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.body.weight(.medium)).foregroundStyle(ShieldTheme.ink)
                if !detail.isEmpty {
                    Text(detail).font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                }
            }
            .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget, alignment: .leading)
        .opacity(isEnabled ? 1 : 0.5)
        .accessibilityElement(children: .combine)
    }
}

struct FlowProgress: View {
    let title: String
    let current: Int
    let total: Int
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Step \(current) of \(total)")
                .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
            ProgressView(value: Double(current), total: Double(total)).tint(ShieldTheme.action)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(title), step \(current) of \(total)")
    }
}

/// Native grouping with Shield's display heading and adaptive card surface.
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
        Section { content } header: { Text(title).shieldHeading(.section).foregroundStyle(ShieldTheme.ink).textCase(nil).accessibilityAddTraits(.isHeader) }
            footer: { footer.font(.subheadline) }
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
