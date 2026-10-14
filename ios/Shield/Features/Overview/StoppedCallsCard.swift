import SwiftUI

/// The overview API preserves stopped calls beyond history retention.
/// This is historical activity, not a claim that every caller was a scammer or checks are on.
struct StoppedCallsCard: View {
    let count: Int?
    let openCalls: () -> Void
    @Environment(\.dynamicTypeSize) private var typeSize
    /// The large serif numeral's side bearing; pulling it back lines its ink up with the label above.
    @ScaledMetric(relativeTo: .largeTitle) private var numeralBearing = 2.0

    var body: some View {
        Button(action: openCalls) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .firstTextBaseline, spacing: 12) {
                    Text("Calls stopped").font(.headline)
                        .fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                    Image(systemName: "hand.raised").font(.body.weight(.medium))
                        .accessibilityHidden(true)
                }
                if let count, count > 0 {
                    // Side by side whenever it fits, so "in total" reads with its number.
                    ViewThatFits(in: .horizontal) {
                        HStack(alignment: .firstTextBaseline, spacing: 10) {
                            total(count)
                            Text("in total").font(.body).fixedSize()
                        }
                        VStack(alignment: .leading, spacing: 0) {
                            total(count)
                            Text("in total").font(.body)
                        }
                    }
                } else {
                    Text(count == nil ? "Total unavailable" : "None so far").font(.body)
                        .fixedSize(horizontal: false, vertical: true)
                }
                HStack(spacing: 8) {
                    Text("See calls").font(.headline)
                    Image(systemName: "arrow.right").font(.body.weight(.semibold))
                        .accessibilityHidden(true)
                }
                .padding(.top, typeSize.isAccessibilitySize ? 0 : 4)
            }
            .foregroundStyle((count ?? 0) > 0 ? ShieldTheme.actionInk : Color.primary)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, minHeight: ShieldTheme.Layout.minimumTarget, alignment: .leading)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Calls stopped")
        .accessibilityValue(count.map { "\($0) in total" } ?? "Total unavailable")
        .accessibilityHint("Shows recent stopped calls, including calls that need review.")
        .accessibilityIdentifier("home-stopped-calls")
        .listRowBackground((count ?? 0) > 0 ? ShieldTheme.action : ShieldTheme.card)
    }

    private func total(_ count: Int) -> some View {
        Text(count, format: .number)
            .font(ShieldTheme.Typography.display.scaled(by: 1.6)).monospacedDigit().tracking(-1)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.leading, -numeralBearing)
            .accessibilityIdentifier("stopped-call-count")
    }
}
