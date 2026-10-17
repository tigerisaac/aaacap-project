import SwiftUI

/// The overview API preserves stopped calls beyond history retention.
/// This is historical activity, not a claim that every caller was a scammer or checks are on.
struct StoppedCallsCard: View {
    let count: Int?
    let openCalls: () -> Void

    /// A Health-style summary: a tinted header with its symbol, the figure in SF Rounded, then units.
    var body: some View {
        Button(action: openCalls) {
            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) {
                HStack(alignment: .firstTextBaseline, spacing: ShieldTheme.Spacing.tight) {
                    Image(systemName: "hand.raised.fill").accessibilityHidden(true)
                        .font(.subheadline.weight(.semibold)).foregroundStyle(ShieldTheme.held)
                    Text("Calls stopped")
                        .font(.subheadline.weight(.semibold)).foregroundStyle(ShieldTheme.held)
                        .fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.forward").font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color(uiColor: .tertiaryLabel))
                        .accessibilityHidden(true)
                }
                if let count, count > 0 {
                    ViewThatFits(in: .horizontal) {
                        HStack(alignment: .firstTextBaseline, spacing: ShieldTheme.Spacing.tight) {
                            total(count)
                            units.fixedSize()
                        }
                        VStack(alignment: .leading, spacing: 0) {
                            total(count)
                            units
                        }
                    }
                } else {
                    Text(count == nil ? "Total unavailable" : "None so far").font(.body)
                        .foregroundStyle(ShieldTheme.ink)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(.vertical, ShieldTheme.Spacing.tight)
            .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget, alignment: .leading)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Calls stopped")
        .accessibilityValue(count.map { "\($0) in total" } ?? "Total unavailable")
        .accessibilityHint("Shows recent stopped calls, including calls that need review.")
        .accessibilityIdentifier("home-stopped-calls")
    }

    private var units: some View {
        Text("in total").font(.subheadline.weight(.semibold)).foregroundStyle(ShieldTheme.secondaryText)
    }

    private func total(_ count: Int) -> some View {
        Text(count, format: .number)
            .font(.system(.largeTitle, design: .rounded).weight(.bold)).monospacedDigit()
            .foregroundStyle(ShieldTheme.ink)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityIdentifier("stopped-call-count")
    }

}
