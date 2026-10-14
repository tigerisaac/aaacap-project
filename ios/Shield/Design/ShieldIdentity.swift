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
struct ShieldSection<Content: View>: View {
    let title: String
    let content: Content
    init(_ title: String, @ViewBuilder content: () -> Content) {
        self.title = title; self.content = content()
    }
    var body: some View {
        Section { content } header: { Text(title).shieldHeading(.section).foregroundStyle(ShieldTheme.ink).textCase(nil).accessibilityAddTraits(.isHeader) }
            .listRowBackground(ShieldTheme.card)
    }
}
