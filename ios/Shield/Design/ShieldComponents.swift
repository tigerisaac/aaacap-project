import SwiftUI

extension View {
    /// Apply to a List, including pushed Settings screens, for one shared grouped surface.
    func shieldListStyle() -> some View {
        listStyle(.insetGrouped)
            .environment(\.defaultMinListRowHeight, ShieldTheme.Layout.rowHeight)
            .scrollContentBackground(.hidden)
            .scrollEdgeEffectStyle(.hard, for: .all)
            .background(ShieldTheme.surface)
            .safeAreaPadding(.bottom, ShieldTheme.Spacing.content)
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
