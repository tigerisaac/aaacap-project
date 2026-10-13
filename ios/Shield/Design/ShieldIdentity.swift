import SwiftUI

struct ShieldBrand: View {
    var compact = false
    var body: some View {
        HStack(spacing: 12) {
            Image("ShieldMark").resizable().scaledToFit()
                .frame(width: compact ? 36 : 68, height: compact ? 36 : 68)
                .clipShape(.rect(cornerRadius: (compact ? 36 : 68) * ShieldTheme.Layout.iconCornerRatio, style: .continuous))
                .accessibilityHidden(true)
            Text("Shield").font(compact ? .title3.bold() : .largeTitle.bold())
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
                Text(title).font(.title3.bold()).accessibilityAddTraits(.isHeader)
                Text(detail).font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
            }
            .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.vertical, 8)
        .accessibilityElement(children: .combine)
    }
}

struct ActionRow: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    @ScaledMetric(relativeTo: .title3) private var symbolWidth = 36.0
    let title: String
    var detail: String = ""
    let symbol: String
    var color: Color = ShieldTheme.action
    var body: some View {
        HStack(alignment: .center, spacing: 14) {
            if !typeSize.isAccessibilitySize {
                Image(systemName: symbol).font(.title3).foregroundStyle(color)
                    .frame(width: symbolWidth).accessibilityHidden(true)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.body).foregroundStyle(Color.primary)
                if !detail.isEmpty {
                    Text(detail).font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                }
            }
            .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.vertical, 8)
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

/// Native section with an opaque supporting-text color on Shield’s warm surface.
struct ShieldSection<Content: View>: View {
    let title: String
    let content: Content
    init(_ title: String, @ViewBuilder content: () -> Content) {
        self.title = title; self.content = content()
    }
    var body: some View {
        Section { content } header: { Text(title).font(.headline).foregroundStyle(ShieldTheme.secondaryText).textCase(nil).accessibilityAddTraits(.isHeader) }
    }
}
